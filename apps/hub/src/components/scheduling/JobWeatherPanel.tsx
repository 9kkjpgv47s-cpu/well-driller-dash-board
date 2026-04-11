"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DrillJob } from "@/lib/scheduling-data";
import { primaryOpenMeteo } from "@/lib/weather/aggregate";
import { buildJobWeatherAdvice } from "@/lib/weather/job-advice";
import {
  formatOpenMeteoWallClock,
  hourlyRowsForAnchorDate,
} from "@/lib/weather/open-meteo-display";
import type { WeatherApiResponse } from "@/lib/weather/types";

type Props = {
  job: DrillJob | null;
  timezone?: string;
  /** Move up / down controls (field workspace section ordering). */
  headerActions?: ReactNode;
};

export function JobWeatherPanel({ job, timezone, headerActions }: Props) {
  const tz =
    timezone ?? "America/Indiana/Indianapolis";
  const [data, setData] = useState<WeatherApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job) {
      setData(null);
      setErr(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setErr(null);
    const q = new URLSearchParams({
      lat: String(job.lat),
      lon: String(job.lon),
      date: job.date,
      timezone: tz,
    });
    fetch(`/api/weather?${q}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? r.statusText);
        }
        return r.json() as Promise<WeatherApiResponse>;
      })
      .then(setData)
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setErr(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [job, tz]);

  const daySummary = useMemo(() => {
    if (!data || !job) return null;
    const exact = data.daySummaries.find((d) => d.date === job.date);
    if (exact) return exact;
    if (!data.daySummaries.length) return null;
    const t0 = new Date(`${job.date}T12:00:00Z`).getTime();
    let best = data.daySummaries[0]!;
    let bestD = Math.abs(
      new Date(`${best.date}T12:00:00Z`).getTime() - t0,
    );
    for (const d of data.daySummaries) {
      const dt = Math.abs(new Date(`${d.date}T12:00:00Z`).getTime() - t0);
      if (dt < bestD) {
        bestD = dt;
        best = d;
      }
    }
    return best;
  }, [data, job]);

  /** Only hours on the job's calendar date — never a "closest" day (avoids Fri vs Sat mix-ups). */
  const hourlyForJob = useMemo(() => {
    if (!data || !job) return [];
    const primary = primaryOpenMeteo(data.sources);
    if (!primary?.hourly.length) return [];
    return hourlyRowsForAnchorDate(primary.hourly, job.date);
  }, [data, job]);

  const advice = useMemo(() => {
    if (!job) return null;
    return buildJobWeatherAdvice(job, daySummary);
  }, [job, daySummary]);

  if (!job) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 flex-1">
            Select a job on the board to load a job-scoped forecast, hour-by-hour
            breakdown, and field considerations.
          </p>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Weather for this job
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {job.title} · {job.date} · {job.county} Co. · blended models refresh on a
            short cache (check again later in the day for newer runs).
          </p>
          {data && daySummary && daySummary.date !== job.date ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              No exact match for <strong>{job.date}</strong> in the returned
              hourly window — showing the closest available day (
              <strong>{daySummary.date}</strong>) for stats and the hour table.
            </p>
          ) : null}
        </div>
        {headerActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {headerActions}
          </div>
        ) : null}
      </header>

      {loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading outlook…</p>
      )}
      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Peak rain chance"
              value={
                daySummary?.maxPrecipPop != null
                  ? `${Math.round(daySummary.maxPrecipPop)}%`
                  : "—"
              }
            />
            <Stat
              label="Peak wind (hourly)"
              value={
                daySummary?.maxWindMph != null
                  ? `${Math.round(daySummary.maxWindMph)} mph`
                  : "—"
              }
            />
            <Stat
              label="Temp range"
              value={
                daySummary?.minTempF != null && daySummary?.maxTempF != null
                  ? `${Math.round(daySummary.minTempF)}–${Math.round(daySummary.maxTempF)}°F`
                  : "—"
              }
            />
            <Stat
              label="Dominant conditions"
              value={daySummary?.dominantCondition ?? "—"}
            />
          </div>

          <details className="rounded-lg border border-zinc-200 dark:border-zinc-700">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Forecast sources ({data.sources.length}) — tap to expand
            </summary>
            <ul className="space-y-2 border-t border-zinc-100 px-3 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
              {data.sources.map((s) => (
                <li key={s.id}>
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">
                    {s.label}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {" "}
                    · {s.provider} · updated {new Date(s.fetchedAt).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Why the numbers differ
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
              {data.explanations.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Hour-by-hour (primary model)
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Rows are only for <strong>{job.date}</strong> (forecast timezone{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{tz}</code>
              ). Wall-clock labels are taken from the API string, not your browser
              zone.
            </p>
            {hourlyForJob.length === 0 ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                No hourly rows for <strong>{job.date}</strong> in this model window
                (range may start after the job day, or the run has not reached that
                date yet). Summary tiles above may still use the nearest day with
                data{daySummary && daySummary.date !== job.date ? (
                  <>
                    : <strong>{daySummary.date}</strong>
                  </>
                ) : null}
                .
              </p>
            ) : null}
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-2 py-2 font-medium">Hour</th>
                    <th className="px-2 py-2 font-medium">Temp</th>
                    <th className="px-2 py-2 font-medium">Rain %</th>
                    <th className="px-2 py-2 font-medium">Cloud</th>
                    <th className="px-2 py-2 font-medium">Wind</th>
                    <th className="px-2 py-2 font-medium">Sky / precip</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyForJob.map((h) => (
                    <tr
                      key={h.time}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                        {formatOpenMeteoWallClock(h.time)}
                      </td>
                      <td className="px-2 py-1.5">{Math.round(h.tempF)}°F</td>
                      <td className="px-2 py-1.5">
                        {h.precipPop != null ? `${h.precipPop}%` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {h.cloudPct != null ? `${h.cloudPct}%` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {h.windMph != null ? `${Math.round(h.windMph)} mph` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-300">
                        {h.conditionLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {advice && (
            <div
              className={`rounded-lg border p-4 ${
                advice.severity === "critical"
                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  : advice.severity === "caution"
                    ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              }`}
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Things to consider for this job
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-800 dark:text-zinc-100">
                {advice.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
