import type { DayWeatherSummary, WeatherHourly } from "./types";
import type { DrillJob } from "../scheduling-data";

export type JobWeatherAdvice = {
  bullets: string[];
  severity: "info" | "caution" | "critical";
};

const OFF_DRIVE_THRESHOLD_FT = 30;
const STRONG_WIND_MPH = 22;
const HIGH_POP = 45;
const MUD_POP = 35;

export function buildJobWeatherAdvice(
  job: DrillJob,
  daySummary: DayWeatherSummary | null,
  hourly: WeatherHourly[],
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

  if (maxWind != null && maxWind >= STRONG_WIND_MPH) {
    bullets.push(
      `Gusty conditions (winds toward ${maxWind} mph in the hourly blend). Check mast handling, loose items on the flatbed, and dust-out on gravel approaches.`,
    );
    severity = severity === "critical" ? "critical" : "caution";
  }

  if (minT != null && minT <= 33 && maxPop != null && maxPop >= 25) {
    bullets.push(
      "Cold-wet overlap: watch for freezing mud on access lanes and frozen hoses overnight; later-day thaw can hide ice under melt.",
    );
    severity = severity === "critical" ? "critical" : "caution";
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
      `Models disagree on rain chance by ~${Math.round(daySummary.modelSpreadPop)} points — use live radar the morning of and keep a flex half-day if possible.`,
    );
  }

  if (!bullets.length) {
    bullets.push(
      "No major weather red flags from the blended outlook. Still verify field mud at the access and watch NWS for warnings day-of.",
    );
  }

  return { bullets, severity };
}
