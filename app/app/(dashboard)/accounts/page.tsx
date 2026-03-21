import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import AccountsClient from "./accounts-client";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <Suspense>
      <AccountsClient
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balance: Number(a.balance),
          currency: a.currency,
          isActive: a.isActive,
          transactionCount: a._count.transactions,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </Suspense>
  );
}
