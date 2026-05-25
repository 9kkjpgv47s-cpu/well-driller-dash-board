import { describe, expect, it } from "vitest";
import { buildConsolidatedFieldWeatherAdvice } from "./job-advice";
import type { DrillJob } from "../scheduling-data";
import type { WeatherApiResponse } from "./types";

const baseJob: DrillJob = {
  id: "j1",
  date: "2026-05-20",
  title: "Test",
  county: "Tippecanoe",
  lat: 40.4,
  lon: -86.9,
  feetOffDrive: 10,
  driveMinutesFromYard: 30,
  isEmergency: false,
  crewIndex: 0,
  daySlot: 0,
  locationSource: "coordinates",
};

function hour(
  time: string,
  overrides: Partial<{
    precipPop: number | null;
    precipInches: number | null;
    windMph: number | null;
    tempF: number;
    weatherCode: number;
  }> = {},
) {
  return {
    time,
    tempF: overrides.tempF ?? 55,
    precipPop: overrides.precipPop ?? null,
    precipInches: overrides.precipInches ?? null,
    cloudPct: 50,
    windMph: overrides.windMph ?? 10,
    windDirDeg: 180,
    weatherCode: overrides.weatherCode ?? 0,
    conditionLabel: "Clear",
    sourceId: "open-meteo-gfs",
    sourceLabel: "GFS",
  };
}

describe("buildConsolidatedFieldWeatherAdvice", () => {
  it("combines model peak rain chances into one bullet", () => {
    const data: WeatherApiResponse = {
      lat: 40.4,
      lon: -86.9,
      timezone: "America/Indiana/Indianapolis",
      anchorDate: "2026-05-20",
      fetchedAt: new Date().toISOString(),
      explanations: [],
      daySummaries: [],
      primaryHourlyForDay: [],
      sources: [
        {
          id: "open-meteo-gfs",
          label: "GFS",
          provider: "Open-Meteo",
          model: "gfs",
          fetchedAt: new Date().toISOString(),
          hourly: [hour("2026-05-20T14:00", { precipPop: 60 })],
        },
        {
          id: "open-meteo-ecmwf",
          label: "ECMWF",
          provider: "Open-Meteo",
          model: "ecmwf",
          fetchedAt: new Date().toISOString(),
          hourly: [hour("2026-05-20T14:00", { precipPop: 74 })],
        },
        {
          id: "nws-hourly",
          label: "NWS",
          provider: "weather.gov",
          model: "NWS",
          fetchedAt: new Date().toISOString(),
          hourly: [hour("2026-05-20T14:00", { precipPop: 84 })],
        },
      ],
    };

    const advice = buildConsolidatedFieldWeatherAdvice(baseJob, data);
    expect(
      advice.general.some((b) =>
        b.includes("Model peak rain chances: GFS 60%, ECMWF 74%, NWS 84%"),
      ),
    ).toBe(true);
    expect(advice.general.some((b) => b.includes("flex half-day"))).toBe(false);
  });

  it("flags critical wind, cold, and thunderstorms", () => {
    const data: WeatherApiResponse = {
      lat: 40.4,
      lon: -86.9,
      timezone: "America/Indiana/Indianapolis",
      anchorDate: "2026-05-20",
      fetchedAt: new Date().toISOString(),
      explanations: [],
      daySummaries: [],
      primaryHourlyForDay: [],
      sources: [
        {
          id: "open-meteo-gfs",
          label: "GFS",
          provider: "Open-Meteo",
          model: "gfs",
          fetchedAt: new Date().toISOString(),
          hourly: [
            hour("2026-05-20T08:00", { tempF: 12, windMph: 42, weatherCode: 95 }),
            hour("2026-05-20T09:00", { tempF: 14, windMph: 44, weatherCode: 96 }),
          ],
        },
      ],
    };

    const advice = buildConsolidatedFieldWeatherAdvice(baseJob, data);
    expect(advice.critical.some((b) => b.includes("44 mph"))).toBe(true);
    expect(advice.critical.some((b) => b.includes("12°F"))).toBe(true);
    expect(advice.critical.some((b) => b.includes("Thunderstorms"))).toBe(true);
  });
});
