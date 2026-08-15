import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpenMeteoModel } from "./open-meteo";

const HOURLY = {
  time: ["2025-06-09T00:00", "2025-06-09T01:00"],
  temperature_2m: [68, 66],
  precipitation_probability: [10, 40],
  precipitation: [0, 0.12],
  weathercode: [0, 95],
  cloud_cover: [5, 90],
  wind_speed_10m: [7, 12],
  wind_direction_10m: [180, 200],
};

function mockFetch(body: unknown, ok = true) {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return { ok, json: async () => body };
    }),
  );
  return urls;
}

describe("fetchOpenMeteoModel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps hourly arrays into normalized rows with condition labels", async () => {
    mockFetch({ hourly: HOURLY });
    const bundle = await fetchOpenMeteoModel(
      39.5,
      -86.2,
      "America/Indiana/Indianapolis",
      "gfs_seamless",
      "om-gfs",
      "GFS",
    );
    expect(bundle).not.toBeNull();
    expect(bundle!).toMatchObject({
      id: "om-gfs",
      label: "GFS",
      provider: "Open-Meteo",
      model: "gfs_seamless",
    });
    expect(bundle!.hourly).toHaveLength(2);
    expect(bundle!.hourly[0]).toMatchObject({
      time: "2025-06-09T00:00",
      tempF: 68,
      precipPop: 10,
      precipInches: 0,
      cloudPct: 5,
      windMph: 7,
      windDirDeg: 180,
      conditionLabel: "Clear",
      sourceId: "om-gfs",
      sourceLabel: "GFS",
    });
    expect(bundle!.hourly[1].conditionLabel).toBe("Thunderstorm");
  });

  it("requests imperial units and clamps day windows", async () => {
    const urls = mockFetch({ hourly: HOURLY });
    await fetchOpenMeteoModel(
      39.5,
      -86.2,
      "UTC",
      "ecmwf_ifs04",
      "om-ecmwf",
      "ECMWF",
      { pastDays: 400, forecastDays: 99 },
    );
    const url = new URL(urls[0]);
    expect(url.searchParams.get("temperature_unit")).toBe("fahrenheit");
    expect(url.searchParams.get("wind_speed_unit")).toBe("mph");
    expect(url.searchParams.get("precipitation_unit")).toBe("inch");
    expect(url.searchParams.get("timezone")).toBe("UTC");
    expect(url.searchParams.get("models")).toBe("ecmwf_ifs04");
    expect(url.searchParams.get("past_days")).toBe("92");
    expect(url.searchParams.get("forecast_days")).toBe("16");
  });

  it("omits past_days by default and floors a forecast window of at least one day", async () => {
    const urls = mockFetch({ hourly: HOURLY });
    await fetchOpenMeteoModel(39.5, -86.2, "UTC", "gfs", "om-gfs", "GFS", {
      pastDays: 0,
      forecastDays: 0,
    });
    const url = new URL(urls[0]);
    expect(url.searchParams.has("past_days")).toBe(false);
    expect(url.searchParams.get("forecast_days")).toBe("1");
  });

  it("returns null on an HTTP error or an empty hourly block", async () => {
    mockFetch({ hourly: HOURLY }, false);
    await expect(
      fetchOpenMeteoModel(39.5, -86.2, "UTC", "gfs", "om-gfs", "GFS"),
    ).resolves.toBeNull();

    mockFetch({ hourly: { ...HOURLY, time: [] } });
    await expect(
      fetchOpenMeteoModel(39.5, -86.2, "UTC", "gfs", "om-gfs", "GFS"),
    ).resolves.toBeNull();
  });
});
