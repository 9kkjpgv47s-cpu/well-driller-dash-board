/**
 * Server-side loader for the 0.1° well tiles under `public/well-viewer/tiles/`
 * (built by scripts/build_well_tiles.py).  A radius query reads+gunzips only
 * the tiles its bounding box intersects — a few small files instead of all 10
 * base chunks — so cold serverless starts finish inside the API timeout budget.
 */

import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import type { WellRecord } from "@/lib/area-well-analytics";
import { parseChunkCsvText } from "@/lib/dnr-chunk-shared";
import { mergeLithoIntoBase, viewerDir } from "@/lib/dnr-chunk-server";
import {
  WELL_TILE_MANIFEST_FILE,
  WELL_TILES_DIR,
  baseTileFile,
  lithoTileFile,
  wellTileKeysForRadius,
  type WellTileManifest,
} from "@/lib/well-tiles";

const gunzip = promisify(zlib.gunzip);

function tilesDir(dir: string): string {
  return path.join(dir, WELL_TILES_DIR);
}

// --- Manifest cache (single-flight per viewer dir) ---

const manifestCache = new Map<string, Promise<WellTileManifest | null>>();

/** Cached read of tiles/manifest.json; `null` when the tiles dir is absent. */
export function loadWellTileManifest(
  dir = viewerDir(),
): Promise<WellTileManifest | null> {
  let cached = manifestCache.get(dir);
  if (!cached) {
    cached = fs
      .readFile(path.join(tilesDir(dir), WELL_TILE_MANIFEST_FILE), "utf-8")
      .then((text) => JSON.parse(text) as WellTileManifest)
      .catch((err: unknown) => {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        manifestCache.delete(dir);
        throw err;
      });
    manifestCache.set(dir, cached);
  }
  return cached;
}

/** True when a built tile set exists under the viewer dir. */
export async function hasWellTiles(dir = viewerDir()): Promise<boolean> {
  return (await loadWellTileManifest(dir)) != null;
}

// --- Per-tile row caches (single-flight per dir+key; evicted on failure) ---

const baseTileCache = new Map<string, Promise<WellRecord[]>>();
const lithoTileCache = new Map<string, Promise<WellRecord[]>>();
const mergedTileCache = new Map<string, Promise<WellRecord[]>>();

function cacheKey(dir: string, key: string): string {
  return `${dir}${key}`;
}

function cached(
  map: Map<string, Promise<WellRecord[]>>,
  ck: string,
  load: () => Promise<WellRecord[]>,
): Promise<WellRecord[]> {
  let p = map.get(ck);
  if (!p) {
    p = load().catch((err: unknown) => {
      map.delete(ck);
      throw err;
    });
    map.set(ck, p);
  }
  return p;
}

async function loadTileRows(filePath: string): Promise<WellRecord[]> {
  const buf = await fs.readFile(filePath);
  const text = (await gunzip(buf)).toString("utf-8");
  const { rows } = await parseChunkCsvText(text);
  return rows;
}

function loadBaseTile(dir: string, key: string): Promise<WellRecord[]> {
  const ck = cacheKey(dir, key);
  return cached(baseTileCache, ck, () =>
    loadTileRows(path.join(tilesDir(dir), baseTileFile(key))),
  );
}

function loadLithoTile(dir: string, key: string): Promise<WellRecord[]> {
  const ck = cacheKey(dir, key);
  return cached(lithoTileCache, ck, () =>
    loadTileRows(path.join(tilesDir(dir), lithoTileFile(key))),
  );
}

/** Base tile + litho sidecar merged by well id (same merge as the full chunks). */
function loadMergedTile(dir: string, key: string): Promise<WellRecord[]> {
  const ck = cacheKey(dir, key);
  return cached(mergedTileCache, ck, async () => {
    const [base, litho] = await Promise.all([
      loadBaseTile(dir, key),
      loadLithoTile(dir, key),
    ]);
    return mergeLithoIntoBase(base, litho);
  });
}

/**
 * Well rows from just the tiles covering `radiusMiles` around (lat, lon),
 * concatenated in sorted tile-key order (then registry order within a tile).
 * With `lithology`, tiles that have a litho sidecar (manifest `litho_n` > 0)
 * are served from the merged rows.  A tile listed in the manifest whose file
 * is missing rejects (data/manifest mismatch → the route returns 503 as today).
 * `tiles` = number of base tiles read.
 */
export async function loadWellsForRadiusFromTiles(
  lat: number,
  lon: number,
  radiusMiles: number,
  opts: { lithology: boolean },
  dir = viewerDir(),
): Promise<{ wells: WellRecord[]; tiles: number }> {
  const manifest = await loadWellTileManifest(dir);
  if (!manifest) {
    throw new Error(
      `No well tile manifest at ${path.join(tilesDir(dir), WELL_TILE_MANIFEST_FILE)}.`,
    );
  }
  const keys = wellTileKeysForRadius(lat, lon, radiusMiles).filter(
    (k) => manifest.tiles[k] != null,
  );
  const parts = await Promise.all(
    keys.map((key) =>
      opts.lithology && (manifest.tiles[key]?.litho_n ?? 0) > 0
        ? loadMergedTile(dir, key)
        : loadBaseTile(dir, key),
    ),
  );
  const wells: WellRecord[] = [];
  for (const rows of parts) wells.push(...rows);
  return { wells, tiles: parts.length };
}

/** Drop all tile caches (manifest + per-tile rows). */
export function resetWellTileCache(): void {
  manifestCache.clear();
  baseTileCache.clear();
  lithoTileCache.clear();
  mergedTileCache.clear();
}
