import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

// Rocket Money CSV format:
// Date, Description, Amount, Currency, Category, Account, Tags, Notes
// Or similar bank export formats with:
// Date, Description, Debit, Credit, Category
// Date, Description, Amount (negative = expense)

interface ParsedRow {
  date: Date;
  description: string;
  amount: number; // positive = income, negative = expense
  category?: string;
  rawRow: number;
  error?: string;
}

function parseAmount(str: string): number | null {
  if (!str) return null;
  // Remove currency symbols, commas, spaces
  const cleaned = str.replace(/[$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  // Try multiple date formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const fmt of formats) {
    const m = str.trim().match(fmt);
    if (m) {
      const d = new Date(str.trim());
      if (!isNaN(d.getTime())) return d;
    }
  }

  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
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

function parseCsv(text: string): string[][] {
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

  if (!file.name.endsWith(".csv")) {
    return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV file is empty or has no data rows" }, { status: 400 });
  }

  const headers = rows[0];
  const cols = detectColumns(headers);

  if (cols.date === -1 || cols.description === -1) {
    return NextResponse.json(
      { error: "Could not detect required columns (date, description) in CSV" },
      { status: 400 }
    );
  }

  // Create the import record
  const csvImport = await prisma.csvImport.create({
    data: {
      userId,
      fileName: file.name,
      rowsTotal: rows.length - 1,
      status: "PROCESSING",
    },
  });

  // Fetch user categories for matching
  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const parsed: ParsedRow[] = [];
  const importErrors: { row: number; error: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[cols.date]?.trim();
    const rawDesc = row[cols.description]?.trim();

    if (!rawDate && !rawDesc) continue; // Skip empty rows

    const date = parseDate(rawDate);
    if (!date) {
      importErrors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawDesc) {
      importErrors.push({ row: i + 1, error: "Missing description" });
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
      importErrors.push({ row: i + 1, error: "Could not parse amount" });
      continue;
    }

    const rawCategory = cols.category !== null ? row[cols.category]?.trim() : undefined;

    parsed.push({
      date,
      description: rawDesc,
      amount,
      category: rawCategory,
      rawRow: i + 1,
    });
  }

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
      rowsSkipped: rows.length - 1 - rowsImported - importErrors.length,
      status: "COMPLETED",
      completedAt: new Date(),
      errors: importErrors.length > 0 ? (importErrors as object[]) : undefined,
    },
  });

  return NextResponse.json({
    importId: csvImport.id,
    rowsTotal: rows.length - 1,
    rowsImported,
    rowsErrored: importErrors.length,
    errors: importErrors.slice(0, 20), // Return first 20 errors
  });
}
