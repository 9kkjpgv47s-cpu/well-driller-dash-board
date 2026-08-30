import type { WellRecord } from "@/lib/area-well-analytics";
import {
  loadBaseChunksFromDisk,
  loadFullChunksFromDisk,
} from "@/lib/dnr-chunk-server";

/** Local/dev budget for loading gz chunks from disk. */
export const DNR_WELLS_SERVER_LOAD_TIMEOUT_MS = 20_000;

/**
 * Budget on Vercel so routes return **503 quickly** for client chunk fallback.
 * Full registry (~10 gz chunks) often cannot finish on a cold serverless start;
 * hanging without timeout produced 500/timeout and the UI never fell back.
 * Warm instances that already have the in-memory cache still serve full API.
 */
export const DNR_WELLS_SERVER_LOAD_TIMEOUT_VERCEL_MS = 4_000;

export function getDnrWellsServerLoadTimeoutMs(): number {
  return process.env.VERCEL
    ? DNR_WELLS_SERVER_LOAD_TIMEOUT_VERCEL_MS
    : DNR_WELLS_SERVER_LOAD_TIMEOUT_MS;
}

// --- Base cache (no lithology_json — ~46% smaller, for wells-nearby API) ---

let baseWellsCache: WellRecord[] | null = null;
let baseWellsCachePromise: Promise<WellRecord[]> | null = null;

/** Single-flight server load of base chunks (no lithology_json). */
export function getDnrWellsBaseCached(): Promise<WellRecord[]> {
  if (baseWellsCache) return Promise.resolve(baseWellsCache);
  if (!baseWellsCachePromise) {
    baseWellsCachePromise = loadBaseChunksFromDisk()
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

/** Bounded cache read for base chunks (shorter timeout on Vercel). */
export function getDnrWellsBaseCachedForApi(): Promise<WellRecord[]> {
  return getDnrWellsServerCachedWithTimeout(
    getDnrWellsBaseCached(),
    getDnrWellsServerLoadTimeoutMs(),
  );
}

// --- Full cache (base + lithology_json merged — for area-insights, optimization) ---

let fullWellsCache: WellRecord[] | null = null;
let fullWellsCachePromise: Promise<WellRecord[]> | null = null;

/** Single-flight server load of full chunks (base + lithology_json merged). */
export function getDnrWellsFullCached(): Promise<WellRecord[]> {
  if (fullWellsCache) return Promise.resolve(fullWellsCache);
  if (!fullWellsCachePromise) {
    fullWellsCachePromise = loadFullChunksFromDisk()
      .then((w) => {
        fullWellsCache = w;
        return w;
      })
      .catch((err) => {
        fullWellsCachePromise = null;
        throw err;
      });
  }
  return fullWellsCachePromise;
}

/** Bounded cache read for full chunks (shorter timeout on Vercel). */
export function getDnrWellsFullCachedForApi(): Promise<WellRecord[]> {
  return getDnrWellsServerCachedWithTimeout(
    getDnrWellsFullCached(),
    getDnrWellsServerLoadTimeoutMs(),
  );
}

// --- Legacy aliases (backward compat) ---

/** @deprecated Use getDnrWellsFullCached for area-insights or getDnrWellsBaseCached for wells-nearby. */
export function getDnrWellsServerCached(): Promise<WellRecord[]> {
  return getDnrWellsFullCached();
}

/** @deprecated Use getDnrWellsBaseCachedForApi or getDnrWellsFullCachedForApi. */
export function getDnrWellsServerCachedForApi(): Promise<WellRecord[]> {
  return getDnrWellsFullCachedForApi();
}

export function getDnrWellsServerCachedWithTimeout(
  cachePromise: Promise<WellRecord[]>,
  timeoutMs: number,
): Promise<WellRecord[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `DNR chunk load timed out after ${timeoutMs}ms (serverless cold start).`,
        ),
      );
    }, timeoutMs);
  });
  return Promise.race([cachePromise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function resetDnrWellsServerCache(): void {
  baseWellsCache = null;
  baseWellsCachePromise = null;
  fullWellsCache = null;
  fullWellsCachePromise = null;
}
