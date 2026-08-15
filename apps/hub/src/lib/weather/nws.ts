import { errorMessage, logWarning } from "@/lib/errors";
import type { WeatherHourly, WeatherSourceBundle } from "./types";

type PointsResponse = {
  properties?: { forecastHourly?: string };
};

type ForecastHourlyResponse = {
  properties?: {
    periods: Array<{
      startTime: string;
      temperature: number;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      probabilityOfPrecipitation?: { value: number | null };
      cloudCover?: { value: number | null };
    }>;
  };
};

function parseWindMph(raw: string): number | null {
  const m = raw.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function fetchNwsHourly(
  lat: number,
  lon: number,
): Promise<WeatherSourceBundle | null> {
  const headers = {
    Accept: "application/geo+json",
    "User-Agent": "DrillerDashboardHub/1.0 (https://github.com/9kkjpgv47s-cpu/well-driller-dash-board)",
  };

  try {
    const pt = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!pt.ok) {
      logWarning("weather/nws", `points lookup returned HTTP ${pt.status}`);
      return null;
    }
    const pj = (await pt.json()) as PointsResponse;
    const hourlyUrl = pj.properties?.forecastHourly;
    if (!hourlyUrl) {
      logWarning("weather/nws", "points response had no forecastHourly URL");
      return null;
    }

    const fh = await fetch(hourlyUrl, { headers, next: { revalidate: 900 } });
    if (!fh.ok) {
      logWarning("weather/nws", `hourly forecast returned HTTP ${fh.status}`);
      return null;
    }
    const fj = (await fh.json()) as ForecastHourlyResponse;
    const periods = fj.properties?.periods;
    if (!periods?.length) {
      logWarning("weather/nws", "hourly forecast contained no periods");
      return null;
    }

    const hourly: WeatherHourly[] = periods.map((p) => ({
      time: p.startTime,
      tempF: p.temperature,
      precipPop: p.probabilityOfPrecipitation?.value ?? null,
      precipInches: null,
      cloudPct: p.cloudCover?.value ?? null,
      windMph: parseWindMph(p.windSpeed),
      windDirDeg: null,
      weatherCode: -1,
      conditionLabel: p.shortForecast,
      sourceId: "nws-hourly",
      sourceLabel: "NWS hourly",
    }));

    return {
      id: "nws-hourly",
      label: "US National Weather Service (hourly)",
      provider: "weather.gov",
      model: "NWS grid",
      hourly,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    logWarning(
      "weather/nws",
      `hourly fetch failed: ${errorMessage(e, "network or parse failure")}`,
      e,
    );
    return null;
  }
}
