import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { detectFormat, parseFile } from "@/lib/import-parsers";

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

  // Fetch user + default categories for matching
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

  // Award XP for importing (non-critical)
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
