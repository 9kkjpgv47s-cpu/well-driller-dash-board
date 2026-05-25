import { summarizeDayFromHourly } from "./aggregate";
import { formatOpenMeteoWallClock } from "./open-meteo-display";
import type {
  DayWeatherSummary,
  WeatherApiResponse,
  WeatherHourly,
  WeatherSourceBundle,
} from "./types";
import type { DrillJob } from "../scheduling-data";

export type JobWeatherAdvice = {
  bullets: string[];
  severity: "info" | "caution" | "critical";
};

export type ConsolidatedFieldWeatherAdvice = {
  general: string[];
  critical: string[];
};

const OFF_DRIVE_THRESHOLD_FT = 30;
const CAUTION_WIND_MPH = 22;
const CRITICAL_WIND_MPH = 40;
const CRITICAL_COLD_F = 15;
const HIGH_POP = 45;
const MUD_POP = 35;

function sourceShortLabel(source: WeatherSourceBundle): string {
  if (source.id === "open-meteo-gfs") return "GFS";
  if (source.id === "open-meteo-ecmwf") return "ECMWF";
  if (source.id === "nws-hourly") return "NWS";
  return source.label.split("·").pop()?.trim() ?? source.label;
}

function hoursForDate(source: WeatherSourceBundle, date: string): WeatherHourly[] {
  return source.hourly.filter((h) => h.time.slice(0, 10) === date);
}

function peakPopForDate(source: WeatherSourceBundle, date: string): number | null {
  let max = -1;
  for (const h of hoursForDate(source, date)) {
    if (h.precipPop != null) max = Math.max(max, h.precipPop);
  }
  return max < 0 ? null : max;
}

function totalPrecipForDate(source: WeatherSourceBundle, date: string): number | null {
  let sum = 0;
  let known = false;
  for (const h of hoursForDate(source, date)) {
    if (h.precipInches == null) continue;
    sum += h.precipInches;
    known = true;
  }
  return known ? sum : null;
}

function isThunderstormHour(h: WeatherHourly): boolean {
  if (h.weatherCode >= 95 && h.weatherCode <= 99) return true;
  return /thunder/i.test(h.conditionLabel);
}

function formatClockTimeOnly(time: string): string {
  const m = time.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/);
  if (!m) return formatOpenMeteoWallClock(time);
  const hh = parseInt(m[2], 10);
  const mm = m[3];
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

function describeThunderstormWindow(hours: WeatherHourly[]): string | null {
  const stormHours = hours.filter(isThunderstormHour);
  if (!stormHours.length) return null;

  const sorted = [...stormHours].sort((a, b) => a.time.localeCompare(b.time));
  const start = formatClockTimeOnly(sorted[0].time);
  const end = formatClockTimeOnly(sorted[sorted.length - 1].time);
  const duration = stormHours.length;

  return `Thunderstorms expected roughly ${start}–${end} (~${duration} hour${duration === 1 ? "" : "s"} in the hourly forecast). Treat as a go/no-go factor for mast work and crew safety.`;
}

function formatFriendlyJobDate(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function describeExpectedRainfall(
  totals: number[],
  dateLabel: string,
): string | null {
  if (!totals.length) return null;
  const best = Math.max(...totals);
  if (best < 0.05) return null;
  if (best < 0.25) {
    return `Little rain accumulation expected for ${dateLabel}.`;
  }
  if (best < 0.75) {
    return `Some rain likely ${dateLabel} — plan for wet access and softer shoulders.`;
  }
  return `Heavy rain possible ${dateLabel} — watch mud on the drive and rig access.`;
}

export function buildConsolidatedFieldWeatherAdvice(
  job: DrillJob,
  data: WeatherApiResponse,
): ConsolidatedFieldWeatherAdvice {
  const general: string[] = [];
  const critical: string[] = [];
  const targetDate = job.date || data.anchorDate;

  const longAccess = job.feetOffDrive > OFF_DRIVE_THRESHOLD_FT;
  if (longAccess) {
    general.push(
      `Site is ${job.feetOffDrive} ft off the drive — above the ${OFF_DRIVE_THRESHOLD_FT} ft line where mud and recovery risk jump. Treat weather as a go/no-go input, not a nicety.`,
    );
  }

  const pops = data.sources
    .map((source) => ({
      label: sourceShortLabel(source),
      pop: peakPopForDate(source, targetDate),
    }))
    .filter((entry): entry is { label: string; pop: number } => entry.pop != null);

  const maxPopOverall = pops.length ? Math.max(...pops.map((p) => p.pop)) : null;

  if (pops.length >= 2 && maxPopOverall != null && maxPopOverall >= MUD_POP) {
    general.push(
      `Model peak rain chances: ${pops.map((p) => `${p.label} ${p.pop}%`).join(", ")}. Expect slower rig moves and softer shoulders.`,
    );
  } else if (maxPopOverall != null && maxPopOverall >= MUD_POP) {
    general.push(
      `Peak rain chance near ${maxPopOverall}% for this day. ${longAccess ? "With long access, plan mats, a winch point, or a reschedule window." : "Expect slower rig moves and softer shoulders."}`,
    );
  }

  const daySummary = data.daySummaries.find((d) => d.date === targetDate);
  if (daySummary?.modelSpreadPop != null && daySummary.modelSpreadPop >= 20) {
    general.push(
      `Models disagree on rain chance by ~${Math.round(daySummary.modelSpreadPop)} points — check live radar the morning of.`,
    );
  }

  const precipTotals = data.sources
    .filter((s) => s.provider === "Open-Meteo")
    .map((source) => totalPrecipForDate(source, targetDate))
    .filter((total): total is number => total != null);

  const rainLine = describeExpectedRainfall(
    precipTotals,
    formatFriendlyJobDate(targetDate),
  );
  if (rainLine) general.push(rainLine);

  let maxWind = -1;
  let minTemp = Infinity;
  for (const source of data.sources) {
    const summary = summarizeDayFromHourly(source.hourly, targetDate);
    if (summary?.maxWindMph != null) maxWind = Math.max(maxWind, summary.maxWindMph);
    if (summary?.minTempF != null) minTemp = Math.min(minTemp, summary.minTempF);
  }

  if (maxWind >= CRITICAL_WIND_MPH) {
    critical.push(
      `High winds toward ${Math.round(maxWind)} mph — strong go/no-go for mast handling and loose gear on the flatbed.`,
    );
  } else if (maxWind >= CAUTION_WIND_MPH) {
    general.push(
      `Gusty conditions (winds toward ${Math.round(maxWind)} mph in the hourly blend). Check mast handling, loose items on the flatbed, and dust-out on gravel approaches.`,
    );
  }

  if (minTemp <= CRITICAL_COLD_F) {
    critical.push(
      `Cold snap with lows near ${Math.round(minTemp)}°F — watch hydraulics, hose freezing, and crew exposure.`,
    );
  }

  if (
    minTemp <= 33 &&
    maxPopOverall != null &&
    maxPopOverall >= 25 &&
    minTemp > CRITICAL_COLD_F
  ) {
    general.push(
      "Cold-wet overlap: watch for freezing mud on access lanes and frozen hoses overnight; later-day thaw can hide ice under melt.",
    );
  }

  const gfs = data.sources.find((s) => s.id === "open-meteo-gfs");
  const stormSource = gfs ?? data.sources[0];
  if (stormSource) {
    const stormMsg = describeThunderstormWindow(
      hoursForDate(stormSource, targetDate),
    );
    if (stormMsg) critical.push(stormMsg);
  }

  if (longAccess && maxPopOverall != null && maxPopOverall >= HIGH_POP) {
    critical.push(
      `Site is ${job.feetOffDrive} ft off the drive with rain chances up to ${maxPopOverall}% — high mud/access risk for the rig.`,
    );
  }

  if (job.isEmergency) {
    general.push(
      "Emergency / no-water: prioritize crew + homeowner safety over schedule aesthetics. If you double up another job the same day, keep a bailout time so this call still gets daylight.",
    );
  }

  if (job.driveMinutesFromYard >= 90) {
    general.push(
      `Long haul (${job.driveMinutesFromYard} min one-way). Weather delays stack with drive — consider staging consumables the night before.`,
    );
  }

  if (!general.length && !critical.length) {
    general.push(
      "No major weather red flags from the blended outlook. Still verify field mud at the access and watch NWS for warnings day-of.",
    );
  }

  return { general, critical };
}

export function buildJobWeatherAdvice(
  job: DrillJob,
  daySummary: DayWeatherSummary | null,
): JobWeatherAdvice {
  const bullets: string[] = [];
  let severity: JobWeatherAdvice["severity"] = "info";

  const longAccess = job.feetOffDrive > OFF_DRIVE_THRESHOLD_FT;
  const maxPop = daySummary?.maxPrecipPop ?? null;
  const maxWind = daySummary?.maxWindMph ?? null;
  const minT = daySummary?.minTempF ?? null;

  if (longAccess) {
    bullets.push(
      `Site is ${job.feetOffDrive} ft off the drive — above the ${OFF_DRIVE_THRESHOLD_FT} ft line where mud and recovery risk jump. Treat weather as a go/no-go input, not a nicety.`,
    );
    severity = "caution";
  }

  if (maxPop != null && maxPop >= HIGH_POP) {
    bullets.push(
      `Peak rain chance near ${maxPop}% for this day. ${longAccess ? "With long access, plan mats, a winch point, or a reschedule window." : "Expect slower rig moves and softer shoulders."}`,
    );
    if (longAccess || maxPop >= 60) severity = "critical";
    else severity = "caution";
  } else if (maxPop != null && maxPop >= MUD_POP && longAccess) {
    bullets.push(
      `Moderate rain chance (~${maxPop}%) plus long access — enough to rut a heavy drill rig if soils are clay-heavy.`,
    );
    severity = "caution";
  }

  if (maxWind != null && maxWind >= CRITICAL_WIND_MPH) {
    bullets.push(
      `High winds toward ${maxWind} mph — strong go/no-go for mast handling and loose gear on the flatbed.`,
    );
    severity = "critical";
  } else if (maxWind != null && maxWind >= CAUTION_WIND_MPH) {
    bullets.push(
      `Gusty conditions (winds toward ${maxWind} mph in the hourly blend). Check mast handling, loose items on the flatbed, and dust-out on gravel approaches.`,
    );
    severity = severity === "critical" ? "critical" : "caution";
  }

  if (minT != null && minT <= CRITICAL_COLD_F) {
    bullets.push(
      `Cold snap with lows near ${minT}°F — watch hydraulics, hose freezing, and crew exposure.`,
    );
    severity = "critical";
  } else if (minT != null && minT <= 33 && maxPop != null && maxPop >= 25) {
    bullets.push(
      "Cold-wet overlap: watch for freezing mud on access lanes and frozen hoses overnight; later-day thaw can hide ice under melt.",
    );
    severity = severity === "critical" ? "critical" : "caution";
  }

  if (
    daySummary?.thunderstormHours != null &&
    daySummary.thunderstormHours > 0
  ) {
    bullets.push(
      `Thunderstorms in the hourly outlook (${daySummary.thunderstormHours} hour${daySummary.thunderstormHours === 1 ? "" : "s"}) — treat as a go/no-go factor for mast work and crew safety.`,
    );
    severity = "critical";
  }

  if (daySummary?.totalPrecipInches != null && daySummary.totalPrecipInches >= 0.05) {
    const rainLine = describeExpectedRainfall(
      [daySummary.totalPrecipInches],
      formatFriendlyJobDate(daySummary.date),
    );
    if (rainLine) bullets.push(rainLine);
  }

  if (job.isEmergency) {
    bullets.push(
      "Emergency / no-water: prioritize crew + homeowner safety over schedule aesthetics. If you double up another job the same day, keep a bailout time so this call still gets daylight.",
    );
  }

  if (job.driveMinutesFromYard >= 90) {
    bullets.push(
      `Long haul (${job.driveMinutesFromYard} min one-way). Weather delays stack with drive — consider staging consumables the night before.`,
    );
  }

  if (daySummary?.modelSpreadPop != null && daySummary.modelSpreadPop >= 20) {
    bullets.push(
      `Models disagree on rain chance by ~${Math.round(daySummary.modelSpreadPop)} points — check live radar the morning of.`,
    );
  }

  if (!bullets.length) {
    bullets.push(
      "No major weather red flags from the blended outlook. Still verify field mud at the access and watch NWS for warnings day-of.",
    );
  }

  return { bullets, severity };
}
