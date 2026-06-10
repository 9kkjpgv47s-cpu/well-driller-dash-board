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

function chunkPath(index: number): string {
  return path.join(
    process.cwd(),
    "public",
    "well-viewer",
    `${CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`,
  );
}

/** Load all DNR gzip chunks from hub public/well-viewer (server-side). */
export async function loadAllDnrChunksFromDisk(): Promise<WellRecord[]> {
  const all: WellRecord[] = [];
  for (let i = 0; i <= MAX_CHUNK_INDEX; i++) {
    const filePath = chunkPath(i);
    let buf: Buffer;
    try {
      buf = await fs.readFile(filePath);
    } catch {
      if (i === 0) {
        throw new Error(
          `No chunk data at ${filePath}. Ensure .csv.gz files exist under public/well-viewer/.`,
        );
      }
      break;
    }
    const text = (await gunzip(buf)).toString("utf-8");
    const { rows, fields } = parseChunkCsvText(text);
    if (i === 0) {
      const missing = missingCoreColumns(normalizeHeaderSet(fields));
      if (missing.length) {
        throw new Error(
          `Chunk schema drift in ${filePath}; missing core columns: ${missing.join(", ")}.`,
        );
      }
    }
    all.push(...rows);
  }
  return all;
}
