import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { recalcBalance } from "@/lib/server/balance";

const UpdateSchema = z.object({
  date: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  categoryId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isReviewed: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { date, description, amount, type, categoryId, bankAccountId, notes, isReviewed } = parsed.data;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(bankAccountId !== undefined ? { bankAccountId } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(isReviewed !== undefined ? { isReviewed } : {}),
    },
    include: { category: true, bankAccount: true },
  });

  if (transaction.bankAccountId) {
    await recalcBalance(transaction.bankAccountId);
  }
  if (existing.bankAccountId && existing.bankAccountId !== transaction.bankAccountId) {
    await recalcBalance(existing.bankAccountId);
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
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });

  if (existing.bankAccountId) {
    await recalcBalance(existing.bankAccountId);
  }

  return NextResponse.json({ success: true });
}
