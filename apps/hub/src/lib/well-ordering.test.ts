import { describe, expect, it } from "vitest";
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  nearestWells,
  shallowestWellsByDepth,
  sortWellsByDistance,
  wellOrderKey,
} from "./well-ordering";

const wells: WellRecord[] = [
  { id: "far", lat: 40.2, lon: -85.0, depth: "300" },
  { id: "near", lat: 40.0, lon: -85.0, depth: "120" },
  { id: "mid", lat: 40.1, lon: -85.0, depth: "200" },
  { id: "no-coords", lat: "n/a", lon: "n/a", depth: "50" },
];

describe("wellOrderKey", () => {
  it("prefers id, then refno, then coordinates", () => {
    expect(wellOrderKey({ id: "A", refno: "B", lat: 1, lon: 2 })).toBe("A");
    expect(wellOrderKey({ refno: "B", lat: 1, lon: 2 })).toBe("B");
    expect(wellOrderKey({ lat: 1, lon: 2 })).toBe("1,2");
  });
});

describe("sortWellsByDistance", () => {
  it("orders by distance and drops wells without finite coordinates", () => {
    expect(sortWellsByDistance(wells, 40.0, -85.0).map((w) => w.id)).toEqual([
      "near",
      "mid",
      "far",
    ]);
  });

  it("breaks ties on the order key for stable output", () => {
    const tied: WellRecord[] = [
      { id: "b", lat: 40, lon: -85 },
      { id: "a", lat: 40, lon: -85 },
    ];
    expect(sortWellsByDistance(tied, 40, -85).map((w) => w.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("nearestWells", () => {
  it("caps the result at the requested limit", () => {
    expect(nearestWells(wells, 40.0, -85.0, 2).map((w) => w.id)).toEqual([
      "near",
      "mid",
    ]);
  });
});

describe("shallowestWellsByDepth", () => {
  it("orders by display depth and skips wells without a depth", () => {
    const input: WellRecord[] = [
      ...wells,
      { id: "no-depth", lat: 40.05, lon: -85.0 },
    ];
    expect(shallowestWellsByDepth(input, 3).map((w) => w.id)).toEqual([
      "no-coords",
      "near",
      "mid",
    ]);
  });
});
