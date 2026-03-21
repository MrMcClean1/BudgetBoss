"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type BudgetPeriod = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  spent: number;
  periodStart: string;
  periodEnd: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface Props {
  budgets: Budget[];
  categories: Category[];
}

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const EMPTY_FORM = {
  name: "",
  amount: "",
  period: "MONTHLY" as BudgetPeriod,
  categoryId: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function ProgressBar({ spent, amount }: { spent: number; amount: number }) {
  const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  const isOver = spent > amount;
  const isWarning = !isOver && pct >= 80;

  let barColor = "bg-green-500";
  if (isOver) barColor = "bg-red-500";
  else if (isWarning) barColor = "bg-yellow-400";

  return (
    <div className="space-y-1">
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={isOver ? "text-red-600 font-semibold" : isWarning ? "text-yellow-600 font-medium" : "text-gray-500"}>
          {fmt(spent)} spent
        </span>
        <span className="text-gray-400">{fmt(amount)} limit</span>
      </div>
    </div>
  );
}

function StatusBadge({ spent, amount }: { spent: number; amount: number }) {
  if (amount <= 0) return null;
  const pct = (spent / amount) * 100;
  if (spent > amount) {
    return (
      <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        ⚠️ Over budget
      </span>
    );
  }
  if (pct >= 80) {
    return (
      <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
        ⚡ Approaching limit
      </span>
    );
  }
  return null;
}

export default function BudgetsClient({ budgets, categories }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showInactive, setShowInactive] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setForm({
      name: b.name,
      amount: String(b.amount),
      period: b.period,
      categoryId: b.categoryId ?? "",
      startDate: b.startDate.slice(0, 10),
      endDate: b.endDate ? b.endDate.slice(0, 10) : "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    setFormError("");
    if (!form.name.trim()) return setFormError("Budget name is required.");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return setFormError("Amount must be a positive number.");
    if (!form.startDate) return setFormError("Start date is required.");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        amount,
        period: form.period,
        categoryId: form.categoryId || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
      };

      const res = editing
        ? await fetch(`/api/budgets/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/budgets", {
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
      const res = await fetch(`/api/budgets/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setDeleteTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(b: Budget) {
    await fetch(`/api/budgets/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    startTransition(() => router.refresh());
  }

  const active = budgets.filter((b) => b.isActive);
  const inactive = budgets.filter((b) => !b.isActive);

  const overBudget = active.filter((b) => b.spent > b.amount);
  const approaching = active.filter((b) => b.spent <= b.amount && b.amount > 0 && (b.spent / b.amount) >= 0.8);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title + Add */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active.length} active budget{active.length !== 1 ? "s" : ""}
              {overBudget.length > 0 && (
                <span className="ml-2 text-red-500 font-medium">· {overBudget.length} over limit</span>
              )}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Budget
          </button>
        </div>

        {/* Alert banners */}
        {overBudget.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-red-700 mb-1">🚨 Over budget</p>
            <ul className="text-sm text-red-600 space-y-0.5">
              {overBudget.map((b) => (
                <li key={b.id}>
                  <span className="font-medium">{b.name}</span> — {fmt(b.spent)} of {fmt(b.amount)} ({b.period.toLowerCase()})
                </li>
              ))}
            </ul>
          </div>
        )}
        {approaching.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-yellow-700 mb-1">⚡ Approaching limit</p>
            <ul className="text-sm text-yellow-700 space-y-0.5">
              {approaching.map((b) => (
                <li key={b.id}>
                  <span className="font-medium">{b.name}</span> — {fmt(b.spent)} of {fmt(b.amount)} ({Math.round((b.spent / b.amount) * 100)}%)
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Active budgets */}
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold text-gray-700 mb-1">No budgets yet</p>
            <p className="text-sm text-gray-400 mb-4">Set a monthly spending limit by category to stay on track.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Create your first budget
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((b) => {
              const remaining = b.amount - b.spent;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {b.categoryIcon && <span className="text-xl flex-shrink-0">{b.categoryIcon}</span>}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                        <p className="text-xs text-gray-400">
                          {PERIOD_LABELS[b.period]}
                          {b.categoryName && ` · ${b.categoryName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => openEdit(b)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <ProgressBar spent={b.spent} amount={b.amount} />

                  <div className="flex items-center justify-between">
                    <StatusBadge spent={b.spent} amount={b.amount} />
                    <span className={`text-sm font-medium ml-auto ${remaining < 0 ? "text-red-600" : "text-gray-700"}`}>
                      {remaining < 0 ? `${fmt(Math.abs(remaining))} over` : `${fmt(remaining)} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inactive budgets toggle */}
        {inactive.length > 0 && (
          <div>
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {showInactive ? "▾" : "▸"} {inactive.length} inactive budget{inactive.length !== 1 ? "s" : ""}
            </button>
            {showInactive && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {inactive.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between opacity-60">
                    <div>
                      <p className="font-medium text-gray-700">{b.name}</p>
                      <p className="text-xs text-gray-400">{PERIOD_LABELS[b.period]} · {fmt(b.amount)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleActive(b)}
                        className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        Reactivate
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
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
                {editing ? "Edit Budget" : "Add Budget"}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limit Amount (USD)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as BudgetPeriod }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {(Object.keys(PERIOD_LABELS) as BudgetPeriod[]).map((p) => (
                    <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">All spending</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}
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
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Budget"}
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
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Delete Budget?</h2>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{deleteTarget.name}</span>
                {" · "}
                {fmt(deleteTarget.amount)} / {PERIOD_LABELS[deleteTarget.period]}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                This will permanently delete the budget. Your transactions are not affected.
              </p>
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
