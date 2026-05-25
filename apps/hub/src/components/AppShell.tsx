"use client";

import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop flex min-h-screen flex-col bg-[var(--background)]">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4">
          <Link
            href="/"
            className="block text-left transition-opacity hover:opacity-80"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Driller Dashboard
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Field hub
            </p>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
