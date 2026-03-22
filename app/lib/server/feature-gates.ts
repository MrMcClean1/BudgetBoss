import { prisma } from "@/lib/prisma";
import { checkLimit, hasFeature, TIER_LIMITS, type SubscriptionTier } from "@/lib/subscription";

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
  upgradeRequired?: boolean;
}

/**
 * Check if user can create a new bank account
 */
export async function canCreateBankAccount(userId: string): Promise<FeatureCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      _count: { select: { bankAccounts: true } },
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const tier = user.tier as SubscriptionTier;
  const result = checkLimit(tier, "bankAccounts", user._count.bankAccounts);

  if (!result.allowed) {
    return {
      allowed: false,
      reason: `Free tier limit: ${result.limit} bank accounts. Upgrade to Pro for unlimited.`,
      limit: result.limit,
      current: user._count.bankAccounts,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create a new budget
 */
export async function canCreateBudget(userId: string): Promise<FeatureCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      _count: { select: { budgets: true } },
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const tier = user.tier as SubscriptionTier;
  const result = checkLimit(tier, "budgets", user._count.budgets);

  if (!result.allowed) {
    return {
      allowed: false,
      reason: `Free tier limit: ${result.limit} budgets. Upgrade to Pro for unlimited.`,
      limit: result.limit,
      current: user._count.budgets,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create a new savings goal
 */
export async function canCreateSavingsGoal(userId: string): Promise<FeatureCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      _count: { select: { savingsGoals: true } },
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const tier = user.tier as SubscriptionTier;
  const result = checkLimit(tier, "savingsGoals", user._count.savingsGoals);

  if (!result.allowed) {
    return {
      allowed: false,
      reason: `Free tier limit: ${result.limit} savings goals. Upgrade to Pro for unlimited.`,
      limit: result.limit,
      current: user._count.savingsGoals,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if user has access to advanced reports
 */
export async function canAccessAdvancedReports(userId: string): Promise<FeatureCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const tier = user.tier as SubscriptionTier;
  const allowed = hasFeature(tier, "advancedReports");

  if (!allowed) {
    return {
      allowed: false,
      reason: "Advanced reports require Pro subscription.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can access all badge rarities
 */
export async function canAccessAllBadges(userId: string): Promise<FeatureCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const tier = user.tier as SubscriptionTier;
  const allowed = hasFeature(tier, "allBadges");

  if (!allowed) {
    return {
      allowed: false,
      reason: "Rare and legendary badges require Pro subscription.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Get user's current tier and limits status
 */
export async function getUserTierStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      _count: {
        select: {
          bankAccounts: true,
          budgets: true,
          savingsGoals: true,
        },
      },
    },
  });

  if (!user) return null;

  const tier = user.tier as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  return {
    tier,
    status: user.subscriptionStatus,
    endsAt: user.subscriptionEndsAt,
    trialEndsAt: user.trialEndsAt,
    limits,
    usage: {
      bankAccounts: {
        current: user._count.bankAccounts,
        limit: limits.maxBankAccounts,
        remaining: limits.maxBankAccounts === -1 ? -1 : limits.maxBankAccounts - user._count.bankAccounts,
      },
      budgets: {
        current: user._count.budgets,
        limit: limits.maxBudgets,
        remaining: limits.maxBudgets === -1 ? -1 : limits.maxBudgets - user._count.budgets,
      },
      savingsGoals: {
        current: user._count.savingsGoals,
        limit: limits.maxSavingsGoals,
        remaining: limits.maxSavingsGoals === -1 ? -1 : limits.maxSavingsGoals - user._count.savingsGoals,
      },
    },
  };
}
