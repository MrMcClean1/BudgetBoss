import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { recalcBalance } from "@/lib/server/balance";

const CreateSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  categoryId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const skip = (page - 1) * limit;

  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");
  const bankAccountId = searchParams.get("bankAccountId");
  const type = searchParams.get("type") as TransactionType | null;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where = {
    userId,
    ...(search ? { description: { contains: search, mode: "insensitive" as const } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(bankAccountId ? { bankAccountId } : {}),
    ...(type ? { type } : {}),
    ...((dateFrom || dateTo)
      ? {
          date: {
            ...(dateFrom && !isNaN(new Date(dateFrom).getTime()) ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo && !isNaN(new Date(dateTo).getTime()) ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  };

  const [transactions, total, categories, bankAccounts] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, bankAccount: true },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { isDefault: true }] },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      notes: t.notes,
      isReviewed: t.isReviewed,
      categoryId: t.categoryId,
      categoryName: t.category?.name ?? null,
      categoryIcon: t.category?.icon ?? null,
      categoryColor: t.category?.color ?? null,
      bankAccountId: t.bankAccountId,
      bankAccountName: t.bankAccount?.name ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
    bankAccounts: bankAccounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { date, description, amount, type, categoryId, bankAccountId, notes } = parsed.data;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      date: new Date(date),
      description,
      amount,
      type,
      categoryId: categoryId ?? null,
      bankAccountId: bankAccountId ?? null,
      notes: notes ?? null,
    },
    include: { category: true, bankAccount: true },
  });

  if (transaction.bankAccountId) {
    await recalcBalance(transaction.bankAccountId);
  }

  return NextResponse.json({
    id: transaction.id,
    date: transaction.date.toISOString(),
    description: transaction.description,
    amount: Number(transaction.amount),
    type: transaction.type,
    notes: transaction.notes,
    isReviewed: transaction.isReviewed,
    categoryId: transaction.categoryId,
    categoryName: transaction.category?.name ?? null,
    categoryIcon: transaction.category?.icon ?? null,
    categoryColor: transaction.category?.color ?? null,
    bankAccountId: transaction.bankAccountId,
    bankAccountName: transaction.bankAccount?.name ?? null,
  }, { status: 201 });
}
