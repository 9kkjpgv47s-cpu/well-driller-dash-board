import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { WellRecord } from "@/lib/area-well-analytics";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import { getGroundElevationFt } from "@/lib/elevation";
import { sortWellsByDistance } from "@/lib/well-ordering";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import {
  buildAslStratigraphyLayout,
  findSharedAquiferBands,
  formatSharedAquiferDrillAdvice,
  sharedAquiferDrillWindowFt,
} from "@/lib/well-asl-stratigraphy";
import { MAX_RADIUS_MILES } from "@/lib/wells-nearby";
import {
  errorResult,
  geoFooter,
  REGISTRY_UNAVAILABLE,
  sharedAquiferBandOutputSchema,
  wellHasLithology,
} from "./common";
import { isInIndiana, outsideIndianaMessage } from "./indiana";
import { withRetry } from "./retry";

export const groundLayersInputSchema = z.object({
  lat: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude in WGS84 decimal degrees"),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude in WGS84 decimal degrees"),
  radius_miles: z
    .number()
    .min(0.1)
    .max(MAX_RADIUS_MILES)
    .default(3)
    .describe("Search radius in miles (default 3)"),
});

export const groundLayersOutputSchema = z.looseObject({
  wells_with_lithology: z.number(),
  shared_aquifer_bands: z.array(sharedAquiferBandOutputSchema),
  ground_elevation_ft: z.number().optional(),
  ground_elevation_source: z.enum(["well_median", "dem"]).optional(),
  dem_elevation_ft: z.number().optional(),
  elevation_note: z.string().optional(),
});

export type SharedAquiferBandRow = {
  center_asl_ft: number;
  well_count: number;
  window_start_ft: number | null;
  window_end_ft: number | null;
  advice: string;
};

export type SharedAquiferBandsResult = {
  bands: SharedAquiferBandRow[];
  /** Wells actually plotted as ASL columns (nearest-first, lithology only). */
  columnsUsed: number;
  /** Ground ASL of the closest plotted well — fallback for the jobsite DEM. */
  firstGroundAslFt: number | null;
  /** Reference ground ASL the drill windows were computed against. */
  referenceGroundAslFt: number | null;
  /** "well_median" (preferred — matches the strata ASL derivation) or "dem". */
  groundSource: "well_median" | "dem" | null;
  /** Set when DEM and the wells' reported ground disagree by >25 ft. */
  elevationNote: string | null;
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  return Math.round(s[Math.floor(s.length / 2)]);
}

/**
 * ASL shared-aquifer bands for the wells nearest a point. `wellsInRadius`
 * should already be radius-filtered; we take the closest `maxColumns` rows
 * with parseable lithology, plot each log interval in feet above sea level,
 * and cluster water-bearing layers that overlap in ASL across ≥2 wells.
 * Drill windows convert shared band elevations to feet below ground. The
 * reference is the plotted wells' own median reported ground elevation — the
 * strata ASL values came from those same elevations, so they stay consistent.
 * A coarse DEM value (pass it in) is only a fallback and, when it disagrees
 * with the wells' ground by >25 ft, an elevationNote flags it for the caller.
 */
export function computeSharedAquiferBandRows(
  wellsInRadius: WellRecord[],
  lat: number,
  lon: number,
  jobsiteGroundElevFt: number | null,
  opts: { maxColumns?: number; maxBands?: number } = {},
): SharedAquiferBandsResult {
  const maxColumns = opts.maxColumns ?? 40;
  const maxBands = opts.maxBands ?? 3;

  const candidates = sortWellsByDistance(
    wellsInRadius.filter(wellHasLithology),
    lat,
    lon,
  );
  const layout = buildAslStratigraphyLayout(candidates, null, { maxColumns });

  const colGrounds = layout.columns
    .map((c) => c.groundAslFt)
    .filter((n): n is number => Number.isFinite(n));
  const wellMedian = median(colGrounds);
  const ground = wellMedian ?? jobsiteGroundElevFt;
  const groundSource = wellMedian != null ? "well_median" : ground != null ? "dem" : null;
  const elevationNote =
    wellMedian != null &&
    jobsiteGroundElevFt != null &&
    Math.abs(wellMedian - jobsiteGroundElevFt) > 25
      ? `Elevation disagreement: nearby wells report ground ~${wellMedian} ft ASL but the DEM estimate is ~${Math.round(jobsiteGroundElevFt)} ft ASL. Drill windows use the wells' reported ground — verify the site's actual elevation before staking footage.`
      : null;

  const bands = findSharedAquiferBands(layout.columns)
    .slice(0, maxBands)
    .map((b) => {
      const win =
        ground != null ? sharedAquiferDrillWindowFt(b, ground) : null;
      const outcrops =
        win != null && win.startDepthFt < 0 && win.endDepthFt > 0;
      const aboveSurface = win != null && win.endDepthFt <= 0;
      return {
        center_asl_ft: b.centerAslFt,
        well_count: b.wellCount,
        // Band intersects the surface → drillable from 0 ft down to the
        // band bottom. Entirely above ground → not reachable; omit numbers.
        window_start_ft: win == null || aboveSurface ? null : Math.max(0, win.startDepthFt),
        window_end_ft: win == null || aboveSurface ? null : win.endDepthFt,
        advice:
          ground == null
            ? `${b.wellCount} wells share an aquifer band centered near ${b.centerAslFt} ft ASL — supply a jobsite ground elevation to get a drill window.`
            : outcrops
              ? `This aquifer band reaches the surface — expect water from 0–${win!.endDepthFt} ft below ground.`
              : aboveSurface
                ? `${b.wellCount} wells share a band ~${b.centerAslFt} ft ASL that sits above the estimated ${ground} ft ASL ground — verify the site elevation.`
                : formatSharedAquiferDrillAdvice(b, ground),
      };
    });

  return {
    bands,
    columnsUsed: layout.columns.length,
    firstGroundAslFt: layout.columns[0]?.groundAslFt ?? null,
    referenceGroundAslFt: ground != null ? Math.round(ground) : null,
    groundSource,
    elevationNote,
  };
}

export async function groundLayersTool(args: {
  lat: number;
  lon: number;
  radius_miles?: number;
}): Promise<CallToolResult> {
  const { lat, lon } = args;
  const radiusMiles = args.radius_miles ?? 3;
  if (!isInIndiana(lat, lon)) {
    return errorResult(outsideIndianaMessage(lat, lon));
  }

  let wells: WellRecord[];
  try {
    const loaded = await withRetry(
      () =>
        getDnrWellsForRadiusCachedForApi(lat, lon, radiusMiles, {
          lithology: true,
        }),
      { retries: 2, delayMs: 400 },
    );
    wells = loaded.wells;
  } catch {
    return errorResult(REGISTRY_UNAVAILABLE);
  }

  const inRadius = getWellSpatialIndex(wells).queryRadius(lat, lon, radiusMiles);
  const wellsWithLithology = inRadius.filter(wellHasLithology).length;

  const demGroundFt = await getGroundElevationFt(lat, lon);
  const { bands, columnsUsed, referenceGroundAslFt, groundSource, elevationNote } =
    computeSharedAquiferBandRows(inRadius, lat, lon, demGroundFt);
  const groundFt = referenceGroundAslFt ?? demGroundFt;

  const lines = [
    `Ground layers near ${lat},${lon} — radius ${radiusMiles} mi: ${wellsWithLithology} wells with lithology logs (${columnsUsed} plotted by elevation).`,
    groundFt != null
      ? `Reference ground elevation: ${groundFt} ft ASL (${
          groundSource === "well_median"
            ? "median of nearby wells' reported ground"
            : "DEM estimate"
        })`
      : "Jobsite ground elevation: unknown — drill windows omitted.",
    ...(elevationNote ? [`Note: ${elevationNote}`] : []),
    ...(bands.length
      ? bands.map(
          (b, i) =>
            `Band ${i + 1}: ~${b.center_asl_ft} ft ASL · ${b.well_count} wells${
              b.window_start_ft != null
                ? ` · drill ${b.window_start_ft}–${b.window_end_ft} ft`
                : ""
            } — ${b.advice}`,
        )
      : [
          "No shared aquifer bands found — nearby well logs do not overlap in elevation, or lithology coverage is thin here.",
        ]),
    geoFooter(lat, lon),
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: {
      wells_with_lithology: wellsWithLithology,
      shared_aquifer_bands: bands,
      ...(groundFt != null ? { ground_elevation_ft: groundFt } : {}),
      ...(groundSource ? { ground_elevation_source: groundSource } : {}),
      ...(demGroundFt != null ? { dem_elevation_ft: Math.round(demGroundFt) } : {}),
      ...(elevationNote ? { elevation_note: elevationNote } : {}),
    } as Record<string, unknown>,
  };
}

export function registerGroundLayersTool(server: McpServer): void {
  server.registerTool(
    "ground_layers",
    {
      title: "Indiana ground layers / shared aquifer",
      description:
        "Stratigraphy-by-elevation for an Indiana jobsite: parses nearby DNR well lithology logs, converts depths below ground to feet above sea level (ASL), and finds shared water-bearing sand/gravel bands that multiple wells hit at the same elevation. For each of the top bands it returns the drill window in feet below ground at the jobsite elevation (DEM, ft ASL), plus plain-language drill advice. Indiana only.",
      inputSchema: groundLayersInputSchema,
      outputSchema: groundLayersOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ lat, lon, radius_miles }) =>
      groundLayersTool({ lat, lon, radius_miles }),
  );
}
