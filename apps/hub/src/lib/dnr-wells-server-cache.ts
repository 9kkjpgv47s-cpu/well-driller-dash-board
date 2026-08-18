import type { WellRecord } from "@/lib/area-well-analytics";
import { loadAllDnrChunksFromDisk } from "@/lib/dnr-chunk-server";

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

let wellsCache: WellRecord[] | null = null;
let wellsCachePromise: Promise<WellRecord[]> | null = null;

/** Single-flight server load of all chunk wells (optimization API + future routes). */
export function getDnrWellsServerCached(): Promise<WellRecord[]> {
  if (wellsCache) return Promise.resolve(wellsCache);
  if (!wellsCachePromise) {
    wellsCachePromise = loadAllDnrChunksFromDisk()
      .then((w) => {
        wellsCache = w;
        return w;
      })
      .catch((err) => {
        wellsCachePromise = null;
        throw err;
      });
  }
  return wellsCachePromise;
}

/**
 * Bounded wait for the server chunk cache. Rejects on timeout so API routes can
 * return mock/fallback JSON before the platform kills the function.
 */
export function getDnrWellsServerCachedWithTimeout(
  timeoutMs = DNR_WELLS_SERVER_LOAD_TIMEOUT_MS,
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
  return Promise.race([getDnrWellsServerCached(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Bounded cache read for API routes (shorter timeout on Vercel). */
export function getDnrWellsServerCachedForApi(): Promise<WellRecord[]> {
  return getDnrWellsServerCachedWithTimeout(getDnrWellsServerLoadTimeoutMs());
}

export function resetDnrWellsServerCache(): void {
  wellsCache = null;
  wellsCachePromise = null;
}
