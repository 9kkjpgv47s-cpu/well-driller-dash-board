import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import Papa from "papaparse";
import type { WellRecord } from "@/lib/area-well-analytics";

const gunzip = promisify(zlib.gunzip);

const CHUNK_PREFIX = "dnr_wells_chunk_";
const CHUNK_SUFFIX = ".csv.gz";
const MAX_CHUNK_INDEX = 24;

const CORE_COLUMN_ALIASES: Record<string, string[]> = {
  lat: ["lat", "latitude"],
  lon: ["lon", "longitude", "lng"],
  lithology_json: [
    "lithology_json",
    "lithology",
    "well_log_json",
    "welllog_json",
  ],
  lithology_source: ["lithology_source"],
};

function normalizeRow(row: Record<string, string>): WellRecord {
  const out: WellRecord = {};
  for (const k of Object.keys(row)) {
    const nk = k.replace(/^\ufeff/, "").toLowerCase().trim();
    out[nk] = row[k];
  }
  const lat = parseFloat(String(out.lat ?? out.latitude ?? ""));
  const lon = parseFloat(String(out.lon ?? out.longitude ?? ""));
  out.lat = lat;
  out.lon = lon;
  return out;
}

function normalizeHeaderSet(fields: string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const f of fields ?? []) {
    out.add(String(f ?? "").replace(/^\ufeff/, "").toLowerCase().trim());
  }
  return out;
}

function missingCoreColumns(h: Set<string>): string[] {
  const missing: string[] = [];
  for (const [core, aliases] of Object.entries(CORE_COLUMN_ALIASES)) {
    if (!aliases.some((a) => h.has(a))) missing.push(core);
  }
  return missing;
}

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
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const headers = normalizeHeaderSet(parsed.meta.fields);
    const missing = missingCoreColumns(headers);
    if (i === 0 && missing.length) {
      throw new Error(
        `Chunk schema drift in ${filePath}; missing core columns: ${missing.join(", ")}.`,
      );
    }
    for (const row of parsed.data ?? []) {
      const w = normalizeRow(row);
      if (Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lon))) {
        all.push(w);
      }
    }
  }
  return all;
}
