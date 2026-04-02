import type { DrillJob, JobsPerDay, ScheduleConfig } from "./scheduling-data";
import { addCalendarDays } from "./scheduling-data";

export function weekdayDatesFromMonday(mondayIso: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => addCalendarDays(mondayIso, i));
}

/** Weekday-only dates inside a calendar month (local). */
export function weekdayDatesInMonth(year: number, monthIndex: number): string[] {
  const out: string[] = [];
  const last = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const d = new Date(year, monthIndex, day);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function jobsForCell(
  jobs: DrillJob[],
  date: string,
  crewIndex: number,
  daySlot: number,
  jobsPerDay: JobsPerDay,
): DrillJob[] {
  if (jobsPerDay === 1 && daySlot !== 0) return [];
  return jobs.filter(
    (j) =>
      j.date === date &&
      j.crewIndex === crewIndex &&
      j.daySlot === (daySlot as 0 | 1),
  );
}

export type RearrangeSuggestion = {
  title: string;
  detail: string;
  /** job ids to highlight */
  relatedJobIds: string[];
};

/**
 * Lightweight planner copy for emergencies / doubles — replace with solver + live traffic later.
 */
export function buildSchedulingInsights(
  jobs: DrillJob[],
  config: ScheduleConfig,
): RearrangeSuggestion[] {
  const suggestions: RearrangeSuggestion[] = [];
  const byDate = new Map<string, DrillJob[]>();
  for (const j of jobs) {
    const list = byDate.get(j.date) ?? [];
    list.push(j);
    byDate.set(j.date, list);
  }

  for (const [date, dayJobs] of byDate) {
    const emergencies = dayJobs.filter((j) => j.isEmergency);
    const longAccess = dayJobs.filter((j) => j.feetOffDrive > 30);
    if (emergencies.length && longAccess.length) {
      suggestions.push({
        title: `${date}: emergency + long access`,
        detail:
          "Emergency work is paired with a >30 ft off-drive site. Consider staging gravel/mats and bumping the non-emergency job if soil is wet — truck recovery is costly.",
        relatedJobIds: [...emergencies, ...longAccess].map((j) => j.id),
      });
    }

    if (config.jobsPerDay === 1) {
      const lowScore = dayJobs.filter((j) => j.routingFitScore < 60);
      if (lowScore.length >= 2) {
        suggestions.push({
          title: `${date}: combine low-fit days?`,
          detail:
            "Two weaker routing fits land the same day. If weather is clean, running both while crews are nearby can avoid repeating long drives later in the week.",
          relatedJobIds: lowScore.map((j) => j.id),
        });
      }
    }
  }

  const far = jobs.filter((j) => j.driveMinutesFromYard >= 90);
  if (far.length >= 2) {
    suggestions.push({
      title: "Long-drive cluster",
      detail:
        "Multiple 90+ minute hauls are on the board. Pair with weather checks before locking the week; ice or heavy rain multiplies turnaround time.",
      relatedJobIds: far.map((j) => j.id),
    });
  }

  return suggestions;
}

export function proposeEmergencySlot(
  jobs: DrillJob[],
  date: string,
  config: ScheduleConfig,
): { crewIndex: number; daySlot: 0 | 1; note: string } | null {
  for (let c = 0; c < config.activeCrews; c++) {
    for (let s = 0; s < config.jobsPerDay; s++) {
      const taken = jobs.some(
        (j) =>
          j.date === date && j.crewIndex === c && j.daySlot === (s as 0 | 1),
      );
      if (!taken) {
        return {
          crewIndex: c,
          daySlot: s as 0 | 1,
          note: `Open: Crew ${c + 1}, slot ${s + 1} on ${date}.`,
        };
      }
    }
  }
  return null;
}
