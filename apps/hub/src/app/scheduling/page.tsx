import type { Metadata } from "next";
import {
  dayLabels,
  demoJobs,
  slotLabels,
  type ScheduledJob,
} from "@/lib/scheduling-data";

export const metadata: Metadata = {
  title: "Scheduling — Driller Dashboard",
  description: "Week view and job list (demo data).",
};

const statusStyles: Record<ScheduledJob["status"], string> = {
  planned:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  en_route:
    "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  on_site:
    "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  complete:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
};

function JobCard({ job }: { job: ScheduledJob }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
          {job.title}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[job.status]}`}
        >
          {job.status.replace("_", " ")}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">County</dt>
          <dd>{job.county}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Rig / lead</dt>
          <dd>
            {job.rig} · {job.lead}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Window</dt>
          <dd>
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

/** For each day column, which job (if any) owns each row via rowspan. */
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Crew scheduling
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Demo schedule for a small team (about ten people). Swap this grid for
          your calendar backend when ready.
        </p>
      </div>

      <section aria-labelledby="week-heading">
        <h2
          id="week-heading"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          This week
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                  Time
                </th>
                {dayLabels.map((d) => (
                  <th
                    key={d}
                    className="px-2 py-2 text-center font-medium text-zinc-700 dark:text-zinc-200"
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
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <th className="sticky left-0 bg-[var(--background)] px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {slot}
                  </th>
                  {dayLabels.flatMap((_, dayIdx) => {
                    const occ = perDay[dayIdx][rowIdx];
                    if (!occ) {
                      return [
                        <td
                          key={`${dayIdx}-${rowIdx}-empty`}
                          className="bg-zinc-50/50 dark:bg-zinc-900/40"
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
                        className="align-top border-l border-r border-zinc-100 px-1 py-1 dark:border-zinc-800"
                      >
                        <div className="flex h-full min-h-[4.5rem] flex-col justify-center rounded-md bg-sky-600/90 px-2 py-2 text-xs font-medium leading-snug text-white shadow-sm dark:bg-sky-700">
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
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          Job list
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {demoJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>
    </div>
  );
}
