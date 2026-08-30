import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  missingBaseCoreColumns,
  missingCoreColumns,
  normalizeHeaderSet,
  parseChunkCsvText,
  MAX_CHUNK_INDEX,
} from "@/lib/dnr-chunk-shared";

const gunzip = promisify(zlib.gunzip);

const CHUNK_PREFIX = "dnr_wells_chunk_";
const BASE_CHUNK_PREFIX = "dnr_wells_base_chunk_";
const LITHO_CHUNK_PREFIX = "dnr_wells_litho_chunk_";
const CHUNK_SUFFIX = ".csv.gz";
const DISCOVERY_BATCH_SIZE = 4;

function viewerDir(): string {
  return path.join(process.cwd(), "public", "well-viewer");
}

function chunkPath(index: number): string {
  return path.join(viewerDir(), `${CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`);
}

function baseChunkPath(index: number): string {
  return path.join(viewerDir(), `${BASE_CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`);
}

function lithoChunkPath(index: number): string {
  return path.join(viewerDir(), `${LITHO_CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`);
}

type ParsedChunkOnDisk = {
  index: number;
  rows: WellRecord[];
  fields: string[];
};

async function discoverChunkIndices(
  prefix: string,
  suffix: string,
): Promise<number[]> {
  const indices: number[] = [];
  for (let start = 0; start <= MAX_CHUNK_INDEX; start += DISCOVERY_BATCH_SIZE) {
    const end = Math.min(start + DISCOVERY_BATCH_SIZE - 1, MAX_CHUNK_INDEX);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, k) => {
        const i = start + k;
        const p = path.join(viewerDir(), `${prefix}${i}${suffix}`);
        return fs
          .access(p)
          .then(() => i)
          .catch(() => null);
      }),
    );
    let stopped = false;
    for (const i of batch) {
      if (i != null && !stopped) {
        indices.push(i);
      } else {
        stopped = true;
      }
    }
    if (stopped) break;
  }
  if (!indices.length) {
    throw new Error(
      `No chunk data at ${path.join(viewerDir(), `${prefix}0${suffix}`)}. Ensure .csv.gz files exist under public/well-viewer/.`,
    );
  }
  return indices;
}

async function loadOneChunkFile(
  index: number,
  filePath: string,
): Promise<ParsedChunkOnDisk> {
  const buf = await fs.readFile(filePath);
  const text = (await gunzip(buf)).toString("utf-8");
  const { rows, fields } = await parseChunkCsvText(text);
  return { index, rows, fields };
}

async function loadOneChunk(index: number): Promise<ParsedChunkOnDisk> {
  return loadOneChunkFile(index, chunkPath(index));
}

async function loadOneBaseChunk(index: number): Promise<ParsedChunkOnDisk> {
  return loadOneChunkFile(index, baseChunkPath(index));
}

async function loadOneLithoChunk(index: number): Promise<ParsedChunkOnDisk> {
  return loadOneChunkFile(index, lithoChunkPath(index));
}

/** Check whether split base/litho chunks exist. */
export async function hasSplitChunks(): Promise<boolean> {
  try {
    await fs.access(baseChunkPath(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge litho chunk rows into base rows by well `id`.
 * Only fields present in litho rows (lithology_json, lithology_source) are
 * copied onto the corresponding base row.
 */
function mergeLithoIntoBase(
  base: WellRecord[],
  litho: WellRecord[],
): WellRecord[] {
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

/** Load all DNR gzip chunks from hub public/well-viewer (server-side). */
export async function loadAllDnrChunksFromDisk(): Promise<WellRecord[]> {
  const indices = await discoverChunkIndices(CHUNK_PREFIX, CHUNK_SUFFIX);
  const parsed = await Promise.all(indices.map((i) => loadOneChunk(i)));
  parsed.sort((a, b) => a.index - b.index);

  const chunk0 = parsed[0];
  if (chunk0) {
    const missing = missingCoreColumns(normalizeHeaderSet(chunk0.fields));
    if (missing.length) {
      throw new Error(
        `Chunk schema drift in ${chunkPath(chunk0.index)}; missing core columns: ${missing.join(", ")}.`,
      );
    }
  }

  const all: WellRecord[] = [];
  for (const chunk of parsed) {
    all.push(...chunk.rows);
  }
  return all;
}

/**
 * Load **base** chunks only (no lithology_json) — ~46% smaller than full chunks.
 * Sufficient for wells-nearby API, map markers, depth/yield/aquifer insights.
 * Falls back to full chunks if split files don't exist.
 */
export async function loadBaseChunksFromDisk(): Promise<WellRecord[]> {
  const split = await hasSplitChunks();
  if (!split) {
    return loadAllDnrChunksFromDisk();
  }

  const indices = await discoverChunkIndices(BASE_CHUNK_PREFIX, CHUNK_SUFFIX);
  const parsed = await Promise.all(indices.map((i) => loadOneBaseChunk(i)));
  parsed.sort((a, b) => a.index - b.index);

  const chunk0 = parsed[0];
  if (chunk0) {
    const missing = missingBaseCoreColumns(normalizeHeaderSet(chunk0.fields));
    if (missing.length) {
      throw new Error(
        `Base chunk schema drift in ${baseChunkPath(chunk0.index)}; missing core columns: ${missing.join(", ")}.`,
      );
    }
  }

  const all: WellRecord[] = [];
  for (const chunk of parsed) {
    all.push(...chunk.rows);
  }
  return all;
}

/**
 * Load **full** well data: base chunks + litho sidecars merged by well id.
 * Falls back to legacy full chunks if split files don't exist.
 */
export async function loadFullChunksFromDisk(): Promise<WellRecord[]> {
  const split = await hasSplitChunks();
  if (!split) {
    return loadAllDnrChunksFromDisk();
  }

  const [baseIndices, lithoIndices] = await Promise.all([
    discoverChunkIndices(BASE_CHUNK_PREFIX, CHUNK_SUFFIX),
    discoverChunkIndices(LITHO_CHUNK_PREFIX, CHUNK_SUFFIX),
  ]);

  const [baseParsed, lithoParsed] = await Promise.all([
    Promise.all(baseIndices.map((i) => loadOneBaseChunk(i))),
    Promise.all(lithoIndices.map((i) => loadOneLithoChunk(i))),
  ]);

  baseParsed.sort((a, b) => a.index - b.index);
  lithoParsed.sort((a, b) => a.index - b.index);

  const allBase: WellRecord[] = [];
  for (const chunk of baseParsed) allBase.push(...chunk.rows);

  const allLitho: WellRecord[] = [];
  for (const chunk of lithoParsed) allLitho.push(...chunk.rows);

  return mergeLithoIntoBase(allBase, allLitho);
}
