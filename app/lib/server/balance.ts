import { prisma } from "@/lib/prisma";

export async function recalcBalance(accountId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { bankAccountId: accountId },
    select: { amount: true, type: true },
  });

  const balance = transactions.reduce((sum, t) => {
    const amt = Number(t.amount);
    if (t.type === "INCOME") return sum + amt;
    if (t.type === "EXPENSE") return sum - amt;
    return sum;
  }, 0);

  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { balance },
  });

  return balance;
}
