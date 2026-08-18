import { NextRequest, NextResponse } from "next/server";
import { getDnrWellsBaseCachedForApi } from "@/lib/dnr-wells-server-cache";
import {
  parseWellsNearbyInput,
  queryWellsNearby,
} from "@/lib/wells-nearby";

export const runtime = "nodejs";
/** Exceeds DNR load timeout so we can return 503 for client chunk fallback. */
export const maxDuration = 30;

/**
 * GET /api/wells-nearby?lat=&lon=&radius=&limit=
 *
 * Radius-limited well rows for map markers and field views — avoids shipping
 * the full ~415k registry to the browser.
 *
 * On Vercel cold start, loading all gz chunks can exceed the platform budget.
 * We use a bounded cache load and return **503** so the client falls back to
 * browser-side chunk load (same data under public/well-viewer/).
 */
export async function GET(req: NextRequest) {
  const input = parseWellsNearbyInput(req.nextUrl.searchParams);
  if ("error" in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  let allWells;
  try {
    allWells = await getDnrWellsBaseCachedForApi();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to load DNR chunk data on the server.",
        fallback: "client-chunks",
      },
      { status: 503 },
    );
  }

  try {
    const { wells, totalInRadius, truncated } = queryWellsNearby(
      allWells,
      input,
    );

    return NextResponse.json(wells, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Wells-In-Radius": String(totalInRadius),
        "X-Wells-Truncated": truncated ? "1" : "0",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Wells radius query failed on the server.",
        fallback: "client-chunks",
      },
      { status: 503 },
    );
  }
}
