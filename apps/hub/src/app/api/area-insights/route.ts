import type { NextRequest } from "next/server";
import { computeAreaInsights } from "@/lib/area-well-analytics";
import { parseLatLonRadiusParams } from "@/lib/api/geo-query";
import {
  cachedJson,
  clientChunkFallback,
  dnrWellsUnavailable,
  jsonError,
} from "@/lib/api/responses";
import { getDnrWellsFullCachedForApi } from "@/lib/dnr-wells-server-cache";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import { MAX_RADIUS_MILES } from "@/lib/wells-nearby";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/area-insights?lat=&lon=&radius=
 *
 * Server-side area drilling insights: loads the chunk set once per process
 * (shared cache with /api/optimization), queries the grid spatial index, and
 * returns the same AreaInsightsReport JSON the client computes locally.
 * Foundation for moving heavy analytics off low-power field devices.
 */
export async function GET(req: NextRequest) {
  const params = parseLatLonRadiusParams(
    req.nextUrl.searchParams,
    MAX_RADIUS_MILES,
  );
  if ("error" in params) return jsonError(params.error, 400);
  const { lat, lon, radiusMiles } = params;

  let wells;
  try {
    wells = await getDnrWellsFullCachedForApi();
  } catch (e) {
    return dnrWellsUnavailable(e);
  }

  try {
    const inRadius = getWellSpatialIndex(wells).queryRadius(
      lat,
      lon,
      radiusMiles,
    );
    const report = computeAreaInsights(wells, lat, lon, radiusMiles, {
      wellsInRadius: inRadius,
    });

    return cachedJson(report, 300);
  } catch (e) {
    return clientChunkFallback(
      e,
      "Area insights query failed on the server.",
    );
  }
}
