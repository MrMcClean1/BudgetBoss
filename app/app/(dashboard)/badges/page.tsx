import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BadgesClient from "./badges-client";

export default async function BadgesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  if (!user) redirect("/login");

  const earnedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

  return (
    <BadgesClient
      userStats={{ xp: user.xp, level: user.level, streakDays: user.streakDays }}
      badges={allBadges.map((b) => ({
        id: b.id,
        key: b.key,
        name: b.name,
        description: b.description,
        icon: b.icon,
        rarity: b.rarity,
        xpReward: b.xpReward,
        earned: earnedMap.has(b.id),
        earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
      }))}
    />
  );
}
