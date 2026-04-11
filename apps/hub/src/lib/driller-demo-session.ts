import type { DrillJob } from "./scheduling-data";
import { expandDemoJobs, mondayOfWeekContaining } from "./scheduling-data";

/**
 * Pretend the hub is scoped to this lead until real accounts exist.
 * Swap for API/session user later.
 */
export const DEMO_DRILLER_SESSION_LEAD = "M. Cole";

function anchorFor(now: Date): string {
  return mondayOfWeekContaining(now);
}

export function expandJobsForCurrentDemoWeek(now = new Date()): DrillJob[] {
  return expandDemoJobs(anchorFor(now));
}

/** Scheduled jobs for the demo driller that are not finished — upcoming / in progress. */
export function getDemoDrillerUpcomingJobs(now = new Date()): DrillJob[] {
  return expandJobsForCurrentDemoWeek(now)
    .filter(
      (j) =>
        j.lead === DEMO_DRILLER_SESSION_LEAD && j.status !== "complete",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findDemoJobById(
  jobId: string,
  now = new Date(),
): DrillJob | undefined {
  return expandJobsForCurrentDemoWeek(now).find((j) => j.id === jobId);
}
