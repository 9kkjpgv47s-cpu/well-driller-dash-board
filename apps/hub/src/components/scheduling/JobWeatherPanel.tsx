"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DrillJob } from "@/lib/scheduling-data";
import { primaryOpenMeteo } from "@/lib/weather/aggregate";
import {
  buildConsolidatedFieldWeatherAdvice,
  buildJobWeatherAdvice,
} from "@/lib/weather/job-advice";
import { formatOpenMeteoWallClock } from "@/lib/weather/open-meteo-display";
import type { DayWeatherSummary, WeatherApiResponse } from "@/lib/weather/types";
import { LiveRadarMap } from "@/components/scheduling/LiveRadarMap";

type Props = {
  job: DrillJob | null;
  timezone?: string;
  /** Move up / down controls (field workspace section ordering). */
  headerActions?: ReactNode;
  /** Field hub: hourly + consolidated considerations only. */
  layout?: "full" | "field";
};

export function JobWeatherPanel({
  job,
  timezone,
  headerActions,
  layout = "full",
}: Props) {
  const fieldLayout = layout === "field";
  const tz = timezone ?? "America/Indiana/Indianapolis";
  const [data, setData] = useState<WeatherApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nearMeData, setNearMeData] = useState<WeatherApiResponse | null>(null);
  const [nearMeErr, setNearMeErr] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeOpen, setNearMeOpen] = useState(false);
  const [nearMeCoords, setNearMeCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [weatherRefreshKey, setWeatherRefreshKey] = useState(0);

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
    if (job.date) q.set("date", job.date);
    fetch(`/api/weather?${q}`, {
      signal: ctrl.signal,
      cache: weatherRefreshKey > 0 ? "no-store" : "default",
    })
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
  }, [job, tz, weatherRefreshKey]);

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

  const adviceByDay = useMemo(() => {
    if (!job || !data) return [];
    return data.daySummaries.map((day) => ({
      date: day.date,
      advice: buildJobWeatherAdvice({ ...job, date: day.date }, day),
    }));
  }, [job, data]);

  const consolidatedAdvice = useMemo(() => {
    if (!job || !data) {
      return { general: [] as string[], critical: [] as string[] };
    }
    if (fieldLayout) {
      return buildConsolidatedFieldWeatherAdvice(job, data);
    }
    const general = new Set<string>();
    const critical = new Set<string>();
    for (const entry of adviceByDay) {
      for (const bullet of entry.advice.bullets) {
        if (entry.advice.severity === "critical") critical.add(bullet);
        else general.add(bullet);
      }
    }
    for (const bullet of critical) general.delete(bullet);
    return {
      general: [...general],
      critical: [...critical],
    };
  }, [adviceByDay, data, fieldLayout, job]);

  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  useEffect(() => {
    if (!data?.sources.length) return;
    setSelectedSourceId((prev) => {
      if (prev && data.sources.some((s) => s.id === prev)) return prev;
      return (
        primaryOpenMeteo(data.sources)?.id ?? data.sources[0]?.id ?? ""
      );
    });
  }, [data]);

  const selectedHourly = useMemo(() => {
    if (!data || !selectedSourceId) return primaryHourly;
    return (
      data.sources.find((s) => s.id === selectedSourceId)?.hourly ??
      primaryHourly
    );
  }, [data, selectedSourceId, primaryHourly]);

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
              <DailyBrief
                title="Day-by-day near your location"
                timezone={tz}
                summaries={nearMeData.daySummaries}
                hourly={primaryOpenMeteo(nearMeData.sources)?.hourly ?? []}
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
            {fieldLayout ? "Weather" : "Daily weather brief"}
          </h2>
          {!fieldLayout ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {job.title} · {job.county} Co. · day-by-day outlook with full hourly
              rows for the current model window.
            </p>
          ) : null}
        </div>
        {headerActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {fieldLayout && job ? (
              <button
                type="button"
                onClick={() => setWeatherRefreshKey((k) => k + 1)}
                disabled={loading}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {loading ? "Refreshing…" : "Refresh weather"}
              </button>
            ) : null}
            {headerActions}
          </div>
        ) : fieldLayout && job ? (
          <button
            type="button"
            onClick={() => setWeatherRefreshKey((k) => k + 1)}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {loading ? "Refreshing…" : "Refresh weather"}
          </button>
        ) : null}
      </header>

      {!fieldLayout ? (
        <details
          className="rounded-lg border border-zinc-200 dark:border-zinc-700"
          onToggle={(e) =>
            setNearMeOpen((e.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Weather near me — tap to expand
          </summary>
          <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
            {nearMeLoading ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Loading weather near you…
              </p>
            ) : null}
            {nearMeErr ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
                {nearMeErr}
              </p>
            ) : null}
            {nearMeData ? (
              <DailyBrief
                title="Day-by-day near your location"
                timezone={tz}
                summaries={nearMeData.daySummaries}
                hourly={primaryOpenMeteo(nearMeData.sources)?.hourly ?? []}
              />
            ) : null}
          </div>
        </details>
      ) : null}

      {!fieldLayout ? (
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
      ) : null}

      {loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading outlook…</p>
      )}
      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      {data && fieldLayout ? (
        <>
          <HourlyForecast
            sources={data.sources}
            selectedSourceId={selectedSourceId}
            onSourceChange={setSelectedSourceId}
            hourly={selectedHourly}
          />

          {consolidatedAdvice.general.length ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Field considerations
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-800 dark:text-zinc-100">
                {consolidatedAdvice.general.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {consolidatedAdvice.critical.length ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <h3 className="text-sm font-semibold text-red-950 dark:text-red-100">
                Critical weather
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-red-950 dark:text-red-100">
                {consolidatedAdvice.critical.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {data && !fieldLayout ? (
        <>
          <DailyBrief
            title="Day-by-day at this jobsite"
            timezone={tz}
            summaries={data.daySummaries}
            hourly={primaryHourly}
          />

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

          {adviceByDay.map((entry) => (
            <div
              key={entry.date}
              className={`rounded-lg border p-4 ${
                entry.advice.severity === "critical"
                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  : entry.advice.severity === "caution"
                    ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
              }`}
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Field considerations for {entry.date}
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-800 dark:text-zinc-100">
                {entry.advice.bullets.map((b, i) => (
                  <li key={`${entry.date}-${i}`}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}

function sourceButtonLabel(source: WeatherApiResponse["sources"][number]): string {
  if (source.id === "open-meteo-gfs") return "GFS";
  if (source.id === "open-meteo-ecmwf") return "ECMWF";
  if (source.id === "nws-hourly") return "NWS";
  return source.label.split("·").pop()?.trim() ?? source.label;
}

function HourlyForecast({
  sources,
  selectedSourceId,
  onSourceChange,
  hourly,
}: {
  sources: WeatherApiResponse["sources"];
  selectedSourceId: string;
  onSourceChange: (id: string) => void;
  hourly: WeatherApiResponse["primaryHourlyForDay"];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Hourly forecast
        </h3>
        <div className="grid w-full grid-cols-3 gap-2">
          {sources.map((s) => {
            const active = s.id === selectedSourceId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSourceChange(s.id)}
                aria-pressed={active}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-600"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                {sourceButtonLabel(s)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-2 py-2 font-medium">Date</th>
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
              <tr
                key={`${selectedSourceId}-${h.time}`}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                  {h.time.slice(0, 10)}
                </td>
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
  );
}

function DailyBrief({
  title,
  timezone,
  summaries,
  hourly,
}: {
  title: string;
  timezone: string;
  summaries: DayWeatherSummary[];
  hourly: WeatherApiResponse["primaryHourlyForDay"];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Forecast timezone{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{timezone}</code>.
          Day summaries are paired with full hourly rows from the primary model.
        </p>
      </div>
      {summaries.map((day) => (
        <div key={day.date} className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{day.date}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Peak rain chance"
              value={day.maxPrecipPop != null ? `${Math.round(day.maxPrecipPop)}%` : "—"}
            />
            <Stat
              label="Peak wind (hourly)"
              value={day.maxWindMph != null ? `${Math.round(day.maxWindMph)} mph` : "—"}
            />
            <Stat
              label="Temp range"
              value={
                day.minTempF != null && day.maxTempF != null
                  ? `${Math.round(day.minTempF)}–${Math.round(day.maxTempF)}°F`
                  : "—"
              }
            />
            <Stat label="Dominant conditions" value={day.dominantCondition ?? "—"} />
          </div>
        </div>
      ))}
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-2 py-2 font-medium">Date</th>
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
                  {h.time.slice(0, 10)}
                </td>
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
