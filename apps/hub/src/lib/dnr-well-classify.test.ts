import { afterEach, describe, expect, it } from "vitest";
import {
  classifyDrillingWell,
  classifyWellDual,
  wellMatchesDrillingFilters,
} from "./dnr-well-classify";
import type { WellRecord } from "./area-well-analytics";

const prev = process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION;

afterEach(() => {
  if (prev == null) delete process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION;
  else process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = prev;
  delete process.env.DNR_CLASSIFY_VERSION;
});

function well(partial: WellRecord): WellRecord {
  return { lat: 40.1, lon: -85.2, ...partial };
}

describe("dnr-well-classify dual-label v2", () => {
  it("keeps estimated marker green but classifies uncon from lithology", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      loc_type: "Estimated",
      aquifer: "Estimated",
      depth: "80",
      lithology_json: JSON.stringify([
        { from: 0, to: 45, formation: "Sand and gravel" },
        { from: 45, to: 80, formation: "Clay" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.markerCategory).toBe("estimated");
    expect(dual.locationQuality).toBe("estimated");
    expect(dual.formationClass).toBe("unconsolidated");
    // Estimated = green marker only; no Est· text on face
    expect(dual.displayLabel).not.toMatch(/Est/i);
    expect(dual.displayLabel).toMatch(/^G/);
    expect(classifyDrillingWell(w)).toBe("estimated");
  });

  it("labels rock open-hole as R rock top (not casing shoe)", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      aquifer: "Bedrock",
      depth: "140",
      casing_length: "103",
      lithology_json: JSON.stringify([
        { from: 0, to: 100, formation: "Clay" },
        { from: 100, to: 140, formation: "Limestone" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.formationClass).toBe("rock");
    expect(dual.setLabel).toBe("R100");
    expect(dual.displayLabel).toBe("R100");
    expect(dual.rockTopFt).toBe(100);
  });

  it("rejects rock when casing ends at rock top with no open hole", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      aquifer: "Bedrock",
      depth: "100",
      casing_length: "100",
      rock_start_ft: "100",
      lithology_json: JSON.stringify([
        { from: 0, to: 100, formation: "Clay" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.formation?.construction.kind).not.toBe("rock_open_hole");
  });

  it("classifies estimated rock wells from rock lithology (not residual text)", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      location_type: "estimated location",
      aquifer: "Estimated",
      depth: "160",
      lithology_json: JSON.stringify([
        { from: 0, to: 25, formation: "Topsoil" },
        { from: 25, to: 40, formation: "Clay" },
        { from: 40, to: 160, formation: "Limestone" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.markerCategory).toBe("estimated");
    expect(dual.formationClass).toBe("rock");
    expect(dual.rockTopFt).toBe(40);
  });

  it("does not treat rock top alone as rock when thick water-bearing gravel exists", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      aquifer: "Unconsolidated sand and gravel",
      depth: "90",
      lithology_json: JSON.stringify([
        { from: 0, to: 55, formation: "Water bearing sand and gravel" },
        { from: 55, to: 90, formation: "Shale" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.formationClass).toBe("unconsolidated");
    expect(dual.markerCategory).toBe("unconsolidated");
    expect(dual.rockTopFt).toBe(55);
  });

  it("reclassifies thin surface S&G over bedrock aquifer + rock top as rock", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      aquifer: "Bedrock limestone",
      depth: "140",
      lithology_json: JSON.stringify([
        { from: 0, to: 4, formation: "Sand and gravel" },
        { from: 4, to: 140, formation: "Limestone" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.formationClass).toBe("rock");
  });

  it("treats sandrock as rock not unconsolidated", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      aquifer: "Bedrock",
      depth: "120",
      lithology_json: JSON.stringify([
        { from: 0, to: 30, formation: "Clay" },
        { from: 30, to: 120, formation: "Sandrock water bearing" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.formationClass).toBe("rock");
  });

  it("allows estimated uncon wells through uncon filter without unverified on", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      loc_type: "Estimated",
      aquifer: "Estimated",
      lithology_json: JSON.stringify([
        { from: 0, to: 40, formation: "Gravel" },
      ]),
    });
    expect(
      wellMatchesDrillingFilters(w, {
        showUnconsolidated: true,
        showRock: false,
        showUnverified: false,
      }),
    ).toBe(true);
    expect(
      wellMatchesDrillingFilters(w, {
        showUnconsolidated: false,
        showRock: true,
        showUnverified: false,
      }),
    ).toBe(false);
    expect(
      wellMatchesDrillingFilters(w, {
        showUnconsolidated: false,
        showRock: false,
        showUnverified: true,
      }),
    ).toBe(true);
  });

  it("allows estimated rock wells through rock filter", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      loc_type: "Estimated",
      aquifer: "Estimated",
      depth: "150",
      casing_length: "25",
      // no screen: open hole into dolomite
      lithology_json: JSON.stringify([
        { from: 0, to: 20, formation: "Clay" },
        { from: 20, to: 150, formation: "Dolomite" },
      ]),
    });
    expect(classifyWellDual(w).formationClass).toBe("rock");
    expect(
      wellMatchesDrillingFilters(w, {
        showUnconsolidated: false,
        showRock: true,
        showUnverified: false,
      }),
    ).toBe(true);
  });

  it("Morgantown clay-only 36ft wells: stack in detail, Well on map face, no G/R", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      depth: "36",
      depth_bedrock: "36",
      lithology_json: JSON.stringify([
        { from: 0, to: 18, formation: "HARD GRAY SOIL" },
        { from: 18, to: 36, formation: "BLUE CLAY" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.formationClass).toBe("unknown");
    // Map face: no C chips, no G/R invent
    expect(dual.displayLabel).toBe("Well");
    // Detail/background still has layer stack for log review
    expect(dual.layerStackLabel).toBe("C0-36");
    expect(dual.setLabel).toBeNull();
  });

  it("multi-vein gravel display uses G1 thickness · G2 thickness", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      aquifer: "Unconsolidated",
      depth: "45",
      casing_length: "45",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 14, formation: "CLAY" },
        { top: 14, bottom: 16, formation: "SAND AND GRAVEL" },
        { top: 16, bottom: 20, formation: "CLAY" },
        { top: 20, bottom: 30, formation: "WATER BEARING GRAVEL" },
        { top: 30, bottom: 45, formation: "CLAY" },
      ]),
    });
    const dual = classifyWellDual(w);
    // First aquifer 2 ft, second 10 ft — not bottoms 16,30
    expect(dual.displayLabel).toBe("G1 2 / G2 10");
    expect(dual.formation?.veinBottomsFt).toEqual([16, 30]);
    expect(dual.formation?.veinThicknessesFt).toEqual([2, 10]);
  });

  it("plain dry sand shows S not G on map face", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v2";
    const w = well({
      depth: "45",
      casing_length: "45",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 14, formation: "CLAY" },
        { top: 14, bottom: 16, formation: "SAND" },
        { top: 16, bottom: 20, formation: "CLAY" },
        { top: 20, bottom: 30, formation: "SAND" },
        { top: 30, bottom: 45, formation: "CLAY" },
      ]),
    });
    const dual = classifyWellDual(w);
    expect(dual.displayLabel).toBe("S1 2 / S2 10");
    expect(dual.formation?.veinThicknessesFt).toEqual([]);
  });
});

describe("dnr-well-classify v1 revert path", () => {
  it("short-circuits estimated before formation (legacy)", () => {
    process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION = "v1";
    const w = well({
      loc_type: "Estimated",
      aquifer: "Estimated",
      lithology_json: JSON.stringify([
        { from: 0, to: 40, formation: "Gravel" },
      ]),
    });
    expect(classifyDrillingWell(w)).toBe("estimated");
    // v1: estimated only matches unverified, not uncon
    expect(
      wellMatchesDrillingFilters(w, {
        showUnconsolidated: true,
        showRock: false,
        showUnverified: false,
      }),
    ).toBe(false);
    expect(
      wellMatchesDrillingFilters(w, {
        showUnconsolidated: false,
        showRock: false,
        showUnverified: true,
      }),
    ).toBe(true);
  });
});
