import { NextRequest, NextResponse } from "next/server";
import { isValidLatLon } from "@/lib/api/geo-query";
import { jsonError } from "@/lib/api/responses";
import { lookupElevations, type ElevationLocation } from "@/lib/elevation";

/**
 * DEM ground elevation at lat/lon (meters), same sources as the standalone viewer:
 * OpenTopoData SRTM90m, then Open-Elevation API fallback.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const locations = (body as { locations?: ElevationLocation[] }).locations;
  if (!Array.isArray(locations) || locations.length === 0) {
    return jsonError("Provide `locations`: [{ lat, lon }, ...].", 400);
  }
  if (locations.length > 50) {
    return jsonError("At most 50 locations per request.", 400);
  }
  const normalized: ElevationLocation[] = [];
  for (const p of locations) {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (!isValidLatLon(lat, lon)) {
      return jsonError(
        "Each location needs lat in [-90, 90] and lon in [-180, 180].",
        400,
      );
    }
    normalized.push({ lat, lon });
  }

  const { elevationsFt, elevationsM } = await lookupElevations(normalized);

  return NextResponse.json({ elevationsFt, elevationsM });
}
