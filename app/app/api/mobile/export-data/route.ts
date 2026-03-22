import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/server/mobile-auth";

/**
 * GET /api/mobile/export-data
 *
 * GDPR Article 15 — Right of Access / Data Portability.
 * Returns all personal data held for the authenticated user as JSON.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyMobileToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userId = payload.sub;

    const [user, bankAccounts, transactions, budgets, savingsGoals, badges] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            tier: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
            xp: true,
            level: true,
            streakDays: true,
            lastActivityAt: true,
          },
        }),
        prisma.bankAccount.findMany({
          where: { userId },
          select: { id: true, name: true, type: true, balance: true, currency: true, createdAt: true },
        }),
        prisma.transaction.findMany({
          where: { userId },
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            type: true,
            createdAt: true,
          },
        }),
        prisma.budget.findMany({
          where: { userId },
          select: { id: true, name: true, amount: true, period: true, startDate: true, endDate: true, isActive: true, createdAt: true },
        }),
        prisma.savingsGoal.findMany({
          where: { userId },
          select: { id: true, name: true, targetAmount: true, currentAmount: true, targetDate: true, isCompleted: true, createdAt: true },
        }),
        prisma.userBadge.findMany({
          where: { userId },
          select: { id: true, badgeId: true, earnedAt: true },
        }),
      ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      profile: user,
      bankAccounts,
      transactions,
      budgets,
      savingsGoals,
      badges,
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
