import { describe, expect, it } from "vitest";
import { mergeLithoIntoBase } from "./dnr-chunk-browser";
import { getLithLayers } from "./area-well-analytics";
import type { WellRecord } from "./area-well-analytics";

const baseRow = (id: string): WellRecord =>
  ({ id, lat: 39.76, lon: -86.4, depth: "84", aquifer: "Unconsolidated" }) as WellRecord;

const lithoRow = (id: string): WellRecord =>
  ({
    id,
    lithology_json:
      '[{"top":"0.0","bottom":"76.0","formation":"TOPSOIL & CLAY"},{"top":"76.0","bottom":"84.0","formation":"GRAVEL"}]',
    lithology_source: "html",
  }) as WellRecord;

describe("mergeLithoIntoBase", () => {
  it("copies lithology onto a NEW record — base row objects stay untouched", () => {
    const w = baseRow("DNR-185960");
    const merged = mergeLithoIntoBase([w], [lithoRow("DNR-185960")]);
    expect(merged[0]).not.toBe(w);
    expect(w.lithology_json).toBeUndefined();
    expect(merged[0].lithology_json).toContain("GRAVEL");
    expect(merged[0].lithology_source).toBe("html");
  });

  it("returns a fresh-parseable record after the base object was already read", () => {
    const w = baseRow("DNR-185960");
    // Simulate the phase-1 render pass: getLithLayers caches [] on this object.
    expect(getLithLayers(w)).toEqual([]);
    const merged = mergeLithoIntoBase([w], [lithoRow("DNR-185960")]);
    // The merged row must not inherit the poisoned WeakMap entry.
    expect(getLithLayers(merged[0])).toHaveLength(2);
  });

  it("returns the same array when nothing merges", () => {
    const base = [baseRow("DNR-1")];
    expect(mergeLithoIntoBase(base, [])).toBe(base);
    expect(mergeLithoIntoBase(base, [lithoRow("DNR-OTHER")])).toBe(base);
  });
});
