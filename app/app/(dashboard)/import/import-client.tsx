"use client";

import { useState, useRef, useCallback } from "react";

type ImportFormat = "csv" | "ofx" | "json";
type Step = "select" | "preview" | "done";

interface PreviewRow {
  rowNum: number;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category?: string;
  notes?: string;
}

interface PreviewResult {
  format: ImportFormat;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: PreviewRow[];
  sampleErrors: { row: number; error: string }[];
}

interface ImportResult {
  importId: string;
  format: ImportFormat;
  rowsTotal: number;
  rowsImported: number;
  rowsErrored: number;
  errors: { row: number; error: string }[];
}

const FORMAT_INFO: Record<ImportFormat, { label: string; icon: string; desc: string }> = {
  csv: { label: "CSV", icon: "📊", desc: "Comma-separated values — exported from most banks, Rocket Money, Mint" },
  ofx: { label: "OFX / QFX", icon: "🏦", desc: "Open Financial Exchange — exported from Quicken, Bank of America, Chase, Wells Fargo" },
  json: { label: "JSON", icon: "📋", desc: "JSON format — BudgetBoss exports or custom data files" },
};

const ACCEPTED = ".csv,.ofx,.qfx,.json";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function FormatBadge({ format }: { format: ImportFormat }) {
  const info = FORMAT_INFO[format];
  return (
    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
      {info.icon} {info.label}
    </span>
  );
}

export default function ImportClient() {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("select");
    setFile(null);
    setPreviewResult(null);
    setImportResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError("");
    setPreviewing(true);

    const fd = new FormData();
    fd.append("file", f);

    try {
      const res = await fetch("/api/transactions/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Preview failed");
        setPreviewing(false);
        return;
      }
      setPreviewResult(data);
      setStep("preview");
    } catch {
      setError("Failed to preview file. Please try again.");
    } finally {
      setPreviewing(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/transactions/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        setImporting(false);
        return;
      }
      setImportResult(data);
      setStep("done");
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <a href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</a>
          <span>/</span>
          <span className="text-gray-700 font-medium">Import Transactions</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Import Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload your bank statement or export file to add transactions in bulk.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(["select", "preview", "done"] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = { select: "Select file", preview: "Review", done: "Complete" };
          const isActive = step === s;
          const isDone = (step === "preview" && s === "select") || step === "done";
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone || isActive ? "bg-green-400" : "bg-gray-200"}`} />}
              <div className={`flex items-center gap-1.5 text-sm font-medium ${isActive ? "text-green-700" : isDone ? "text-green-600" : "text-gray-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-green-600 text-white" : isDone ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {isDone ? "✓" : i + 1}
                </span>
                {labels[s]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Select */}
      {step === "select" && (
        <div className="space-y-6">
          {/* Supported formats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Supported formats</h2>
            <div className="space-y-3">
              {(Object.entries(FORMAT_INFO) as [ImportFormat, typeof FORMAT_INFO[ImportFormat]][]).map(([fmt, info]) => (
                <div key={fmt} className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{info.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{info.label}</p>
                    <p className="text-xs text-gray-500">{info.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-colors ${
              dragging ? "border-green-400 bg-green-50" : "border-gray-300 bg-white hover:border-green-300 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">{previewing ? "⏳" : "📂"}</p>
              <p className="font-semibold text-gray-700 mb-1">
                {previewing ? "Analyzing file…" : "Drop your file here"}
              </p>
              {!previewing && (
                <>
                  <p className="text-sm text-gray-400 mb-4">CSV, OFX, QFX, or JSON — up to 10 MB</p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Browse files
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              ❌ {error}
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">💡 Tips</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Export your statement from your bank's website under "Download" or "Export"</li>
              <li>• CSV files should have columns: Date, Description, Amount (or Debit/Credit)</li>
              <li>• OFX/QFX files are supported from most major US banks and Quicken</li>
              <li>• You'll see a preview of your transactions before they're imported</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && previewResult && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Import preview</h2>
              <FormatBadge format={previewResult.format} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700 truncate max-w-xs">{file?.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{previewResult.totalRows}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total rows</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{previewResult.validRows}</p>
                <p className="text-xs text-green-600 mt-0.5">Will import</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${previewResult.errorRows > 0 ? "bg-yellow-50" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold ${previewResult.errorRows > 0 ? "text-yellow-700" : "text-gray-400"}`}>
                  {previewResult.errorRows}
                </p>
                <p className={`text-xs mt-0.5 ${previewResult.errorRows > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                  Skipped
                </p>
              </div>
            </div>
          </div>

          {/* Sample errors */}
          {previewResult.sampleErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Some rows will be skipped</p>
              <ul className="space-y-1">
                {previewResult.sampleErrors.map((e, i) => (
                  <li key={i} className="text-xs text-yellow-700">
                    Row {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview table */}
          {previewResult.preview.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">
                  Showing first {previewResult.preview.length} transactions
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {previewResult.preview.map((row) => (
                      <tr key={row.rowNum} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-3 text-gray-800 max-w-48 truncate">{row.description}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{row.category ?? "—"}</td>
                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${row.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                          {row.type === "INCOME" ? "+" : "-"}{fmt(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              ❌ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={reset}
              className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              ← Choose different file
            </button>
            <button
              onClick={handleImport}
              disabled={importing || previewResult.validRows === 0}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {importing ? "⏳ Importing…" : `Import ${previewResult.validRows} transactions`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && importResult && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Import complete!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Successfully imported {importResult.rowsImported} transactions.
            </p>
            <div className="flex gap-3 justify-center text-center mb-6">
              <div className="bg-green-50 rounded-xl px-5 py-3">
                <p className="text-2xl font-bold text-green-700">{importResult.rowsImported}</p>
                <p className="text-xs text-green-600">Imported</p>
              </div>
              {importResult.rowsErrored > 0 && (
                <div className="bg-yellow-50 rounded-xl px-5 py-3">
                  <p className="text-2xl font-bold text-yellow-700">{importResult.rowsErrored}</p>
                  <p className="text-xs text-yellow-600">Skipped</p>
                </div>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left mb-5">
                <p className="text-sm font-medium text-yellow-800 mb-2">Skipped rows:</p>
                <ul className="space-y-1">
                  {importResult.errors.slice(0, 10).map((e, i) => (
                    <li key={i} className="text-xs text-yellow-700">Row {e.row}: {e.error}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li className="text-xs text-yellow-500">…and {importResult.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Import another file
              </button>
              <a
                href="/transactions"
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                View transactions →
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
