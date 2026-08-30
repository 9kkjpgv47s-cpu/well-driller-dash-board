/**
 * Shared ordering/limiting of WellRecord lists: nearest-first by great-circle
 * distance and shallowest-first by display depth, both with a stable tiebreak.
 */

import { haversineMiles, type WellRecord } from "@/lib/area-well-analytics";
import { getWellDisplayDepthFtViewer } from "@/lib/viewer-well-map";
import type { LatLon } from "@/lib/api/geo-query";

/** Stable identity for ties (same key the map markers use). */
export function wellOrderKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}

export function finiteWellCoords(w: WellRecord): LatLon | null {
  const lat = Number(w.lat);
  const lon = Number(w.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

/** Nearest-first wells with unmappable coordinates dropped. */
export function sortWellsByDistance(
  wells: WellRecord[],
  lat: number,
  lon: number,
): WellRecord[] {
  return wells
    .map((w) => {
      const c = finiteWellCoords(w);
      return c ? { w, d: haversineMiles(lat, lon, c.lat, c.lon) } : null;
    })
    .filter((x): x is { w: WellRecord; d: number } => x != null)
    .sort(
      (a, b) => a.d - b.d || wellOrderKey(a.w).localeCompare(wellOrderKey(b.w)),
    )
    .map((x) => x.w);
}

export function nearestWells(
  wells: WellRecord[],
  lat: number,
  lon: number,
  limit: number,
): WellRecord[] {
  return sortWellsByDistance(wells, lat, lon).slice(0, limit);
}

/** Shallowest-first wells that have a usable display depth. */
export function shallowestWellsByDepth(
  wells: WellRecord[],
  limit: number,
): WellRecord[] {
  return wells
    .map((w) => ({ w, depthFt: getWellDisplayDepthFtViewer(w) }))
    .filter(
      (x): x is { w: WellRecord; depthFt: number } =>
        x.depthFt != null && Number.isFinite(x.depthFt),
    )
    .sort(
      (a, b) =>
        a.depthFt - b.depthFt ||
        wellOrderKey(a.w).localeCompare(wellOrderKey(b.w)),
    )
    .slice(0, limit)
    .map((x) => x.w);
}
