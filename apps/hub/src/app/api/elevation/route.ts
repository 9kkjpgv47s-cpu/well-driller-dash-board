import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { errorMessage, logWarning } from "@/lib/errors";
import { upstreamJsonHeaders } from "@/lib/http/upstream";

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
    headers: upstreamJsonHeaders(),
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(`OpenTopoData returned HTTP ${res.status}`);
  }
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
      ...upstreamJsonHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locations: locations.map((p) => ({
        latitude: p.lat,
        longitude: p.lon,
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Open-Elevation returned HTTP ${res.status}`);
  }
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
    return jsonError("Invalid JSON body.", 400);
  }
  const locations = (body as { locations?: Loc[] }).locations;
  if (!Array.isArray(locations) || locations.length === 0) {
    return jsonError("Provide `locations`: [{ lat, lon }, ...].", 400);
  }
  if (locations.length > 50) {
    return jsonError("At most 50 locations per request.", 400);
  }
  const normalized: Loc[] = [];
  for (const p of locations) {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return jsonError("Each location needs numeric lat and lon.", 400);
    }
    normalized.push({ lat, lon });
  }

  const failures: string[] = [];

  let elevationsM: (number | null)[] | null = null;
  try {
    const ot = await fetchOpenTopoDataM(normalized);
    if (ot) elevationsM = ot;
    else failures.push("OpenTopoData: unusable response payload");
  } catch (e) {
    const msg = errorMessage(e, "OpenTopoData request failed");
    logWarning("api/elevation", `OpenTopoData lookup failed: ${msg}`, e);
    failures.push(`OpenTopoData: ${msg}`);
  }

  if (!elevationsM) {
    try {
      elevationsM = await fetchOpenElevationM(normalized);
    } catch (e) {
      const msg = errorMessage(e, "Open-Elevation request failed");
      logWarning("api/elevation", `Open-Elevation lookup failed: ${msg}`, e);
      failures.push(`Open-Elevation: ${msg}`);
      return jsonError(
        `Elevation lookup failed — ${failures.join("; ")}.`,
        502,
      );
    }
  }

  const elevationsFt = elevationsM.map((m) =>
    m != null && Number.isFinite(m) ? Math.round(m * M_TO_FT) : null,
  );

  return NextResponse.json({ elevationsFt, elevationsM });
}
