import {
  buildExplanations,
  mergeDaySummaryWithSpread,
  modelSpreadByDate,
  primaryOpenMeteo,
  summarizeDayFromHourly,
} from "./aggregate";
import { fetchOpenMeteoModel } from "./open-meteo";
import { fetchNwsHourly } from "./nws";
import type { WeatherApiResponse, WeatherSourceBundle } from "./types";
import { todayIsoDateInTimeZone } from "@/lib/synthetic-drill-job";

export const DEFAULT_WEATHER_TIMEZONE = "America/Indiana/Indianapolis";

/** IANA-style zone names only — the value is forwarded to upstream weather APIs. */
export function safeTimezone(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_WEATHER_TIMEZONE;
  if (!/^[A-Za-z][A-Za-z0-9+_-]*(\/[A-Za-z0-9+_-]+){0,2}$/.test(raw)) {
    return DEFAULT_WEATHER_TIMEZONE;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_WEATHER_TIMEZONE;
  }
}

export function openMeteoWindowForAnchor(anchorDate: string, timezone: string) {
  const todayStr = todayIsoDateInTimeZone(timezone);
  if (anchorDate >= todayStr) {
    return { pastDays: 2, forecastDays: 16 };
  }
  const a = new Date(`${anchorDate}T12:00:00Z`).getTime();
  const t = new Date(`${todayStr}T12:00:00Z`).getTime();
  const diff = Math.ceil((t - a) / 86400000);
  return {
    pastDays: Math.min(92, Math.max(3, diff + 3)),
    forecastDays: 16,
  };
}

export type WeatherBundleResult =
  | { ok: true; response: WeatherApiResponse }
  | { ok: false; error: string };

/**
 * Shared weather composition used by `/api/weather` and the MCP `job_weather`
 * tool: Open-Meteo (GFS + ECMWF) blended with NWS hourly when reachable.
 * `date` anchors the window (YYYY-MM-DD); defaults to today in `timezone`.
 */
export async function getWeatherBundle(
  lat: number,
  lon: number,
  timezoneRaw?: string | null,
  dateRaw?: string | null,
): Promise<WeatherBundleResult> {
  const timezone = safeTimezone(timezoneRaw);
  const today = todayIsoDateInTimeZone(timezone);
  const anchorDate =
    dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : today;

  const omOpts = openMeteoWindowForAnchor(anchorDate, timezone);

  const [gfs, ecmwf, nws] = await Promise.all([
    fetchOpenMeteoModel(
      lat,
      lon,
      timezone,
      "gfs_seamless",
      "open-meteo-gfs",
      "Open-Meteo · GFS seamless blend",
      omOpts,
    ),
    fetchOpenMeteoModel(
      lat,
      lon,
      timezone,
      "ecmwf_ifs025",
      "open-meteo-ecmwf",
      "Open-Meteo · ECMWF IFS 0.25°",
      omOpts,
    ),
    fetchNwsHourly(lat, lon),
  ]);

  const sources: WeatherSourceBundle[] = [];
  if (gfs) sources.push(gfs);
  if (ecmwf) sources.push(ecmwf);
  if (nws) sources.push(nws);

  if (!sources.length) {
    return { ok: false, error: "All weather sources failed" };
  }

  const primary = primaryOpenMeteo(sources);
  if (!primary) {
    return { ok: false, error: "No Open-Meteo source available" };
  }

  const gfsHourly = gfs?.hourly ?? [];
  const ecmwfHourly = ecmwf?.hourly ?? [];
  const spreadMap =
    gfsHourly.length && ecmwfHourly.length
      ? modelSpreadByDate(gfsHourly, ecmwfHourly)
      : new Map<string, number>();

  const uniqueDates = [
    ...new Set(primary.hourly.map((h) => h.time.slice(0, 10))),
  ].sort();

  const daySummaries = uniqueDates
    .map((d) => summarizeDayFromHourly(primary.hourly, d))
    .filter(Boolean)
    .map((s) =>
      mergeDaySummaryWithSpread(s!, spreadMap.get(s!.date) ?? null),
    );

  const primaryHourlyForDay = primary.hourly.filter(
    (h) => h.time.slice(0, 10) === anchorDate,
  );

  return {
    ok: true,
    response: {
      lat,
      lon,
      timezone,
      anchorDate,
      fetchedAt: new Date().toISOString(),
      sources,
      explanations: buildExplanations(sources),
      daySummaries,
      primaryHourlyForDay,
    },
  };
}

/**
 * Slice `daySummaries` to a window around `anchorDate`: up to `before` days of
 * history plus `max` days total starting from there.
 */
export function capDaySummariesAroundAnchor<
  T extends { date: string },
>(daySummaries: T[], anchorDate: string, max: number, before = 2): T[] {
  if (daySummaries.length <= max) return daySummaries;
  let anchorIdx = daySummaries.findIndex((d) => d.date >= anchorDate);
  if (anchorIdx === -1) anchorIdx = daySummaries.length;
  const start = Math.max(0, Math.min(anchorIdx - before, daySummaries.length - max));
  return daySummaries.slice(start, start + max);
}
