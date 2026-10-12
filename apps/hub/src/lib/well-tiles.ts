/**
 * 0.1° lat/lon well tiles under `public/well-viewer/tiles/` — a radius query
 * loads only the tiles its bounding box touches instead of the full ~415k-row
 * registry, so cold serverless starts finish inside the Vercel timeout budget.
 *
 * Tile key math is pinned to scripts/build_well_tiles.py: `floor(x / 0.1)`
 * on the parsed double (identical IEEE-754 result in Python and JS), so e.g.
 * Indianapolis 39.7684,-86.1581 lives in tile `397_-862`.
 */

export const WELL_TILE_DEG = 0.1;
export const WELL_TILES_DIR = "tiles"; // under public/well-viewer
export const WELL_TILE_MANIFEST_FILE = "manifest.json";

export type WellTileManifest = {
  tile_deg: number;
  total_wells: number;
  tiles: Record<string, { n: number; litho_n: number }>;
} & Record<string, unknown>;

const MILES_PER_DEG_LAT = 69.0;

/** Tile index for one coordinate: `Math.floor(coord / 0.1)` (matches Python `math.floor`). */
export function wellTileIndex(coord: number): number {
  return Math.floor(coord / WELL_TILE_DEG);
}

/** `{latIdx}_{lonIdx}` tile key for a point, e.g. `397_-862`. */
export function wellTileKey(lat: number, lon: number): string {
  return `${wellTileIndex(lat)}_${wellTileIndex(lon)}`;
}

/**
 * Tile keys covering the same bounding box `WellSpatialIndex.queryRadius`
 * scans (`latDeg = r/69`, `cosLat = max(0.05, cos(lat))`, `lonDeg = r/(69*cosLat)`).
 * Sorted latIdx asc then lonIdx asc, unique; `[]` for non-finite input or r <= 0.
 */
export function wellTileKeysForRadius(
  lat: number,
  lon: number,
  radiusMiles: number,
): string[] {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    !Number.isFinite(radiusMiles) ||
    radiusMiles <= 0
  ) {
    return [];
  }
  const latDeg = radiusMiles / MILES_PER_DEG_LAT;
  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const lonDeg = radiusMiles / (MILES_PER_DEG_LAT * cosLat);

  const latMin = wellTileIndex(lat - latDeg);
  const latMax = wellTileIndex(lat + latDeg);
  const lonMin = wellTileIndex(lon - lonDeg);
  const lonMax = wellTileIndex(lon + lonDeg);

  const keys: string[] = [];
  for (let la = latMin; la <= latMax; la++) {
    for (let lo = lonMin; lo <= lonMax; lo++) {
      keys.push(`${la}_${lo}`);
    }
  }
  return keys;
}

/** On-disk filename for a base tile (`base_397_-862.csv.gz`). */
export function baseTileFile(key: string): string {
  return `base_${key}.csv.gz`;
}

/** On-disk filename for a litho sidecar tile (`litho_397_-862.csv.gz`). */
export function lithoTileFile(key: string): string {
  return `litho_${key}.csv.gz`;
}
