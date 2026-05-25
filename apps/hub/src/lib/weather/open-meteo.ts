import { wmoCodeLabel } from "./wmo";
import type { WeatherHourly, WeatherSourceBundle } from "./types";

type OmResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    weathercode: number[];
    cloud_cover: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
};

const HOURLY_PARAMS =
  "temperature_2m,precipitation,precipitation_probability,weathercode,cloud_cover,wind_speed_10m,wind_direction_10m";

function parseHourly(data: OmResponse, sourceId: string, label: string): WeatherHourly[] {
  const { hourly } = data;
  const n = hourly.time.length;
  const out: WeatherHourly[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      time: hourly.time[i],
      tempF: hourly.temperature_2m[i],
      precipPop: hourly.precipitation_probability?.[i] ?? null,
      precipInches: hourly.precipitation?.[i] ?? null,
      cloudPct: hourly.cloud_cover[i] ?? null,
      windMph: hourly.wind_speed_10m[i] ?? null,
      windDirDeg: hourly.wind_direction_10m[i] ?? null,
      weatherCode: hourly.weathercode[i],
      conditionLabel: wmoCodeLabel(hourly.weathercode[i]),
      sourceId,
      sourceLabel: label,
    });
  }
  return out;
}

export type OpenMeteoFetchOpts = {
  pastDays?: number;
  forecastDays?: number;
};

export async function fetchOpenMeteoModel(
  lat: number,
  lon: number,
  timezone: string,
  model: string,
  sourceId: string,
  label: string,
  opts?: OpenMeteoFetchOpts,
): Promise<WeatherSourceBundle | null> {
  const pastDays = Math.min(92, Math.max(0, Math.floor(opts?.pastDays ?? 0)));
  const forecastDays = Math.min(16, Math.max(1, Math.floor(opts?.forecastDays ?? 14)));
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", HOURLY_PARAMS);
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", timezone);
  if (pastDays > 0) url.searchParams.set("past_days", String(pastDays));
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("models", model);

  const res = await fetch(url.toString(), {
    next: { revalidate: 900 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as OmResponse;
  if (!json.hourly?.time?.length) return null;
  return {
    id: sourceId,
    label,
    provider: "Open-Meteo",
    model,
    hourly: parseHourly(json, sourceId, label),
    fetchedAt: new Date().toISOString(),
  };
}
