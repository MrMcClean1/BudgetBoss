"use client";

import { useState, useRef, useMemo } from "react";

interface DashboardProps {
  user: { id: string; name: string | null; xp: number; level: number; streakDays: number };
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string;
    categoryName: string | null;
    categoryIcon: string | null;
    categoryColor: string | null;
  }>;
  spendingByCategory: Array<{
    name: string;
    icon: string | null;
    color: string | null;
    amount: number;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    amount: number;
    categoryName: string | null;
    categoryIcon: string | null;
    spent: number;
  }>;
  savingsGoals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    icon: string | null;
    color: string | null;
    targetDate: string | null;
  }>;
  recentImports: Array<{
    id: string;
    fileName: string;
    rowsImported: number;
    rowsErrored: number;
    status: string;
    createdAt: string;
  }>;
  monthlyTrend: Array<{ label: string; income: number; expenses: number }>;
  recentBadges: Array<{
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    earnedAt: string;
  }>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function xpForLevel(level: number) {
  return level * 500;
}

const RARITY_COLORS: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#22c55e",
  RARE: "#3b82f6",
  EPIC: "#8b5cf6",
  LEGENDARY: "#f59e0b",
};

// SVG bar chart for monthly income vs expenses
function MonthlyBarChart({ data }: { data: Array<{ label: string; income: number; expenses: number }> }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);
  const W = 480;
  const H = 160;
  const PAD = { top: 10, bottom: 24, left: 8, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const groupW = chartW / n;
  const barW = Math.max(8, groupW * 0.28);
  const gap = barW * 0.6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD.top + chartH * (1 - f);
        return (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
            stroke="#f3f4f6" strokeWidth={1} />
        );
      })}

      {data.map((d, i) => {
        const cx = PAD.left + groupW * i + groupW / 2;
        const incomeH = (d.income / max) * chartH;
        const expH = (d.expenses / max) * chartH;
        const incomeY = PAD.top + chartH - incomeH;
        const expY = PAD.top + chartH - expH;
        const ix = cx - gap / 2 - barW;
        const ex = cx + gap / 2;

        return (
          <g key={i}>
            {/* Income bar */}
            <rect x={ix} y={incomeY} width={barW} height={Math.max(incomeH, 1)}
              rx={3} fill="#22c55e" opacity={0.85} />
            {/* Expense bar */}
            <rect x={ex} y={expY} width={barW} height={Math.max(expH, 1)}
              rx={3} fill="#ef4444" opacity={0.75} />
            {/* Label */}
            <text x={cx} y={H - 4} textAnchor="middle" fontSize={10} fill="#9ca3af">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// SVG donut chart for spending by category
function DonutChart({ data, total }: { data: Array<{ name: string; color: string | null; amount: number }>; total: number }) {
  const SIZE = 120;
  const R = 46;
  const INNER = 30;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const slices = useMemo(() => {
    return data.slice(0, 6).reduce<Array<(typeof data)[0] & { startAngle: number; endAngle: number; frac: number }>>(
      (acc, d) => {
        const prevEnd = acc.length > 0 ? acc[acc.length - 1].endAngle : -Math.PI / 2;
        const frac = total > 0 ? d.amount / total : 0;
        return [...acc, { ...d, startAngle: prevEnd, endAngle: prevEnd + frac * 2 * Math.PI, frac }];
      },
      []
    );
  }, [data, total]);

  function arcPath(start: number, end: number, r: number, innerR: number) {
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(end);
    const iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(start);
    const iy2 = cy + innerR * Math.sin(start);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
  }

  if (slices.length === 0) {
    return (
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <circle cx={cx} cy={cy} r={R} fill="#f3f4f6" />
        <circle cx={cx} cy={cy} r={INNER} fill="white" />
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
      {slices.map((s, i) => (
        <path
          key={i}
          d={arcPath(s.startAngle, s.endAngle, R, INNER)}
          fill={s.color ?? "#22c55e"}
          opacity={0.9}
        />
      ))}
      <circle cx={cx} cy={cy} r={INNER} fill="white" />
    </svg>
  );
}

export default function DashboardClient(props: DashboardProps) {
  const {
    user, monthlyIncome, monthlyExpenses,
    recentTransactions, spendingByCategory, budgets,
    savingsGoals, recentImports, monthlyTrend, recentBadges,
  } = props;

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ rowsImported: number; rowsErrored: number } | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const netSavings = monthlyIncome - monthlyExpenses;
  const xpForNextLevel = xpForLevel(user.level);
  const xpProgress = Math.min((user.xp % xpForNextLevel) / xpForNextLevel * 100, 100);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError("");
    setImportResult(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/transactions/import", { method: "POST", body: fd });
    setImporting(false);

    if (!res.ok) {
      const d = await res.json();
      setImportError(d.error || "Import failed");
    } else {
      const d = await res.json();
      setImportResult(d);
      setTimeout(() => window.location.reload(), 1500);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Gamification Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Level</p>
              <p className="text-2xl font-bold text-gray-900">{user.level}</p>
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{user.xp % xpForNextLevel} XP</span>
              <span>{xpForNextLevel} XP to next level</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-xs text-gray-500">Streak</p>
              <p className="font-bold text-orange-600">{user.streakDays} days</p>
            </div>
          </div>
          {recentBadges.length > 0 && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 mr-1">Badges:</p>
              {recentBadges.slice(0, 4).map((b) => (
                <span
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  className="text-xl"
                  style={{ filter: `drop-shadow(0 0 3px ${RARITY_COLORS[b.rarity] ?? "#9ca3af"})` }}
                >
                  {b.icon}
                </span>
              ))}
              {recentBadges.length > 4 && (
                <span className="text-xs text-gray-400">+{recentBadges.length - 4} more</span>
              )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Monthly Income</p>
            <p className="text-2xl font-bold text-green-600">{fmt(monthlyIncome)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Monthly Expenses</p>
            <p className="text-2xl font-bold text-red-500">{fmt(monthlyExpenses)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Net Savings</p>
            <p className={`text-2xl font-bold ${netSavings >= 0 ? "text-green-600" : "text-red-500"}`}>
              {fmt(netSavings)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">6-Month Trend</h2>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
                    Income
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
                    Expenses
                  </span>
                </div>
              </div>
              <MonthlyBarChart data={monthlyTrend} />
            </div>

            {/* Spending by Category with Donut */}
            {spendingByCategory.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Spending This Month</h2>
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0">
                    <DonutChart data={spendingByCategory} total={monthlyExpenses} />
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    {spendingByCategory.map((cat) => {
                      const pct = monthlyExpenses > 0 ? (cat.amount / monthlyExpenses) * 100 : 0;
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5 truncate">
                              {cat.icon && <span>{cat.icon}</span>}
                              <span className="text-gray-700 truncate">{cat.name}</span>
                            </span>
                            <span className="font-medium text-gray-900 flex-shrink-0 ml-2">{fmt(cat.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: cat.color ?? "#22c55e",
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
                <a href="/transactions" className="text-sm text-green-600 hover:text-green-700 font-medium">View all →</a>
              </div>
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-3xl mb-2">📂</p>
                  <p className="text-gray-700 font-medium text-sm mb-1">No transactions yet</p>
                  <p className="text-gray-400 text-xs">Use the &quot;Import Transactions&quot; panel to upload a CSV from your bank, or add one manually on the <a href="/transactions" className="text-green-600 hover:underline">Transactions</a> page.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: t.categoryColor ? `${t.categoryColor}20` : "#f3f4f6" }}
                        >
                          {t.categoryIcon ?? "💳"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 truncate max-w-48">{t.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(t.date).toLocaleDateString()} · {t.categoryName ?? "Uncategorized"}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                        {t.type === "INCOME" ? "+" : "-"}{fmt(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Import */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Import Transactions</h2>
              <p className="text-xs text-gray-500 mb-3">
                Upload bank statements in CSV, OFX/QFX, or JSON format.
              </p>
              <a
                href="/import"
                className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 hover:border-green-400 text-gray-500 hover:text-green-600 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                📂 Import transactions
              </a>
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {["CSV", "OFX", "QFX", "JSON"].map((f) => (
                  <span key={f} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{f}</span>
                ))}
              </div>
              {recentImports.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Imports</p>
                  {recentImports.map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-xs text-gray-600">
                      <span className="truncate max-w-32">{i.fileName}</span>
                      <span className={i.status === "COMPLETED" ? "text-green-600" : "text-gray-400"}>
                        {i.rowsImported} rows
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budgets */}
            {budgets.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Budgets</h2>
                  <a href="/budgets" className="text-xs text-green-600 hover:text-green-700">Manage →</a>
                </div>
                <div className="space-y-4">
                  {budgets.map((b) => {
                    const pct = Math.min((b.spent / b.amount) * 100, 100);
                    const over = b.spent > b.amount;
                    return (
                      <div key={b.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            {b.categoryIcon && <span>{b.categoryIcon}</span>}
                            <span className="text-gray-700">{b.name}</span>
                          </span>
                          <span className={`font-medium ${over ? "text-red-500" : "text-gray-600"}`}>
                            {fmt(b.spent)} / {fmt(b.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${over ? "bg-red-400" : "bg-green-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Savings Goals */}
            {savingsGoals.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Savings Goals</h2>
                  <a href="/savings-goals" className="text-xs text-green-600 hover:text-green-700">Manage →</a>
                </div>
                <div className="space-y-4">
                  {savingsGoals.map((g) => {
                    const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                    return (
                      <div key={g.id}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            {g.icon && <span>{g.icon}</span>}
                            {g.name}
                          </span>
                          <span className="text-xs text-gray-500">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: g.color ?? "#22c55e" }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                          <span>{fmt(g.currentAmount)}</span>
                          <span>{fmt(g.targetAmount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
    </main>
  );
}
