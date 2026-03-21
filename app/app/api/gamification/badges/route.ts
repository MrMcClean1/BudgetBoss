import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [allBadges, userBadges, user] = await Promise.all([
    prisma.badge.findMany({ orderBy: { rarity: "asc" } }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streakDays: true },
    }),
  ]);

  const earnedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

  return NextResponse.json({
    user,
    badges: allBadges.map((b) => ({
      id: b.id,
      key: b.key,
      name: b.name,
      description: b.description,
      icon: b.icon,
      rarity: b.rarity,
      xpReward: b.xpReward,
      earned: earnedMap.has(b.id),
      earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
    })),
  });
}
