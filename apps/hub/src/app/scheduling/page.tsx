import type { Metadata } from "next";
import Link from "next/link";
import { BuiltJobsSection } from "@/components/BuiltJobsSection";
import {
  dayLabels,
  demoJobs,
  slotLabels,
  type ScheduledJob,
} from "@/lib/scheduling-data";

export const metadata: Metadata = {
  title: "Scheduling — Driller Dashboard",
  description: "Week view, job list, and build job.",
};

const statusStyles: Record<ScheduledJob["status"], string> = {
  planned: "bg-[var(--surface-muted)] text-[var(--foreground)] ring-1 ring-[var(--border)]",
  en_route: "bg-sky-500/15 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500/25",
  on_site:
    "bg-amber-500/15 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/25",
  complete:
    "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/25",
};

function JobCard({ job }: { job: ScheduledJob }) {
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium text-[var(--foreground)]">{job.title}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[job.status]}`}
        >
          {job.status.replace("_", " ")}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide">County</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{job.county}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide">Rig / lead</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">
            {job.rig} · {job.lead}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide">Window</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">
            {dayLabels[job.dayIndex]} {slotLabels[job.startSlot]}
            {job.spanSlots > 1
              ? `–${slotLabels[job.startSlot + job.spanSlots - 1]}`
              : ""}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function buildDayOccupancy(dayIndex: number) {
  const occupiedByRow: (ScheduledJob | null)[] = Array(slotLabels.length).fill(
    null,
  );
  for (const job of demoJobs) {
    if (job.dayIndex !== dayIndex) continue;
    for (let r = job.startSlot; r < job.startSlot + job.spanSlots; r++) {
      if (r >= 0 && r < slotLabels.length) {
        occupiedByRow[r] = job;
      }
    }
  }
  return occupiedByRow;
}

export default function SchedulingPage() {
  const perDay = dayLabels.map((_, d) => buildDayOccupancy(d));

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Operations
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Crew scheduling
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Demo week grid for a small team. Build real jobsite packets for the
            crew—coordinates, notes, and photos—then open the driller brief.
          </p>
        </div>
        <Link href="/build-job" className="btn-primary shrink-0 self-start lg:self-auto">
          Build job
        </Link>
      </div>

      <section aria-labelledby="built-heading" className="card p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="built-heading"
            className="text-lg font-semibold text-[var(--foreground)]"
          >
            Built jobs (this session)
          </h2>
          <Link href="/build-job" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            + New job packet
          </Link>
        </div>
        <BuiltJobsSection />
      </section>

      <section aria-labelledby="week-heading">
        <h2
          id="week-heading"
          className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
        >
          This week (demo)
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                <th className="sticky left-0 z-10 bg-[var(--surface-muted)] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Time
                </th>
                {dayLabels.map((d) => (
                  <th
                    key={d}
                    className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotLabels.map((slot, rowIdx) => (
                <tr
                  key={slot}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <th className="sticky left-0 z-10 bg-[var(--background)] px-3 py-2.5 text-left text-xs font-medium text-[var(--muted)]">
                    {slot}
                  </th>
                  {dayLabels.flatMap((_, dayIdx) => {
                    const occ = perDay[dayIdx][rowIdx];
                    if (!occ) {
                      return [
                        <td
                          key={`${dayIdx}-${rowIdx}-empty`}
                          className="bg-[var(--surface-muted)]/40"
                        />,
                      ];
                    }
                    if (occ.startSlot !== rowIdx) {
                      return [];
                    }
                    return [
                      <td
                        key={`${dayIdx}-${rowIdx}-${occ.id}`}
                        rowSpan={occ.spanSlots}
                        className="align-top border-x border-[var(--border)] px-1 py-1"
                      >
                        <div className="flex h-full min-h-[4.5rem] flex-col justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 px-2.5 py-2 text-xs font-semibold leading-snug text-white shadow-md">
                          <span>{occ.title}</span>
                          <span className="mt-1 font-normal opacity-90">
                            {occ.rig} · {occ.lead}
                          </span>
                        </div>
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="jobs-heading">
        <h2
          id="jobs-heading"
          className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
        >
          Demo job list
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {demoJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>
    </div>
  );
}
