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
import { LiveRadarMap } from "@/components/scheduling/LiveRadarMap";

type Props = {
  job: DrillJob | null;
  timezone?: string;
  /** Move up / down controls (field workspace section ordering). */
  headerActions?: ReactNode;
};

export function JobWeatherPanel({ job, timezone, headerActions }: Props) {
  const tz = timezone ?? "America/Indiana/Indianapolis";
  const [data, setData] = useState<WeatherApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [nearMeData, setNearMeData] = useState<WeatherApiResponse | null>(null);
  const [nearMeErr, setNearMeErr] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeOpen, setNearMeOpen] = useState(false);
  const [nearMeCoords, setNearMeCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

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

  useEffect(() => {
    if (!data || !job) {
      setActiveDate(null);
      return;
    }
    const dates = data.daySummaries.map((d) => d.date);
    if (!dates.length) {
      setActiveDate(null);
      return;
    }
    if (dates.includes(job.date)) {
      setActiveDate(job.date);
      return;
    }
    setActiveDate(dates[0]!);
  }, [data, job]);

  useEffect(() => {
    if (!nearMeOpen || nearMeCoords) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearMeErr("Geolocation is not available in this browser.");
      return;
    }
    setNearMeErr(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setNearMeCoords({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
        });
      },
      (e) => {
        setNearMeErr(e.message || "Unable to access your location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  }, [nearMeOpen, nearMeCoords]);

  useEffect(() => {
    if (!nearMeCoords) return;
    const ctrl = new AbortController();
    setNearMeLoading(true);
    setNearMeErr(null);
    const q = new URLSearchParams({
      lat: String(nearMeCoords.lat),
      lon: String(nearMeCoords.lon),
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
      .then(setNearMeData)
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setNearMeErr(e.message);
        setNearMeData(null);
      })
      .finally(() => setNearMeLoading(false));
    return () => ctrl.abort();
  }, [nearMeCoords, tz]);

  const primaryHourly = useMemo(() => {
    if (!data) return [];
    return primaryOpenMeteo(data.sources)?.hourly ?? [];
  }, [data]);

  const availableDates = useMemo(
    () => data?.daySummaries.map((d) => d.date) ?? [],
    [data],
  );

  const activeIndex = useMemo(
    () => (activeDate ? availableDates.indexOf(activeDate) : -1),
    [activeDate, availableDates],
  );
  const canGoNextDay =
    activeIndex >= 0 && activeIndex < availableDates.length - 1;

  const activeSummary = useMemo(() => {
    if (!data || !activeDate) return null;
    return data.daySummaries.find((d) => d.date === activeDate) ?? null;
  }, [data, activeDate]);

  const hourlyForActiveDay = useMemo(() => {
    if (!activeDate) return [];
    return hourlyRowsForAnchorDate(primaryHourly, activeDate);
  }, [primaryHourly, activeDate]);

  const activeAdvice = useMemo(() => {
    if (!job || !activeSummary || !activeDate) return null;
    return buildJobWeatherAdvice({ ...job, date: activeDate }, activeSummary);
  }, [job, activeSummary, activeDate]);

  const nearMeSummary = useMemo(() => {
    if (!nearMeData?.daySummaries.length) return null;
    return nearMeData.daySummaries[0]!;
  }, [nearMeData]);

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
        <details
          className="mt-4 rounded-lg border border-zinc-200 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
          onToggle={(e) => setNearMeOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
            Weather near me — tap to expand
          </summary>
          <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
            {nearMeLoading ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading weather near you…</p>
            ) : null}
            {nearMeErr ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
                {nearMeErr}
              </p>
            ) : null}
            {nearMeData ? (
              <NearMeSingleDay
                timezone={tz}
                summary={nearMeSummary}
                hourly={
                  nearMeSummary
                    ? hourlyRowsForAnchorDate(
                        primaryOpenMeteo(nearMeData.sources)?.hourly ?? [],
                        nearMeSummary.date,
                      )
                    : []
                }
              />
            ) : null}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Weather for this jobsite
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {job.title} · {job.county} Co. · single-day view with hour-by-hour
            breakdown.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!canGoNextDay) return;
              setActiveDate(availableDates[activeIndex + 1] ?? activeDate);
            }}
            disabled={!canGoNextDay}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Next day
          </button>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>

      <details
        className="rounded-lg border border-zinc-200 dark:border-zinc-700"
        onToggle={(e) => setNearMeOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Weather near me — tap to expand
        </summary>
        <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
          {nearMeLoading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading weather near you…</p>
          ) : null}
          {nearMeErr ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {nearMeErr}
            </p>
          ) : null}
          {nearMeData ? (
            <NearMeSingleDay
              timezone={tz}
              summary={nearMeSummary}
              hourly={
                nearMeSummary
                  ? hourlyRowsForAnchorDate(
                      primaryOpenMeteo(nearMeData.sources)?.hourly ?? [],
                      nearMeSummary.date,
                    )
                  : []
              }
            />
          ) : null}
        </div>
      </details>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Live radar (jobsite)
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Composite reflectivity at the selected jobsite coordinates.
        </p>
        <div className="mt-2">
          <LiveRadarMap lat={job.lat} lon={job.lon} />
        </div>
      </div>

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
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Selected day
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Forecast timezone{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{tz}</code>
                . Using <strong>{activeDate ?? "—"}</strong>.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Peak rain chance"
                value={
                  activeSummary?.maxPrecipPop != null
                    ? `${Math.round(activeSummary.maxPrecipPop)}%`
                    : "—"
                }
              />
              <Stat
                label="Peak wind (hourly)"
                value={
                  activeSummary?.maxWindMph != null
                    ? `${Math.round(activeSummary.maxWindMph)} mph`
                    : "—"
                }
              />
              <Stat
                label="Temp range"
                value={
                  activeSummary?.minTempF != null && activeSummary?.maxTempF != null
                    ? `${Math.round(activeSummary.minTempF)}–${Math.round(activeSummary.maxTempF)}°F`
                    : "—"
                }
              />
              <Stat
                label="Dominant conditions"
                value={activeSummary?.dominantCondition ?? "—"}
              />
            </div>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full min-w-[620px] text-left text-xs">
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
                  {hourlyForActiveDay.map((h) => (
                    <tr key={h.time} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                        {formatOpenMeteoWallClock(h.time)}
                      </td>
                      <td className="px-2 py-1.5">{Math.round(h.tempF)}°F</td>
                      <td className="px-2 py-1.5">{h.precipPop != null ? `${h.precipPop}%` : "—"}</td>
                      <td className="px-2 py-1.5">{h.cloudPct != null ? `${h.cloudPct}%` : "—"}</td>
                      <td className="px-2 py-1.5">
                        {h.windMph != null ? `${Math.round(h.windMph)} mph` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-300">{h.conditionLabel}</td>
                    </tr>
                  ))}
                  {hourlyForActiveDay.length === 0 ? (
                    <tr className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-2 py-2 text-zinc-500 dark:text-zinc-400" colSpan={6}>
                        No hourly rows available for this day.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 px-3 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            <p className="font-medium text-zinc-800 dark:text-zinc-100">
              Forecast sources ({data.sources.length})
            </p>
            <ul className="mt-2 space-y-2">
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
          </div>

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

          {activeAdvice ? (
            <div
              className={`rounded-lg border p-4 ${
                activeAdvice.severity === "critical"
                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  : activeAdvice.severity === "caution"
                    ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              }`}
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Field considerations for {activeDate}
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-800 dark:text-zinc-100">
                {activeAdvice.bullets.map((b, i) => (
                  <li key={`${activeDate}-${i}`}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function NearMeSingleDay({
  timezone,
  summary,
  hourly,
}: {
  timezone: string;
  summary: WeatherApiResponse["daySummaries"][number] | null;
  hourly: WeatherApiResponse["primaryHourlyForDay"];
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Near me (single day)
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Forecast timezone{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{timezone}</code>.
        </p>
      </div>
      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Peak rain chance"
              value={summary.maxPrecipPop != null ? `${Math.round(summary.maxPrecipPop)}%` : "—"}
            />
            <Stat
              label="Peak wind (hourly)"
              value={summary.maxWindMph != null ? `${Math.round(summary.maxWindMph)} mph` : "—"}
            />
            <Stat
              label="Temp range"
              value={
                summary.minTempF != null && summary.maxTempF != null
                  ? `${Math.round(summary.minTempF)}–${Math.round(summary.maxTempF)}°F`
                  : "—"
              }
            />
            <Stat label="Dominant conditions" value={summary.dominantCondition ?? "—"} />
          </div>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[620px] text-left text-xs">
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
                {hourly.map((h) => (
                  <tr key={h.time} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                      {formatOpenMeteoWallClock(h.time)}
                    </td>
                    <td className="px-2 py-1.5">{Math.round(h.tempF)}°F</td>
                    <td className="px-2 py-1.5">{h.precipPop != null ? `${h.precipPop}%` : "—"}</td>
                    <td className="px-2 py-1.5">{h.cloudPct != null ? `${h.cloudPct}%` : "—"}</td>
                    <td className="px-2 py-1.5">
                      {h.windMph != null ? `${Math.round(h.windMph)} mph` : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-300">{h.conditionLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No nearby daily weather is available yet.
        </p>
      )}
    </div>
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
