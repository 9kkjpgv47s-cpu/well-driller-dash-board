import type { NextRequest } from "next/server";
import {
  cachedJson,
  clientChunkFallback,
  dnrWellsUnavailable,
  jsonError,
} from "@/lib/api/responses";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import {
  parseWellsNearbyInput,
  queryWellsNearby,
} from "@/lib/wells-nearby";

export const runtime = "nodejs";
/** Exceeds DNR load timeout so we can return 503 for client chunk fallback. */
export const maxDuration = 30;

/**
 * GET /api/wells-nearby?lat=&lon=&radius=&limit=&lithology=
 *
 * Radius-limited well rows for map markers and field views — avoids shipping
 * the full ~415k registry to the browser.
 *
 * `lithology=1` serves rows merged with the litho sidecars (or the full
 * base + litho cache when tiles are absent) and adds the lithology columns,
 * for the ASL stratigraphy view. Those responses are capped at a smaller
 * limit because the logs are bulky.
 *
 * On Vercel cold start, loading all gz chunks could exceed the platform
 * budget; the 0.1° tile set under public/well-viewer/tiles/ now lets a radius
 * query parse only its bounding-box tiles.  When tiles are absent we still use
 * the bounded whole-registry load and return **503** so the client falls back
 * to browser-side chunk load (same data under public/well-viewer/).
 *
 * Semantic note: with viewer filter params, "source order" is now tile-key
 * order (then registry order) instead of registry order, which can change
 * which rows survive truncation.  The hub UI never sends filter params and the
 * distance-sorted path has a stable id tiebreak, so it is unaffected.
 */
export async function GET(req: NextRequest) {
  const input = parseWellsNearbyInput(req.nextUrl.searchParams);
  if ("error" in input) return jsonError(input.error, 400);

  let loaded;
  try {
    loaded = await getDnrWellsForRadiusCachedForApi(
      input.lat,
      input.lon,
      input.radiusMiles,
      { lithology: input.includeLithology === true },
    );
  } catch (e) {
    return dnrWellsUnavailable(e);
  }

  try {
    const { wells, totalInRadius, truncated } = queryWellsNearby(
      loaded.wells,
      input,
    );

    return cachedJson(wells, 300, {
      "X-Wells-In-Radius": String(totalInRadius),
      "X-Wells-Truncated": truncated ? "1" : "0",
      "X-Wells-Source": loaded.source,
      "X-Wells-Tiles": String(loaded.tiles),
    });
  } catch (e) {
    return clientChunkFallback(e, "Wells radius query failed on the server.");
  }
}
