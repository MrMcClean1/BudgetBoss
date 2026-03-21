import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  categoryId: z.string().nullable().optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
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

  const existing = await prisma.budget.findUnique({ where: { id } });
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

  const { name, amount, period, categoryId, startDate, endDate, isActive } = parsed.data;

  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(period !== undefined ? { period } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: { category: true },
  });

  return NextResponse.json({
    id: budget.id,
    name: budget.name,
    amount: Number(budget.amount),
    period: budget.period,
    categoryId: budget.categoryId,
    categoryName: budget.category?.name ?? null,
    categoryIcon: budget.category?.icon ?? null,
    categoryColor: budget.category?.color ?? null,
    isActive: budget.isActive,
    startDate: budget.startDate.toISOString(),
    endDate: budget.endDate?.toISOString() ?? null,
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

  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.budget.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
