import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNwsHourly } from "./nws";

const POINTS = {
  properties: { forecastHourly: "https://api.weather.gov/gridpoints/IND/1,2/forecast/hourly" },
};

const PERIODS = {
  properties: {
    periods: [
      {
        startTime: "2025-06-09T08:00:00-04:00",
        temperature: 72,
        windSpeed: "10 to 15 mph",
        windDirection: "SW",
        shortForecast: "Chance Showers And Thunderstorms",
        probabilityOfPrecipitation: { value: 45 },
        cloudCover: { value: 80 },
      },
      {
        startTime: "2025-06-09T09:00:00-04:00",
        temperature: 74,
        windSpeed: "calm",
        windDirection: "S",
        shortForecast: "Mostly Sunny",
      },
    ],
  },
};

function stubFetch(responses: Array<{ ok: boolean; body?: unknown }>) {
  const urls: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    urls.push(url);
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra fetch");
    return { ok: next.ok, json: async () => next.body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return urls;
}

describe("fetchNwsHourly", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the points lookup and normalizes hourly periods", async () => {
    const urls = stubFetch([
      { ok: true, body: POINTS },
      { ok: true, body: PERIODS },
    ]);
    const bundle = await fetchNwsHourly(39.4079512, -85.8629512);
    expect(urls).toEqual([
      "https://api.weather.gov/points/39.4080,-85.8630",
      POINTS.properties.forecastHourly,
    ]);
    expect(bundle).toMatchObject({ id: "nws-hourly", provider: "weather.gov" });
    expect(bundle!.hourly[0]).toMatchObject({
      time: "2025-06-09T08:00:00-04:00",
      tempF: 72,
      precipPop: 45,
      cloudPct: 80,
      windMph: 10,
      weatherCode: -1,
      conditionLabel: "Chance Showers And Thunderstorms",
    });
    expect(bundle!.hourly[1]).toMatchObject({
      precipPop: null,
      cloudPct: null,
      windMph: null,
    });
  });

  it("returns null when the points lookup fails or has no hourly link", async () => {
    stubFetch([{ ok: false }]);
    await expect(fetchNwsHourly(39.5, -86.2)).resolves.toBeNull();

    stubFetch([{ ok: true, body: { properties: {} } }]);
    await expect(fetchNwsHourly(39.5, -86.2)).resolves.toBeNull();
  });

  it("returns null when the forecast fails or is empty", async () => {
    stubFetch([{ ok: true, body: POINTS }, { ok: false }]);
    await expect(fetchNwsHourly(39.5, -86.2)).resolves.toBeNull();

    stubFetch([
      { ok: true, body: POINTS },
      { ok: true, body: { properties: { periods: [] } } },
    ]);
    await expect(fetchNwsHourly(39.5, -86.2)).resolves.toBeNull();
  });

  it("swallows network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(fetchNwsHourly(39.5, -86.2)).resolves.toBeNull();
  });
});
