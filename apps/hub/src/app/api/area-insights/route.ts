import { NextRequest, NextResponse } from "next/server";
import { computeAreaInsights } from "@/lib/area-well-analytics";
import { getDnrWellsServerCachedForApi } from "@/lib/dnr-wells-server-cache";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_RADIUS_MILES = 25;

/**
 * GET /api/area-insights?lat=&lon=&radius=
 *
 * Server-side area drilling insights: loads the chunk set once per process
 * (shared cache with /api/optimization), queries the grid spatial index, and
 * returns the same AreaInsightsReport JSON the client computes locally.
 * Foundation for moving heavy analytics off low-power field devices.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lon = parseFloat(sp.get("lon") ?? "");
  const radius = parseFloat(sp.get("radius") ?? sp.get("radiusMiles") ?? "");

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return NextResponse.json(
      { error: "Invalid or missing `lat` / `lon` query parameters." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > MAX_RADIUS_MILES) {
    return NextResponse.json(
      { error: `Invalid \`radius\` — expected miles in (0, ${MAX_RADIUS_MILES}].` },
      { status: 400 },
    );
  }

  let wells;
  try {
    wells = await getDnrWellsServerCachedForApi();
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
    const inRadius = getWellSpatialIndex(wells).queryRadius(lat, lon, radius);
    const report = computeAreaInsights(wells, lat, lon, radius, {
      wellsInRadius: inRadius,
    });

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Area insights query failed on the server.",
        fallback: "client-chunks",
      },
      { status: 503 },
    );
  }
}
