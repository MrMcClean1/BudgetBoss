import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import TransactionsClient from "./transactions-client";

interface SearchParams {
  page?: string;
  search?: string;
  categoryId?: string;
  bankAccountId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const search = params.search ?? "";
  const categoryId = params.categoryId ?? "";
  const bankAccountId = params.bankAccountId ?? "";
  const type = params.type ?? "";
  const dateFrom = params.dateFrom ?? "";
  const dateTo = params.dateTo ?? "";

  const where = {
    userId,
    ...(search ? { description: { contains: search, mode: "insensitive" as const } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(bankAccountId ? { bankAccountId } : {}),
    ...(type ? { type: type as "INCOME" | "EXPENSE" | "TRANSFER" } : {}),
    ...((dateFrom || dateTo)
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
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

  return (
    <Suspense>
      <TransactionsClient
        transactions={transactions.map((t) => ({
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
        }))}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
        }))}
        bankAccounts={bankAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
        }))}
      />
    </Suspense>
  );
}
