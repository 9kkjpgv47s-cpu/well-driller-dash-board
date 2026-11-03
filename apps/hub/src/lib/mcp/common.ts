import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/server";
import {
  getLithLayers,
  haversineMiles,
  type WellRecord,
} from "@/lib/area-well-analytics";
import { mapDeepLink } from "./hub-url";

export const SOURCE_LINE =
  "Source: Indiana DNR water well registry via Driller Hub. Registry data, not a drilling guarantee. Indiana only.";

export const REGISTRY_UNAVAILABLE =
  "Well registry is temporarily unavailable on the server (cold start). Retry in a few seconds.";

export function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function geoFooter(lat: number, lon: number): string {
  return `Map: ${mapDeepLink(lat, lon)}\n${SOURCE_LINE}`;
}

export function isBlank(v: string | number | undefined): boolean {
  return v == null || String(v).trim() === "";
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

export function projectNearbyWell(
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

export function nearbyWellLine(w: NearbyWellProjection): string {
  const parts = [`#${w.refno ?? w.well_id ?? "?"}`];
  if (Number.isFinite(w.distance_miles)) parts.push(`${w.distance_miles} mi`);
  if (w.depth != null) parts.push(`depth ${w.depth} ft`);
  if (w.static_water != null) parts.push(`static ${w.static_water} ft`);
  if (w.pump_rate != null) parts.push(`${w.pump_rate} GPM`);
  if (w.aquifer != null) parts.push(`aquifer ${w.aquifer}`);
  if (w.county != null) parts.push(`${w.county} Co`);
  return parts.join(" · ");
}

/** True when a well row carries at least one parseable lithology interval. */
export function wellHasLithology(w: WellRecord): boolean {
  return getLithLayers(w).length > 0;
}

// --- shared outputSchema fragments (zod; validated by the MCP SDK on every call) ---

const scalarStringOrNumber = z.union([z.string(), z.number()]);

export const nearbyWellOutputSchema = z.looseObject({
  distance_miles: z.number(),
  refno: scalarStringOrNumber.optional(),
  well_id: scalarStringOrNumber.optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  depth: scalarStringOrNumber.optional(),
  static_water: scalarStringOrNumber.optional(),
  pump_rate: scalarStringOrNumber.optional(),
  aquifer: scalarStringOrNumber.optional(),
  county: scalarStringOrNumber.optional(),
  casing_material: scalarStringOrNumber.optional(),
  rock_start_ft: scalarStringOrNumber.optional(),
  depth_bedrock: scalarStringOrNumber.optional(),
  well_use: scalarStringOrNumber.optional(),
});

export const daySummaryOutputSchema = z.looseObject({
  date: z.string(),
  maxPrecipPop: z.number().nullable(),
  maxWindMph: z.number().nullable(),
  minTempF: z.number().nullable(),
  maxTempF: z.number().nullable(),
  dominantCondition: z.string(),
  totalPrecipInches: z.number().nullable(),
  thunderstormHours: z.number(),
  modelSpreadPop: z.number().nullable().optional(),
});

export const sharedAquiferBandOutputSchema = z.looseObject({
  center_asl_ft: z.number(),
  well_count: z.number(),
  window_start_ft: z.number().nullable(),
  window_end_ft: z.number().nullable(),
  above_site_ground: z.boolean().optional(),
  advice: z.string(),
});
