import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, transactions, budgets, savingsGoals, recentImports, badges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, xp: true, level: true, streakDays: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 500,
    }),
    prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId, isCompleted: false },
    }),
    prisma.csvImport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
      take: 6,
    }),
  ]);

  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTransactions = transactions.filter((t) => t.date >= startOfMonth);

  const monthlyIncome = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyExpenses = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Spending by category (this month)
  const categorySpend: Record<string, { name: string; icon: string | null; color: string | null; amount: number }> = {};
  for (const t of monthTransactions.filter((t) => t.type === "EXPENSE")) {
    const key = t.categoryId ?? "uncategorized";
    const name = t.category?.name ?? "Uncategorized";
    const icon = t.category?.icon ?? null;
    const color = t.category?.color ?? null;
    if (!categorySpend[key]) categorySpend[key] = { name, icon, color, amount: 0 };
    categorySpend[key].amount += Number(t.amount);
  }

  const spendingByCategory = Object.values(categorySpend)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Build last 6 months trend
  const monthlyTrend: Array<{ label: string; income: number; expenses: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleString("en-US", { month: "short" });
    const monthTx = transactions.filter((t) => t.date >= d && t.date <= end);
    monthlyTrend.push({
      label,
      income: monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0),
      expenses: monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  return (
    <DashboardClient
      user={user}
      monthlyIncome={monthlyIncome}
      monthlyExpenses={monthlyExpenses}
      recentTransactions={transactions.slice(0, 20).map((t) => ({
        id: t.id,
        date: t.date.toISOString(),
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        categoryName: t.category?.name ?? null,
        categoryIcon: t.category?.icon ?? null,
        categoryColor: t.category?.color ?? null,
      }))}
      spendingByCategory={spendingByCategory}
      budgets={budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        categoryName: b.category?.name ?? null,
        categoryIcon: b.category?.icon ?? null,
        spent: categorySpend[b.categoryId ?? ""]?.amount ?? 0,
      }))}
      savingsGoals={savingsGoals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        icon: g.icon,
        color: g.color,
        targetDate: g.targetDate?.toISOString() ?? null,
      }))}
      recentImports={recentImports.map((i) => ({
        id: i.id,
        fileName: i.fileName,
        rowsImported: i.rowsImported,
        rowsErrored: i.rowsErrored,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      }))}
      monthlyTrend={monthlyTrend}
      recentBadges={badges.map((ub) => ({
        id: ub.badge.id,
        key: ub.badge.key,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        rarity: ub.badge.rarity,
        earnedAt: ub.earnedAt.toISOString(),
      }))}
    />
  );
}
