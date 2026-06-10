/**
 * Grid spatial index over loaded WellRecord[] (~415k rows statewide).
 *
 * Wells are bucketed into fixed 0.05° lat/lon cells once; radius and bounds
 * queries then only touch candidate cells instead of haversine-scanning the
 * whole array. Works in the browser and on the server (no DOM usage).
 */

import { haversineMiles, type WellRecord } from "@/lib/area-well-analytics";

export const GRID_CELL_DEG = 0.05;

/** Linear scans are fine (and avoid index-build cost) below this size. */
const LINEAR_SCAN_THRESHOLD = 2000;

const MILES_PER_DEG_LAT = 69.0;

export type WellBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type IndexedWell = {
  w: WellRecord;
  lat: number;
  lon: number;
  /** Insertion order, used to keep query results deterministic. */
  ord: number;
};

function cellKey(latCell: number, lonCell: number): string {
  return `${latCell}:${lonCell}`;
}

export class WellSpatialIndex {
  private readonly cells = new Map<string, IndexedWell[]>();
  readonly size: number;

  constructor(wells: WellRecord[]) {
    let n = 0;
    for (let i = 0; i < wells.length; i++) {
      const w = wells[i]!;
      const lat = Number(w.lat);
      const lon = Number(w.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const key = cellKey(
        Math.floor(lat / GRID_CELL_DEG),
        Math.floor(lon / GRID_CELL_DEG),
      );
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push({ w, lat, lon, ord: i });
      n++;
    }
    this.size = n;
  }

  /** Wells within `radiusMiles` of (lat, lon), haversine-exact, in source order. */
  queryRadius(lat: number, lon: number, radiusMiles: number): WellRecord[] {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || radiusMiles <= 0) {
      return [];
    }
    const latDeg = radiusMiles / MILES_PER_DEG_LAT;
    const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
    const lonDeg = radiusMiles / (MILES_PER_DEG_LAT * cosLat);

    const hits: IndexedWell[] = [];
    this.forEachCandidate(
      {
        south: lat - latDeg,
        north: lat + latDeg,
        west: lon - lonDeg,
        east: lon + lonDeg,
      },
      (iw) => {
        if (haversineMiles(lat, lon, iw.lat, iw.lon) <= radiusMiles) {
          hits.push(iw);
        }
      },
    );
    hits.sort((a, b) => a.ord - b.ord);
    return hits.map((h) => h.w);
  }

  /** Wells within a lat/lon bounding box (e.g. Leaflet map bounds), in source order. */
  queryBounds(bounds: WellBounds): WellRecord[] {
    const hits: IndexedWell[] = [];
    this.forEachCandidate(bounds, (iw) => {
      if (
        iw.lat >= bounds.south &&
        iw.lat <= bounds.north &&
        iw.lon >= bounds.west &&
        iw.lon <= bounds.east
      ) {
        hits.push(iw);
      }
    });
    hits.sort((a, b) => a.ord - b.ord);
    return hits.map((h) => h.w);
  }

  private forEachCandidate(
    bounds: WellBounds,
    fn: (iw: IndexedWell) => void,
  ): void {
    const latMin = Math.floor(bounds.south / GRID_CELL_DEG);
    const latMax = Math.floor(bounds.north / GRID_CELL_DEG);
    const lonMin = Math.floor(bounds.west / GRID_CELL_DEG);
    const lonMax = Math.floor(bounds.east / GRID_CELL_DEG);
    for (let la = latMin; la <= latMax; la++) {
      for (let lo = lonMin; lo <= lonMax; lo++) {
        const bucket = this.cells.get(cellKey(la, lo));
        if (!bucket) continue;
        for (const iw of bucket) fn(iw);
      }
    }
  }
}

export function buildWellSpatialIndex(wells: WellRecord[]): WellSpatialIndex {
  return new WellSpatialIndex(wells);
}

/** Per-array index cache so repeated queries over the same loaded set reuse one build. */
const indexCache = new WeakMap<WellRecord[], WellSpatialIndex>();

export function getWellSpatialIndex(wells: WellRecord[]): WellSpatialIndex {
  let idx = indexCache.get(wells);
  if (!idx) {
    idx = new WellSpatialIndex(wells);
    indexCache.set(wells, idx);
  }
  return idx;
}

/**
 * Drop-in replacement for `wellsWithinRadius`: uses the cached grid index for
 * large arrays and falls back to the plain linear scan for tiny ones.
 */
export function wellsWithinRadiusIndexed(
  wells: WellRecord[],
  lat: number,
  lon: number,
  radiusMiles: number,
): WellRecord[] {
  if (wells.length < LINEAR_SCAN_THRESHOLD) {
    return wells.filter((w) => {
      const la = Number(w.lat);
      const lo = Number(w.lon);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
      return haversineMiles(lat, lon, la, lo) <= radiusMiles;
    });
  }
  return getWellSpatialIndex(wells).queryRadius(lat, lon, radiusMiles);
}
