import { NextResponse } from "next/server";
import {
  buildExplanations,
  mergeDaySummaryWithSpread,
  modelSpreadByDate,
  primaryOpenMeteo,
  summarizeDayFromHourly,
} from "@/lib/weather/aggregate";
import { fetchOpenMeteoModel } from "@/lib/weather/open-meteo";
import { fetchNwsHourly } from "@/lib/weather/nws";
import type { WeatherApiResponse, WeatherSourceBundle } from "@/lib/weather/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const anchorDate = searchParams.get("date") ?? "";
  const timezone =
    searchParams.get("timezone") ?? "America/Indiana/Indianapolis";

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
    return NextResponse.json(
      { error: "Provide lat, lon, and date=YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const [gfs, ecmwf, nws] = await Promise.all([
    fetchOpenMeteoModel(
      lat,
      lon,
      timezone,
      "gfs_seamless",
      "open-meteo-gfs",
      "Open-Meteo · GFS seamless blend",
    ),
    fetchOpenMeteoModel(
      lat,
      lon,
      timezone,
      "ecmwf_ifs025",
      "open-meteo-ecmwf",
      "Open-Meteo · ECMWF IFS 0.25°",
    ),
    fetchNwsHourly(lat, lon),
  ]);

  const sources: WeatherSourceBundle[] = [];
  if (gfs) sources.push(gfs);
  if (ecmwf) sources.push(ecmwf);
  if (nws) sources.push(nws);

  if (!sources.length) {
    return NextResponse.json(
      { error: "All weather sources failed" },
      { status: 502 },
    );
  }

  const primary = primaryOpenMeteo(sources);
  if (!primary) {
    return NextResponse.json(
      { error: "No Open-Meteo source available" },
      { status: 502 },
    );
  }

  const gfsHourly = gfs?.hourly ?? [];
  const ecmwfHourly = ecmwf?.hourly ?? [];
  const spreadMap =
    gfsHourly.length && ecmwfHourly.length
      ? modelSpreadByDate(gfsHourly, ecmwfHourly)
      : new Map<string, number>();

  const uniqueDates = [
    ...new Set(primary.hourly.map((h) => h.time.slice(0, 10))),
  ].sort();

  const daySummaries = uniqueDates
    .map((d) => summarizeDayFromHourly(primary.hourly, d))
    .filter(Boolean)
    .map((s) =>
      mergeDaySummaryWithSpread(s!, spreadMap.get(s!.date) ?? null),
    );

  const primaryHourlyForDay = primary.hourly.filter(
    (h) => h.time.slice(0, 10) === anchorDate,
  );

  const body: WeatherApiResponse = {
    lat,
    lon,
    timezone,
    anchorDate,
    fetchedAt: new Date().toISOString(),
    sources,
    explanations: buildExplanations(sources),
    daySummaries,
    primaryHourlyForDay,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
