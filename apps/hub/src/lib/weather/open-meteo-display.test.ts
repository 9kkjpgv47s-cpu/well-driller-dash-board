import { describe, expect, it } from "vitest";
import {
  formatOpenMeteoWallClock,
  hourlyRowsForAnchorDate,
  weekdayShortForYmd,
} from "./open-meteo-display";
import type { WeatherHourly } from "./types";

function hour(time: string): WeatherHourly {
  return {
    time,
    tempF: 70,
    precipPop: 0,
    precipInches: 0,
    cloudPct: 0,
    windMph: 5,
    windDirDeg: 180,
    weatherCode: 0,
    conditionLabel: "Clear",
    sourceId: "om-gfs",
    sourceLabel: "GFS",
  };
}

describe("weekdayShortForYmd", () => {
  it("names the weekday for the date portion", () => {
    expect(weekdayShortForYmd("2025-06-09")).toBe("Mon");
    expect(weekdayShortForYmd("2025-06-15")).toBe("Sun");
  });

  it("returns an empty string for malformed input", () => {
    expect(weekdayShortForYmd("2025-6-9")).toBe("");
    expect(weekdayShortForYmd("")).toBe("");
  });
});

describe("formatOpenMeteoWallClock", () => {
  it("keeps the provider's wall clock instead of shifting timezones", () => {
    expect(formatOpenMeteoWallClock("2025-06-09T00:00")).toBe("Mon 12:00 AM");
    expect(formatOpenMeteoWallClock("2025-06-09T07:00")).toBe("Mon 7:00 AM");
    expect(formatOpenMeteoWallClock("2025-06-09T12:30")).toBe("Mon 12:30 PM");
    expect(formatOpenMeteoWallClock("2025-06-09T23:00")).toBe("Mon 11:00 PM");
  });

  it("returns the raw string when it is not an Open-Meteo timestamp", () => {
    expect(formatOpenMeteoWallClock("later today")).toBe("later today");
  });
});

describe("hourlyRowsForAnchorDate", () => {
  it("keeps only the hours whose date portion matches", () => {
    const rows = hourlyRowsForAnchorDate(
      [
        hour("2025-06-08T23:00"),
        hour("2025-06-09T00:00"),
        hour("2025-06-09T23:00"),
        hour("2025-06-10T00:00"),
      ],
      "2025-06-09",
    );
    expect(rows.map((r) => r.time)).toEqual([
      "2025-06-09T00:00",
      "2025-06-09T23:00",
    ]);
  });

  it("returns nothing when the anchor date is absent", () => {
    expect(hourlyRowsForAnchorDate([hour("2025-06-09T00:00")], "2025-07-01")).toEqual(
      [],
    );
  });
});
