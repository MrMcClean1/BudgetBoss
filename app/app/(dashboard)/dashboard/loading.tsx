export default function DashboardLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-pulse">
      {/* Gamification bar skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex gap-6 items-center">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-2.5 bg-gray-200 rounded-full" />
        </div>
        <div className="w-28 h-12 bg-gray-100 rounded-xl" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-28" />
            <div className="h-7 bg-gray-200 rounded w-36" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart skeleton */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-40 bg-gray-100 rounded-lg" />
          </div>
          {/* Transactions skeleton */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-48" />
                    <div className="h-2.5 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="h-4 bg-gray-200 rounded w-28 mb-4" />
              <div className="space-y-3">
                {[0, 1].map((j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-2 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
