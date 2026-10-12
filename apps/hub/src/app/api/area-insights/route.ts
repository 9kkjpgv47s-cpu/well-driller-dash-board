import type { NextRequest } from "next/server";
import { computeAreaInsights } from "@/lib/area-well-analytics";
import { parseLatLonRadiusParams } from "@/lib/api/geo-query";
import {
  cachedJson,
  clientChunkFallback,
  dnrWellsUnavailable,
  jsonError,
} from "@/lib/api/responses";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import { MAX_RADIUS_MILES } from "@/lib/wells-nearby";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/area-insights?lat=&lon=&radius=
 *
 * Server-side area drilling insights: loads just the 0.1° tiles the query
 * bounding box touches (or the chunk set once per process when tiles are
 * absent — shared cache with /api/optimization), queries the grid spatial
 * index, and returns the same AreaInsightsReport JSON the client computes
 * locally.  Foundation for moving heavy analytics off low-power field devices.
 */
export async function GET(req: NextRequest) {
  const params = parseLatLonRadiusParams(
    req.nextUrl.searchParams,
    MAX_RADIUS_MILES,
  );
  if ("error" in params) return jsonError(params.error, 400);
  const { lat, lon, radiusMiles } = params;

  let loaded;
  try {
    loaded = await getDnrWellsForRadiusCachedForApi(lat, lon, radiusMiles, {
      lithology: true,
    });
  } catch (e) {
    return dnrWellsUnavailable(e);
  }

  try {
    const wells = loaded.wells;
    const inRadius = getWellSpatialIndex(wells).queryRadius(
      lat,
      lon,
      radiusMiles,
    );
    const report = computeAreaInsights(wells, lat, lon, radiusMiles, {
      wellsInRadius: inRadius,
    });

    return cachedJson(report, 300, {
      "X-Wells-Source": loaded.source,
      "X-Wells-Tiles": String(loaded.tiles),
    });
  } catch (e) {
    return clientChunkFallback(
      e,
      "Area insights query failed on the server.",
    );
  }
}
