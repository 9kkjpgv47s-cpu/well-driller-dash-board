"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fieldHome = pathname === "/" || pathname.startsWith("/drilling");
  const hubTitle = pathname.startsWith("/scheduling")
    ? "Office hub"
    : "Field hub";

  return (
    <div
      className={`flex min-h-screen flex-col bg-[var(--background)] ${fieldHome ? "app-backdrop" : ""}`}
    >
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="block text-left transition-opacity hover:opacity-80"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Driller Dashboard
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {hubTitle}
              </p>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-black/10 px-4 py-6 text-center text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        MVP for a small crew (about 10 people). Official registry data and
        community notes stay separate when wired to live sources.
      </footer>
    </div>
  );
}
