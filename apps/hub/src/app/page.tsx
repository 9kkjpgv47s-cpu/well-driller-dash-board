import Link from "next/link";

const cards = [
  {
    href: "/scheduling",
    title: "Scheduling",
    desc: "Week grid, demo jobs, and built job packets for the crew.",
    cta: "Open scheduling",
    accent: "from-sky-500 to-cyan-500",
  },
  {
    href: "/build-job",
    title: "Build job",
    desc: "Drive address, offset, coordinates, notes, and a site photo.",
    cta: "Create job packet",
    accent: "from-indigo-500 to-violet-500",
  },
  {
    href: "/optimization",
    title: "Optimization",
    desc: "Quick jobsite parameters and mock readiness scores.",
    cta: "Run optimizer",
    accent: "from-amber-500 to-orange-500",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg backdrop-blur-xl sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl"
          aria-hidden
        />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Pre-job hub
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Everything the crew needs before wheels roll.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Schedule the week, build detailed jobsite packets, and skim
          optimization hints. Built for a small test crew; static pages and
          cached APIs stay light under load.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/build-job" className="btn-primary">
            Build job
          </Link>
          <Link href="/scheduling" className="btn-secondary">
            View schedule
          </Link>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group card relative overflow-hidden p-6 transition hover:-translate-y-0.5"
          >
            <div
              className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} shadow-md`}
              aria-hidden
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
              {c.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {c.desc}
            </p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">
              {c.cta} →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
