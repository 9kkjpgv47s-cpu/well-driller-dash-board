import type { NextRequest } from "next/server";
import {
  cachedJson,
  clientChunkFallback,
  dnrWellsUnavailable,
  jsonError,
} from "@/lib/api/responses";
import {
  getDnrWellsBaseCachedForApi,
  getDnrWellsFullCachedForApi,
} from "@/lib/dnr-wells-server-cache";
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
 * `lithology=1` serves from the full (base + litho) cache and adds the
 * lithology columns, for the ASL stratigraphy view. Those responses are capped
 * at a smaller limit because the logs are bulky.
 *
 * On Vercel cold start, loading all gz chunks can exceed the platform budget.
 * We use a bounded cache load and return **503** so the client falls back to
 * browser-side chunk load (same data under public/well-viewer/).
 */
export async function GET(req: NextRequest) {
  const input = parseWellsNearbyInput(req.nextUrl.searchParams);
  if ("error" in input) return jsonError(input.error, 400);

  let allWells;
  try {
    allWells = input.includeLithology
      ? await getDnrWellsFullCachedForApi()
      : await getDnrWellsBaseCachedForApi();
  } catch (e) {
    return dnrWellsUnavailable(e);
  }

  try {
    const { wells, totalInRadius, truncated } = queryWellsNearby(
      allWells,
      input,
    );

    return cachedJson(wells, 300, {
      "X-Wells-In-Radius": String(totalInRadius),
      "X-Wells-Truncated": truncated ? "1" : "0",
    });
  } catch (e) {
    return clientChunkFallback(e, "Wells radius query failed on the server.");
  }
}
