import type {
  DayWeatherSummary,
  WeatherHourly,
  WeatherSourceBundle,
} from "./types";

function dateKeyFromLocalHourlyTime(time: string): string {
  return time.slice(0, 10);
}

export function summarizeDayFromHourly(
  hours: WeatherHourly[],
  date: string,
): DayWeatherSummary | null {
  const slice = hours.filter((h) => dateKeyFromLocalHourlyTime(h.time) === date);
  if (!slice.length) return null;

  let maxPop = -1;
  let maxWind = -1;
  let minT = Infinity;
  let maxT = -Infinity;
  let precipSum = 0;
  let precipKnown = false;
  let thunderstormHours = 0;
  const condCounts = new Map<string, number>();

  for (const h of slice) {
    if (h.precipPop != null) maxPop = Math.max(maxPop, h.precipPop);
    if (h.precipInches != null) {
      precipSum += h.precipInches;
      precipKnown = true;
    }
    if (h.windMph != null) maxWind = Math.max(maxWind, h.windMph);
    minT = Math.min(minT, h.tempF);
    maxT = Math.max(maxT, h.tempF);
    if (
      (h.weatherCode >= 95 && h.weatherCode <= 99) ||
      /thunder/i.test(h.conditionLabel)
    ) {
      thunderstormHours++;
    }
    condCounts.set(
      h.conditionLabel,
      (condCounts.get(h.conditionLabel) ?? 0) + 1,
    );
  }

  let dominantCondition = slice[Math.floor(slice.length / 2)].conditionLabel;
  let best = 0;
  for (const [k, v] of condCounts) {
    if (v > best) {
      best = v;
      dominantCondition = k;
    }
  }

  return {
    date,
    maxPrecipPop: maxPop < 0 ? null : maxPop,
    maxWindMph: maxWind < 0 ? null : maxWind,
    minTempF: Number.isFinite(minT) ? minT : null,
    maxTempF: Number.isFinite(maxT) ? maxT : null,
    dominantCondition,
    totalPrecipInches: precipKnown ? precipSum : null,
    thunderstormHours,
  };
}

export function modelSpreadByDate(
  a: WeatherHourly[],
  b: WeatherHourly[],
): Map<string, number> {
  const map = new Map<string, { maxA: number; maxB: number }>();

  for (const h of a) {
    const d = dateKeyFromLocalHourlyTime(h.time);
    if (h.precipPop == null) continue;
    const cur = map.get(d) ?? { maxA: -1, maxB: -1 };
    cur.maxA = Math.max(cur.maxA, h.precipPop);
    map.set(d, cur);
  }
  for (const h of b) {
    const d = dateKeyFromLocalHourlyTime(h.time);
    if (h.precipPop == null) continue;
    const cur = map.get(d) ?? { maxA: -1, maxB: -1 };
    cur.maxB = Math.max(cur.maxB, h.precipPop);
    map.set(d, cur);
  }

  const spread = new Map<string, number>();
  for (const [d, { maxA, maxB }] of map) {
    if (maxA >= 0 && maxB >= 0) spread.set(d, Math.abs(maxA - maxB));
  }
  return spread;
}

export function buildExplanations(sources: WeatherSourceBundle[]): string[] {
  const lines: string[] = [];
  const om = sources.filter((s) => s.provider === "Open-Meteo");
  if (om.length >= 2) {
    lines.push(
      "GFS-family and ECMWF-family runs are both shown. When max rain chance differs by more than ~20 points, treat the day as “uncertain” and watch radar the morning of.",
    );
  }
  const nws = sources.find((s) => s.id === "nws-hourly");
  if (nws) {
    lines.push(
      "NWS grid data is authoritative for watches/warnings in the US; use it alongside global models for a second opinion.",
    );
  } else {
    lines.push(
      "NWS hourly was unavailable (location may be outside the US grid or the service throttled). Open-Meteo still updates every ~15 minutes upstream; this app caches ~15 minutes.",
    );
  }
  lines.push(
    "Figures refresh on a short server cache so a morning vs afternoon check in the hub can show a newer run without hammering free APIs.",
  );
  return lines;
}

export function primaryOpenMeteo(
  sources: WeatherSourceBundle[],
): WeatherSourceBundle | null {
  const gfs = sources.find((s) => s.id === "open-meteo-gfs");
  if (gfs) return gfs;
  return sources.find((s) => s.provider === "Open-Meteo") ?? null;
}

export function mergeDaySummaryWithSpread(
  base: DayWeatherSummary,
  spread: number | null | undefined,
): DayWeatherSummary {
  return { ...base, modelSpreadPop: spread ?? null };
}
