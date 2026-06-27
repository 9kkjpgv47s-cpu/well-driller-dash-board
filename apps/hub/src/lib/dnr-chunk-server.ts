import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  missingCoreColumns,
  normalizeHeaderSet,
  parseChunkCsvText,
  MAX_CHUNK_INDEX,
} from "@/lib/dnr-chunk-shared";

const gunzip = promisify(zlib.gunzip);

const CHUNK_PREFIX = "dnr_wells_chunk_";
const CHUNK_SUFFIX = ".csv.gz";
const DISCOVERY_BATCH_SIZE = 4;

function chunkPath(index: number): string {
  return path.join(
    process.cwd(),
    "public",
    "well-viewer",
    `${CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`,
  );
}

type ParsedChunkOnDisk = {
  index: number;
  rows: WellRecord[];
  fields: string[];
};

async function discoverChunkIndices(): Promise<number[]> {
  const indices: number[] = [];
  for (let start = 0; start <= MAX_CHUNK_INDEX; start += DISCOVERY_BATCH_SIZE) {
    const end = Math.min(start + DISCOVERY_BATCH_SIZE - 1, MAX_CHUNK_INDEX);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, k) => {
        const i = start + k;
        return fs
          .access(chunkPath(i))
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
      `No chunk data at ${chunkPath(0)}. Ensure .csv.gz files exist under public/well-viewer/.`,
    );
  }
  return indices;
}

async function loadOneChunk(index: number): Promise<ParsedChunkOnDisk> {
  const filePath = chunkPath(index);
  const buf = await fs.readFile(filePath);
  const text = (await gunzip(buf)).toString("utf-8");
  const { rows, fields } = parseChunkCsvText(text);
  return { index, rows, fields };
}

/** Load all DNR gzip chunks from hub public/well-viewer (server-side). */
export async function loadAllDnrChunksFromDisk(): Promise<WellRecord[]> {
  const indices = await discoverChunkIndices();
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
