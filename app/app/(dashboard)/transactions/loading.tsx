export default function TransactionsLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 bg-gray-200 rounded w-36" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-32" />
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-3">
        <div className="h-9 bg-gray-100 rounded-lg flex-1" />
        <div className="h-9 bg-gray-100 rounded-lg w-28" />
        <div className="h-9 bg-gray-100 rounded-lg w-28" />
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-48" />
              <div className="h-2.5 bg-gray-100 rounded w-28" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    </main>
  );
}
