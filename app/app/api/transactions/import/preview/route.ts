import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseAmount, parseDate } from "../route";

// Re-implement local parsing helpers (duplicated to avoid circular imports from route.ts)
// Preview parses the file and returns the first N rows WITHOUT saving anything.

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
        if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        row.push(cell); cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function detectColumns(headers: string[]) {
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

function getOFXTag(block: string, tag: string): string {
  const xmlMatch = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`, "i"));
  if (xmlMatch) return xmlMatch[1].trim();
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^\n<]*)`, "i"));
  if (sgmlMatch) return sgmlMatch[1].trim();
  return "";
}

export interface PreviewTransaction {
  rowNum: number;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category?: string;
  notes?: string;
}

export interface PreviewResult {
  format: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: PreviewTransaction[]; // first 10 valid rows
  errors: { row: number; error: string }[];
  sampleErrors: { row: number; error: string }[]; // first 5 errors
}

function detectFormat(fileName: string, text: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return "ofx";
  if (lower.endsWith(".json")) return "json";
  if (text.includes("<OFX>") || text.includes("<STMTTRN>")) return "ofx";
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return null;
}

function previewCSV(text: string): Omit<PreviewResult, "format"> {
  const rows = parseCsvText(text);
  if (rows.length < 2) return { totalRows: 0, validRows: 0, errorRows: 0, preview: [], errors: [], sampleErrors: [] };

  const headers = rows[0];
  const cols = detectColumns(headers);
  if (cols.date === -1 || cols.description === -1) {
    const err = { row: 0, error: "Could not detect required columns (date, description)" };
    return { totalRows: 0, validRows: 0, errorRows: 1, preview: [], errors: [err], sampleErrors: [err] };
  }

  const preview: PreviewTransaction[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[cols.date]?.trim();
    const rawDesc = row[cols.description]?.trim();
    if (!rawDate && !rawDesc) continue;

    const date = parseDate(rawDate);
    if (!date) { errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` }); continue; }
    if (!rawDesc) { errors.push({ row: i + 1, error: "Missing description" }); continue; }

    let amount: number | null = null;
    if (cols.amount !== null && row[cols.amount]) {
      amount = parseAmount(row[cols.amount]);
    } else if (cols.debit !== null || cols.credit !== null) {
      const debit = cols.debit !== null ? parseAmount(row[cols.debit] || "") : null;
      const credit = cols.credit !== null ? parseAmount(row[cols.credit] || "") : null;
      if (credit && credit > 0) amount = credit;
      else if (debit && debit > 0) amount = -debit;
    }

    if (amount === null) { errors.push({ row: i + 1, error: "Could not parse amount" }); continue; }

    if (preview.length < 10) {
      preview.push({
        rowNum: i + 1,
        date: date.toISOString().split("T")[0],
        description: rawDesc,
        amount: Math.abs(amount),
        type: amount >= 0 ? "INCOME" : "EXPENSE",
        category: cols.category !== null ? row[cols.category]?.trim() : undefined,
      });
    }
  }

  const totalRows = rows.length - 1;
  return { totalRows, validRows: preview.length + Math.max(0, totalRows - errors.length - preview.length) + Math.min(preview.length, 10), errorRows: errors.length, preview, errors, sampleErrors: errors.slice(0, 5) };
}

function previewOFX(text: string): Omit<PreviewResult, "format"> {
  const ofxStart = text.indexOf("<OFX>");
  const body = ofxStart >= 0 ? text.slice(ofxStart) : text;
  const trxPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let rowNum = 0;
  const preview: PreviewTransaction[] = [];
  const errors: { row: number; error: string }[] = [];

  while ((match = trxPattern.exec(body)) !== null) {
    rowNum++;
    const block = match[1];
    const rawDate = getOFXTag(block, "DTPOSTED");
    const rawAmount = getOFXTag(block, "TRNAMT");
    const rawMemo = getOFXTag(block, "MEMO") || getOFXTag(block, "NAME");
    const rawType = getOFXTag(block, "TRNTYPE");

    const date = parseDate(rawDate);
    if (!date) { errors.push({ row: rowNum, error: `Invalid date: "${rawDate}"` }); continue; }
    if (!rawMemo) { errors.push({ row: rowNum, error: "Missing memo/description" }); continue; }

    const amount = parseAmount(rawAmount);
    if (amount === null) { errors.push({ row: rowNum, error: `Could not parse amount: "${rawAmount}"` }); continue; }

    if (preview.length < 10) {
      preview.push({
        rowNum,
        date: date.toISOString().split("T")[0],
        description: rawMemo,
        amount: Math.abs(amount),
        type: amount >= 0 ? "INCOME" : "EXPENSE",
        notes: rawType ? `OFX type: ${rawType}` : undefined,
      });
    }
  }

  return { totalRows: rowNum, validRows: rowNum - errors.length, errorRows: errors.length, preview, errors, sampleErrors: errors.slice(0, 5) };
}

function previewJSON(text: string): Omit<PreviewResult, "format"> {
  let data: unknown;
  try { data = JSON.parse(text); }
  catch { return { totalRows: 0, validRows: 0, errorRows: 1, preview: [], errors: [{ row: 0, error: "Invalid JSON" }], sampleErrors: [{ row: 0, error: "Invalid JSON" }] }; }

  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).transactions))
    rows = (data as Record<string, unknown>).transactions as unknown[];
  else {
    const err = { row: 0, error: "JSON must be an array or object with 'transactions' array" };
    return { totalRows: 0, validRows: 0, errorRows: 1, preview: [], errors: [err], sampleErrors: [err] };
  }

  const preview: PreviewTransaction[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;
    const rawDate = String(row.date ?? row.Date ?? row.DATE ?? "");
    const rawDesc = String(row.description ?? row.memo ?? row.payee ?? row.name ?? row.Description ?? "");
    const rawAmount = row.amount ?? row.Amount ?? row.AMOUNT;
    const rawCategory = String(row.category ?? row.Category ?? row.categoryName ?? "");

    if (!rawDate && !rawDesc) continue;

    const date = parseDate(rawDate);
    if (!date) { errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` }); continue; }
    if (!rawDesc) { errors.push({ row: i + 1, error: "Missing description" }); continue; }

    let amount: number | null = null;
    if (typeof rawAmount === "number") amount = rawAmount;
    else if (typeof rawAmount === "string") amount = parseAmount(rawAmount);

    if (amount !== null && typeof row.type === "string") {
      const type = (row.type as string).toUpperCase();
      if (type === "EXPENSE" && amount > 0) amount = -amount;
    }

    if (amount === null) { errors.push({ row: i + 1, error: "Could not parse amount" }); continue; }

    if (preview.length < 10) {
      preview.push({
        rowNum: i + 1,
        date: date.toISOString().split("T")[0],
        description: rawDesc,
        amount: Math.abs(amount),
        type: amount >= 0 ? "INCOME" : "EXPENSE",
        category: rawCategory || undefined,
      });
    }
  }

  return { totalRows: rows.length, validRows: rows.length - errors.length, errorRows: errors.length, preview, errors, sampleErrors: errors.slice(0, 5) };
}

// ── POST /api/transactions/import/preview ─────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

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

  let result: Omit<PreviewResult, "format">;
  switch (format) {
    case "csv": result = previewCSV(text); break;
    case "ofx": result = previewOFX(text); break;
    case "json": result = previewJSON(text); break;
    default: return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  return NextResponse.json({ ...result, format });
}
