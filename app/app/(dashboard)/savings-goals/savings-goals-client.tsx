"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  createdAt: string;
}

interface Props {
  goals: SavingsGoal[];
}

const ICON_OPTIONS = ["🎯", "🏠", "✈️", "🚗", "💻", "📚", "🏖️", "💍", "🏋️", "🎓", "🛍️", "💊", "🐾", "🌱"];
const COLOR_OPTIONS = [
  "#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const EMPTY_FORM = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  targetDate: "",
  icon: "🎯",
  color: "#22c55e",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function ProgressRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export default function SavingsGoalsClient({ goals }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [depositTarget, setDepositTarget] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositError, setDepositError] = useState("");
  const [depositing, setDepositing] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditing(g);
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      targetDate: g.targetDate ? g.targetDate.slice(0, 10) : "",
      icon: g.icon ?? "🎯",
      color: g.color ?? "#22c55e",
    });
    setFormError("");
    setShowForm(true);
  }

  function openDeposit(g: SavingsGoal) {
    setDepositTarget(g);
    setDepositAmount("");
    setDepositError("");
  }

  async function handleSave() {
    setFormError("");
    if (!form.name.trim()) return setFormError("Goal name is required.");
    const target = parseFloat(form.targetAmount);
    if (isNaN(target) || target <= 0) return setFormError("Target amount must be positive.");
    const current = form.currentAmount ? parseFloat(form.currentAmount) : 0;
    if (isNaN(current) || current < 0) return setFormError("Current amount cannot be negative.");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: form.targetDate || null,
        icon: form.icon || null,
        color: form.color || null,
      };

      const res = editing
        ? await fetch(`/api/savings-goals/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/savings-goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error ?? "Save failed");
        return;
      }

      setShowForm(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/savings-goals/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeposit() {
    if (!depositTarget) return;
    setDepositError("");
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Enter a positive amount.");
      return;
    }

    setDepositing(true);
    try {
      const newAmount = depositTarget.currentAmount + amount;
      const isCompleted = newAmount >= depositTarget.targetAmount;

      const res = await fetch(`/api/savings-goals/${depositTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: newAmount, isCompleted }),
      });

      if (!res.ok) {
        setDepositError("Failed to update goal.");
        return;
      }

      setDepositTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setDepositing(false);
    }
  }

  async function handleToggleComplete(g: SavingsGoal) {
    await fetch(`/api/savings-goals/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !g.isCompleted }),
    });
    startTransition(() => router.refresh());
  }

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = active.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title + Add */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active.length} active goal{active.length !== 1 ? "s" : ""}
              {completed.length > 0 && <span className="ml-2 text-green-600">· {completed.length} completed 🎉</span>}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Goal
          </button>
        </div>

        {/* Summary banner */}
        {active.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Saved</p>
              <p className="text-2xl font-bold text-green-600">{fmt(totalSaved)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Target</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalTarget)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overall Progress</p>
              <p className="text-2xl font-bold text-gray-700">
                {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Active goals */}
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-semibold text-gray-700 mb-1">No savings goals yet</p>
            <p className="text-sm text-gray-400 mb-4">Set a target — vacation, emergency fund, new laptop — and track progress.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Create your first goal
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
              const remaining = g.targetAmount - g.currentAmount;
              const daysLeft = g.targetDate
                ? Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000)
                : null;

              return (
                <div key={g.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <ProgressRing pct={pct} color={g.color ?? "#22c55e"} size={72} />
                        <span className="absolute inset-0 flex items-center justify-center text-xl rotate-90">
                          {g.icon ?? "🎯"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{Math.round(pct)}% complete</p>
                        {daysLeft !== null && (
                          <p className={`text-xs mt-0.5 ${daysLeft < 0 ? "text-red-500" : daysLeft < 30 ? "text-yellow-600" : "text-gray-400"}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(g)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(g)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: g.color ?? "#22c55e" }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{fmt(g.currentAmount)} saved</span>
                      <span>{fmt(remaining)} to go</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{fmt(g.targetAmount)}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleComplete(g)}
                        className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        Mark done
                      </button>
                      <button
                        onClick={() => openDeposit(g)}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1 rounded-lg transition-colors"
                      >
                        + Deposit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed goals */}
        {completed.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {showCompleted ? "▾" : "▸"} {completed.length} completed goal{completed.length !== 1 ? "s" : ""}
            </button>
            {showCompleted && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {completed.map((g) => (
                  <div key={g.id} className="bg-white rounded-2xl border border-green-100 p-4 flex items-center justify-between opacity-75">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.icon ?? "✅"}</span>
                      <div>
                        <p className="font-medium text-gray-700">{g.name}</p>
                        <p className="text-xs text-green-600 font-medium">✅ {fmt(g.currentAmount)} saved</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleComplete(g)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                      >
                        Reopen
                      </button>
                      <button
                        onClick={() => setDeleteTarget(g)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg">
                {editing ? "Edit Goal" : "New Savings Goal"}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (USD)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 10000"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Current Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Already Saved (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.currentAmount}
                  onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Date (optional)</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-colors ${
                        form.icon === icon ? "border-green-400 bg-green-50" : "border-transparent hover:bg-gray-100"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        form.color === color ? "border-gray-800 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg">
                {depositTarget.icon} Deposit to {depositTarget.name}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Current: <span className="font-medium text-gray-700">{fmt(depositTarget.currentAmount)}</span>
                  {" "}→ Target: <span className="font-medium text-gray-700">{fmt(depositTarget.targetAmount)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Deposit (USD)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
              </div>
              {depositError && <p className="text-sm text-red-500">{depositError}</p>}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setDepositTarget(null)}
                disabled={depositing}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={depositing}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {depositing ? "Saving..." : "Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Delete Goal?</h2>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{deleteTarget.name}</span>
                {" · "}{fmt(deleteTarget.targetAmount)} target
              </p>
              <p className="text-sm text-gray-400 mt-2">This will permanently delete the goal.</p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
