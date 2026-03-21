import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import BudgetsClient from "./budgets-client";

function getPeriodRange(period: string, startDate: Date): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case "WEEKLY": {
      const day = now.getDay();
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

  if (start < startDate) start = startDate;
  return { start, end };
}

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
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

  // Calculate spend for each budget
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

      return {
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        period: b.period,
        categoryId: b.categoryId,
        categoryName: b.category?.name ?? null,
        categoryIcon: b.category?.icon ?? null,
        categoryColor: b.category?.color ?? null,
        isActive: b.isActive,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate?.toISOString() ?? null,
        spent: Number(spendResult._sum.amount ?? 0),
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      };
    })
  );

  return (
    <Suspense>
      <BudgetsClient
        budgets={budgetsWithSpend}
        categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))}
      />
    </Suspense>
  );
}
