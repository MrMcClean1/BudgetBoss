"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", shortcut: "g d" },
  { href: "/accounts", label: "Accounts", shortcut: "g a" },
  { href: "/transactions", label: "Transactions", shortcut: "g t" },
  { href: "/budgets", label: "Budgets", shortcut: "g b" },
  { href: "/savings-goals", label: "Goals", shortcut: "g g" },
  { href: "/badges", label: "Badges", shortcut: "g x" },
];

export default function AppNav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard navigation: press "g" then a letter to navigate
  useEffect(() => {
    let lastKey = "";
    let timer: ReturnType<typeof setTimeout>;

    function handleKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === "?") {
        setShowShortcuts((v) => !v);
        return;
      }

      if (key === "escape") {
        setShowShortcuts(false);
        setMobileOpen(false);
        return;
      }

      if (lastKey === "g") {
        clearTimeout(timer);
        const dest: Record<string, string> = {
          d: "/dashboard",
          a: "/accounts",
          t: "/transactions",
          b: "/budgets",
          g: "/savings-goals",
          x: "/badges",
        };
        if (dest[key]) router.push(dest[key]);
        lastKey = "";
        return;
      }

      if (key === "g") {
        lastKey = "g";
        timer = setTimeout(() => {
          lastKey = "";
        }, 1500);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              href="/dashboard"
              className="text-xl font-bold text-green-600 flex items-center gap-1.5 shrink-0"
            >
              💰 <span>BudgetBoss</span>
            </a>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" &&
                    pathname.startsWith(link.href));
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "text-green-700 bg-green-50"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShortcuts(true)}
              className="hidden md:flex items-center text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
            <span className="hidden sm:block text-sm text-gray-600">
              👋 {userName ?? "Welcome"}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Sign out
            </button>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between text-sm px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "text-green-700 bg-green-50"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </a>
              );
            })}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <span className="block text-xs text-gray-400 px-3 pb-1">
                {userName ?? "Welcome"}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm">
              {NAV_LINKS.map((link) => (
                <div
                  key={link.href}
                  className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-gray-700">Go to {link.label}</span>
                  <kbd className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                    {link.shortcut}
                  </kbd>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 border-t border-gray-100 mt-2">
                <span className="text-gray-700">Show shortcuts</span>
                <kbd className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                  ?
                </kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Close / dismiss</span>
                <kbd className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
