import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import {
  computeAreaInsights,
  type WellRecord,
} from "@/lib/area-well-analytics";
import { fetchDnrReport } from "@/lib/dnr-report-server";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import { geocodeIndiana } from "@/lib/geocode-server";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import { MAX_RADIUS_MILES, queryWellsNearby } from "@/lib/wells-nearby";
import {
  errorResult,
  geoFooter,
  nearbyWellLine,
  nearbyWellOutputSchema,
  projectNearbyWell,
  REGISTRY_UNAVAILABLE,
  SOURCE_LINE,
} from "./common";
import { registerDrillerContent } from "./content";
import { registerParseDispatchTool } from "./dispatch";
import { registerGroundLayersTool } from "./ground-layers";
import { isInIndiana, outsideIndianaMessage } from "./indiana";
import { registerJobBriefTool } from "./job-brief";
import { registerJobWeatherTool } from "./job-weather";
import { registerSiteOptimizationTool } from "./optimization";
import { withRetry } from "./retry";

const DNR_BODY_TEXT_LIMIT = 12_000;
const DNR_SUMMARY_FIELD_LIMIT = 40;

export const geocodeAddressInputSchema = z.object({
  query: z
    .string()
    .min(3)
    .max(200)
    .describe("Indiana street address or place name"),
});

export const areaInsightsInputSchema = z.object({
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
    .default(5)
    .describe("Search radius in miles (default 5)"),
});

export const wellsNearbyInputSchema = z.object({
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
    .default(2)
    .describe("Search radius in miles (default 2)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Max wells returned, nearest-first (default 25)"),
});

export const dnrWellRecordInputSchema = z.object({
  ref_no: z
    .string()
    .min(1)
    .max(32)
    .describe("DNR well reference number (refno), e.g. from wells_nearby"),
});

export const geocodeAddressOutputSchema = z.looseObject({
  results: z.array(
    z.looseObject({
      lat: z.number(),
      lon: z.number(),
      label: z.string(),
    }),
  ),
});

export const areaInsightsOutputSchema = z.looseObject({
  center: z.looseObject({ lat: z.number(), lon: z.number() }),
  radiusMiles: z.number(),
  totalWellsInRadius: z.number(),
  wellsWithLithology: z.number(),
  wellsWithGpm: z.number(),
  insightQuality: z.looseObject({
    grade: z.enum(["high", "medium", "low"]),
    score: z.number(),
    reasons: z.array(z.string()),
  }),
  narratives: z.array(
    z.looseObject({ text: z.string(), scope: z.string() }),
  ),
  depthMedianFt: z.number().nullable(),
  disclaimers: z.array(z.string()),
});

export const wellsNearbyOutputSchema = z.looseObject({
  wells: z.array(nearbyWellOutputSchema),
  total_in_radius: z.number(),
  truncated: z.boolean(),
});

export const dnrWellRecordOutputSchema = z.looseObject({
  summary: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  record: z.unknown().optional(),
});

export async function geocodeAddressTool(args: {
  query: string;
}): Promise<CallToolResult> {
  const results = await geocodeIndiana(args.query);
  if (results.length === 0) {
    return errorResult(
      `No Indiana match for "${args.query}". Try adding the town or county.`,
    );
  }

  const lines = results.map(
    (r, i) => `${i + 1}. ${r.label} — ${r.lat}, ${r.lon}`,
  );
  const top = results[0];
  return {
    content: [
      { type: "text", text: [...lines, geoFooter(top.lat, top.lon)].join("\n") },
    ],
    structuredContent: { results },
  };
}

export async function areaInsightsTool(args: {
  lat: number;
  lon: number;
  radius_miles?: number;
}): Promise<CallToolResult> {
  const { lat, lon } = args;
  const radiusMiles = args.radius_miles ?? 5;
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

  const wellsInRadius = getWellSpatialIndex(wells).queryRadius(
    lat,
    lon,
    radiusMiles,
  );
  const report = computeAreaInsights(wells, lat, lon, radiusMiles, {
    wellsInRadius,
  });

  const lines = [
    `Area insights near ${lat},${lon} — radius ${radiusMiles} mi: ${report.totalWellsInRadius} wells in radius (lithology ${report.wellsWithLithology}, GPM ${report.wellsWithGpm})`,
    `Confidence: ${report.insightQuality.grade} (score ${report.insightQuality.score})${
      report.insightQuality.reasons.length
        ? ` — ${report.insightQuality.reasons.join("; ")}`
        : ""
    }`,
    ...report.narratives.map((n) => `- ${n.text}`),
    geoFooter(lat, lon),
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: report as unknown as Record<string, unknown>,
  };
}

export async function wellsNearbyTool(args: {
  lat: number;
  lon: number;
  radius_miles?: number;
  limit?: number;
}): Promise<CallToolResult> {
  const { lat, lon } = args;
  const radiusMiles = args.radius_miles ?? 2;
  const limit = args.limit ?? 25;
  if (!isInIndiana(lat, lon)) {
    return errorResult(outsideIndianaMessage(lat, lon));
  }

  let loaded;
  try {
    loaded = await withRetry(
      () =>
        getDnrWellsForRadiusCachedForApi(lat, lon, radiusMiles, {
          lithology: false,
        }),
      { retries: 2, delayMs: 400 },
    );
  } catch {
    return errorResult(REGISTRY_UNAVAILABLE);
  }

  const { wells, totalInRadius, truncated } = queryWellsNearby(loaded.wells, {
    lat,
    lon,
    radiusMiles,
    limit,
    includeLithology: false,
  });

  const projected = wells.map((w) => projectNearbyWell(w, lat, lon));
  const lines = projected.map(nearbyWellLine);
  lines.push(
    `Showing ${projected.length} of ${totalInRadius} wells within ${radiusMiles} mi${
      truncated ? " (truncated)" : ""
    }`,
    geoFooter(lat, lon),
  );

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: {
      wells: projected,
      total_in_radius: totalInRadius,
      truncated,
    } as unknown as Record<string, unknown>,
  };
}

/** Scalars-only summary of the DNR record's top-level fields (cap 40). */
function scalarSummary(body: Record<string, unknown>) {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(body)) {
    if (Object.keys(out).length >= DNR_SUMMARY_FIELD_LIMIT) break;
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * True when a DNR report body carries real content — guards the baseline bug
 * where an empty `{}` (or all-blank fields) was reported as a successful
 * record fetch.
 */
function isMeaningfulRecordBody(body: unknown): boolean {
  if (body == null) return false;
  if (typeof body !== "object") return body !== "";
  if (Array.isArray(body)) return body.length > 0;
  const entries = Object.entries(body as Record<string, unknown>);
  if (!entries.length) return false;
  return entries.some(([, v]) => v !== null && v !== undefined && v !== "");
}

export async function dnrWellRecordTool(args: {
  ref_no: string;
}): Promise<CallToolResult> {
  const { status, body } = await fetchDnrReport(args.ref_no);
  if (status >= 400 || !isMeaningfulRecordBody(body)) {
    return errorResult(
      `DNR registry returned status ${status} for ref_no "${args.ref_no}"${
        status < 400 ? " with an empty record body" : ""
      }.`,
    );
  }

  const summary =
    typeof body === "object" && !Array.isArray(body)
      ? scalarSummary(body as Record<string, unknown>)
      : {};
  const structuredContent =
    typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), summary }
      : { summary, record: body };

  let text = JSON.stringify(structuredContent, null, 2);
  if (text.length > DNR_BODY_TEXT_LIMIT) {
    text = `${text.slice(0, DNR_BODY_TEXT_LIMIT)}… (truncated)`;
  }
  return {
    content: [{ type: "text", text: `${text}\n${SOURCE_LINE}` }],
    structuredContent: structuredContent as Record<string, unknown>,
  };
}

export function registerDrillerTools(server: McpServer): void {
  server.registerTool(
    "geocode_address",
    {
      title: "Geocode Indiana address",
      description:
        "Forward-geocode an Indiana street address or place name to coordinates (Nominatim, Indiana-biased). Returns lat/lon in WGS84 decimal degrees — feed them into job_brief, area_insights, or wells_nearby. Indiana only.",
      inputSchema: geocodeAddressInputSchema,
      outputSchema: geocodeAddressOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query }) => geocodeAddressTool({ query }),
  );

  server.registerTool(
    "area_insights",
    {
      title: "Indiana drilling area insights",
      description:
        "Summarize what a water-well driller should expect at an Indiana jobsite: nearby registry well counts, aquifer mix (unconsolidated vs bedrock), gravel/vein signals, depth buckets (feet below ground) and yield buckets (GPM), with a confidence grade. Indiana only. Use job_brief for a full field brief, or geocode_address first if you only have an address.",
      inputSchema: areaInsightsInputSchema,
      outputSchema: areaInsightsOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ lat, lon, radius_miles }) =>
      areaInsightsTool({ lat, lon, radius_miles }),
  );

  server.registerTool(
    "wells_nearby",
    {
      title: "Indiana wells nearby",
      description:
        "List Indiana DNR registry wells nearest a point (lat/lon WGS84 degrees), nearest-first: distance in miles, depth and static water in feet below ground surface, pump rate in GPM, aquifer label, county — the same rows the hub map shows. Indiana only.",
      inputSchema: wellsNearbyInputSchema,
      outputSchema: wellsNearbyOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ lat, lon, radius_miles, limit }) =>
      wellsNearbyTool({ lat, lon, radius_miles, limit }),
  );

  server.registerTool(
    "dnr_well_record",
    {
      title: "Indiana DNR well record",
      description:
        "Fetch the official Indiana DNR water well record for a refno (well reference number) — the driller's report parsed from the registry, plus a flat `summary` map of its top-level scalar fields (depths in feet, rates in GPM). Indiana only.",
      inputSchema: dnrWellRecordInputSchema,
      outputSchema: dnrWellRecordOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ref_no }) => dnrWellRecordTool({ ref_no }),
  );

  registerJobBriefTool(server);
  registerParseDispatchTool(server);
  registerJobWeatherTool(server);
  registerGroundLayersTool(server);
  registerSiteOptimizationTool(server);
  registerDrillerContent(server);
}
