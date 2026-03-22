import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateBudget } from "@/lib/server/feature-gates";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  categoryId: z.string().nullable().optional(),
  startDate: z.string().refine((s) => !isNaN(new Date(s).getTime()), { message: "Invalid startDate" }),
  endDate: z.string().refine((s) => !isNaN(new Date(s).getTime()), { message: "Invalid endDate" }).nullable().optional(),
});

function getPeriodRange(period: string, startDate: Date): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case "WEEKLY": {
      const day = now.getDay(); // 0=Sun
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "MONTHLY": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case "QUARTERLY": {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
      break;
    }
    case "YEARLY": {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    default: {
      start = startDate;
      end = now;
    }
  }

  // Don't go before budget startDate
  if (start < startDate) start = startDate;

  return { start, end };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [budgets, categories] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { isDefault: true }] },
      orderBy: { name: "asc" },
    }),
  ]);

  // Calculate spend for each budget based on its period
  const budgetsWithSpend = await Promise.all(
    budgets.map(async (b) => {
      const { start, end } = getPeriodRange(b.period, b.startDate);

      const spendResult = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: start, lte: end },
          ...(b.categoryId ? { categoryId: b.categoryId } : {}),
        },
        _sum: { amount: true },
      });

      const spent = Number(spendResult._sum.amount ?? 0);
      const budgetAmount = Number(b.amount);
      const remaining = budgetAmount - spent;
      const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        id: b.id,
        name: b.name,
        amount: budgetAmount,
        period: b.period,
        categoryId: b.categoryId,
        categoryName: b.category?.name ?? null,
        categoryIcon: b.category?.icon ?? null,
        categoryColor: b.category?.color ?? null,
        isActive: b.isActive,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate?.toISOString() ?? null,
        spent,
        remaining,
        percentUsed,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      };
    })
  );

  return NextResponse.json({
    budgets: budgetsWithSpend,
    categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
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

  const { name, amount, period, categoryId, startDate, endDate } = parsed.data;

  const featureCheck = await canCreateBudget(userId);
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.reason, upgradeRequired: featureCheck.upgradeRequired },
      { status: 403 }
    );
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      name,
      amount,
      period,
      categoryId: categoryId ?? null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
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
  }, { status: 201 });
}
