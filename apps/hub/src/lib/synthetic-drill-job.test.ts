import { afterEach, describe, expect, it, vi } from "vitest";
import {
  syntheticDrillJobForWeather,
  todayIsoDateInTimeZone,
} from "./synthetic-drill-job";

describe("todayIsoDateInTimeZone", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the requested zone's calendar day, not UTC", () => {
    vi.useFakeTimers();
    // 03:30 UTC on 2025-06-10 is still 2025-06-09 in Indiana (UTC-4).
    vi.setSystemTime(new Date("2025-06-10T03:30:00.000Z"));
    expect(todayIsoDateInTimeZone()).toBe("2025-06-09");
    expect(todayIsoDateInTimeZone("UTC")).toBe("2025-06-10");
  });
});

describe("syntheticDrillJobForWeather", () => {
  it("fills conservative defaults and a coordinate-derived id", () => {
    const job = syntheticDrillJobForWeather({
      lat: 39.407954,
      lon: -85.862951,
      title: "Smith residence",
      county: "Decatur",
      date: "2025-06-09",
    });
    expect(job).toMatchObject({
      id: "hub-site-39.40795--85.86295",
      title: "Smith residence",
      county: "Decatur",
      date: "2025-06-09",
      crewIndex: 0,
      daySlot: 0,
      status: "planned",
      driveMinutesFromYard: 0,
      feetOffDrive: 0,
      isEmergency: false,
    });
  });

  it("passes through access, drive, and emergency overrides", () => {
    const job = syntheticDrillJobForWeather({
      lat: 39.5,
      lon: -86.2,
      title: "No-water call",
      county: "Marion",
      date: "2025-06-09",
      feetOffDrive: 180,
      driveMinutesFromYard: 95,
      isEmergency: true,
    });
    expect(job).toMatchObject({
      feetOffDrive: 180,
      driveMinutesFromYard: 95,
      isEmergency: true,
    });
  });

  it("defaults the date to today in the Indiana zone", () => {
    const job = syntheticDrillJobForWeather({
      lat: 39.5,
      lon: -86.2,
      title: "Job",
      county: "Marion",
    });
    expect(job.date).toBe(todayIsoDateInTimeZone());
  });
});
