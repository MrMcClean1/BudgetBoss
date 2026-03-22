/**
 * Subscription tier configuration and helpers
 * Hybrid Freemium Model for BudgetBoss
 */

export type SubscriptionTier = "FREE" | "PRO" | "FAMILY";

export interface TierLimits {
  maxBankAccounts: number;
  maxBudgets: number;
  maxSavingsGoals: number;
  csvImport: boolean;
  advancedReports: boolean;
  prioritySupport: boolean;
  familyMembers: number;
  allBadges: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    maxBankAccounts: 2,
    maxBudgets: 3,
    maxSavingsGoals: 2,
    csvImport: true, // Basic CSV import
    advancedReports: false,
    prioritySupport: false,
    familyMembers: 0,
    allBadges: false, // Only common badges
  },
  PRO: {
    maxBankAccounts: -1, // Unlimited
    maxBudgets: -1,
    maxSavingsGoals: -1,
    csvImport: true,
    advancedReports: true,
    prioritySupport: true,
    familyMembers: 0,
    allBadges: true,
  },
  FAMILY: {
    maxBankAccounts: -1,
    maxBudgets: -1,
    maxSavingsGoals: -1,
    csvImport: true,
    advancedReports: true,
    prioritySupport: true,
    familyMembers: 5,
    allBadges: true,
  },
};

export const TIER_PRICES = {
  PRO: {
    monthly: 499, // $4.99 in cents
    yearly: 3999, // $39.99 in cents (save ~33%)
  },
  FAMILY: {
    monthly: 799, // $7.99 in cents
    yearly: 6999, // $69.99 in cents
  },
};

export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
  FAMILY_MONTHLY: process.env.STRIPE_PRICE_FAMILY_MONTHLY || "price_family_monthly",
  FAMILY_YEARLY: process.env.STRIPE_PRICE_FAMILY_YEARLY || "price_family_yearly",
};

/**
 * Check if user has reached the limit for a resource
 */
export function checkLimit(
  tier: SubscriptionTier,
  resource: "bankAccounts" | "budgets" | "savingsGoals",
  currentCount: number
): { allowed: boolean; limit: number; remaining: number } {
  const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof TierLimits;
  const limit = TIER_LIMITS[tier][limitKey] as number;

  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }

  return {
    allowed: currentCount < limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
  };
}

/**
 * Check if a feature is available for the user's tier
 */
export function hasFeature(
  tier: SubscriptionTier,
  feature: keyof Omit<TierLimits, "maxBankAccounts" | "maxBudgets" | "maxSavingsGoals" | "familyMembers">
): boolean {
  return TIER_LIMITS[tier][feature] as boolean;
}

/**
 * Check if user is on a paid tier
 */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === "PRO" || tier === "FAMILY";
}

/**
 * Get upgrade message for a limit
 */
export function getUpgradeMessage(resource: string, tier: SubscriptionTier): string {
  if (tier === "FREE") {
    return `Upgrade to Pro to add unlimited ${resource}. Start your free trial today!`;
  }
  return `You've reached your ${resource} limit.`;
}
