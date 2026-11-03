import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { WellRecord } from "@/lib/area-well-analytics";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import {
  computeOptimizationFromWells,
  MAX_OPTIMIZATION_RADIUS_MILES,
  type OptimizationPriority,
} from "@/lib/optimization";
import {
  errorResult,
  geoFooter,
  REGISTRY_UNAVAILABLE,
} from "./common";
import { isInIndiana, outsideIndianaMessage } from "./indiana";
import { withRetry } from "./retry";

export const siteOptimizationInputSchema = z.object({
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
    .min(0.5)
    .max(MAX_OPTIMIZATION_RADIUS_MILES)
    .default(5)
    .describe("Search radius in miles (default 5, max 25)"),
  priority: z
    .enum(["depth", "yield", "balanced"])
    .default("balanced")
    .describe("Weighting for the heuristic scores (default balanced)"),
});

export const siteOptimizationOutputSchema = z.looseObject({
  data_source: z.literal("registry"),
  neighborhood: z.looseObject({
    sample_wells_in_radius: z.number(),
    median_depth_ft: z.number(),
    typical_static_band_ft: z.string(),
    notes: z.array(z.string()),
  }),
  scores: z.looseObject({
    setup_readiness: z.number(),
    logistics_fit: z.number(),
    data_confidence: z.number(),
  }),
  checklist: z.array(z.string()),
});

export async function siteOptimizationTool(args: {
  lat: number;
  lon: number;
  radius_miles?: number;
  priority?: OptimizationPriority;
}): Promise<CallToolResult> {
  const { lat, lon } = args;
  const radiusMiles = args.radius_miles ?? 5;
  const priority = args.priority ?? "balanced";
  if (!isInIndiana(lat, lon)) {
    return errorResult(outsideIndianaMessage(lat, lon));
  }

  let wells: WellRecord[];
  try {
    const loaded = await withRetry(
      () =>
        getDnrWellsForRadiusCachedForApi(lat, lon, radiusMiles, {
          lithology: false,
        }),
      { retries: 2, delayMs: 400 },
    );
    wells = loaded.wells;
  } catch {
    return errorResult(REGISTRY_UNAVAILABLE);
  }

  // Registry-backed only — never fall back to computeOptimizationMock.
  const result = computeOptimizationFromWells(
    { lat, lon, radiusMiles, priority },
    wells,
  );

  const structured = {
    data_source: result.dataSource,
    neighborhood: {
      sample_wells_in_radius: result.neighborhood.sampleWellsInRadius,
      median_depth_ft: result.neighborhood.medianDepthFt,
      typical_static_band_ft: result.neighborhood.typicalStaticBandFt,
      notes: result.neighborhood.notes,
    },
    scores: {
      setup_readiness: result.scores.setupReadiness,
      logistics_fit: result.scores.logisticsFit,
      data_confidence: result.scores.dataConfidence,
    },
    checklist: result.checklist,
  };

  const lines = [
    `Site optimization near ${lat},${lon} — radius ${radiusMiles} mi, priority ${priority} (${structured.data_source})`,
    `Neighborhood: ${structured.neighborhood.sample_wells_in_radius} wells · median depth ${structured.neighborhood.median_depth_ft} ft · typical static ${structured.neighborhood.typical_static_band_ft} (ft below surface)`,
    `Scores (0–100): setup ${structured.scores.setup_readiness} · logistics ${structured.scores.logistics_fit} · data confidence ${structured.scores.data_confidence}`,
    ...structured.neighborhood.notes.map((n) => `- ${n}`),
    "Checklist:",
    ...structured.checklist.map((c) => `- ${c}`),
    geoFooter(lat, lon),
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: structured as unknown as Record<string, unknown>,
  };
}

export function registerSiteOptimizationTool(server: McpServer): void {
  server.registerTool(
    "site_optimization",
    {
      title: "Indiana drilling site optimization",
      description:
        "Registry-backed job-site assessment for an Indiana drilling location: neighborhood stats (wells sampled in radius, median depth in feet, typical static-water band in feet below ground), 0–100 heuristic scores (setup readiness, logistics fit, data confidence), and a field checklist. Priority weights the scores: 'depth', 'yield', or 'balanced'. Errors instead of returning mock data when the registry is unavailable. Indiana only.",
      inputSchema: siteOptimizationInputSchema,
      outputSchema: siteOptimizationOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ lat, lon, radius_miles, priority }) =>
      siteOptimizationTool({ lat, lon, radius_miles, priority }),
  );
}
