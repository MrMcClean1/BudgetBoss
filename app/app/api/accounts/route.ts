import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateBankAccount } from "@/lib/server/feature-gates";
import { BankAccountType } from "@prisma/client";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT_CARD", "CASH", "INVESTMENT"]),
  currency: z.string().default("USD"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    include: {
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
      currency: a.currency,
      isActive: a.isActive,
      transactionCount: a._count.transactions,
      createdAt: a.createdAt.toISOString(),
    })),
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

  const { name, type, currency } = parsed.data;

  const featureCheck = await canCreateBankAccount(userId);
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.reason, upgradeRequired: featureCheck.upgradeRequired },
      { status: 403 }
    );
  }

  const account = await prisma.bankAccount.create({
    data: {
      userId,
      name,
      type: type as BankAccountType,
      currency,
      balance: 0,
    },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  return NextResponse.json({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: Number(account.balance),
    currency: account.currency,
    isActive: account.isActive,
    transactionCount: account._count.transactions,
    createdAt: account.createdAt.toISOString(),
  }, { status: 201 });
}
