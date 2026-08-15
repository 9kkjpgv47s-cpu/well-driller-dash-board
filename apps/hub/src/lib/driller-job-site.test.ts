import { describe, expect, it } from "vitest";
import type { CjDrillerJobEntry } from "./cj-driller-job";
import { countiesLabel, deriveDrillerSite } from "./driller-job-site";

function entry(
  snap: Partial<CjDrillerJobEntry["snap"]>,
  wellId = "DNR-1",
): CjDrillerJobEntry {
  return { wellId, notes: "", addedAt: 0, snap };
}

describe("deriveDrillerSite", () => {
  it("returns null with no entries or no usable coordinates", () => {
    expect(deriveDrillerSite([])).toBeNull();
    expect(deriveDrillerSite([entry({})])).toBeNull();
    expect(deriveDrillerSite([entry({ lat: 0, lon: 0 })])).toBeNull();
    expect(deriveDrillerSite([entry({ lat: 39.5, lon: Number.NaN })])).toBeNull();
  });

  it("uses a single well directly", () => {
    expect(deriveDrillerSite([entry({ lat: 39.5, lon: -86.2 })])).toEqual({
      lat: 39.5,
      lon: -86.2,
      source: "single",
      wellsWithCoords: 1,
    });
  });

  it("averages multiple wells and ignores unusable ones", () => {
    const site = deriveDrillerSite([
      entry({ lat: 39.0, lon: -86.0 }),
      entry({ lat: 40.0, lon: -87.0 }),
      entry({ lat: 0, lon: 0 }),
      entry({}),
    ]);
    expect(site).toMatchObject({ source: "centroid", wellsWithCoords: 2 });
    expect(site!.lat).toBeCloseTo(39.5);
    expect(site!.lon).toBeCloseTo(-86.5);
  });
});

describe("countiesLabel", () => {
  it("shows an em dash when no county is known", () => {
    expect(countiesLabel([])).toBe("\u2014");
    expect(countiesLabel([entry({ county: "  " })])).toBe("\u2014");
  });

  it("names a single county and counts multiples", () => {
    expect(
      countiesLabel([entry({ county: "Bartholomew" }), entry({ county: "Bartholomew" })]),
    ).toBe("Bartholomew");
    expect(
      countiesLabel([entry({ county: "Marion" }), entry({ county: "Hamilton" })]),
    ).toBe("2 counties");
  });
});
