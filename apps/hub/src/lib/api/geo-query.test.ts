import { describe, expect, it } from "vitest";
import {
  INVALID_LAT_LON_ERROR,
  isValidLatLon,
  parseLatLonRadiusParams,
  parseNumericParam,
} from "./geo-query";

describe("parseNumericParam", () => {
  it("parses fully numeric values", () => {
    expect(parseNumericParam(" -85.7 ")).toBe(-85.7);
    expect(parseNumericParam("1e2")).toBe(100);
  });

  it("rejects missing, blank, and partially numeric values", () => {
    expect(parseNumericParam(null)).toBeNaN();
    expect(parseNumericParam("   ")).toBeNaN();
    expect(parseNumericParam("40junk")).toBeNaN();
  });
});

describe("isValidLatLon", () => {
  it("accepts in-range finite coordinates", () => {
    expect(isValidLatLon(40, -85)).toBe(true);
  });

  it("rejects non-finite or out-of-range coordinates", () => {
    expect(isValidLatLon(NaN, -85)).toBe(false);
    expect(isValidLatLon(91, -85)).toBe(false);
    expect(isValidLatLon(40, -181)).toBe(false);
  });
});

describe("parseLatLonRadiusParams", () => {
  const parse = (qs: string) =>
    parseLatLonRadiusParams(new URLSearchParams(qs), 25);

  it("parses lat/lon plus either radius spelling", () => {
    expect(parse("lat=40&lon=-85&radius=5")).toEqual({
      lat: 40,
      lon: -85,
      radiusMiles: 5,
    });
    expect(parse("lat=40&lon=-85&radiusMiles=5")).toEqual({
      lat: 40,
      lon: -85,
      radiusMiles: 5,
    });
  });

  it("reports invalid coordinates", () => {
    expect(parse("lon=-85&radius=5")).toEqual({
      error: INVALID_LAT_LON_ERROR,
    });
    expect(parse("lat=40junk&lon=-85&radius=5")).toEqual({
      error: INVALID_LAT_LON_ERROR,
    });
  });

  it("rejects a partially numeric radius", () => {
    expect(parse("lat=40&lon=-85&radius=5junk")).toEqual({
      error: "Invalid `radius` — expected miles in (0, 25].",
    });
  });

  it("reports a radius outside (0, max]", () => {
    expect(parse("lat=40&lon=-85&radius=0")).toEqual({
      error: "Invalid `radius` — expected miles in (0, 25].",
    });
    expect(parse("lat=40&lon=-85&radius=26")).toEqual({
      error: "Invalid `radius` — expected miles in (0, 25].",
    });
  });
});
