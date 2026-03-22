import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/server/mobile-auth";

/**
 * DELETE /api/mobile/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Required for iOS App Store compliance (account deletion requirement since June 2022).
 *
 * All related data is automatically deleted via Prisma cascade:
 * - Bank accounts
 * - Transactions
 * - Categories
 * - Budgets
 * - Savings goals
 * - Badges
 * - Push tokens
 * - CSV imports
 * - Sessions
 */
export async function DELETE(req: NextRequest) {
  try {
    // Extract bearer token from Authorization header
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

    // Verify user exists and get Stripe info for subscription cleanup
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeSubscriptionId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cancel active Stripe subscription before deleting so user isn't charged after deletion
    if (user.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (stripeError) {
        console.error("Failed to cancel Stripe subscription during account deletion:", stripeError);
        // Continue with deletion even if Stripe cancel fails — user still expects account gone
      }
    }

    // Delete the user - all related data will cascade delete via Prisma schema
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Account permanently deleted",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/delete-account
 *
 * Request account deletion with confirmation.
 * Returns a summary of what will be deleted.
 */
export async function POST(req: NextRequest) {
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

    // Get counts of user data for confirmation display
    const [
      transactionCount,
      accountCount,
      budgetCount,
      goalCount,
      badgeCount,
    ] = await Promise.all([
      prisma.transaction.count({ where: { userId } }),
      prisma.bankAccount.count({ where: { userId } }),
      prisma.budget.count({ where: { userId } }),
      prisma.savingsGoal.count({ where: { userId } }),
      prisma.userBadge.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      message: "Confirm account deletion",
      dataToBeDeleted: {
        transactions: transactionCount,
        bankAccounts: accountCount,
        budgets: budgetCount,
        savingsGoals: goalCount,
        badges: badgeCount,
      },
      warning: "This action is permanent and cannot be undone. All your financial data will be permanently deleted.",
    });
  } catch (error) {
    console.error("Account deletion preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview deletion" },
      { status: 500 }
    );
  }
}
