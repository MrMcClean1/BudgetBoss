"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "INVESTMENT";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  transactionCount: number;
  createdAt: string;
}

interface Props {
  accounts: Account[];
}

const TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT_CARD: "Credit Card",
  CASH: "Cash",
  INVESTMENT: "Investment",
};

const TYPE_ICONS: Record<AccountType, string> = {
  CHECKING: "🏦",
  SAVINGS: "🐷",
  CREDIT_CARD: "💳",
  CASH: "💵",
  INVESTMENT: "📈",
};

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

const EMPTY_FORM = {
  name: "",
  type: "CHECKING" as AccountType,
  currency: "USD",
};

export default function AccountsClient({ accounts }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Account | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setForm({ name: a.name, type: a.type, currency: a.currency });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    setFormError("");
    if (!form.name.trim()) return setFormError("Account name is required.");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        currency: form.currency,
      };

      const res = editing
        ? await fetch(`/api/accounts/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/accounts", {
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

  async function handleToggleActive(account: Account) {
    if (account.isActive) {
      setDeactivateTarget(account);
    } else {
      await patchActive(account.id, true);
    }
  }

  async function patchActive(id: string, isActive: boolean) {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) return;
      setDeactivateTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setDeactivating(false);
    }
  }

  const active = accounts.filter((a) => a.isActive);
  const inactive = accounts.filter((a) => !a.isActive);
  const totalBalance = active.reduce((sum, a) => sum + a.balance, 0);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title + Add button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active.length} active · Total balance: {fmt(totalBalance)}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Account
          </button>
        </div>

        {/* Active accounts */}
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-3">🏦</p>
            <p className="font-semibold text-gray-700 mb-1">No accounts yet</p>
            <p className="text-sm text-gray-400 mb-4">Add a bank account to track balances and link transactions.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add your first account
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TYPE_ICONS[a.type]}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{TYPE_LABELS[a.type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(a)}
                      className="text-xs text-orange-400 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
                <div className="border-t border-gray-50 pt-3 flex items-end justify-between">
                  <span className={`text-xl font-bold ${a.balance < 0 ? "text-red-500" : "text-gray-900"}`}>
                    {fmt(a.balance, a.currency)}
                  </span>
                  <span className="text-xs text-gray-400">{a.transactionCount} transactions</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inactive accounts */}
        {inactive.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Inactive</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {inactive.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{TYPE_ICONS[a.type]}</span>
                    <div>
                      <p className="font-medium text-gray-700">{a.name}</p>
                      <p className="text-xs text-gray-400">{TYPE_LABELS[a.type]} · {fmt(a.balance, a.currency)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(a)}
                    className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                  >
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg">
                {editing ? "Edit Account" : "Add Account"}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chase Checking"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="JPY">JPY — Japanese Yen</option>
                </select>
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
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Deactivate Account?</h2>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{deactivateTarget.name}</span>
                {" · "}
                {fmt(deactivateTarget.balance, deactivateTarget.currency)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                This account will be hidden from transaction forms. Existing transactions are preserved.
              </p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setDeactivateTarget(null)}
                disabled={deactivating}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => patchActive(deactivateTarget.id, false)}
                disabled={deactivating}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {deactivating ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
