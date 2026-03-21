"use client";

interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  xpReward: number;
  earned: boolean;
  earnedAt: string | null;
}

interface Props {
  userStats: { xp: number; level: number; streakDays: number };
  badges: Badge[];
}

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
};

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#22c55e",
  RARE: "#3b82f6",
  EPIC: "#8b5cf6",
  LEGENDARY: "#f59e0b",
};

const RARITY_BG: Record<string, string> = {
  COMMON: "bg-gray-50 border-gray-200",
  UNCOMMON: "bg-green-50 border-green-200",
  RARE: "bg-blue-50 border-blue-200",
  EPIC: "bg-purple-50 border-purple-200",
  LEGENDARY: "bg-amber-50 border-amber-200",
};

const RARITY_ORDER = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];

function xpForLevel(level: number) {
  return level * 500;
}

export default function BadgesClient({ userStats, badges }: Props) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  const xpForNextLevel = xpForLevel(userStats.level);
  const xpProgress = Math.min((userStats.xp % xpForNextLevel) / xpForNextLevel * 100, 100);

  const byRarity = RARITY_ORDER.map((r) => ({
    rarity: r,
    badges: badges.filter((b) => b.rarity === r),
  })).filter((g) => g.badges.length > 0);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-wrap gap-8 items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-3xl">🏆</div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Level</p>
              <p className="text-3xl font-bold text-gray-900">{userStats.level}</p>
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{userStats.xp % xpForNextLevel} XP</span>
              <span>{xpForNextLevel} XP to level {userStats.level + 1}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Total XP: {userStats.xp.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 bg-orange-50 rounded-xl">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-xs text-gray-500">Current Streak</p>
              <p className="text-xl font-bold text-orange-600">{userStats.streakDays} days</p>
            </div>
          </div>
          <div className="px-5 py-3 bg-green-50 rounded-xl text-center">
            <p className="text-xs text-gray-500">Badges Earned</p>
            <p className="text-xl font-bold text-green-700">{earned.length} / {badges.length}</p>
          </div>
        </div>

        {/* Earned badges */}
        {earned.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Badges ({earned.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {earned.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 flex flex-col items-center gap-2 text-center ${RARITY_BG[b.rarity] ?? "bg-white border-gray-200"}`}
                >
                  <span
                    className="text-4xl"
                    style={{ filter: `drop-shadow(0 0 6px ${RARITY_COLOR[b.rarity] ?? "#9ca3af"})` }}
                  >
                    {b.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.description}</p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: RARITY_COLOR[b.rarity] ?? "#9ca3af",
                      backgroundColor: `${RARITY_COLOR[b.rarity] ?? "#9ca3af"}18`,
                    }}
                  >
                    {RARITY_LABEL[b.rarity]}
                  </span>
                  {b.xpReward > 0 && (
                    <span className="text-xs text-green-600">+{b.xpReward} XP</span>
                  )}
                  {b.earnedAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(b.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All badges by rarity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Badges</h2>
          <div className="space-y-6">
            {byRarity.map(({ rarity, badges: rarityBadges }) => (
              <div key={rarity}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: RARITY_COLOR[rarity] ?? "#9ca3af" }}
                  />
                  <h3 className="text-sm font-medium text-gray-700">{RARITY_LABEL[rarity]}</h3>
                  <span className="text-xs text-gray-400">
                    ({rarityBadges.filter((b) => b.earned).length}/{rarityBadges.length} earned)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {rarityBadges.map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all ${
                        b.earned
                          ? `${RARITY_BG[b.rarity] ?? "bg-white border-gray-200"}`
                          : "bg-gray-50 border-gray-100 opacity-50 grayscale"
                      }`}
                    >
                      <span className="text-3xl">{b.icon}</span>
                      <p className="text-xs font-medium text-gray-800">{b.name}</p>
                      <p className="text-xs text-gray-400 leading-tight">{b.description}</p>
                      {b.xpReward > 0 && (
                        <span className="text-xs text-green-600">+{b.xpReward} XP</span>
                      )}
                      {!b.earned && (
                        <span className="text-xs text-gray-400">🔒 Locked</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {locked.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🎊</p>
            <p className="font-semibold text-amber-800">You&apos;ve earned all badges!</p>
            <p className="text-sm text-amber-600 mt-1">Incredible achievement — you&apos;re a true BudgetBoss!</p>
          </div>
        )}

    </main>
  );
}
