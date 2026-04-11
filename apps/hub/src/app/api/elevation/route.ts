import { NextRequest, NextResponse } from "next/server";

/**
 * DEM ground elevation at lat/lon (meters), same sources as the standalone viewer:
 * OpenTopoData SRTM90m, then Open-Elevation API fallback.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

type Loc = { lat: number; lon: number };

function parseOpenTopoData(text: string): number[] | null {
  try {
    const data = JSON.parse(text) as {
      results?: { elevation?: number | null }[];
      status?: string;
    };
    if (!data?.results || !Array.isArray(data.results)) return null;
    if (data.status && data.status !== "OK") return null;
    return data.results.map((r) =>
      r.elevation != null && Number.isFinite(Number(r.elevation))
        ? Number(r.elevation)
        : NaN,
    );
  } catch {
    return null;
  }
}

async function fetchOpenTopoDataM(locations: Loc[]): Promise<number[] | null> {
  if (!locations.length) return [];
  const qs = locations.map((p) => `${p.lat},${p.lon}`).join("|");
  const url = `https://api.opentopodata.org/v1/srtm90m?locations=${encodeURIComponent(qs)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DrillerDashboardHub/1.0 (elevation; field planning)",
    },
    next: { revalidate: 86400 },
  });
  const text = await res.text();
  const arr = parseOpenTopoData(text);
  if (!arr || arr.length !== locations.length) return null;
  if (arr.some((n) => Number.isNaN(n))) return null;
  return arr;
}

async function fetchOpenElevationM(locations: Loc[]): Promise<(number | null)[]> {
  if (!locations.length) return [];
  const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "DrillerDashboardHub/1.0 (elevation; field planning)",
    },
    body: JSON.stringify({
      locations: locations.map((p) => ({
        latitude: p.lat,
        longitude: p.lon,
      })),
    }),
  });
  if (!res.ok) return locations.map(() => null);
  const data = (await res.json()) as {
    results?: { elevation?: number | null }[];
  };
  if (!data?.results || data.results.length !== locations.length) {
    return locations.map(() => null);
  }
  return data.results.map((r) =>
    r.elevation != null && Number.isFinite(Number(r.elevation))
      ? Number(r.elevation)
      : null,
  );
}

const M_TO_FT = 3.28084;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const locations = (body as { locations?: Loc[] }).locations;
  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json(
      { error: "Provide `locations`: [{ lat, lon }, ...]." },
      { status: 400 },
    );
  }
  if (locations.length > 50) {
    return NextResponse.json(
      { error: "At most 50 locations per request." },
      { status: 400 },
    );
  }
  const normalized: Loc[] = [];
  for (const p of locations) {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: "Each location needs numeric lat and lon." },
        { status: 400 },
      );
    }
    normalized.push({ lat, lon });
  }

  let elevationsM: (number | null)[] | null = null;
  try {
    const ot = await fetchOpenTopoDataM(normalized);
    if (ot) elevationsM = ot;
  } catch {
    elevationsM = null;
  }

  if (!elevationsM) {
    elevationsM = await fetchOpenElevationM(normalized);
  }

  const elevationsFt = elevationsM.map((m) =>
    m != null && Number.isFinite(m) ? Math.round(m * M_TO_FT) : null,
  );

  return NextResponse.json({ elevationsFt, elevationsM });
}
