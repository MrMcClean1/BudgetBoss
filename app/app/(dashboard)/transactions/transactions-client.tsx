"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  notes: string | null;
  isReviewed: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface BankAccount {
  id: string;
  name: string;
  type: string;
}

interface Props {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
  categories: Category[];
  bankAccounts: BankAccount[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  amount: "",
  type: "EXPENSE" as "INCOME" | "EXPENSE" | "TRANSFER",
  categoryId: "",
  bankAccountId: "",
  notes: "",
};

export default function TransactionsClient({
  transactions,
  total,
  page,
  totalPages,
  categories,
  bankAccounts,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter state (local, applied on submit)
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      // Reset to page 1 when filters change (but not when paginating)
      if (!("page" in updates)) params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setForm({
      date: t.date.split("T")[0],
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      categoryId: t.categoryId ?? "",
      bankAccountId: t.bankAccountId ?? "",
      notes: t.notes ?? "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    setFormError("");
    const amount = parseFloat(form.amount);
    if (!form.date) return setFormError("Date is required.");
    if (!form.description.trim()) return setFormError("Description is required.");
    if (isNaN(amount) || amount <= 0) return setFormError("Amount must be a positive number.");

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        description: form.description.trim(),
        amount,
        type: form.type,
        categoryId: form.categoryId || null,
        bankAccountId: form.bankAccountId || null,
        notes: form.notes.trim() || null,
      };

      const res = editing
        ? await fetch(`/api/transactions/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/transactions", {
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
      const res = await fetch(`/api/transactions/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setDeleteTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  }

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategory = searchParams.get("categoryId") ?? "";
  const currentAccount = searchParams.get("bankAccountId") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title + Add button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Transaction
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex gap-2 flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search descriptions..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateParams({ search: searchInput });
                }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={() => updateParams({ search: searchInput })}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                🔍
              </button>
            </div>

            {/* Type filter */}
            <select
              value={currentType}
              onChange={(e) => updateParams({ type: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={currentCategory}
                onChange={(e) => updateParams({ categoryId: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Account filter */}
            {bankAccounts.length > 0 && (
              <select
                value={currentAccount}
                onChange={(e) => updateParams({ bankAccountId: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">All Accounts</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            {/* Date range */}
            <input
              type="date"
              value={currentDateFrom}
              onChange={(e) => updateParams({ dateFrom: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="date"
              value={currentDateTo}
              onChange={(e) => updateParams({ dateTo: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />

            {/* Clear filters */}
            {(currentSearch || currentCategory || currentAccount || currentType || currentDateFrom || currentDateTo) && (
              <button
                onClick={() => {
                  setSearchInput("");
                  updateParams({ search: null, categoryId: null, bankAccountId: null, type: null, dateFrom: null, dateTo: null });
                }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Transaction list */}
        <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden transition-opacity ${isPending ? "opacity-60" : ""}`}>
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-semibold text-gray-700 mb-1">No transactions found</p>
              <p className="text-sm text-gray-400 mb-4">
                {total === 0
                  ? "Import a CSV from your bank or add a transaction manually to get started."
                  : "Try clearing or adjusting your filters."}
              </p>
              {total === 0 && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  + Add first transaction
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Description</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Account</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <span className="font-medium text-gray-800 truncate block">{t.description}</span>
                      {t.notes && <span className="text-xs text-gray-400 truncate block">{t.notes}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {t.categoryName ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: t.categoryColor ? `${t.categoryColor}20` : "#f3f4f6" }}>
                          {t.categoryIcon && <span>{t.categoryIcon}</span>}
                          <span className="text-gray-600">{t.categoryName}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {t.bankAccountName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        t.type === "INCOME"
                          ? "bg-green-100 text-green-700"
                          : t.type === "EXPENSE"
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {t.type.charAt(0) + t.type.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                      t.type === "INCOME" ? "text-green-600" : t.type === "EXPENSE" ? "text-red-500" : "text-blue-600"
                    }`}>
                      {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                      {fmt(t.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = page <= 4 ? i + 1 : page - 3 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => updateParams({ page: String(p) })}
                    className={`px-3 py-1.5 rounded-lg border transition-colors ${
                      p === page
                        ? "border-green-400 bg-green-50 text-green-700 font-medium"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg">
                {editing ? "Edit Transaction" : "Add Transaction"}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Grocery store"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Amount + Type */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "INCOME" | "EXPENSE" | "TRANSFER" }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account */}
              {bankAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <select
                    value={form.bankAccountId}
                    onChange={(e) => setForm((f) => ({ ...f, bankAccountId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">No account</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
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
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Transaction"}
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
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Delete Transaction?</h2>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{deleteTarget.description}</span>
                {" · "}
                {fmt(deleteTarget.amount)}
                {" · "}
                {new Date(deleteTarget.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-400 mt-2">This action cannot be undone.</p>
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
