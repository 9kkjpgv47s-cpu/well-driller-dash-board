import { describe, expect, it } from "vitest";
import type { DrillJob, ScheduleConfig } from "./scheduling-data";
import {
  buildSchedulingInsights,
  jobsForCell,
  proposeEmergencySlot,
  weekdayDatesFromMonday,
  weekdayDatesInMonth,
} from "./scheduling-logic";

function job(over: Partial<DrillJob>): DrillJob {
  return {
    id: "j1",
    title: "Test job",
    county: "Hamilton",
    date: "2025-06-09",
    crewIndex: 0,
    daySlot: 0,
    rig: "Rig-1",
    lead: "Lead",
    status: "planned",
    lat: 40,
    lon: -86,
    driveMinutesFromYard: 30,
    feetOffDrive: 10,
    isEmergency: false,
    routingFitScore: 80,
    ...over,
  };
}

const config: ScheduleConfig = { activeCrews: 3, jobsPerDay: 1 };

describe("weekdayDatesFromMonday", () => {
  it("returns Monday through Friday", () => {
    expect(weekdayDatesFromMonday("2025-06-09")).toEqual([
      "2025-06-09",
      "2025-06-10",
      "2025-06-11",
      "2025-06-12",
      "2025-06-13",
    ]);
  });
});

describe("weekdayDatesInMonth", () => {
  it("skips weekends and covers the whole month", () => {
    const days = weekdayDatesInMonth(2025, 5); // June 2025
    expect(days).toHaveLength(21);
    expect(days[0]).toBe("2025-06-02");
    expect(days.at(-1)).toBe("2025-06-30");
    for (const d of days) {
      const wd = new Date(`${d}T12:00:00.000Z`).getUTCDay();
      expect(wd).not.toBe(0);
      expect(wd).not.toBe(6);
    }
  });

  it("handles February in a leap year", () => {
    const days = weekdayDatesInMonth(2024, 1);
    expect(days).toHaveLength(21);
    expect(days.at(-1)).toBe("2024-02-29");
  });
});

describe("jobsForCell", () => {
  const jobs = [
    job({ id: "a", crewIndex: 0, daySlot: 0 }),
    job({ id: "b", crewIndex: 0, daySlot: 1 }),
    job({ id: "c", crewIndex: 1, daySlot: 0 }),
    job({ id: "d", date: "2025-06-10", crewIndex: 0, daySlot: 0 }),
  ];

  it("matches on date, crew and slot", () => {
    expect(jobsForCell(jobs, "2025-06-09", 0, 0, 2).map((j) => j.id)).toEqual(["a"]);
    expect(jobsForCell(jobs, "2025-06-09", 0, 1, 2).map((j) => j.id)).toEqual(["b"]);
    expect(jobsForCell(jobs, "2025-06-10", 0, 0, 2).map((j) => j.id)).toEqual(["d"]);
  });

  it("has no second slot when running one job per day", () => {
    expect(jobsForCell(jobs, "2025-06-09", 0, 1, 1)).toEqual([]);
  });
});

describe("buildSchedulingInsights", () => {
  it("returns nothing for a quiet board", () => {
    expect(buildSchedulingInsights([job({})], config)).toEqual([]);
  });

  it("pairs an emergency with a long-access site on the same day", () => {
    const emergency = job({ id: "e", isEmergency: true, feetOffDrive: 10 });
    const longAccess = job({ id: "l", feetOffDrive: 120 });
    const insights = buildSchedulingInsights([emergency, longAccess], config);
    const hit = insights.find((s) => s.title.includes("emergency + long access"));
    expect(hit?.relatedJobIds).toEqual(["e", "l"]);
  });

  it("suggests combining two low-fit jobs only when running one job per day", () => {
    const jobs = [
      job({ id: "x", routingFitScore: 40 }),
      job({ id: "y", routingFitScore: 55, crewIndex: 1 }),
    ];
    expect(
      buildSchedulingInsights(jobs, config).some((s) =>
        s.title.includes("combine low-fit"),
      ),
    ).toBe(true);
    expect(
      buildSchedulingInsights(jobs, { ...config, jobsPerDay: 2 }).some((s) =>
        s.title.includes("combine low-fit"),
      ),
    ).toBe(false);
  });

  it("calls out long-drive clusters across the whole board", () => {
    const jobs = [
      job({ id: "f1", driveMinutesFromYard: 90 }),
      job({ id: "f2", date: "2025-06-11", driveMinutesFromYard: 130 }),
    ];
    const hit = buildSchedulingInsights(jobs, config).find(
      (s) => s.title === "Long-drive cluster",
    );
    expect(hit?.relatedJobIds).toEqual(["f1", "f2"]);
  });

  it("needs two long drives before flagging a cluster", () => {
    const jobs = [job({ id: "f1", driveMinutesFromYard: 200 })];
    expect(
      buildSchedulingInsights(jobs, config).some(
        (s) => s.title === "Long-drive cluster",
      ),
    ).toBe(false);
  });
});

describe("proposeEmergencySlot", () => {
  it("returns the first open crew slot for the date", () => {
    const jobs = [job({ crewIndex: 0 })];
    expect(proposeEmergencySlot(jobs, "2025-06-09", config)).toEqual({
      crewIndex: 1,
      daySlot: 0,
      note: "Open: Crew 2, slot 1 on 2025-06-09.",
    });
  });

  it("uses the second slot of a crew when running two jobs per day", () => {
    const jobs = [
      job({ crewIndex: 0, daySlot: 0 }),
      job({ crewIndex: 1, daySlot: 0 }),
      job({ crewIndex: 2, daySlot: 0 }),
    ];
    expect(
      proposeEmergencySlot(jobs, "2025-06-09", { ...config, jobsPerDay: 2 }),
    ).toMatchObject({ crewIndex: 0, daySlot: 1 });
  });

  it("returns null when every crew slot is taken", () => {
    const jobs = [0, 1, 2].map((c) => job({ id: `c${c}`, crewIndex: c }));
    expect(proposeEmergencySlot(jobs, "2025-06-09", config)).toBeNull();
  });

  it("ignores jobs on other dates", () => {
    const jobs = [job({ date: "2025-06-10", crewIndex: 0 })];
    expect(proposeEmergencySlot(jobs, "2025-06-09", config)).toMatchObject({
      crewIndex: 0,
    });
  });
});
