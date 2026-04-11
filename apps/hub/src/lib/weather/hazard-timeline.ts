import type { WeatherHourly } from "./types";

/** 0 = calm … 3 = severe (thunder / hail / heavy ice). */
export type HazardTier = 0 | 1 | 2 | 3;

export function hazardTierFromWeatherCode(code: number): HazardTier {
  if (code === 95 || code === 96 || code === 97 || code === 99) return 3;
  if (code === 66 || code === 67 || code === 82 || code === 86) return 2;
  if (
    code === 71 ||
    code === 73 ||
    code === 75 ||
    code === 77 ||
    code === 85
  )
    return 2;
  if (code === 65 || code === 81) return 2;
  if (
    code === 45 ||
    code === 48 ||
    code === 51 ||
    code === 53 ||
    code === 55 ||
    code === 56 ||
    code === 57 ||
    code === 61 ||
    code === 63 ||
    code === 80
  )
    return 1;
  if (code === 1 || code === 2 || code === 3) return 1;
  return 0;
}

export const HAZARD_TIER_STYLES: Record<
  HazardTier,
  { bar: string; label: string }
> = {
  0: {
    bar: "bg-emerald-500/90",
    label: "Calm / dry",
  },
  1: {
    bar: "bg-amber-400/95",
    label: "Worth watching",
  },
  2: {
    bar: "bg-orange-500/95",
    label: "Rough conditions",
  },
  3: {
    bar: "bg-red-600/95",
    label: "High impact",
  },
};

/** Next up to `maxHours` rows at/after `now` (model clock), capped by array length. */
export function upcomingHourlyWindow(
  hourly: WeatherHourly[],
  nowMs: number,
  maxHours: number,
): WeatherHourly[] {
  if (!hourly.length || maxHours <= 0) return [];
  const slack = 20 * 60 * 1000;
  const future = hourly.filter((h) => {
    const t = new Date(h.time).getTime();
    return Number.isFinite(t) && t >= nowMs - slack;
  });
  return future.slice(0, maxHours);
}
