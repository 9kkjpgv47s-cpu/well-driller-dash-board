import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  demoJobSeeds,
  expandDemoJobs,
  formatShortDate,
  mondayOfWeekContaining,
} from "./scheduling-data";

describe("addCalendarDays", () => {
  it("moves forward and backward across month and year ends", () => {
    expect(addCalendarDays("2025-01-31", 1)).toBe("2025-02-01");
    expect(addCalendarDays("2025-03-01", -1)).toBe("2025-02-28");
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addCalendarDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addCalendarDays("2025-06-10", 0)).toBe("2025-06-10");
  });
});

describe("mondayOfWeekContaining", () => {
  it("returns the Monday for every weekday of the same week", () => {
    // 2025-06-09 is a Monday.
    for (let i = 0; i < 6; i++) {
      const d = new Date(2025, 5, 9 + i, 12, 0, 0);
      expect(mondayOfWeekContaining(d)).toBe("2025-06-09");
    }
  });

  it("treats Sunday as the end of the previous week", () => {
    const sunday = new Date(2025, 5, 15, 12, 0, 0);
    expect(mondayOfWeekContaining(sunday)).toBe("2025-06-09");
  });
});

describe("expandDemoJobs", () => {
  it("dates every seed off the anchor Monday and gives stable unique ids", () => {
    const jobs = expandDemoJobs("2025-06-09");
    expect(jobs).toHaveLength(demoJobSeeds.length);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(jobs.length);
    expect(jobs).toEqual(expandDemoJobs("2025-06-09"));

    jobs.forEach((job, i) => {
      const seed = demoJobSeeds[i];
      expect(job.date).toBe(addCalendarDays("2025-06-09", seed.weekdayOffset));
      expect(job.title).toBe(seed.title);
      expect(job.crewIndex).toBe(seed.crewIndex);
      expect(job.daySlot).toBe(seed.daySlot);
      expect(job).not.toHaveProperty("weekdayOffset");
    });
  });
});

describe("formatShortDate", () => {
  it("formats from the date parts without timezone drift", () => {
    expect(formatShortDate("2025-06-09")).toContain("9");
    expect(formatShortDate("2025-01-01")).not.toBe("");
  });
});
