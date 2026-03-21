export default function BudgetsLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-24" />
        <div className="h-9 bg-gray-200 rounded-lg w-28" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-20" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 bg-gray-200 rounded-full" />
              <div className="flex justify-between">
                <div className="h-3 bg-gray-100 rounded w-20" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
