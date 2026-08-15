import { describe, expect, it } from "vitest";
import {
  DEMO_DRILLER_SESSION_LEAD,
  expandJobsForCurrentDemoWeek,
  findDemoJobById,
  getDemoDrillerUpcomingJobs,
} from "./driller-demo-session";
import { expandDemoJobs, mondayOfWeekContaining } from "./scheduling-data";

const wednesday = new Date(2025, 5, 11, 9, 0, 0);

describe("expandJobsForCurrentDemoWeek", () => {
  it("anchors the demo board on the Monday of the given week", () => {
    expect(expandJobsForCurrentDemoWeek(wednesday)).toEqual(
      expandDemoJobs(mondayOfWeekContaining(wednesday)),
    );
  });
});

describe("getDemoDrillerUpcomingJobs", () => {
  it("keeps only the demo lead's unfinished jobs, sorted by date", () => {
    const jobs = getDemoDrillerUpcomingJobs(wednesday);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => j.lead === DEMO_DRILLER_SESSION_LEAD)).toBe(true);
    expect(jobs.every((j) => j.status !== "complete")).toBe(true);
    expect(jobs.map((j) => j.date)).toEqual(
      [...jobs.map((j) => j.date)].sort((a, b) => a.localeCompare(b)),
    );
  });
});

describe("findDemoJobById", () => {
  it("finds a job from the same week and misses unknown ids", () => {
    const first = expandJobsForCurrentDemoWeek(wednesday)[0];
    expect(findDemoJobById(first.id, wednesday)).toEqual(first);
    expect(findDemoJobById("job-nope", wednesday)).toBeUndefined();
  });
});
