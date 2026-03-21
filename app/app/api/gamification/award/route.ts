import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AwardSchema = z.object({
  xp: z.number().int().min(1).max(1000),
  reason: z.string().optional(),
});

// XP thresholds per level: level N requires N*500 XP total
function computeLevel(totalXp: number): number {
  let level = 1;
  let threshold = 500;
  while (totalXp >= threshold) {
    level++;
    threshold += level * 500;
  }
  return level;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { xp } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newXp = user.xp + xp;
  const newLevel = computeLevel(newXp);
  const leveledUp = newLevel > user.level;

  // Update streak: if lastActivityAt is yesterday or today, continue; otherwise reset
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  let streakDays = user.streakDays;
  if (user.lastActivityAt) {
    const lastDay = new Date(
      user.lastActivityAt.getFullYear(),
      user.lastActivityAt.getMonth(),
      user.lastActivityAt.getDate()
    );
    if (lastDay.getTime() === today.getTime()) {
      // Same day, no change to streak
    } else if (lastDay.getTime() === yesterday.getTime()) {
      // Consecutive day
      streakDays += 1;
    } else {
      // Streak broken
      streakDays = 1;
    }
  } else {
    streakDays = 1;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      level: newLevel,
      streakDays,
      lastActivityAt: now,
    },
    select: { xp: true, level: true, streakDays: true },
  });

  // Check and award badges
  const newBadges = await checkAndAwardBadges(userId, updated.xp, updated.level, updated.streakDays);

  return NextResponse.json({
    xp: updated.xp,
    level: updated.level,
    streakDays: updated.streakDays,
    xpGained: xp,
    leveledUp,
    newBadges,
  });
}

async function checkAndAwardBadges(userId: string, xp: number, level: number, streakDays: number) {
  const allBadges = await prisma.badge.findMany();
  const earnedBadgeIds = (await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  })).map((ub) => ub.badgeId);

  const toAward: string[] = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.includes(badge.id)) continue;

    let shouldAward = false;
    switch (badge.key) {
      case "first_xp": shouldAward = xp >= 1; break;
      case "level_5": shouldAward = level >= 5; break;
      case "level_10": shouldAward = level >= 10; break;
      case "streak_7": shouldAward = streakDays >= 7; break;
      case "streak_30": shouldAward = streakDays >= 30; break;
      case "streak_100": shouldAward = streakDays >= 100; break;
      case "xp_1000": shouldAward = xp >= 1000; break;
      case "xp_5000": shouldAward = xp >= 5000; break;
      case "xp_10000": shouldAward = xp >= 10000; break;
    }

    if (shouldAward) toAward.push(badge.id);
  }

  if (toAward.length > 0) {
    await prisma.userBadge.createMany({
      data: toAward.map((badgeId) => ({ userId, badgeId })),
      skipDuplicates: true,
    });
  }

  const awarded = allBadges.filter((b) => toAward.includes(b.id));
  return awarded.map((b) => ({ key: b.key, name: b.name, icon: b.icon, xpReward: b.xpReward }));
}
