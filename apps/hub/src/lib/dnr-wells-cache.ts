import { loadAllDnrChunksFromPublic } from "@/lib/dnr-chunk-browser";
import type { WellRecord } from "@/lib/area-well-analytics";

let wellsCache: WellRecord[] | null = null;
let wellsCachePromise: Promise<WellRecord[]> | null = null;

/** Single-flight load of all chunk wells (shared by Drilling map + area insights). */
export function getDnrWellsCached(
  onProgress?: (msg: string) => void,
): Promise<WellRecord[]> {
  if (wellsCache) return Promise.resolve(wellsCache);
  if (!wellsCachePromise) {
    wellsCachePromise = loadAllDnrChunksFromPublic(onProgress).then((w) => {
      wellsCache = w;
      return w;
    });
  }
  return wellsCachePromise;
}
