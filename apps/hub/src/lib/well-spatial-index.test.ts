import { describe, expect, it } from "vitest";
import {
  wellsWithinRadius,
  type WellRecord,
} from "@/lib/area-well-analytics";
import {
  buildWellSpatialIndex,
  getWellSpatialIndex,
  wellsWithinRadiusIndexed,
} from "@/lib/well-spatial-index";

function makeWells(): WellRecord[] {
  // Deterministic pseudo-random scatter around central Indiana.
  const wells: WellRecord[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 5000; i++) {
    wells.push({
      id: `W${i}`,
      lat: 39.5 + rand() * 1.2,
      lon: -86.9 + rand() * 1.2,
    });
  }
  // A few invalid-coordinate rows the index must skip.
  wells.push({ id: "bad1", lat: "n/a", lon: -86.5 });
  wells.push({ id: "bad2" });
  return wells;
}

describe("WellSpatialIndex", () => {
  const wells = makeWells();
  const lat = 39.95;
  const lon = -86.5;

  it("queryRadius matches the linear haversine scan exactly", () => {
    const idx = buildWellSpatialIndex(wells);
    for (const radius of [0.25, 1, 2, 5, 10]) {
      const expected = wellsWithinRadius(wells, lat, lon, radius);
      const actual = idx.queryRadius(lat, lon, radius);
      expect(actual.map((w) => w.id)).toEqual(expected.map((w) => w.id));
    }
  });

  it("queryBounds returns wells inside the box only", () => {
    const idx = buildWellSpatialIndex(wells);
    const bounds = { south: 39.8, north: 40.1, west: -86.7, east: -86.3 };
    const actual = idx.queryBounds(bounds);
    const expected = wells.filter((w) => {
      const la = Number(w.lat);
      const lo = Number(w.lon);
      return (
        Number.isFinite(la) &&
        Number.isFinite(lo) &&
        la >= bounds.south &&
        la <= bounds.north &&
        lo >= bounds.west &&
        lo <= bounds.east
      );
    });
    expect(actual.map((w) => w.id)).toEqual(expected.map((w) => w.id));
    expect(actual.length).toBeGreaterThan(0);
  });

  it("skips rows without finite coordinates", () => {
    const idx = buildWellSpatialIndex(wells);
    expect(idx.size).toBe(5000);
  });

  it("wellsWithinRadiusIndexed matches wellsWithinRadius for small and large arrays", () => {
    const small = wells.slice(0, 50);
    expect(
      wellsWithinRadiusIndexed(small, lat, lon, 5).map((w) => w.id),
    ).toEqual(wellsWithinRadius(small, lat, lon, 5).map((w) => w.id));
    expect(
      wellsWithinRadiusIndexed(wells, lat, lon, 2).map((w) => w.id),
    ).toEqual(wellsWithinRadius(wells, lat, lon, 2).map((w) => w.id));
  });

  it("caches one index per wells array identity", () => {
    expect(getWellSpatialIndex(wells)).toBe(getWellSpatialIndex(wells));
  });
});
