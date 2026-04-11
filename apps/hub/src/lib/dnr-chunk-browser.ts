"use client";

import Papa from "papaparse";
import type { WellRecord } from "@/lib/area-well-analytics";

const CHUNK_PREFIX = "/well-viewer/dnr_wells_chunk_";
const CHUNK_SUFFIX = ".csv.gz";
const MAX_CHUNK_INDEX = 24;

async function gunzipText(buf: ArrayBuffer): Promise<string> {
  const u8 = new Uint8Array(buf);
  const isGzip = u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b;
  if (!isGzip) {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Browser cannot decompress .gz (need DecompressionStream)");
  }
  const dec = new DecompressionStream("gzip");
  const response = new Response(new Blob([buf]).stream().pipeThrough(dec));
  return response.text();
}

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

/**
 * Load all DNR gzip chunks from the static viewer path (same origin as the hub).
 */
export async function loadAllDnrChunksFromPublic(
  onProgress?: (msg: string) => void,
): Promise<WellRecord[]> {
  const all: WellRecord[] = [];
  for (let i = 0; i <= MAX_CHUNK_INDEX; i++) {
    const url = `${CHUNK_PREFIX}${i}${CHUNK_SUFFIX}`;
    onProgress?.(`Loading chunk ${i}…`);
    const res = await fetch(url);
    if (!res.ok) {
      if (i === 0) {
        throw new Error(
          `No chunk data at ${url}. Run scripts/sync-well-viewer-into-hub.sh and ensure .csv.gz files exist under public/well-viewer/.`,
        );
      }
      break;
    }
    const text = await gunzipText(await res.arrayBuffer());
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = parsed.data ?? [];
    for (const row of rows) {
      const w = normalizeRow(row);
      if (Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lon))) {
        all.push(w);
      }
    }
  }
  onProgress?.(`Loaded ${all.length.toLocaleString()} wells`);
  return all;
}
