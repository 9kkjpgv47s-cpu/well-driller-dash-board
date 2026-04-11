"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/scheduling", label: "Office" },
  { href: "/", label: "Field" },
] as const;

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
          <nav className="flex flex-wrap gap-2" aria-label="Primary">
            {nav.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/" || pathname.startsWith("/drilling")
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
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
