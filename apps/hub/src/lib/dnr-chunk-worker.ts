/// <reference lib="webworker" />
/**
 * Web Worker: gunzip + CSV-parse one DNR chunk off the main thread.
 * Spawned by dnr-chunk-browser.ts via `new Worker(new URL(...))` so Next.js
 * bundles it for both dev and production builds.
 */

import { gunzipText, parseChunkCsvText } from "@/lib/dnr-chunk-shared";
import type { WellRecord } from "@/lib/area-well-analytics";

export type ChunkWorkerRequest = {
  id: number;
  buf: ArrayBuffer;
};

export type ChunkWorkerResponse =
  | { id: number; rows: WellRecord[]; fields: string[] }
  | { id: number; error: string };

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<ChunkWorkerRequest>) => {
  const { id, buf } = e.data;
  void (async () => {
    try {
      const text = await gunzipText(buf);
      const { rows, fields } = parseChunkCsvText(text);
      ctx.postMessage({ id, rows, fields } satisfies ChunkWorkerResponse);
    } catch (err) {
      ctx.postMessage({
        id,
        error: err instanceof Error ? err.message : String(err),
      } satisfies ChunkWorkerResponse);
    }
  })();
};
