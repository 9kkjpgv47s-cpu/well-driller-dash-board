import type { NextRequest } from "next/server";
import {
  cachedJson,
  dnrWellsUnavailable,
  jsonError,
} from "@/lib/api/responses";
import { getDnrWellsServerCached } from "@/lib/dnr-wells-server-cache";
import {
  parseWellsNearbyInput,
  queryWellsNearby,
} from "@/lib/wells-nearby";

/**
 * GET /api/wells-nearby?lat=&lon=&radius=&limit=
 *
 * Radius-limited well rows for map markers and field views — avoids shipping
 * the full ~415k registry to the browser.
 */
export async function GET(req: NextRequest) {
  const input = parseWellsNearbyInput(req.nextUrl.searchParams);
  if ("error" in input) return jsonError(input.error, 400);

  let allWells;
  try {
    allWells = await getDnrWellsServerCached();
  } catch (e) {
    return dnrWellsUnavailable(e);
  }

  const { wells, totalInRadius, truncated } = queryWellsNearby(allWells, input);

  return cachedJson(wells, 300, {
    "X-Wells-In-Radius": String(totalInRadius),
    "X-Wells-Truncated": truncated ? "1" : "0",
  });
}
