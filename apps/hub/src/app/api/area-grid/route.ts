import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const maxDuration = 10;

const gunzip = promisify(zlib.gunzip);

/**
 * GET /api/area-grid?lat=&lon=
 *
 * Returns the precomputed area insight summary for the 0.1° grid cell
 * containing the jobsite. Loads a tiny (~28KB) precomputed JSON file —
 * no chunk scanning needed, responds in <10ms even on cold start.
 *
 * This is a fast first-response before the full /api/area-insights (which
 * scans all wells in radius) loads. The client can show the grid summary
 * instantly, then replace it with the full report when ready.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lon = parseFloat(sp.get("lon") ?? "");

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

  try {
    const gridPath = path.join(
      process.cwd(),
      "public",
      "well-viewer",
      "area_grid.json.gz",
    );
    const buf = await fs.readFile(gridPath);
    const text = (await gunzip(buf)).toString("utf-8");
    const grid = JSON.parse(text) as {
      grid_cell_deg: number;
      total_wells: number;
      cells: Record<string, {
        well_count: number;
        depth_median_ft: number | null;
        gpm_avg: number | null;
        gpm_count: number;
        aquifer_mix: Record<string, number>;
        gravel_rate: number;
        rock_top_rate: number;
        dry_count: number;
      }>;
    };

    const cellDeg = grid.grid_cell_deg;
    const latCell = Math.floor(lat / cellDeg);
    const lonCell = Math.floor(lon / cellDeg);
    const key = `${latCell}:${lonCell}`;
    const cell = grid.cells[key];

    if (!cell) {
      return NextResponse.json(
        {
          center: { lat, lon },
          grid_cell_deg: cellDeg,
          found: false,
          message: "No wells in this grid cell.",
          total_wells_in_grid: grid.total_wells,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        center: { lat, lon },
        grid_cell_deg: cellDeg,
        found: true,
        ...cell,
        total_wells_in_grid: grid.total_wells,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Precomputed area grid not available.", fallback: "full-scan" },
      { status: 503 },
    );
  }
}
