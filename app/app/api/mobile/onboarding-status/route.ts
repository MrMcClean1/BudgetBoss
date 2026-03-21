import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/mobile/onboarding-status
// Returns whether the user has completed each step of onboarding:
//   hasAccount  — at least one bank account
//   hasBudget   — at least one active budget
//   hasGoal     — at least one savings goal
//   completed   — all three steps done
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [accountCount, budgetCount, goalCount] = await Promise.all([
    prisma.bankAccount.count({ where: { userId } }),
    prisma.budget.count({ where: { userId, isActive: true } }),
    prisma.savingsGoal.count({ where: { userId } }),
  ]);

  const hasAccount = accountCount > 0;
  const hasBudget = budgetCount > 0;
  const hasGoal = goalCount > 0;

  return NextResponse.json({
    hasAccount,
    hasBudget,
    hasGoal,
    completed: hasAccount && hasBudget && hasGoal,
  });
}
