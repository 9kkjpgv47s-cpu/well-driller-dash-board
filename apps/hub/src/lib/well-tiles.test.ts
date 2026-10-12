import { describe, expect, it } from "vitest";
import {
  WELL_TILE_DEG,
  baseTileFile,
  lithoTileFile,
  wellTileIndex,
  wellTileKey,
  wellTileKeysForRadius,
} from "./well-tiles";

// Expected keys computed with `math.floor(x / 0.1)` in Python — the exact
// IEEE-754 math scripts/build_well_tiles.py uses (note 40.3/0.1 floors to 402).
describe("wellTileKey / wellTileIndex", () => {
  it.each([
    [39.7684, -86.1581, "397_-862"], // Indianapolis
    [40.3, -86.1, "402_-861"], // float edge: 40.3/0.1 = 402.999… → 402
    [41.0, -85.0, "410_-850"],
    [39.0, -87.0, "390_-870"],
    [37.779462669996846, -88.08220396925664, "377_-881"], // SW corner of registry
    [41.760432626665576, -84.78761157208312, "417_-848"], // NE corner of registry
  ])("key(%s, %s) === %s", (lat, lon, expected) => {
    expect(wellTileKey(lat, lon)).toBe(expected);
  });

  it("indexes coordinates into 0.1° cells", () => {
    expect(WELL_TILE_DEG).toBe(0.1);
    expect(wellTileIndex(39.7684)).toBe(397);
    expect(wellTileIndex(-86.1581)).toBe(-862);
  });
});

describe("wellTileKeysForRadius", () => {
  it("returns only the center tile for a tiny radius well inside it", () => {
    // 39.75,-86.15 sits ~0.05° from every edge of tile 397_-862; 0.01 mi ≈ 0.00015°.
    expect(wellTileKeysForRadius(39.75, -86.15, 0.01)).toEqual(["397_-862"]);
  });

  it("covers a 2×2 tile block for a 1 mi radius near a boundary", () => {
    const keys = wellTileKeysForRadius(40.0001, -86.0001, 1);
    expect(keys).toEqual(["399_-861", "399_-860", "400_-861", "400_-860"]);
    expect(keys).toContain(wellTileKey(40.0001, -86.0001));
  });

  it("covers the bbox for the 25 mi API cap at Indianapolis", () => {
    const keys = wellTileKeysForRadius(39.7684, -86.1581, 25);
    // latDeg=25/69≈0.362, lonDeg≈0.473 → latIdx 394..401, lonIdx -867..-857.
    expect(keys).toHaveLength(88);
    expect(keys[0]).toBe("394_-867");
    expect(keys[keys.length - 1]).toBe("401_-857");
  });

  it("returns [] for non-positive or non-finite input", () => {
    expect(wellTileKeysForRadius(39.7, -86.1, 0)).toEqual([]);
    expect(wellTileKeysForRadius(39.7, -86.1, -1)).toEqual([]);
    expect(wellTileKeysForRadius(39.7, -86.1, Number.NaN)).toEqual([]);
    expect(wellTileKeysForRadius(Number.NaN, -86.1, 2)).toEqual([]);
    expect(wellTileKeysForRadius(39.7, Number.NaN, 2)).toEqual([]);
  });

  it("returns keys sorted (latIdx asc, then lonIdx asc) and unique", () => {
    const keys = wellTileKeysForRadius(40.5, -86.5, 3);
    expect(new Set(keys).size).toBe(keys.length);
    const parsed = keys.map((k) => k.split("_").map(Number) as [number, number]);
    const sorted = [...parsed].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(parsed).toEqual(sorted);
  });
});

describe("tile filenames", () => {
  it("maps keys to on-disk filenames", () => {
    expect(baseTileFile("397_-862")).toBe("base_397_-862.csv.gz");
    expect(lithoTileFile("397_-862")).toBe("litho_397_-862.csv.gz");
  });
});
