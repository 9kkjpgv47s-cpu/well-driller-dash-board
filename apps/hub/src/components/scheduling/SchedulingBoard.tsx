"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaInsightsPanel } from "@/components/AreaInsightsPanel";
import {
  CREW_LIMIT,
  DEFAULT_CREWS,
  DEFAULT_JOBS_PER_DAY,
  type DrillJob,
  type HorizonView,
  type JobsPerDay,
  type ScheduleConfig,
  addCalendarDays,
  dayLabels,
  expandDemoJobs,
  formatShortDate,
  mondayOfWeekContaining,
} from "@/lib/scheduling-data";
import {
  buildSchedulingInsights,
  jobsForCell,
  proposeEmergencySlot,
  weekdayDatesFromMonday,
  weekdayDatesInMonth,
} from "@/lib/scheduling-logic";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import { JobWeatherPanel } from "./JobWeatherPanel";

const statusChip: Record<DrillJob["status"], string> = {
  planned:
    "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
  en_route: "bg-sky-200/90 text-sky-950 dark:bg-sky-900 dark:text-sky-50",
  on_site:
    "bg-amber-200/90 text-amber-950 dark:bg-amber-900 dark:text-amber-50",
  complete:
    "bg-emerald-200/90 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-50",
};

export function SchedulingBoard() {
  const [anchorMonday, setAnchorMonday] = useState(() =>
    mondayOfWeekContaining(new Date()),
  );
  const [view, setView] = useState<HorizonView>("week");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [activeCrews, setActiveCrews] = useState(DEFAULT_CREWS);
  const [jobsPerDay, setJobsPerDay] = useState<JobsPerDay>(DEFAULT_JOBS_PER_DAY);
  const [jobs, setJobs] = useState<DrillJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setJobs(expandDemoJobs(anchorMonday));
    setSelectedId(null);
  }, [anchorMonday]);

  const config: ScheduleConfig = useMemo(
    () => ({ activeCrews, jobsPerDay }),
    [activeCrews, jobsPerDay],
  );

  const insights = useMemo(
    () => buildSchedulingInsights(jobs, config),
    [jobs, config],
  );

  const weekDates = useMemo(
    () => weekdayDatesFromMonday(anchorMonday),
    [anchorMonday],
  );

  const monthDates = useMemo(
    () => weekdayDatesInMonth(calendarMonth.y, calendarMonth.m),
    [calendarMonth.y, calendarMonth.m],
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId],
  );

  const bumpCrews = (delta: number) => {
    setActiveCrews((c) =>
      Math.min(CREW_LIMIT, Math.max(1, c + delta)),
    );
  };

  const shiftWeek = (dir: number) => {
    setAnchorMonday((m) => addCalendarDays(m, dir * 7));
  };

  const shiftMonth = (dir: number) => {
    setCalendarMonth(({ y, m }) => {
      const d = new Date(y, m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const insertEmergency = useCallback(() => {
    const date =
      view === "week"
        ? weekDates[2] ?? weekDates[0]
        : monthDates[Math.min(2, monthDates.length - 1)] ?? weekDates[0];
    const slot = proposeEmergencySlot(jobs, date, config);
    if (!slot) {
      alert("No open crew slot that day — bump crews, switch to 2 jobs/day, or pick another day.");
      return;
    }
    const id = `em-${Date.now()}`;
    const emergency: DrillJob = {
      id,
      title: "Emergency — no water (new)",
      county: "Rush",
      date,
      crewIndex: slot.crewIndex,
      daySlot: slot.daySlot,
      rig: `Rig-${slot.crewIndex + 1}`,
      lead: "Dispatcher",
      status: "planned",
      lat: 39.6092,
      lon: -86.3753,
      driveMinutesFromYard: 52,
      feetOffDrive: 28,
      isEmergency: true,
      routingFitScore: 95,
      customerNotes: "Inserted from hub — reorder around success probability + access.",
    };
    setJobs((prev) => [...prev, emergency]);
    setSelectedId(id);
  }, [config, jobs, monthDates, view, weekDates]);

  const insertRegularJob = useCallback(() => {
    const date =
      view === "week"
        ? weekDates[2] ?? weekDates[0]
        : monthDates[Math.min(2, monthDates.length - 1)] ?? weekDates[0];
    const slot = proposeEmergencySlot(jobs, date, config);
    if (!slot) {
      alert(
        "No open crew slot that day — bump crews, switch to 2 jobs/day, or pick another day.",
      );
      return;
    }
    const id = `job-${Date.now()}`;
    const newJob: DrillJob = {
      id,
      title: "New job — edit in list",
      county: "Marion",
      date,
      crewIndex: slot.crewIndex,
      daySlot: slot.daySlot,
      rig: `Rig-${slot.crewIndex + 1}`,
      lead: "—",
      status: "planned",
      lat: 39.7684,
      lon: -86.1581,
      driveMinutesFromYard: 45,
      feetOffDrive: 25,
      isEmergency: false,
      routingFitScore: 70,
      customerNotes: "Added from scheduling toolbar — update title, site, and crew info.",
    };
    setJobs((prev) => [...prev, newJob]);
    setSelectedId(id);
  }, [config, jobs, monthDates, view, weekDates]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Office
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
          Plan up to five crews on weekdays with either one or two jobs per crew per
          day (no clock slots). Select a job for weather, full registry{" "}
          <strong>area drilling analysis</strong> ({DEFAULT_AREA_RADIUS_MILES}{" "}
          mi), and the embedded{" "}
          <strong>well viewer</strong> centered on that site.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
            View
          </span>
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-600">
            <TogglePill
              active={view === "week"}
              onClick={() => setView("week")}
              label="Week"
            />
            <TogglePill
              active={view === "month"}
              onClick={() => setView("month")}
              label="Month"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
            Crews
          </span>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
            onClick={() => bumpCrews(-1)}
            aria-label="Fewer crews"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{activeCrews}</span>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
            onClick={() => bumpCrews(1)}
            aria-label="More crews"
          >
            +
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            (max {CREW_LIMIT})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
            Jobs / crew / day
          </span>
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-600">
            <TogglePill
              active={jobsPerDay === 1}
              onClick={() => setJobsPerDay(1)}
              label="1"
            />
            <TogglePill
              active={jobsPerDay === 2}
              onClick={() => setJobsPerDay(2)}
              label="2"
            />
          </div>
        </div>

        {view === "week" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
              onClick={() => shiftWeek(-1)}
            >
              ← Week
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-200">
              Week of {formatShortDate(anchorMonday)}
            </span>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
              onClick={() => shiftWeek(1)}
            >
              Week →
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
              onClick={() => shiftMonth(-1)}
            >
              ← Month
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-200">
              {new Date(calendarMonth.y, calendarMonth.m).toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
              onClick={() => shiftMonth(1)}
            >
              Month →
            </button>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500"
            onClick={insertRegularJob}
          >
            Add job
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            onClick={insertEmergency}
          >
            Add emergency job
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <section aria-labelledby="insights-h">
          <h2
            id="insights-h"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Planner notes (drive + weather-aware heuristics)
          </h2>
          <ul className="mt-2 space-y-2">
            {insights.map((s, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {s.title}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-300">{s.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "week" ? (
        <WeekGrid
          dates={weekDates}
          jobs={jobs}
          config={config}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : (
        <MonthAgenda
          dates={monthDates}
          jobs={jobs}
          config={config}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      <section aria-labelledby="list-h">
        <h2
          id="list-h"
          className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          Job list (this board)
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedId(job.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedId === job.id
                  ? "border-sky-500 ring-2 ring-sky-400/40"
                  : "border-zinc-200 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {job.title}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusChip[job.status]}`}
                >
                  {job.status.replace("_", " ")}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                <div>
                  <dt className="text-zinc-500">Day</dt>
                  <dd>
                    {job.date} {job.isEmergency ? "· Emergency" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Crew / slot</dt>
                  <dd>
                    Crew {job.crewIndex + 1} · Job {job.daySlot + 1} of {config.jobsPerDay}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Drive</dt>
                  <dd>{job.driveMinutesFromYard} min</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Off drive</dt>
                  <dd>{job.feetOffDrive} ft</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-zinc-500">Routing fit (mock)</dt>
                  <dd>{job.routingFitScore}/100</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      </section>

      <JobWeatherPanel job={selectedJob} />

      {selectedJob ? (
        <AreaInsightsPanel
          lat={selectedJob.lat}
          lon={selectedJob.lon}
          radiusMiles={DEFAULT_AREA_RADIUS_MILES}
          autoRun
          title={`Area drilling analysis (${DEFAULT_AREA_RADIUS_MILES} mi around this job)`}
        />
      ) : null}

      {selectedJob && (
        <section aria-labelledby="drilling-h" className="space-y-3">
          <h2
            id="drilling-h"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Field map (this job)
          </h2>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
            Open the field workspace with this job as the map center
            (2&nbsp;mi radius, registry wells from gz chunks). Add wells to the
            shared job queue from the map.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/?lat=${encodeURIComponent(String(selectedJob.lat))}&lon=${encodeURIComponent(String(selectedJob.lon))}`}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Open field workspace
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function WeekGrid({
  dates,
  jobs,
  config,
  selectedId,
  onSelect,
}: {
  dates: string[];
  jobs: DrillJob[];
  config: ScheduleConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
            <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
              Crew
            </th>
            {dates.map((d, i) => (
              <th
                key={d}
                className="px-2 py-2 text-center text-xs font-medium text-zinc-700 dark:text-zinc-200"
              >
                {dayLabels[i]}
                <div className="font-normal text-zinc-500 dark:text-zinc-400">
                  {formatShortDate(d)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: config.activeCrews }, (_, crew) => (
            <tr
              key={crew}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
              <th className="sticky left-0 bg-[var(--background)] px-3 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Crew {crew + 1}
              </th>
              {dates.map((date) => (
                <td
                  key={`${crew}-${date}`}
                  className="align-top border-l border-zinc-100 px-1 py-1 dark:border-zinc-800"
                >
                  <div className="flex min-h-[5rem] flex-col gap-1">
                    {config.jobsPerDay === 2 && (
                      <span className="text-[10px] font-medium uppercase text-zinc-400">
                        Slot 1
                      </span>
                    )}
                    {jobsForCell(jobs, date, crew, 0, config.jobsPerDay).map(
                      (job) => (
                        <JobChip
                          key={job.id}
                          job={job}
                          selected={selectedId === job.id}
                          onSelect={() => onSelect(job.id)}
                        />
                      ),
                    )}
                    {config.jobsPerDay === 2 && (
                      <>
                        <span className="mt-1 text-[10px] font-medium uppercase text-zinc-400">
                          Slot 2
                        </span>
                        {jobsForCell(jobs, date, crew, 1, config.jobsPerDay).map(
                          (job) => (
                            <JobChip
                              key={job.id}
                              job={job}
                              selected={selectedId === job.id}
                              onSelect={() => onSelect(job.id)}
                            />
                          ),
                        )}
                      </>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthAgenda({
  dates,
  jobs,
  config,
  selectedId,
  onSelect,
}: {
  dates: string[];
  jobs: DrillJob[];
  config: ScheduleConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const dayJobs = jobs.filter((j) => j.date === date);
        if (!dayJobs.length) return null;
        return (
          <div
            key={date}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {date} · {formatShortDate(date)}
            </h3>
            <ul className="mt-2 space-y-2">
              {dayJobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(job.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedId === job.id
                        ? "border-sky-500 ring-2 ring-sky-400/40"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="font-medium">{job.title}</span>
                    <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                      Crew {job.crewIndex + 1} · slot {job.daySlot + 1}/
                      {config.jobsPerDay}
                      {job.isEmergency ? " · Emergency" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function JobChip({
  job,
  selected,
  onSelect,
}: {
  job: DrillJob;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] leading-snug text-white shadow-sm ${
        selected ? "ring-2 ring-amber-300 ring-offset-1 dark:ring-offset-zinc-900" : ""
      } ${job.isEmergency ? "bg-red-700 hover:bg-red-800" : "bg-sky-700 hover:bg-sky-800"}`}
    >
      <span className="line-clamp-2 font-medium">{job.title}</span>
      <span className="mt-0.5 block font-normal opacity-90">
        {job.driveMinutesFromYard}m · {job.feetOffDrive}ft off
      </span>
    </button>
  );
}
