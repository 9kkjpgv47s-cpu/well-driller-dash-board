/**
 * Environment-neutral DNR chunk CSV parsing shared by the main-thread loader
 * (dnr-chunk-browser.ts) and the Web Worker (dnr-chunk-worker.ts).
 */

import type { WellRecord } from "@/lib/area-well-analytics";

// Lazily import papaparse only when chunk parsing actually runs, so the main
// page bundle stays lean (~44KB saved on first load).  All call sites are async.
let papaPromise: Promise<typeof import("papaparse")> | null = null;
async function getPapa(): Promise<typeof import("papaparse")> {
  if (!papaPromise) papaPromise = import("papaparse");
  return papaPromise;
}

export const CHUNK_PREFIX = "/well-viewer/dnr_wells_chunk_";
export const CHUNK_SUFFIX = ".csv.gz";
export const BASE_CHUNK_PREFIX = "/well-viewer/dnr_wells_base_chunk_";
export const LITHO_CHUNK_PREFIX = "/well-viewer/dnr_wells_litho_chunk_";
export const MAX_CHUNK_INDEX = 24;

export const CORE_COLUMN_ALIASES: Record<string, string[]> = {
  lat: ["lat", "latitude"],
  lon: ["lon", "longitude", "lng"],
  lithology_json: ["lithology_json", "lithology", "well_log_json", "welllog_json"],
  lithology_source: ["lithology_source"],
};

/** Core columns required in *base* chunks (no lithology_json needed). */
export const BASE_CORE_COLUMN_ALIASES: Record<string, string[]> = {
  lat: ["lat", "latitude"],
  lon: ["lon", "longitude", "lng"],
};

export function chunkUrl(index: number): string {
  return `${CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`;
}

export function baseChunkUrl(index: number): string {
  return `${BASE_CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`;
}

export function lithoChunkUrl(index: number): string {
  return `${LITHO_CHUNK_PREFIX}${index}${CHUNK_SUFFIX}`;
}

export function missingBaseCoreColumns(h: Set<string>): string[] {
  const missing: string[] = [];
  for (const [core, aliases] of Object.entries(BASE_CORE_COLUMN_ALIASES)) {
    if (!aliases.some((a) => h.has(a))) missing.push(core);
  }
  return missing;
}

export function normalizeRow(row: Record<string, string>): WellRecord {
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

export function normalizeHeaderSet(fields: string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const f of fields ?? []) {
    out.add(String(f ?? "").replace(/^\ufeff/, "").toLowerCase().trim());
  }
  return out;
}

export function missingCoreColumns(h: Set<string>): string[] {
  const missing: string[] = [];
  for (const [core, aliases] of Object.entries(CORE_COLUMN_ALIASES)) {
    if (!aliases.some((a) => h.has(a))) missing.push(core);
  }
  return missing;
}

export type ParsedChunk = {
  /** Normalized rows with finite lat/lon only. */
  rows: WellRecord[];
  /** Raw header fields as reported by the CSV parser. */
  fields: string[];
};

export async function parseChunkCsvText(text: string): Promise<ParsedChunk> {
  const Papa = await getPapa();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const rows: WellRecord[] = [];
  for (const row of parsed.data ?? []) {
    const w = normalizeRow(row);
    if (Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lon))) {
      rows.push(w);
    }
  }
  return { rows, fields: parsed.meta.fields ?? [] };
}

/** Gunzip an ArrayBuffer to text (works on the main thread and in workers). */
export async function gunzipText(buf: ArrayBuffer): Promise<string> {
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
