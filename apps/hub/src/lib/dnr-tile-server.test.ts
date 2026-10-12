import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import {
  hasWellTiles,
  loadWellTileManifest,
  loadWellsForRadiusFromTiles,
  resetWellTileCache,
} from "./dnr-tile-server";

// Synthetic tile set: 12 wells across 3 manifest tiles (+1 manifest-listed tile
// with no file). Tile keys are 0.1° cells, so e.g. lat 40.0x/lon -86.0x → 400_-861.
const BASE_HEADER = ["id", "refno", "lat", "lon", "depth", "county"];
const WELLS: Record<string, { key: string; rows: string[][] }> = {
  A: {
    key: "400_-861",
    rows: [
      ["A1", "1", "40.01", "-86.01", "100", "MARION"],
      ["A2", "2", "40.02", "-86.02", "110", "MARION"],
      ["A3", "3", "40.03", "-86.03", "120", "MARION"],
      ["DUP", "9", "40.04", "-86.04", "130", "MARION"],
    ],
  },
  B: {
    key: "401_-862",
    rows: [
      ["B1", "4", "40.11", "-86.11", "140", "HAMILTON"],
      ["B2", "5", "40.12", "-86.12", "150", "HAMILTON"],
      ["B3", "6", "40.13", "-86.13", "160", "HAMILTON"],
      ["DUP", "9", "40.14", "-86.14", "170", "HAMILTON"], // same id as a row in tile A
    ],
  },
  C: {
    key: "399_-860",
    rows: [
      ["C1", "7", "39.91", "-85.91", "180", "RUSH"],
      ["C2", "8", "39.92", "-85.92", "190", "RUSH"],
      ["C3", "10", "39.93", "-85.93", "200", "RUSH"],
      ["C4", "11", "39.94", "-85.94", "210", "RUSH"],
    ],
  },
};
const LITHO_A1 = '[{"top":"0","bottom":"10","formation":"sand"}]';
const LITHO: Record<string, string[][]> = {
  "400_-861": [
    ["A1", LITHO_A1, "csv"],
    ["A2", '[{"top":"0","bottom":"5","formation":"clay"}]', "csv"],
    ["DUP", '[{"top":"0","bottom":"8","formation":"gravel"}]', "csv"],
  ],
  "401_-862": [
    ["B1", '[{"top":"0","bottom":"12","formation":"till"}]', "csv"],
    ["DUP", '[{"top":"0","bottom":"8","formation":"gravel"}]', "csv"],
  ],
  // tile C intentionally has no litho file (manifest litho_n: 0)
};
const MANIFEST = {
  tile_deg: 0.1,
  total_wells: 12,
  tiles: {
    "399_-860": { n: 4, litho_n: 0 },
    "400_-861": { n: 4, litho_n: 3 },
    "401_-862": { n: 4, litho_n: 2 },
    "402_-860": { n: 3, litho_n: 0 }, // listed but file intentionally absent
  },
};

const esc = (v: string) =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const csv = (header: string[], rows: string[][]) =>
  `${[header, ...rows].map((r) => r.map(esc).join(",")).join("\n")}\n`;

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "well-tiles-"));
  const tilesDir = path.join(dir, "tiles");
  fs.mkdirSync(tilesDir);
  for (const t of Object.values(WELLS)) {
    fs.writeFileSync(
      path.join(tilesDir, `base_${t.key}.csv.gz`),
      zlib.gzipSync(csv(BASE_HEADER, t.rows)),
    );
  }
  for (const [key, rows] of Object.entries(LITHO)) {
    fs.writeFileSync(
      path.join(tilesDir, `litho_${key}.csv.gz`),
      zlib.gzipSync(csv(["id", "lithology_json", "lithology_source"], rows)),
    );
  }
  fs.writeFileSync(
    path.join(tilesDir, "manifest.json"),
    JSON.stringify(MANIFEST),
  );
});

afterEach(() => {
  resetWellTileCache();
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("loadWellsForRadiusFromTiles", () => {
  it("returns only candidate-tile rows in sorted key order (base only)", async () => {
    // bbox lat {400,401} × lon {-862,-861}; 400_-862/401_-861 absent from the
    // manifest are skipped silently → tiles A then B.
    const res = await loadWellsForRadiusFromTiles(
      40.09,
      -86.1,
      2,
      { lithology: false },
      dir,
    );
    expect(res.tiles).toBe(2);
    expect(res.wells.map((w) => w.id)).toEqual([
      "A1",
      "A2",
      "A3",
      "DUP",
      "B1",
      "B2",
      "B3",
      "DUP",
    ]);
    expect(res.wells[0]!.lat).toBeCloseTo(40.01);
    expect(res.wells[0]!.lon).toBeCloseTo(-86.01);
    expect(res.wells.every((w) => w.lithology_json == null)).toBe(true);
  });

  it("merges litho sidecars by id (copy-on-write); litho_n:0 tile is fine", async () => {
    const baseRes = await loadWellsForRadiusFromTiles(
      40.09,
      -86.1,
      2,
      { lithology: false },
      dir,
    );
    const mergedRes = await loadWellsForRadiusFromTiles(
      40.09,
      -86.1,
      2,
      { lithology: true },
      dir,
    );

    const a1Base = baseRes.wells.find((w) => w.id === "A1")!;
    const a1Merged = mergedRes.wells.find((w) => w.id === "A1")!;
    expect(a1Merged.lithology_json).toBe(LITHO_A1);
    expect(a1Merged.lithology_source).toBe("csv");
    expect(a1Merged).not.toBe(a1Base); // copy-on-write
    expect(a1Base.lithology_json).toBeUndefined(); // cached base rows untouched

    // DUP id merged in both tiles; rows without a litho row stay empty.
    const dups = mergedRes.wells.filter((w) => w.id === "DUP");
    expect(dups).toHaveLength(2);
    expect(dups.every((w) => w.lithology_json != null)).toBe(true);
    expect(mergedRes.wells.find((w) => w.id === "B3")!.lithology_json).toBeUndefined();

    // Tile C has litho_n: 0 and no litho file — must not throw.
    const cRes = await loadWellsForRadiusFromTiles(
      39.95,
      -85.95,
      2,
      { lithology: true },
      dir,
    );
    expect(cRes.tiles).toBe(1);
    expect(cRes.wells).toHaveLength(4);
  });

  it("rejects when a manifest-listed tile file is missing", async () => {
    // 40.25,-85.95 → tile 402_-860, listed in the manifest but never written.
    await expect(
      loadWellsForRadiusFromTiles(40.25, -85.95, 1, { lithology: false }, dir),
    ).rejects.toThrow();
  });

  it("single-flights tile reads across concurrent calls", async () => {
    const readSpy = vi.spyOn(fsp, "readFile");
    await Promise.all([
      loadWellsForRadiusFromTiles(40.09, -86.1, 2, { lithology: false }, dir),
      loadWellsForRadiusFromTiles(40.09, -86.1, 2, { lithology: false }, dir),
    ]);
    for (const file of ["base_400_-861.csv.gz", "base_401_-862.csv.gz"]) {
      const calls = readSpy.mock.calls.filter((c) =>
        String(c[0]).endsWith(file),
      );
      expect(calls, file).toHaveLength(1);
    }
  });

  it("re-reads tiles after resetWellTileCache()", async () => {
    const readSpy = vi.spyOn(fsp, "readFile");
    const count = () =>
      readSpy.mock.calls.filter((c) =>
        String(c[0]).endsWith("base_400_-861.csv.gz"),
      ).length;
    await loadWellsForRadiusFromTiles(40.09, -86.1, 2, { lithology: false }, dir);
    expect(count()).toBe(1);
    resetWellTileCache();
    await loadWellsForRadiusFromTiles(40.09, -86.1, 2, { lithology: false }, dir);
    expect(count()).toBe(2);
  });
});

describe("missing tile set", () => {
  it("reports no manifest / no tiles for an empty viewer dir", async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "well-tiles-empty-"));
    try {
      await expect(loadWellTileManifest(empty)).resolves.toBeNull();
      await expect(hasWellTiles(empty)).resolves.toBe(false);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});
