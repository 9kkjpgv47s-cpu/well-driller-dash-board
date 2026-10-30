import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import {
  computeAreaInsights,
  haversineMiles,
  type WellRecord,
} from "@/lib/area-well-analytics";
import { fetchDnrReport } from "@/lib/dnr-report-server";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import { geocodeIndiana } from "@/lib/geocode-server";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import { MAX_RADIUS_MILES, queryWellsNearby } from "@/lib/wells-nearby";
import { mapDeepLink } from "./hub-url";
import { isInIndiana, outsideIndianaMessage } from "./indiana";

const SOURCE_LINE =
  "Source: Indiana DNR water well registry via Driller Hub. Registry data, not a drilling guarantee. Indiana only.";

const REGISTRY_UNAVAILABLE =
  "Well registry is temporarily unavailable on the server (cold start). Retry in a few seconds.";

const DNR_BODY_TEXT_LIMIT = 12_000;

export const geocodeAddressInputSchema = z.object({
  query: z.string().min(3).max(200),
});

export const areaInsightsInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  radius_miles: z.number().min(0.1).max(MAX_RADIUS_MILES).default(5),
});

export const wellsNearbyInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  radius_miles: z.number().min(0.1).max(MAX_RADIUS_MILES).default(2),
  limit: z.number().int().min(1).max(100).default(25),
});

export const dnrWellRecordInputSchema = z.object({
  ref_no: z.string().min(1).max(32),
});

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function geoFooter(lat: number, lon: number): string {
  return `Map: ${mapDeepLink(lat, lon)}\n${SOURCE_LINE}`;
}

function isBlank(v: string | number | undefined): boolean {
  return v == null || String(v).trim() === "";
}

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
    const loaded = await getDnrWellsForRadiusCachedForApi(
      lat,
      lon,
      radiusMiles,
      { lithology: true },
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

export type NearbyWellProjection = {
  refno?: string | number;
  well_id?: string | number;
  lat?: number;
  lon?: number;
  distance_miles: number;
  depth?: string | number;
  static_water?: string | number;
  pump_rate?: string | number;
  aquifer?: string | number;
  county?: string | number;
  casing_material?: string | number;
  rock_start_ft?: string | number;
  depth_bedrock?: string | number;
  well_use?: string | number;
};

function projectNearbyWell(
  w: WellRecord,
  lat: number,
  lon: number,
): NearbyWellProjection {
  const wlat = Number(w.lat);
  const wlon = Number(w.lon);
  const distance =
    Number.isFinite(wlat) && Number.isFinite(wlon)
      ? Math.round(haversineMiles(lat, lon, wlat, wlon) * 10) / 10
      : NaN;
  const out: NearbyWellProjection = { distance_miles: distance };
  if (!isBlank(w.refno)) out.refno = w.refno;
  if (!isBlank(w.well_id)) out.well_id = w.well_id;
  if (Number.isFinite(wlat)) out.lat = wlat;
  if (Number.isFinite(wlon)) out.lon = wlon;
  if (!isBlank(w.depth)) out.depth = w.depth;
  if (!isBlank(w.static_water)) out.static_water = w.static_water;
  if (!isBlank(w.pump_rate)) out.pump_rate = w.pump_rate;
  if (!isBlank(w.aquifer)) out.aquifer = w.aquifer;
  if (!isBlank(w.county)) out.county = w.county;
  if (!isBlank(w.casing_material)) out.casing_material = w.casing_material;
  if (!isBlank(w.rock_start_ft)) out.rock_start_ft = w.rock_start_ft;
  if (!isBlank(w.depth_bedrock)) out.depth_bedrock = w.depth_bedrock;
  if (!isBlank(w.well_use)) out.well_use = w.well_use;
  return out;
}

function nearbyWellLine(w: NearbyWellProjection): string {
  const parts = [`#${w.refno ?? w.well_id ?? "?"}`];
  if (Number.isFinite(w.distance_miles)) parts.push(`${w.distance_miles} mi`);
  if (w.depth != null) parts.push(`depth ${w.depth} ft`);
  if (w.static_water != null) parts.push(`static ${w.static_water} ft`);
  if (w.pump_rate != null) parts.push(`${w.pump_rate} GPM`);
  if (w.aquifer != null) parts.push(`aquifer ${w.aquifer}`);
  if (w.county != null) parts.push(`${w.county} Co`);
  return parts.join(" · ");
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
    loaded = await getDnrWellsForRadiusCachedForApi(lat, lon, radiusMiles, {
      lithology: false,
    });
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

export async function dnrWellRecordTool(args: {
  ref_no: string;
}): Promise<CallToolResult> {
  const { status, body } = await fetchDnrReport(args.ref_no);
  if (status >= 400 || body === null) {
    return errorResult(
      `DNR registry returned status ${status} for ref_no "${args.ref_no}".`,
    );
  }

  let text = JSON.stringify(body, null, 2);
  if (text.length > DNR_BODY_TEXT_LIMIT) {
    text = `${text.slice(0, DNR_BODY_TEXT_LIMIT)}… (truncated)`;
  }
  return {
    content: [{ type: "text", text: `${text}\n${SOURCE_LINE}` }],
    structuredContent: body as Record<string, unknown>,
  };
}

export function registerDrillerTools(server: McpServer): void {
  server.registerTool(
    "geocode_address",
    {
      title: "Geocode Indiana address",
      description:
        "Forward-geocode an Indiana street address or place name to coordinates (Nominatim, Indiana-biased). Indiana only. Feed the returned lat/lon into area_insights or wells_nearby.",
      inputSchema: geocodeAddressInputSchema,
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
        "Summarize what a water-well driller should expect at an Indiana jobsite: nearby registry well counts, aquifer mix (unconsolidated vs bedrock), gravel/vein signals, depth and yield buckets, with a confidence grade. Indiana only. Use geocode_address first if you only have an address.",
      inputSchema: areaInsightsInputSchema,
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
        "List Indiana DNR registry wells nearest a point, with distance, depth, static water level, pump rate, and aquifer — the same rows the hub map shows. Indiana only.",
      inputSchema: wellsNearbyInputSchema,
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
        "Fetch the official Indiana DNR water well record for a refno (well reference number) — driller's report details parsed from the registry. Indiana only.",
      inputSchema: dnrWellRecordInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ref_no }) => dnrWellRecordTool({ ref_no }),
  );
}
