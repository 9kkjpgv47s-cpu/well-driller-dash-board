"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Home" },
  { href: "/scheduling", label: "Scheduling" },
  { href: "/build-job", label: "Build job" },
  { href: "/optimization", label: "Optimization" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-backdrop flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="group block shrink-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Driller Dashboard
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-[var(--foreground)] transition group-hover:text-[var(--accent)]">
              Field hub
            </p>
          </Link>
          <nav
            className="flex flex-wrap items-center gap-1.5 sm:justify-end"
            aria-label="Primary"
          >
            {nav.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-pill ${active ? "nav-pill-active" : "nav-pill-idle"}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-[var(--border)] px-4 py-8">
        <p className="mx-auto max-w-6xl text-center text-xs leading-relaxed text-[var(--muted)]">
          MVP for a small crew. Official registry data and community-sourced
          notes stay on separate surfaces when integrated.
        </p>
      </footer>
    </div>
  );
}
