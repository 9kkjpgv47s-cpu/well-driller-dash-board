/**
 * Open-Meteo returns hourly `time` strings in the requested IANA timezone as
 * local wall clock (no `Z` suffix). Do not use `new Date(time)` for labels —
 * that parses as the viewer's browser timezone and shifts weekday/hour.
 */

import type { WeatherHourly } from "./types";

/** Calendar weekday for the date portion only (Gregorian; same in all zones). */
export function weekdayShortForYmd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const noonUtc = Date.UTC(y, mo - 1, d, 12, 0, 0);
  return new Date(noonUtc).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** Format a single Open-Meteo hourly timestamp for display (wall clock from string). */
export function formatOpenMeteoWallClock(time: string): string {
  const m = time.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/);
  if (!m) return time;
  const ymd = m[1];
  const hh = parseInt(m[2], 10);
  const mm = m[3];
  const wd = weekdayShortForYmd(ymd);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${wd} ${h12}:${mm} ${ampm}`;
}

export function hourlyRowsForAnchorDate(
  hourly: WeatherHourly[],
  anchorDate: string,
): WeatherHourly[] {
  return hourly.filter((h) => h.time.slice(0, 10) === anchorDate);
}
