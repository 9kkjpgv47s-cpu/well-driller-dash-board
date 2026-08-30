"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import { readStoredJson, writeStoredJson } from "@/lib/browser-storage";
import {
  baseChunkUrl,
  chunkUrl,
  gunzipText,
  lithoChunkUrl,
  MAX_CHUNK_INDEX,
  missingBaseCoreColumns,
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
      onChunkParsed(index, await parseChunkCsvText(await gunzipText(buf)));
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

// ---------------------------------------------------------------------------
// IndexedDB persistence for base chunk ArrayBuffers
// ---------------------------------------------------------------------------

const IDB_DB_NAME = "driller_hub_chunks";
const IDB_STORE = "base_chunks";
const IDB_VERSION = 1;
const IDB_CHUNK_COUNT_KEY = "cj_dnr_chunk_count_v2";
const IDB_CHUNK_COUNT_TTL_MS = 24 * 60 * 60 * 1000;

function openChunkDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet(db: IDBDatabase, key: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbPut(
  db: IDBDatabase,
  key: string,
  value: ArrayBuffer,
): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ---------------------------------------------------------------------------
// Chunk count discovery + caching
// ---------------------------------------------------------------------------

const CHUNK_COUNT_CACHE_KEY = "cj_dnr_chunk_count_v1";
const CHUNK_COUNT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DISCOVERY_BATCH_SIZE = 4;

function readCachedChunkCount(): number | null {
  const cached = readStoredJson<{ count?: unknown; at?: unknown }>(
    CHUNK_COUNT_CACHE_KEY,
  );
  if (!cached) return null;
  const { count, at } = cached;
  if (
    typeof count !== "number" ||
    count < 1 ||
    count > MAX_CHUNK_INDEX + 1 ||
    typeof at !== "number" ||
    Date.now() - at > CHUNK_COUNT_CACHE_TTL_MS
  ) {
    return null;
  }
  return count;
}

function writeCachedChunkCount(count: number): void {
  writeStoredJson(CHUNK_COUNT_CACHE_KEY, { count, at: Date.now() });
}

/**
 * Discover the contiguous chunk count by fetching small parallel batches and
 * stopping at the first batch containing a miss. Avoids blasting
 * MAX_CHUNK_INDEX requests (and a wall of 404s) on every page load.
 */
async function discoverChunks(
  urlFn: (i: number) => string,
): Promise<{ i: number; res: Response }[]> {
  const ok: { i: number; res: Response }[] = [];
  for (let start = 0; start <= MAX_CHUNK_INDEX; start += DISCOVERY_BATCH_SIZE) {
    const end = Math.min(start + DISCOVERY_BATCH_SIZE - 1, MAX_CHUNK_INDEX);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, k) =>
        fetch(urlFn(start + k)).then(
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
 * Fetch + parse chunk responses, with optional IndexedDB caching of raw
 * ArrayBuffers for instant repeat loads.
 */
async function fetchAndParseChunks(
  urlFn: (i: number) => string,
  count: number,
  onProgress: ChunkProgressCallback | undefined,
  idbDb: IDBDatabase | null,
  idbKeyPrefix: string,
  coreCheck: (headers: Set<string>, index: number) => string | null,
): Promise<WellRecord[]> {
  const report = (done: number, total: number, wells: number, message: string) =>
    onProgress?.({ done, total, wellsLoaded: wells, message });

  // Try IndexedDB first for all chunks
  const idbBuffers: { index: number; buf: ArrayBuffer }[] = [];
  const needFetch: number[] = [];
  if (idbDb) {
    for (let i = 0; i < count; i++) {
      const cached = await idbGet(idbDb, `${idbKeyPrefix}_${i}`);
      if (cached) {
        idbBuffers.push({ index: i, buf: cached });
      } else {
        needFetch.push(i);
      }
    }
  } else {
    for (let i = 0; i < count; i++) needFetch.push(i);
  }

  const total = count;
  report(0, total, 0, idbBuffers.length > 0
    ? `Loaded ${idbBuffers.length}/${total} chunks from cache…`
    : `Downloading ${total} chunks…`);

  // Fetch missing chunks
  const fetchedBuffers: { index: number; buf: ArrayBuffer }[] = [];
  if (needFetch.length) {
    let fetched = 0;
    const responses = await Promise.all(
      needFetch.map((i) =>
        fetch(urlFn(i)).then(async (res) => {
          if (!res.ok) throw new Error(`Chunk ${i} fetch failed: ${res.status}`);
          const buf = await res.arrayBuffer();
          fetched++;
          report(idbBuffers.length + 0, total, 0, `Downloaded chunk ${fetched}/${needFetch.length}…`);
          return { index: i, buf };
        }),
      ),
    );
    fetchedBuffers.push(...responses);

    // Persist to IDB in background (don't block on it)
    if (idbDb) {
      for (const { index, buf } of fetchedBuffers) {
        void idbPut(idbDb, `${idbKeyPrefix}_${index}`, buf.slice(0));
      }
    }
  }

  const allBuffers = [...idbBuffers, ...fetchedBuffers].sort((a, b) => a.index - b.index);

  const parsedByIndex = new Map<number, ParsedChunk>();
  let done = 0;
  let wellsSoFar = 0;

  await parseChunkBuffers(allBuffers, (index, parsed) => {
    parsedByIndex.set(index, parsed);
    done++;
    wellsSoFar += parsed.rows.length;

    if (index === 0) {
      const headers = normalizeHeaderSet(parsed.fields);
      const err = coreCheck(headers, index);
      if (err) throw new Error(err);
    }
    report(
      done,
      total,
      wellsSoFar,
      `Parsed chunk ${done}/${total} (${wellsSoFar.toLocaleString()} wells)…`,
    );
  });

  const all: WellRecord[] = [];
  for (let i = 0; i < total; i++) {
    const parsed = parsedByIndex.get(i);
    if (parsed) all.push(...parsed.rows);
  }
  return all;
}

/**
 * Merge litho chunk rows into base rows by well `id`.
 */
function mergeLithoIntoBase(base: WellRecord[], litho: WellRecord[]): WellRecord[] {
  const lithoMap = new Map<string, WellRecord>();
  for (const row of litho) {
    const id = String(row.id ?? "").trim();
    if (id) lithoMap.set(id, row);
  }
  for (const w of base) {
    const id = String(w.id ?? "").trim();
    const lithoRow = id ? lithoMap.get(id) : undefined;
    if (lithoRow) {
      if (lithoRow.lithology_json != null) w.lithology_json = lithoRow.lithology_json;
      if (lithoRow.lithology_source != null) w.lithology_source = lithoRow.lithology_source;
    }
  }
  return base;
}

/**
 * Load **base** chunks only (no lithology_json) from the static viewer path.
 * Uses IndexedDB for instant repeat loads. Falls back to legacy full chunks
 * if base chunk files don't exist.
 */
export async function loadBaseChunksFromPublic(
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  const report = (done: number, total: number, wells: number, message: string) =>
    onProgress?.({ done, total, wellsLoaded: wells, message });

  report(0, 0, 0, "Checking registry chunks…");

  const idbDb = await openChunkDb();

  // Try base chunks first
  let chunkResponses: { i: number; res: Response }[] | null = null;

  const cachedCount = readCachedChunkCount();
  if (cachedCount) {
    const batch = await Promise.all(
      Array.from({ length: cachedCount }, (_, i) =>
        fetch(baseChunkUrl(i)).then(
          (res) => ({ i, res: res as Response | null }),
          () => ({ i, res: null as Response | null }),
        ),
      ),
    );
    if (batch.every(({ res }) => res?.ok)) {
      chunkResponses = batch as { i: number; res: Response }[];
    } else {
      for (const { res } of batch) void res?.body?.cancel();
    }
  }

  if (!chunkResponses) {
    // Try base chunks
    chunkResponses = await discoverChunks(baseChunkUrl);
    if (!chunkResponses.length) {
      // Fall back to legacy full chunks
      chunkResponses = await discoverChunks(chunkUrl);
      if (!chunkResponses.length) {
        throw new Error(
          `No chunk data at ${baseChunkUrl(0)} or ${chunkUrl(0)}.`,
        );
      }
      // Use legacy path
      writeCachedChunkCount(chunkResponses.length);
      return loadLegacyChunks(chunkResponses, onProgress, idbDb);
    }
    writeCachedChunkCount(chunkResponses.length);
  }

  const count = chunkResponses.length;
  // Cancel the discovery responses — we'll re-fetch through the IDB-aware path
  for (const { res } of chunkResponses) void res.body?.cancel();

  return fetchAndParseChunks(
    baseChunkUrl,
    count,
    onProgress,
    idbDb,
    "base",
    (headers, idx) => {
      const missing = missingBaseCoreColumns(headers);
      return missing.length
        ? `Base chunk schema drift in ${baseChunkUrl(idx)}; missing core columns: ${missing.join(", ")}.`
        : null;
    },
  );
}

/**
 * Load **litho** sidecar chunks and merge into existing base well records.
 * Called after base chunks are loaded to populate lithology_json for area
 * insights and well detail panels.
 */
export async function loadLithoChunksIntoWells(
  baseWells: WellRecord[],
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  const report = (done: number, total: number, wells: number, message: string) =>
    onProgress?.({ done, total, wellsLoaded: wells, message });

  report(0, 0, 0, "Loading lithology sidecars…");

  const idbDb = await openChunkDb();

  // Discover litho chunk count
  const cachedCount = readCachedChunkCount();
  let count = cachedCount ?? 0;

  if (count === 0) {
    const discovered = await discoverChunks(lithoChunkUrl);
    count = discovered.length;
    for (const { res } of discovered) void res.body?.cancel();
  }

  if (count === 0) {
    // No litho sidecars — base wells already have lithology_json from legacy chunks
    return baseWells;
  }

  const lithoWells = await fetchAndParseChunks(
    lithoChunkUrl,
    count,
    onProgress,
    idbDb,
    "litho",
    () => null,
  );

  return mergeLithoIntoBase(baseWells, lithoWells);
}

/**
 * Legacy chunk loading path (full chunks with lithology_json inline).
 * Used when base/litho split files don't exist.
 */
async function loadLegacyChunks(
  chunkResponses: { i: number; res: Response }[],
  onProgress: ChunkProgressCallback | undefined,
  idbDb: IDBDatabase | null,
): Promise<WellRecord[]> {
  const total = chunkResponses.length;
  const report = (done: number, total: number, wells: number, message: string) =>
    onProgress?.({ done, total, wellsLoaded: wells, message });

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

  // Persist to IDB
  if (idbDb) {
    for (const { index, buf } of buffers) {
      void idbPut(idbDb, `legacy_${index}`, buf.slice(0));
    }
  }

  const parsedByIndex = new Map<number, ParsedChunk>();
  let done = 0;
  let wellsSoFar = 0;

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
    report(
      done,
      total,
      wellsSoFar,
      `Parsed chunk ${done}/${total} (${wellsSoFar.toLocaleString()} wells)…`,
    );
  });

  const all: WellRecord[] = [];
  for (let i = 0; i < total; i++) {
    const parsed = parsedByIndex.get(i);
    if (parsed) all.push(...parsed.rows);
  }

  report(total, total, all.length, `Loaded ${all.length.toLocaleString()} wells`);
  return all;
}

/**
 * Load all DNR gzip chunks from the static viewer path (same origin as the hub).
 *
 * Two-phase: loads base chunks first (no lithology_json, ~46% smaller), then
 * loads litho sidecars and merges. Falls back to legacy full chunks if split
 * files don't exist.
 *
 * @param onProgress Progress callback for base chunk loading
 * @param onLithoProgress Optional progress callback for litho sidecar loading
 */
export async function loadAllDnrChunksFromPublic(
  onProgress?: ChunkProgressCallback,
  onLithoProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  const baseWells = await loadBaseChunksFromPublic(onProgress);
  // If base wells already have lithology_json (legacy chunks), skip litho load
  const hasLitho = baseWells.some(
    (w) => w.lithology_json != null && String(w.lithology_json).trim() !== "",
  );
  if (hasLitho) return baseWells;
  return loadLithoChunksIntoWells(baseWells, onLithoProgress);
}

/**
 * Get the cached base wells (for map rendering) and lazily load litho in
 * the background. Returns base wells immediately; litho merges into the
 * same array reference when ready.
 */
export async function loadBaseChunksForMap(
  onProgress?: ChunkProgressCallback,
): Promise<WellRecord[]> {
  return loadBaseChunksFromPublic(onProgress);
}
