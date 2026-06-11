import { describe, expect, it } from "vitest";
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  compactWellForMap,
  parseWellsNearbyInput,
  queryWellsNearby,
} from "./wells-nearby";

const wells: WellRecord[] = [
  {
    id: "near",
    lat: 40.0,
    lon: -85.0,
    depth: "120",
    lithology_json: "[]",
    aquifer: "Sand",
    owner: "A",
    notes: "keep",
    extra_col: "drop",
  },
  {
    id: "mid",
    lat: 40.02,
    lon: -85.02,
    depth: "90",
    lithology_json: "[]",
  },
  {
    id: "far",
    lat: 40.2,
    lon: -85.2,
    depth: "200",
  },
];

describe("wells-nearby", () => {
  it("parses lat/lon/radius/limit", () => {
    const sp = new URLSearchParams("lat=39.95&lon=-86.5&radius=2&limit=50");
    const input = parseWellsNearbyInput(sp);
    expect("error" in input).toBe(false);
    if ("error" in input) return;
    expect(input.lat).toBe(39.95);
    expect(input.lon).toBe(-86.5);
    expect(input.radiusMiles).toBe(2);
    expect(input.limit).toBe(50);
  });

  it("rejects invalid coordinates", () => {
    const bad = parseWellsNearbyInput(new URLSearchParams("lat=999&lon=0&radius=1"));
    expect(bad).toEqual({ error: "Invalid or missing `lat` / `lon` query parameters." });
  });

  it("returns nearest wells sorted by distance when no filters", () => {
    const result = queryWellsNearby(wells, {
      lat: 40.0,
      lon: -85.0,
      radiusMiles: 5,
      limit: 2,
    });
    expect(result.totalInRadius).toBe(2);
    expect(result.truncated).toBe(false);
    expect(result.wells.map((w) => w.id)).toEqual(["near", "mid"]);
  });

  it("applies hub viewer filters when provided", () => {
    const result = queryWellsNearby(wells, {
      lat: 40.0,
      lon: -85.0,
      radiusMiles: 5,
      limit: 10,
      filters: {
        elevBlue: false,
        elevGreen: false,
        elevOrange: false,
        elevRed: false,
        yieldBlue: false,
        yieldGreen: false,
        yieldOrange: false,
        yieldRed: false,
        typeUncon: true,
        typeRock: true,
        typeBucket: true,
        typeDry: true,
        typeEstimated: true,
        hideWellLabels: false,
        minDepth: 100,
        maxDepth: 9999,
        textSearch: "",
        markerLabelScale: 0.62,
      },
    });
    expect(result.wells.map((w) => w.id)).toEqual(["near"]);
  });

  it("compactWellForMap keeps map fields and drops extras", () => {
    const compact = compactWellForMap(wells[0]!);
    expect(compact.id).toBe("near");
    expect(compact.depth).toBe("120");
    expect(compact.lithology_json).toBe("[]");
    expect(compact.extra_col).toBeUndefined();
  });
});
