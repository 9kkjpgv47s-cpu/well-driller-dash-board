import type { WellRecord } from "@/lib/area-well-analytics";
import { loadAllDnrChunksFromDisk } from "@/lib/dnr-chunk-server";

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

export function resetDnrWellsServerCache(): void {
  wellsCache = null;
  wellsCachePromise = null;
}
