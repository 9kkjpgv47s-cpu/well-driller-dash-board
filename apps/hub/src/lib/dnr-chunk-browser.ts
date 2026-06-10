"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import {
  chunkUrl,
  gunzipText,
  MAX_CHUNK_INDEX,
  missingCoreColumns,
  normalizeHeaderSet,
  parseChunkCsvText,
  type ParsedChunk,
} from "@/lib/dnr-chunk-shared";
import type {
  ChunkWorkerRequest,
  ChunkWorkerResponse,
} from "@/lib/dnr-chunk-worker";

export type ChunkLoadProgress = {
  /** Chunks fully decompressed + parsed so far. */
  done: number;
  /** Chunks that exist on the server for this dataset. */
  total: number;
  /** Valid well rows accumulated so far. */
  wellsLoaded: number;
  /** Human-readable status (kept for simple status-line consumers). */
  message: string;
};

export type ChunkProgressCallback = (progress: ChunkLoadProgress) => void;

const WORKER_POOL_SIZE = 4;

function canUseWorkers(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function createChunkWorker(): Worker {
  return new Worker(new URL("./dnr-chunk-worker.ts", import.meta.url));
}

/**
 * Decompress + parse fetched chunk buffers in a small Web Worker pool so the
 * main thread stays responsive. Falls back to main-thread parsing when
 * workers are unavailable (older browsers, non-window contexts, tests).
 */
async function parseChunkBuffers(
  buffers: { index: number; buf: ArrayBuffer }[],
  onChunkParsed: (index: number, parsed: ParsedChunk) => void,
): Promise<void> {
  if (!buffers.length) return;

  if (!canUseWorkers()) {
    for (const { index, buf } of buffers) {
      onChunkParsed(index, parseChunkCsvText(await gunzipText(buf)));
    }
    return;
  }

  const queue = [...buffers];
  const workers: Worker[] = [];
  try {
    const poolSize = Math.min(WORKER_POOL_SIZE, queue.length);
    for (let i = 0; i < poolSize; i++) workers.push(createChunkWorker());

    await Promise.all(
      workers.map(
        (worker) =>
          new Promise<void>((resolve, reject) => {
            const next = () => {
              const job = queue.shift();
              if (!job) {
                resolve();
                return;
              }
              const msg: ChunkWorkerRequest = { id: job.index, buf: job.buf };
              worker.postMessage(msg, [job.buf]);
            };
            worker.onmessage = (e: MessageEvent<ChunkWorkerResponse>) => {
              const data = e.data;
              if ("error" in data) {
                reject(
                  new Error(`Chunk ${data.id} failed to parse: ${data.error}`),
                );
                return;
              }
              try {
                onChunkParsed(data.id, { rows: data.rows, fields: data.fields });
              } catch (err) {
                reject(err instanceof Error ? err : new Error(String(err)));
                return;
              }
              next();
            };
            worker.onerror = (e) => {
              reject(new Error(`Chunk worker error: ${e.message || "unknown"}`));
            };
            next();
          }),
      ),
    );
  } finally {
    for (const w of workers) w.terminate();
  }
}

/**
 * Load all DNR gzip chunks from the static viewer path (same origin as the hub).
 *
 * Chunks are fetched concurrently (existing files are discovered by status —
 * the first missing index ends the contiguous set, matching how the ETL
 * writes chunk files), then decompressed + parsed in a Web Worker pool.
 */
export async function loadAllDnrChunksFromPublic(
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  const report = (done: number, total: number, wells: number, message: string) =>
    onProgress?.({ done, total, wellsLoaded: wells, message });

  report(0, 0, 0, "Checking registry chunks…");

  // Fetch all candidate chunks concurrently; missing indices 404 cheaply.
  const responses = await Promise.all(
    Array.from({ length: MAX_CHUNK_INDEX + 1 }, (_, i) =>
      fetch(chunkUrl(i)).then(
        (res) => ({ i, res }),
        () => ({ i, res: null as Response | null }),
      ),
    ),
  );

  if (!responses[0]?.res?.ok) {
    throw new Error(
      `No chunk data at ${chunkUrl(0)}. Run scripts/sync-well-viewer-into-hub.sh and ensure .csv.gz files exist under public/well-viewer/.`,
    );
  }

  // Contiguous count from index 0 (the ETL writes chunk_0..chunk_{n-1}).
  let total = 0;
  while (total <= MAX_CHUNK_INDEX && responses[total]?.res?.ok) total++;
  for (let i = total; i <= MAX_CHUNK_INDEX; i++) {
    // Drain ignored bodies so connections can be reused/closed.
    void responses[i]?.res?.body?.cancel();
  }

  report(0, total, 0, `Downloading ${total} registry chunks…`);

  let fetched = 0;
  const buffers = await Promise.all(
    responses.slice(0, total).map(async ({ i, res }) => {
      const buf = await (res as Response).arrayBuffer();
      fetched++;
      report(0, total, 0, `Downloaded chunk ${fetched}/${total}…`);
      return { index: i, buf };
    }),
  );

  const parsedByIndex = new Map<number, ParsedChunk>();
  let done = 0;
  let wellsSoFar = 0;
  let warnedLithologySourceMissing = false;

  await parseChunkBuffers(buffers, (index, parsed) => {
    parsedByIndex.set(index, parsed);
    done++;
    wellsSoFar += parsed.rows.length;

    const headers = normalizeHeaderSet(parsed.fields);
    if (index === 0) {
      const missing = missingCoreColumns(headers);
      if (missing.length) {
        throw new Error(
          `Chunk schema drift detected in ${chunkUrl(0)}; missing core columns: ${missing.join(", ")}.`,
        );
      }
    }
    if (!warnedLithologySourceMissing && !headers.has("lithology_source")) {
      warnedLithologySourceMissing = true;
      report(
        done,
        total,
        wellsSoFar,
        "Warning: chunks missing lithology_source; KPI/source-aware insights may be degraded.",
      );
      return;
    }
    report(
      done,
      total,
      wellsSoFar,
      `Parsed chunk ${done}/${total} (${wellsSoFar.toLocaleString()} wells)…`,
    );
  });

  // Assemble in chunk order for deterministic downstream behavior.
  const all: WellRecord[] = [];
  for (let i = 0; i < total; i++) {
    const parsed = parsedByIndex.get(i);
    if (parsed) all.push(...parsed.rows);
  }

  report(total, total, all.length, `Loaded ${all.length.toLocaleString()} wells`);
  return all;
}
