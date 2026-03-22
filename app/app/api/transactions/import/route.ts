import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // positive = income, negative = expense
  category?: string;
  notes?: string;
  rawRow: number;
}

interface ImportError {
  row: number;
  error: string;
}

interface ParseResult {
  transactions: ParsedTransaction[];
  errors: ImportError[];
  totalRows: number;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function parseAmount(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseDate(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();

  // Try standard formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,        // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,    // MM-DD-YYYY
    /^(\d{8})$/,                          // YYYYMMDD (OFX)
  ];

  // Handle YYYYMMDD (OFX format)
  const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (yyyymmdd) {
    const d = new Date(`${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  for (const fmt of formats) {
    if (fmt.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    const row: string[] = [];
    let inQuotes = false;
    let cell = "";

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function detectColumns(headers: string[]): {
  date: number;
  description: number;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  category: number | null;
} {
  const h = headers.map((h) => h.toLowerCase().trim());

  const find = (...names: string[]) => {
    for (const name of names) {
      const idx = h.findIndex((col) => col.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    date: find("date"),
    description: find("description", "memo", "payee", "name"),
    amount: find("amount") === -1 ? null : find("amount"),
    debit: find("debit", "withdrawal") === -1 ? null : find("debit", "withdrawal"),
    credit: find("credit", "deposit") === -1 ? null : find("credit", "deposit"),
    category: find("category") === -1 ? null : find("category"),
  };
}

function parseCSV(text: string): ParseResult {
  const rows = parseCsvText(text);
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];

  if (rows.length < 2) {
    return { transactions: [], errors: [{ row: 0, error: "File is empty or has no data rows" }], totalRows: 0 };
  }

  const headers = rows[0];
  const cols = detectColumns(headers);

  if (cols.date === -1 || cols.description === -1) {
    return {
      transactions: [],
      errors: [{ row: 0, error: "Could not detect required columns (date, description)" }],
      totalRows: 0,
    };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[cols.date]?.trim();
    const rawDesc = row[cols.description]?.trim();

    if (!rawDate && !rawDesc) continue;

    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawDesc) {
      errors.push({ row: i + 1, error: "Missing description" });
      continue;
    }

    let amount: number | null = null;

    if (cols.amount !== null && row[cols.amount]) {
      amount = parseAmount(row[cols.amount]);
    } else if (cols.debit !== null || cols.credit !== null) {
      const debit = cols.debit !== null ? parseAmount(row[cols.debit] || "") : null;
      const credit = cols.credit !== null ? parseAmount(row[cols.credit] || "") : null;
      if (credit && credit > 0) amount = credit;
      else if (debit && debit > 0) amount = -debit;
    }

    if (amount === null) {
      errors.push({ row: i + 1, error: "Could not parse amount" });
      continue;
    }

    const rawCategory = cols.category !== null ? row[cols.category]?.trim() : undefined;

    transactions.push({
      date,
      description: rawDesc,
      amount,
      category: rawCategory,
      rawRow: i + 1,
    });
  }

  return { transactions, errors, totalRows: rows.length - 1 };
}

// ── OFX/QFX parser ────────────────────────────────────────────────────────────
// Supports both legacy SGML-style OFX and XML-style OFX 2.x

function parseOFX(text: string): ParseResult {
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];

  // Strip OFX headers (lines before <OFX> or <?OFX ...>)
  const ofxStart = text.indexOf("<OFX>");
  const body = ofxStart >= 0 ? text.slice(ofxStart) : text;

  // Extract STMTTRN blocks (works for both SGML and XML OFX)
  const trxPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let rowNum = 0;

  function getTag(block: string, tag: string): string {
    // XML style: <TAG>value</TAG>
    const xmlMatch = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`, "i"));
    if (xmlMatch) return xmlMatch[1].trim();
    // SGML style: <TAG>value\n
    const sgmlMatch = block.match(new RegExp(`<${tag}>([^\n<]*)`, "i"));
    if (sgmlMatch) return sgmlMatch[1].trim();
    return "";
  }

  while ((match = trxPattern.exec(body)) !== null) {
    rowNum++;
    const block = match[1];

    const rawDate = getTag(block, "DTPOSTED");
    const rawAmount = getTag(block, "TRNAMT");
    const rawMemo = getTag(block, "MEMO") || getTag(block, "NAME");
    const rawType = getTag(block, "TRNTYPE");

    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: rowNum, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawMemo) {
      errors.push({ row: rowNum, error: "Missing memo/description" });
      continue;
    }

    const amount = parseAmount(rawAmount);
    if (amount === null) {
      errors.push({ row: rowNum, error: `Could not parse amount: "${rawAmount}"` });
      continue;
    }

    // OFX CREDIT transactions are positive income, DEBIT are negative (expenses)
    // The amount sign in the file already encodes this.
    transactions.push({
      date,
      description: rawMemo,
      amount,
      notes: rawType ? `OFX type: ${rawType}` : undefined,
      rawRow: rowNum,
    });
  }

  if (rowNum === 0) {
    errors.push({ row: 0, error: "No transactions found in OFX/QFX file. Ensure the file contains <STMTTRN> blocks." });
  }

  return { transactions, errors, totalRows: rowNum };
}

// ── JSON parser ───────────────────────────────────────────────────────────────
// Supports:
//   - BudgetBoss export format: { transactions: [...] }
//   - Array of transaction objects: [{ date, description/memo/payee, amount, ... }]

function parseJSON(text: string): ParseResult {
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { transactions: [], errors: [{ row: 0, error: "Invalid JSON file" }], totalRows: 0 };
  }

  // Unwrap BudgetBoss export format
  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).transactions)) {
    rows = (data as Record<string, unknown>).transactions as unknown[];
  } else {
    return {
      transactions: [],
      errors: [{ row: 0, error: "JSON must be an array of transactions or an object with a 'transactions' array" }],
      totalRows: 0,
    };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;

    const rawDate = String(row.date ?? row.Date ?? row.DATE ?? "");
    const rawDesc = String(row.description ?? row.memo ?? row.payee ?? row.name ?? row.Description ?? "");
    const rawAmount = row.amount ?? row.Amount ?? row.AMOUNT;
    const rawCategory = String(row.category ?? row.Category ?? row.categoryName ?? "");
    const rawNotes = String(row.notes ?? row.Notes ?? "");

    if (!rawDate && !rawDesc) continue;

    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawDesc) {
      errors.push({ row: i + 1, error: "Missing description" });
      continue;
    }

    let amount: number | null = null;
    if (typeof rawAmount === "number") {
      amount = rawAmount;
    } else if (typeof rawAmount === "string") {
      amount = parseAmount(rawAmount);
    }

    // Handle BudgetBoss export which has separate type + positive amount
    if (amount !== null && typeof row.type === "string") {
      const type = (row.type as string).toUpperCase();
      if (type === "EXPENSE" && amount > 0) amount = -amount;
    }

    if (amount === null) {
      errors.push({ row: i + 1, error: "Could not parse amount" });
      continue;
    }

    transactions.push({
      date,
      description: rawDesc,
      amount,
      category: rawCategory || undefined,
      notes: rawNotes || undefined,
      rawRow: i + 1,
    });
  }

  return { transactions, errors, totalRows: rows.length };
}

// ── Format detection ──────────────────────────────────────────────────────────

type ImportFormat = "csv" | "ofx" | "json";

function detectFormat(fileName: string, text: string): ImportFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return "ofx";
  if (lower.endsWith(".json")) return "json";

  // Content-based detection
  if (text.includes("<OFX>") || text.includes("<STMTTRN>")) return "ofx";
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";

  return null;
}

function parseFile(format: ImportFormat, text: string): ParseResult {
  switch (format) {
    case "csv": return parseCSV(text);
    case "ofx": return parseOFX(text);
    case "json": return parseJSON(text);
  }
}

// ── POST /api/transactions/import ─────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const text = await file.text();
  const format = detectFormat(file.name, text);

  if (!format) {
    return NextResponse.json(
      { error: "Unsupported file type. Accepted formats: CSV, OFX, QFX, JSON" },
      { status: 400 }
    );
  }

  const { transactions: parsed, errors: importErrors, totalRows } = parseFile(format, text);

  if (importErrors.length > 0 && parsed.length === 0) {
    return NextResponse.json({ error: importErrors[0].error }, { status: 400 });
  }

  // Create the import record
  const csvImport = await prisma.csvImport.create({
    data: {
      userId,
      fileName: file.name,
      rowsTotal: totalRows,
      status: "PROCESSING",
    },
  });

  // Fetch user categories for matching
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { isDefault: true }] },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // Batch insert transactions
  let rowsImported = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
    const batch = parsed.slice(i, i + BATCH_SIZE);

    await prisma.transaction.createMany({
      data: batch.map((p) => {
        const type: TransactionType = p.amount >= 0 ? "INCOME" : "EXPENSE";
        const categoryId = p.category
          ? categoryMap.get(p.category.toLowerCase()) ?? null
          : null;

        return {
          userId,
          csvImportId: csvImport.id,
          date: p.date,
          description: p.description,
          amount: Math.abs(p.amount),
          type,
          categoryId,
          notes: p.notes ?? null,
          isReviewed: false,
        };
      }),
    });

    rowsImported += batch.length;
  }

  // Update import record
  await prisma.csvImport.update({
    where: { id: csvImport.id },
    data: {
      rowsImported,
      rowsErrored: importErrors.length,
      rowsSkipped: totalRows - rowsImported - importErrors.length,
      status: "COMPLETED",
      completedAt: new Date(),
      errors: importErrors.length > 0 ? (importErrors as object[]) : undefined,
    },
  });

  // Award XP for importing
  if (rowsImported > 0) {
    try {
      await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/gamification/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "import_transactions" }),
      });
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({
    importId: csvImport.id,
    format,
    rowsTotal: totalRows,
    rowsImported,
    rowsErrored: importErrors.length,
    errors: importErrors.slice(0, 20),
  });
}
