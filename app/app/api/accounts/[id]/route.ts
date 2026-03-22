import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BankAccountType } from "@prisma/client";
import { z } from "zod";
import { recalcBalance } from "@/lib/server/balance";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT_CARD", "CASH", "INVESTMENT"]).optional(),
  currency: z.string().optional(),
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

  const existing = await prisma.bankAccount.findUnique({ where: { id } });
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

  const { name, type, currency, isActive } = parsed.data;

  await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type: type as BankAccountType } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  const balance = await recalcBalance(id);

  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true } } },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: account.id,
    name: account.name,
    type: account.type,
    balance,
    currency: account.currency,
    isActive: account.isActive,
    transactionCount: account._count.transactions,
    createdAt: account.createdAt.toISOString(),
  });
}
