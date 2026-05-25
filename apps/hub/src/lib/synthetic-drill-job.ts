import type { DrillJob } from "./scheduling-data";

/** Job-date string for weather API (YYYY-MM-DD) in a fixed Indiana zone. */
export function todayIsoDateInTimeZone(
  timeZone = "America/Indiana/Indianapolis",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (y && m && d) return `${y}-${m}-${d}`;
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fabricates a {@link DrillJob} so {@link JobWeatherPanel} can run without the scheduling board.
 * Uses conservative defaults for access length / drive when unknown.
 */
export function syntheticDrillJobForWeather(input: {
  lat: number;
  lon: number;
  title: string;
  county: string;
  date?: string;
  feetOffDrive?: number;
  driveMinutesFromYard?: number;
  isEmergency?: boolean;
}): DrillJob {
  const date = input.date ?? todayIsoDateInTimeZone();
  return {
    id: `hub-site-${input.lat.toFixed(5)}-${input.lon.toFixed(5)}`,
    title: input.title,
    county: input.county,
    date,
    crewIndex: 0,
    daySlot: 0,
    rig: "Field",
    lead: "Crew",
    status: "planned",
    lat: input.lat,
    lon: input.lon,
    driveMinutesFromYard: input.driveMinutesFromYard ?? 0,
    feetOffDrive: input.feetOffDrive ?? 0,
    isEmergency: input.isEmergency ?? false,
    routingFitScore: 75,
    customerNotes: "Driller job sheet (hub)",
  };
}
