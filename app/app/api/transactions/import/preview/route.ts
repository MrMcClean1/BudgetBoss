import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectFormat, parseFile, ParsedTransaction } from "@/lib/import-parsers";

export interface PreviewTransaction {
  rowNum: number;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category?: string;
  notes?: string;
}

function toPreview(p: ParsedTransaction): PreviewTransaction {
  return {
    rowNum: p.rawRow,
    date: p.date.toISOString().split("T")[0],
    description: p.description,
    amount: Math.abs(p.amount),
    type: p.amount >= 0 ? "INCOME" : "EXPENSE",
    category: p.category,
    notes: p.notes,
  };
}

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

  const { transactions, errors, totalRows } = parseFile(format, text);

  return NextResponse.json({
    format,
    totalRows,
    validRows: transactions.length,
    errorRows: errors.length,
    preview: transactions.slice(0, 10).map(toPreview),
    sampleErrors: errors.slice(0, 5),
  });
}
