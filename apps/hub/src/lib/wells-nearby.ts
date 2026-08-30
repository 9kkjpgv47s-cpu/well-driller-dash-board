import type { WellRecord } from "@/lib/area-well-analytics";
import { parseLatLonRadiusParams } from "@/lib/api/geo-query";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import { sortWellsByDistance, wellOrderKey } from "@/lib/well-ordering";
import {
  DEFAULT_VIEWER_MAP_FILTERS,
  type ViewerMapFilters,
  wellPassesHubViewerFilters,
} from "@/lib/viewer-well-map";

export const MAX_RADIUS_MILES = 25;
/** Radius for lat/lon-only deep links that omit `radius`. */
export const DEFAULT_WELLS_NEARBY_RADIUS_MILES = 5;
export const DEFAULT_WELLS_NEARBY_LIMIT = 500;
export const MAX_WELLS_NEARBY_LIMIT = 2000;
/** Lithology logs are bulky, so `lithology=1` responses stay small. */
export const MAX_WELLS_NEARBY_LITHOLOGY_LIMIT = 200;

/** Fields needed by map markers, depth/ASL views, and well detail. */
export const MAP_WELL_FIELD_KEYS = [
  "id",
  "refno",
  "well_id",
  "lat",
  "lon",
  "depth",
  "county",
  "aquifer",
  "static_water",
  "pump_rate",
  "ground_elev",
  "gravel_thickness_ft",
  "vein_size_ft",
  "vein_size",
  "rock_start_ft",
  "depth_bedrock",
  "owner",
  "notes",
  "loc_type",
  "well_type",
  "pump_type",
  "well_use",
  "casing_material",
  "permit",
  "report",
] as const;

/** Extra fields returned only for `lithology=1` requests (ASL stratigraphy). */
export const LITHOLOGY_WELL_FIELD_KEYS = [
  "lithology_json",
  "lithology_source",
] as const;

export type WellsNearbyInput = {
  lat: number;
  lon: number;
  radiusMiles: number;
  limit: number;
  includeLithology?: boolean;
  filters?: ViewerMapFilters;
};

export type WellsNearbyResult = {
  wells: WellRecord[];
  totalInRadius: number;
  truncated: boolean;
};

function parseBoolParam(
  sp: URLSearchParams,
  key: string,
  fallback: boolean,
): boolean {
  const raw = sp.get(key);
  if (raw == null || raw === "") return fallback;
  const v = raw.toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return fallback;
}

/** Optional hub viewer filter query params (mirrors ViewerMapFilters). */
export function parseHubViewerFiltersFromSearchParams(
  sp: URLSearchParams,
): ViewerMapFilters | undefined {
  const hasFilterParams = [
    "elevBlue",
    "elevGreen",
    "elevOrange",
    "elevRed",
    "yieldBlue",
    "yieldGreen",
    "yieldOrange",
    "yieldRed",
    "typeUncon",
    "typeRock",
    "typeBucket",
    "typeDry",
    "typeEstimated",
    "hideWellLabels",
    "minDepth",
    "maxDepth",
    "textSearch",
    "markerLabelScale",
  ].some((k) => sp.has(k));

  if (!hasFilterParams) return undefined;

  const minDepth = parseFloat(sp.get("minDepth") ?? "");
  const maxDepth = parseFloat(sp.get("maxDepth") ?? "");
  const markerLabelScale = parseFloat(sp.get("markerLabelScale") ?? "");

  return {
    elevBlue: parseBoolParam(sp, "elevBlue", DEFAULT_VIEWER_MAP_FILTERS.elevBlue),
    elevGreen: parseBoolParam(sp, "elevGreen", DEFAULT_VIEWER_MAP_FILTERS.elevGreen),
    elevOrange: parseBoolParam(sp, "elevOrange", DEFAULT_VIEWER_MAP_FILTERS.elevOrange),
    elevRed: parseBoolParam(sp, "elevRed", DEFAULT_VIEWER_MAP_FILTERS.elevRed),
    yieldBlue: parseBoolParam(sp, "yieldBlue", DEFAULT_VIEWER_MAP_FILTERS.yieldBlue),
    yieldGreen: parseBoolParam(sp, "yieldGreen", DEFAULT_VIEWER_MAP_FILTERS.yieldGreen),
    yieldOrange: parseBoolParam(sp, "yieldOrange", DEFAULT_VIEWER_MAP_FILTERS.yieldOrange),
    yieldRed: parseBoolParam(sp, "yieldRed", DEFAULT_VIEWER_MAP_FILTERS.yieldRed),
    typeUncon: parseBoolParam(sp, "typeUncon", DEFAULT_VIEWER_MAP_FILTERS.typeUncon),
    typeRock: parseBoolParam(sp, "typeRock", DEFAULT_VIEWER_MAP_FILTERS.typeRock),
    typeBucket: parseBoolParam(sp, "typeBucket", DEFAULT_VIEWER_MAP_FILTERS.typeBucket),
    typeDry: parseBoolParam(sp, "typeDry", DEFAULT_VIEWER_MAP_FILTERS.typeDry),
    typeEstimated: parseBoolParam(
      sp,
      "typeEstimated",
      DEFAULT_VIEWER_MAP_FILTERS.typeEstimated,
    ),
    hideWellLabels: parseBoolParam(
      sp,
      "hideWellLabels",
      DEFAULT_VIEWER_MAP_FILTERS.hideWellLabels,
    ),
    minDepth: Number.isFinite(minDepth) ? minDepth : DEFAULT_VIEWER_MAP_FILTERS.minDepth,
    maxDepth: Number.isFinite(maxDepth) ? maxDepth : DEFAULT_VIEWER_MAP_FILTERS.maxDepth,
    textSearch: sp.get("textSearch") ?? DEFAULT_VIEWER_MAP_FILTERS.textSearch,
    markerLabelScale: Number.isFinite(markerLabelScale)
      ? markerLabelScale
      : DEFAULT_VIEWER_MAP_FILTERS.markerLabelScale,
  };
}

export function parseWellsNearbyInput(
  sp: URLSearchParams,
): WellsNearbyInput | { error: string } {
  const geo = parseLatLonRadiusParams(
    sp,
    MAX_RADIUS_MILES,
    DEFAULT_WELLS_NEARBY_RADIUS_MILES,
  );
  if ("error" in geo) return geo;

  const includeLithology = parseBoolParam(sp, "lithology", false);
  const maxLimit = includeLithology
    ? MAX_WELLS_NEARBY_LITHOLOGY_LIMIT
    : MAX_WELLS_NEARBY_LIMIT;

  const limitRaw = parseInt(sp.get("limit") ?? String(DEFAULT_WELLS_NEARBY_LIMIT), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(maxLimit, Math.max(1, limitRaw))
    : Math.min(maxLimit, DEFAULT_WELLS_NEARBY_LIMIT);

  return {
    ...geo,
    limit,
    includeLithology,
    filters: parseHubViewerFiltersFromSearchParams(sp),
  };
}

export function compactWellForMap(
  w: WellRecord,
  includeLithology = false,
): WellRecord {
  const out: WellRecord = {};
  const keys = includeLithology
    ? [...MAP_WELL_FIELD_KEYS, ...LITHOLOGY_WELL_FIELD_KEYS]
    : MAP_WELL_FIELD_KEYS;
  for (const key of keys) {
    const v = w[key];
    if (v != null && v !== "") out[key] = v;
  }
  return out;
}

/**
 * Copies lithology columns from a `lithology=1` response onto already-loaded
 * well rows, matched on well identity. Rows that already carry a log and rows
 * with no match are returned untouched; `wells` is returned as-is when nothing
 * changes so React state stays referentially stable.
 */
export function mergeLithologyIntoWells(
  wells: WellRecord[],
  lithoRows: WellRecord[],
): WellRecord[] {
  const byKey = new Map<string, WellRecord>();
  for (const row of lithoRows) {
    if (hasLithologyJson(row)) byKey.set(wellOrderKey(row), row);
  }
  if (!byKey.size) return wells;

  let changed = false;
  const merged = wells.map((w) => {
    if (hasLithologyJson(w)) return w;
    const row = byKey.get(wellOrderKey(w));
    if (!row) return w;
    changed = true;
    const next: WellRecord = { ...w, lithology_json: row.lithology_json };
    if (row.lithology_source != null) next.lithology_source = row.lithology_source;
    return next;
  });
  return changed ? merged : wells;
}

function hasLithologyJson(w: WellRecord): boolean {
  return w.lithology_json != null && String(w.lithology_json).trim() !== "";
}

export function queryWellsNearby(
  allWells: WellRecord[],
  input: WellsNearbyInput,
): WellsNearbyResult {
  const inRadius = getWellSpatialIndex(allWells).queryRadius(
    input.lat,
    input.lon,
    input.radiusMiles,
  );
  const totalInRadius = inRadius.length;

  let candidates = inRadius;
  if (input.filters) {
    candidates = inRadius.filter((w) =>
      wellPassesHubViewerFilters(w, input.filters!),
    );
  } else {
    candidates = sortWellsByDistance(candidates, input.lat, input.lon);
  }

  const truncated = candidates.length > input.limit;
  const wells = candidates
    .slice(0, input.limit)
    .map((w) => compactWellForMap(w, input.includeLithology === true));

  return { wells, totalInRadius, truncated };
}
