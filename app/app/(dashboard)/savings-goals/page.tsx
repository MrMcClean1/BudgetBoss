import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SavingsGoalsClient from "./savings-goals-client";

export default async function SavingsGoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <SavingsGoalsClient
      goals={goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        targetDate: g.targetDate?.toISOString() ?? null,
        icon: g.icon,
        color: g.color,
        isCompleted: g.isCompleted,
        createdAt: g.createdAt.toISOString(),
      }))}
    />
  );
}
