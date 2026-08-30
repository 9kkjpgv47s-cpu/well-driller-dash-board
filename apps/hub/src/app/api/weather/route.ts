import { cachedJson, jsonError } from "@/lib/api/responses";
import { INVALID_LAT_LON_ERROR, isValidLatLon } from "@/lib/api/geo-query";
import {
  buildExplanations,
  mergeDaySummaryWithSpread,
  modelSpreadByDate,
  primaryOpenMeteo,
  summarizeDayFromHourly,
} from "@/lib/weather/aggregate";
import { fetchOpenMeteoModel } from "@/lib/weather/open-meteo";
import { fetchNwsHourly } from "@/lib/weather/nws";
import type { WeatherApiResponse, WeatherSourceBundle } from "@/lib/weather/types";
import { todayIsoDateInTimeZone } from "@/lib/synthetic-drill-job";

function openMeteoWindowForAnchor(anchorDate: string, timezone: string) {
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

const DEFAULT_TIMEZONE = "America/Indiana/Indianapolis";

/** IANA-style zone names only — the value is forwarded to upstream weather APIs. */
function safeTimezone(raw: string | null): string {
  if (!raw) return DEFAULT_TIMEZONE;
  if (!/^[A-Za-z][A-Za-z0-9+_-]*(\/[A-Za-z0-9+_-]+){0,2}$/.test(raw)) {
    return DEFAULT_TIMEZONE;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const timezone = safeTimezone(searchParams.get("timezone"));
  const rawDate = searchParams.get("date");
  const today = todayIsoDateInTimeZone(timezone);
  const anchorDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  if (!isValidLatLon(lat, lon)) {
    return jsonError(INVALID_LAT_LON_ERROR, 400);
  }

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
    return jsonError("All weather sources failed", 502);
  }

  const primary = primaryOpenMeteo(sources);
  if (!primary) {
    return jsonError("No Open-Meteo source available", 502);
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

  const body: WeatherApiResponse = {
    lat,
    lon,
    timezone,
    anchorDate,
    fetchedAt: new Date().toISOString(),
    sources,
    explanations: buildExplanations(sources),
    daySummaries,
    primaryHourlyForDay,
  };

  return cachedJson(body, 900);
}
