"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import { logWarning } from "@/lib/errors";
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

const CHUNK_COUNT_CACHE_KEY = "cj_dnr_chunk_count_v1";
const CHUNK_COUNT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DISCOVERY_BATCH_SIZE = 4;

function readCachedChunkCount(): number | null {
  try {
    const raw = window.localStorage.getItem(CHUNK_COUNT_CACHE_KEY);
    if (!raw) return null;
    const { count, at } = JSON.parse(raw) as { count: number; at: number };
    if (
      typeof count !== "number" ||
      count < 1 ||
      count > MAX_CHUNK_INDEX + 1 ||
      Date.now() - at > CHUNK_COUNT_CACHE_TTL_MS
    ) {
      return null;
    }
    return count;
  } catch (e) {
    logWarning("dnr-chunk-browser", "cached chunk count unreadable", e);
    return null;
  }
}

function writeCachedChunkCount(count: number): void {
  try {
    window.localStorage.setItem(
      CHUNK_COUNT_CACHE_KEY,
      JSON.stringify({ count, at: Date.now() }),
    );
  } catch (e) {
    // Private mode etc. — discovery just reruns next load.
    logWarning("dnr-chunk-browser", "chunk count not cached", e);
  }
}

/**
 * Discover the contiguous chunk count by fetching small parallel batches and
 * stopping at the first batch containing a miss. Avoids blasting
 * MAX_CHUNK_INDEX requests (and a wall of 404s) on every page load.
 */
async function discoverChunks(): Promise<{ i: number; res: Response }[]> {
  const ok: { i: number; res: Response }[] = [];
  for (let start = 0; start <= MAX_CHUNK_INDEX; start += DISCOVERY_BATCH_SIZE) {
    const end = Math.min(start + DISCOVERY_BATCH_SIZE - 1, MAX_CHUNK_INDEX);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, k) =>
        fetch(chunkUrl(start + k)).then(
          (res) => ({ i: start + k, res: res as Response | null }),
          () => ({ i: start + k, res: null as Response | null }),
        ),
      ),
    );
    let stopped = false;
    for (const { i, res } of batch) {
      if (!stopped && res?.ok) {
        ok.push({ i, res });
      } else {
        stopped = true;
        void res?.body?.cancel();
      }
    }
    if (stopped) break;
  }
  return ok;
}

/**
 * Load all DNR gzip chunks from the static viewer path (same origin as the hub).
 *
 * The contiguous chunk count is discovered in small batches (the ETL writes
 * chunk_0..chunk_{n-1}) and cached in localStorage for 24h so repeat loads
 * fetch exactly the right files. Decompression + parsing runs in a Web Worker
 * pool.
 */
export async function loadAllDnrChunksFromPublic(
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  const report = (done: number, total: number, wells: number, message: string) =>
    onProgress?.({ done, total, wellsLoaded: wells, message });

  report(0, 0, 0, "Checking registry chunks…");

  let chunkResponses: { i: number; res: Response }[] | null = null;

  const cachedCount = readCachedChunkCount();
  if (cachedCount) {
    const batch = await Promise.all(
      Array.from({ length: cachedCount }, (_, i) =>
        fetch(chunkUrl(i)).then(
          (res) => ({ i, res: res as Response | null }),
          () => ({ i, res: null as Response | null }),
        ),
      ),
    );
    if (batch.every(({ res }) => res?.ok)) {
      chunkResponses = batch as { i: number; res: Response }[];
    } else {
      // Stale cache (dataset changed) — drain and rediscover.
      for (const { res } of batch) void res?.body?.cancel();
    }
  }

  if (!chunkResponses) {
    chunkResponses = await discoverChunks();
    if (chunkResponses.length) writeCachedChunkCount(chunkResponses.length);
  }

  if (!chunkResponses.length) {
    throw new Error(
      `No chunk data at ${chunkUrl(0)}. Run scripts/sync-well-viewer-into-hub.sh and ensure .csv.gz files exist under public/well-viewer/.`,
    );
  }

  const total = chunkResponses.length;
  report(0, total, 0, `Downloading ${total} registry chunks…`);

  let fetched = 0;
  const buffers = await Promise.all(
    chunkResponses.map(async ({ i, res }) => {
      const buf = await res.arrayBuffer();
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
  for (const { i } of chunkResponses) {
    const parsed = parsedByIndex.get(i);
    if (!parsed) {
      throw new Error(
        `Chunk ${i} was fetched but never parsed — refusing to report a partial registry.`,
      );
    }
    all.push(...parsed.rows);
  }

  report(total, total, all.length, `Loaded ${all.length.toLocaleString()} wells`);
  return all;
}
