import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "alex@example.com" },
    update: {},
    create: {
      name: "Alex McClellan",
      email: "alex@example.com",
      passwordHash,
      xp: 1250,
      level: 3,
      streakDays: 7,
    },
  });

  console.log("Created user:", user.email);

  // Default categories
  const categoryData = [
    { name: "Food & Drink", icon: "🍔", color: "#ef4444" },
    { name: "Shopping", icon: "🛍️", color: "#f97316" },
    { name: "Transport", icon: "🚗", color: "#eab308" },
    { name: "Housing", icon: "🏠", color: "#22c55e" },
    { name: "Entertainment", icon: "🎬", color: "#3b82f6" },
    { name: "Health", icon: "💊", color: "#8b5cf6" },
    { name: "Income", icon: "💰", color: "#10b981" },
    { name: "Savings", icon: "🏦", color: "#06b6d4" },
    { name: "Utilities", icon: "⚡", color: "#6b7280" },
    { name: "Other", icon: "📦", color: "#9ca3af" },
  ];

  await prisma.category.deleteMany({ where: { userId: user.id } });
  const categories = await prisma.category.createManyAndReturn({
    data: categoryData.map((c) => ({ ...c, userId: user.id, isDefault: true })),
  });

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // Bank account
  const account = await prisma.bankAccount.upsert({
    where: { id: "seed-checking-1" },
    update: {},
    create: {
      id: "seed-checking-1",
      userId: user.id,
      name: "Chase Checking",
      type: "CHECKING",
      balance: 4500,
    },
  });

  // Sample transactions (last 2 months)
  const now = new Date();
  const txData = [
    { daysAgo: 1, desc: "Whole Foods Market", amount: 87.43, type: "EXPENSE", cat: "Food & Drink" },
    { daysAgo: 2, desc: "Netflix", amount: 15.99, type: "EXPENSE", cat: "Entertainment" },
    { daysAgo: 3, desc: "Salary Deposit", amount: 5200, type: "INCOME", cat: "Income" },
    { daysAgo: 4, desc: "Shell Gas Station", amount: 62.10, type: "EXPENSE", cat: "Transport" },
    { daysAgo: 5, desc: "Amazon.com", amount: 143.76, type: "EXPENSE", cat: "Shopping" },
    { daysAgo: 7, desc: "Spotify", amount: 9.99, type: "EXPENSE", cat: "Entertainment" },
    { daysAgo: 8, desc: "CVS Pharmacy", amount: 34.20, type: "EXPENSE", cat: "Health" },
    { daysAgo: 9, desc: "Chipotle Mexican Grill", amount: 12.85, type: "EXPENSE", cat: "Food & Drink" },
    { daysAgo: 10, desc: "Electric Bill - PSE&G", amount: 89.50, type: "EXPENSE", cat: "Utilities" },
    { daysAgo: 11, desc: "Starbucks", amount: 6.75, type: "EXPENSE", cat: "Food & Drink" },
    { daysAgo: 14, desc: "Target", amount: 67.34, type: "EXPENSE", cat: "Shopping" },
    { daysAgo: 15, desc: "Rent Payment", amount: 1850, type: "EXPENSE", cat: "Housing" },
    { daysAgo: 16, desc: "Freelance Payment", amount: 800, type: "INCOME", cat: "Income" },
    { daysAgo: 18, desc: "Trader Joe's", amount: 54.22, type: "EXPENSE", cat: "Food & Drink" },
    { daysAgo: 20, desc: "Uber", amount: 18.50, type: "EXPENSE", cat: "Transport" },
    { daysAgo: 22, desc: "Gym Membership", amount: 45, type: "EXPENSE", cat: "Health" },
    { daysAgo: 25, desc: "Costco", amount: 187.43, type: "EXPENSE", cat: "Shopping" },
    { daysAgo: 28, desc: "Internet - Comcast", amount: 65, type: "EXPENSE", cat: "Utilities" },
    { daysAgo: 30, desc: "Salary Deposit", amount: 5200, type: "INCOME", cat: "Income" },
    { daysAgo: 33, desc: "DoorDash", amount: 32.40, type: "EXPENSE", cat: "Food & Drink" },
    { daysAgo: 35, desc: "Apple Store", amount: 29.99, type: "EXPENSE", cat: "Entertainment" },
    { daysAgo: 38, desc: "Shell Gas Station", amount: 58.80, type: "EXPENSE", cat: "Transport" },
  ];

  await prisma.transaction.deleteMany({ where: { userId: user.id, csvImportId: null } });

  for (const t of txData) {
    const date = new Date(now);
    date.setDate(date.getDate() - t.daysAgo);
    await prisma.transaction.create({
      data: {
        userId: user.id,
        bankAccountId: account.id,
        categoryId: catMap[t.cat],
        date,
        description: t.desc,
        amount: t.amount,
        type: t.type as "INCOME" | "EXPENSE",
        isReviewed: true,
      },
    });
  }

  console.log(`Created ${txData.length} sample transactions`);

  // Budgets
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const budgetData = [
    { name: "Food & Drink", cat: "Food & Drink", amount: 400 },
    { name: "Shopping", cat: "Shopping", amount: 300 },
    { name: "Entertainment", cat: "Entertainment", amount: 100 },
    { name: "Transport", cat: "Transport", amount: 200 },
    { name: "Health", cat: "Health", amount: 150 },
  ];

  for (const b of budgetData) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId: catMap[b.cat],
        name: b.name,
        amount: b.amount,
        period: "MONTHLY",
        startDate: startOfMonth,
      },
    });
  }

  // Savings goals
  await prisma.savingsGoal.deleteMany({ where: { userId: user.id } });
  await prisma.savingsGoal.createMany({
    data: [
      { userId: user.id, name: "Emergency Fund", targetAmount: 10000, currentAmount: 4200, icon: "🛡️", color: "#3b82f6" },
      { userId: user.id, name: "New GPU (RX 7900 XT)", targetAmount: 1200, currentAmount: 850, icon: "🎮", color: "#8b5cf6" },
      { userId: user.id, name: "Japan Trip 2027", targetAmount: 5000, currentAmount: 1200, icon: "✈️", color: "#f97316" },
    ],
  });

  // Badges
  const badgeData = [
    { key: "first_xp", name: "First Steps", description: "Earned your first XP", icon: "⭐", xpReward: 0, rarity: "COMMON" as const },
    { key: "first_import", name: "Data Importer", description: "Imported your first CSV", icon: "📊", xpReward: 50, rarity: "COMMON" as const },
    { key: "savings_starter", name: "Savings Starter", description: "Created your first savings goal", icon: "🐷", xpReward: 75, rarity: "COMMON" as const },
    { key: "streak_7", name: "Week Warrior", description: "7-day activity streak", icon: "🔥", xpReward: 100, rarity: "UNCOMMON" as const },
    { key: "xp_1000", name: "XP Hunter", description: "Earned 1,000 total XP", icon: "💫", xpReward: 50, rarity: "UNCOMMON" as const },
    { key: "level_5", name: "Rising Star", description: "Reached level 5", icon: "🌟", xpReward: 200, rarity: "UNCOMMON" as const },
    { key: "streak_30", name: "Monthly Master", description: "30-day activity streak", icon: "🏆", xpReward: 500, rarity: "RARE" as const },
    { key: "xp_5000", name: "XP Grinder", description: "Earned 5,000 total XP", icon: "💎", xpReward: 200, rarity: "RARE" as const },
    { key: "level_10", name: "Finance Expert", description: "Reached level 10", icon: "🎓", xpReward: 500, rarity: "RARE" as const },
    { key: "budget_boss", name: "Budget Boss", description: "Stayed under budget for a full month", icon: "👑", xpReward: 250, rarity: "EPIC" as const },
    { key: "streak_100", name: "Centurion", description: "100-day activity streak", icon: "🦁", xpReward: 1000, rarity: "EPIC" as const },
    { key: "xp_10000", name: "Legendary Saver", description: "Earned 10,000 total XP", icon: "🌈", xpReward: 500, rarity: "LEGENDARY" as const },
  ];

  for (const b of badgeData) {
    await prisma.badge.upsert({
      where: { key: b.key },
      update: {},
      create: b,
    });
  }

  // Award some badges to demo user
  const streakBadge = await prisma.badge.findUnique({ where: { key: "streak_7" } });
  const savingsBadge = await prisma.badge.findUnique({ where: { key: "savings_starter" } });

  if (streakBadge) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: user.id, badgeId: streakBadge.id } },
      update: {},
      create: { userId: user.id, badgeId: streakBadge.id },
    });
  }
  if (savingsBadge) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: user.id, badgeId: savingsBadge.id } },
      update: {},
      create: { userId: user.id, badgeId: savingsBadge.id },
    });
  }

  console.log("Seed complete! Login with alex@example.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
