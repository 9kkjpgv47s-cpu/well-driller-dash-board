import {
  loadBaseChunksFromPublic,
  loadLithoChunksIntoWells,
  type ChunkProgressCallback,
} from "@/lib/dnr-chunk-browser";
import type { WellRecord } from "@/lib/area-well-analytics";

// --- Base cache (no lithology_json — for map rendering) ---

let baseWellsCache: WellRecord[] | null = null;
let baseWellsCachePromise: Promise<WellRecord[]> | null = null;

/** Single-flight load of base chunks (no lithology_json) for map rendering. */
export function getDnrWellsBaseCached(
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  if (baseWellsCache) return Promise.resolve(baseWellsCache);
  if (!baseWellsCachePromise) {
    baseWellsCachePromise = loadBaseChunksFromPublic(onProgress)
      .then((w) => {
        baseWellsCache = w;
        return w;
      })
      .catch((err) => {
        baseWellsCachePromise = null;
        throw err;
      });
  }
  return baseWellsCachePromise;
}

// --- Full cache (base + lithology_json merged — for area insights) ---

let fullWellsCache: WellRecord[] | null = null;
let fullWellsCachePromise: Promise<WellRecord[]> | null = null;

/**
 * Single-flight load of full well data (base + lithology_json).
 * Reuses already-loaded base chunks if available, then loads litho sidecars
 * and merges them in.
 */
export function getDnrWellsFullCached(
  onBaseProgress?: ChunkProgressCallback,
  onLithoProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  if (fullWellsCache) return Promise.resolve(fullWellsCache);
  if (!fullWellsCachePromise) {
    fullWellsCachePromise = (async () => {
      // Reuse base cache if already loaded, otherwise load base first
      const base = baseWellsCache ?? await getDnrWellsBaseCached(onBaseProgress);
      // Check if base already has lithology (legacy chunks)
      const hasLitho = base.some(
        (w) => w.lithology_json != null && String(w.lithology_json).trim() !== "",
      );
      if (hasLitho) {
        fullWellsCache = base;
        return base;
      }
      // Load litho sidecars and merge into the base array (in-place)
      const merged = await loadLithoChunksIntoWells(base, onLithoProgress);
      fullWellsCache = merged;
      return merged;
    })().catch((err) => {
      fullWellsCachePromise = null;
      throw err;
    });
  }
  return fullWellsCachePromise;
}

/** @deprecated Use getDnrWellsFullCached for area insights or getDnrWellsBaseCached for map. */
export function getDnrWellsCached(
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  return getDnrWellsFullCached(onProgress);
}

export function resetDnrWellsCache(): void {
  baseWellsCache = null;
  baseWellsCachePromise = null;
  fullWellsCache = null;
  fullWellsCachePromise = null;
}
