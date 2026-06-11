import { NextRequest, NextResponse } from "next/server";
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
  if ("error" in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  let allWells;
  try {
    allWells = await getDnrWellsServerCached();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to load DNR chunk data on the server.",
      },
      { status: 503 },
    );
  }

  const { wells, totalInRadius, truncated } = queryWellsNearby(allWells, input);

  return NextResponse.json(wells, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Wells-In-Radius": String(totalInRadius),
      "X-Wells-Truncated": truncated ? "1" : "0",
    },
  });
}
