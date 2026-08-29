import { describe, expect, it } from "vitest";
import {
  analyzeConstruction,
  classifyFormationFromWell,
  ensureRockChipLastOnFaceLabel,
  formationCategoryForName,
  isEstimatedLocation,
  preferGOverMatchingS,
} from "./formation-class";
import type { WellRecord } from "./area-well-analytics";

function well(partial: WellRecord): WellRecord {
  return { lat: 40, lon: -85, ...partial };
}

describe("formationCategoryForName — sandstone family before loose sand", () => {
  it.each([
    "Sandrock",
    "SAND ROCK",
    "Sand Rock water bearing",
    "WHITE SAND ROCK",
    "Sandstone",
    "sandra rock",
    "soft sand-rock",
    "BRN SANDROCK",
  ])("labels %s as rock", (name) => {
    expect(formationCategoryForName(name).category).toBe("rock");
  });

  it("labels true sand and gravel as unconsolidated", () => {
    expect(formationCategoryForName("Sand and gravel").category).toBe(
      "unconsolidated",
    );
    expect(formationCategoryForName("S&G").category).toBe("unconsolidated");
    expect(formationCategoryForName("fine sand").category).toBe(
      "unconsolidated",
    );
  });

  it("labels limestone as rock", () => {
    expect(formationCategoryForName("Limestone").category).toBe("rock");
  });
});

describe("analyzeConstruction — rock open hole vs screen", () => {
  it("rock well: no screen, casing slightly into rock, open hole below casing", () => {
    // rock @ 100, casing 103, depth 140 → open hole 37 ft
    const c = analyzeConstruction(
      well({
        casing_length: "103",
        depth: "140",
        screen_length: "",
        screen_diam: "",
      }),
      100,
    );
    expect(c.hasScreen).toBe(false);
    expect(c.kind).toBe("rock_open_hole");
    expect(c.openHoleBelowCasingFt).toBe(37);
    expect(c.casingIntoRockFt).toBe(3);
    // R@ = rock top (100), not casing shoe (103)
    expect(c.setLabel).toBe("R100");
  });

  it("REJECTS rock when casing ends at rock top with no open hole", () => {
    // User rule: never a rock well if casing ends where rock begins with no extra footage
    const c = analyzeConstruction(
      well({
        casing_length: "100",
        depth: "100",
        screen_length: "",
      }),
      100,
    );
    expect(c.kind).not.toBe("rock_open_hole");
    expect(c.openHoleBelowCasingFt).toBe(0);
    expect(c.reasons.some((r) => r.includes("reject_rock_no_open_hole"))).toBe(
      true,
    );
  });

  it("REJECTS rock when depth equals casing even if rock top slightly above", () => {
    const c = analyzeConstruction(
      well({ casing_length: "102", depth: "102" }),
      100,
    );
    expect(c.kind).not.toBe("rock_open_hole");
  });

  it("screen set → unconsolidated construction chip G@casing", () => {
    const c = analyzeConstruction(
      well({
        casing_length: "48",
        screen_length: "10",
        screen_diam: "4",
        depth: "58",
      }),
      null,
    );
    expect(c.kind).toBe("screen_set");
    expect(c.hasScreen).toBe(true);
    expect(c.setLabel).toBe("G@48");
  });
});

describe("classifyFormationFromWell — construction + lithology", () => {
  it("classifies rock well by construction even with sand rock log text", () => {
    const r = classifyFormationFromWell(
      well({
        aquifer: "Bedrock",
        depth: "140",
        casing_length: "103",
        // no screen
        lithology_json: JSON.stringify([
          { from: 0, to: 20, formation: "Clay" },
          { from: 20, to: 100, formation: "Shale" },
          { from: 100, to: 140, formation: "SAND ROCK" },
        ]),
      }),
    );
    expect(r.layers.find((L) => L.formation === "SAND ROCK")?.category).toBe(
      "rock",
    );
    expect(r.formationClass).toBe("rock");
    expect(r.construction.kind).toBe("rock_open_hole");
    // First rock signal (shale) at 20 ft — R@ is rock top, not casing 103
    expect(r.construction.setLabel).toBe("R20");
    expect(r.rockTopFt).toBe(20);
    expect(r.reasons.some((x) => x.includes("rock_by_construction") || x.includes("rock_open_hole"))).toBe(
      true,
    );
  });

  it("does not call rock when casing stops at rock with no open hole", () => {
    const r = classifyFormationFromWell(
      well({
        aquifer: "Bedrock",
        depth: "100",
        casing_length: "100",
        rock_start_ft: "100",
        lithology_json: JSON.stringify([
          { from: 0, to: 100, formation: "Clay" },
          { from: 100, to: 100, formation: "Limestone" },
        ]),
      }),
    );
    expect(r.construction.kind).not.toBe("rock_open_hole");
    // Must not be forced rock solely by rock top without open hole
    expect(r.reasons.some((x) => x.includes("no_open_hole"))).toBe(true);
  });

  it("screen + S&G interval → unconsolidated with G1 aquifer thickness", () => {
    const r = classifyFormationFromWell(
      well({
        aquifer: "Unconsolidated",
        depth: "80",
        casing_length: "70",
        screen_length: "10",
        screen_diam: "4",
        lithology_json: JSON.stringify([
          { from: 0, to: 40, formation: "Clay" },
          { from: 40, to: 80, formation: "Sand and gravel" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("unconsolidated");
    expect(r.construction.kind).toBe("screen_set");
    // G = aquifer footage (40 ft S&G), not casing set depth
    expect(r.construction.setLabel).toBe("G1 40");
    expect(r.veinThicknessesFt).toEqual([40]);
  });

  it("thick gravel above rock stays uncon even when rock top present", () => {
    const r = classifyFormationFromWell(
      well({
        aquifer: "Unconsolidated",
        depth: "100",
        casing_length: "55",
        screen_length: "15",
        lithology_json: JSON.stringify([
          { from: 0, to: 10, formation: "Topsoil" },
          { from: 10, to: 60, formation: "Water bearing gravel" },
          { from: 60, to: 100, formation: "Shale" },
        ]),
      }),
    );
    expect(r.rockTopFt).toBe(60);
    expect(r.formationClass).toBe("unconsolidated");
  });

  it("does not treat estimated as a formation", () => {
    expect(isEstimatedLocation(well({ loc_type: "Estimated" }))).toBe(true);
    const r = classifyFormationFromWell(
      well({
        loc_type: "Estimated",
        aquifer: "Estimated",
        depth: "200",
        casing_length: "35",
        // no screen → open hole
        lithology_json: JSON.stringify([
          { from: 0, to: 30, formation: "Clay" },
          { from: 30, to: 200, formation: "Dolomite" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    expect(r.construction.kind).toBe("rock_open_hole");
  });

  it("prefers unknown when no lithology, blank aquifer, no construction", () => {
    const r = classifyFormationFromWell(
      well({ aquifer: "", lithology_json: "" }),
    );
    expect(r.formationClass).toBe("unknown");
    expect(r.confidence).toBe("low");
  });

  it("screen without sand/gravel over rock lithology → rock R not G@", () => {
    // Dom 2026-07-22: G requires sand/S&G; clay+rock with a screen field → R@
    const r = classifyFormationFromWell(
      well({
        aquifer: "Bedrock",
        depth: "36",
        casing_length: "38",
        screen_length: "6",
        lithology_json: JSON.stringify([
          { from: 0, to: 14, formation: "Clay" },
          { from: 14, to: 36, formation: "Limestone" },
        ]),
      }),
    );
    expect(r.construction.hasScreen).toBe(true);
    expect(r.formationClass).toBe("rock");
    // R@ = limestone top (14), not casing shoe (38)
    expect(r.construction.setLabel).toBe("R14");
    expect(r.rockTopFt).toBe(14);
  });

  it("clay-only 36ft wells do not get G or R labels", () => {
    const r = classifyFormationFromWell(
      well({
        aquifer: "",
        depth: "36",
        depth_bedrock: "36",
        lithology_json: JSON.stringify([
          { from: 0, to: 18, formation: "DARK GRAY CLAY" },
          { from: 18, to: 36, formation: "BLUE CLAY" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("unknown");
    expect(r.construction.setLabel).toBeNull();
    expect(r.unconsolidatedFt).toBeNull();
  });

  it("rejects gravel_thickness when it equals rock_start (ETL pollute)", () => {
    // Morgantown area: gravel_th == rock_start on shale wells → false Est·G
    const r = classifyFormationFromWell(
      well({
        aquifer: "Estimated",
        loc_type: "Estimated",
        gravel_thickness_ft: "19",
        rock_start_ft: "19",
        lithology_json: JSON.stringify([
          { from: 0, to: 19, formation: "TOPSOIL & CLAY" },
          { from: 19, to: 135, formation: "SHALE" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    expect(r.unconsolidatedFt).toBeNull();
    expect(r.reasons.some((x) => x.includes("reject_vein_column"))).toBe(true);
  });

  it("hard pan / clay is not water-bearing for G labels", () => {
    expect(formationCategoryForName("HARD PAN").category).toBe("mixed");
    expect(formationCategoryForName("BLUE & BROWN HARDPAN").category).toBe(
      "mixed",
    );
    const r = classifyFormationFromWell(
      well({
        aquifer: "Unconsolidated",
        depth: "105",
        casing_length: "20",
        gravel_thickness_ft: "17",
        rock_start_ft: "17",
        lithology_json: JSON.stringify([
          { from: 0, to: 17, formation: "BLUE & BROWN HARDPAN" },
          { from: 17, to: 105, formation: "BLUE SHALE" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    // Rock top 17 (shale), casing 20 — face chip uses rock top only
    expect(r.construction.setLabel).toBe("R17");
    expect(r.rockTopFt).toBe(17);
  });

  it("layer stack: clay-only → C0-36", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "36",
        depth_bedrock: "36",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 18, formation: "HARD GRAY SOIL" },
          { top: 18, bottom: 36, formation: "BLUE CLAY" },
        ]),
      }),
    );
    expect(r.layerStackLabel).toBe("C0-36");
    expect(r.veinBottomsFt).toEqual([]);
    expect(r.veinSetLabel).toBeNull();
    expect(r.layers.every((L) => L.code === "C")).toBe(true);
  });

  it("layer stack: hardpan → shale → C then R", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "105",
        casing_length: "20",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 17, formation: "BLUE & BROWN HARDPAN" },
          { top: 17, bottom: 105, formation: "BLUE SHALE" },
        ]),
      }),
    );
    expect(r.layerStackLabel).toBe("C0-17 / R17-105");
    expect(r.layers.find((L) => L.formation.includes("SHALE"))?.code).toBe("R");
  });

  it("multi-vein sand: G labels are sequence + aquifer thickness", () => {
    // Dom lithology style: topsoil, brown sandy clay, sand wet med-fine, gray clay, gray sand…
    // G purpose = footage of each aquifer, not bottom depth.
    const r = classifyFormationFromWell(
      well({
        aquifer: "Unconsolidated",
        depth: "45",
        casing_length: "45",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 1, formation: "TOPSOIL" },
          { top: 1, bottom: 14, formation: "BROWN SANDY CLAY" },
          { top: 14, bottom: 16, formation: "BROWN SAND (WET, MED-FINE)" },
          { top: 16, bottom: 20, formation: "GRAY CLAY" },
          { top: 20, bottom: 22, formation: "GRAY SAND (WET MED)" },
          { top: 22, bottom: 34, formation: "GRAY CLAY" },
          { top: 34, bottom: 35, formation: "GRAY SAND (WET MED)" },
          { top: 35, bottom: 45, formation: "GRAY CLAY" },
        ]),
      }),
    );
    expect(r.veinBottomsFt).toEqual([16, 22, 35]);
    expect(r.veinThicknessesFt).toEqual([2, 2, 1]);
    expect(r.veinSetLabel).toBe("G1 2 / G2 2 / G3 1");
    expect(r.construction.setLabel).toBe("G1 2 / G2 2 / G3 1");
    // Detail stack still shows depth ranges
    expect(r.layerStackLabel).toContain("G14-16");
    expect(r.layerStackLabel).toContain("G20-22");
    expect(r.layerStackLabel).toContain("G34-35");
    // Sandy clay is C, not G
    expect(r.layers.find((L) => L.formation.includes("SANDY CLAY"))?.code).toBe(
      "C",
    );
  });

  it("single 2 ft gravel vein labels G1 2 (aquifer footage)", () => {
    const r = classifyFormationFromWell(
      well({
        aquifer: "Unconsolidated",
        depth: "60",
        casing_length: "50",
        screen_length: "5",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 40, formation: "CLAY" },
          { top: 40, bottom: 42, formation: "GRAVEL" },
          { top: 42, bottom: 60, formation: "CLAY" },
        ]),
      }),
    );
    expect(r.veinSetLabel).toBe("G1 2");
    expect(r.construction.setLabel).toBe("G1 2");
    expect(r.veinThicknessesFt).toEqual([2]);
  });

  it("S labels for non-water-bearing sand, interleaved with G in depth order", () => {
    // Dom: dry sand = S (insight); wet / gravel = G (aquifer). Order matches lithology.
    const r = classifyFormationFromWell(
      well({
        aquifer: "Unconsolidated",
        depth: "50",
        casing_length: "50",
        screen_length: "5",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 5, formation: "TOPSOIL" },
          { top: 5, bottom: 15, formation: "BROWN SAND" }, // dry sand → S
          { top: 15, bottom: 25, formation: "CLAY" },
          { top: 25, bottom: 30, formation: "GRAY SAND (WET)" }, // wet → G
          { top: 30, bottom: 40, formation: "CLAY" },
          { top: 40, bottom: 45, formation: "FINE SAND" }, // dry → S
          { top: 45, bottom: 50, formation: "SAND AND GRAVEL" }, // G
        ]),
      }),
    );
    expect(r.layers.find((L) => L.formation === "BROWN SAND")?.code).toBe("S");
    expect(r.layers.find((L) => L.formation.includes("WET"))?.code).toBe("G");
    expect(r.layers.find((L) => L.formation === "FINE SAND")?.code).toBe("S");
    expect(r.layers.find((L) => L.formation.includes("GRAVEL"))?.code).toBe("G");
    // Face: S1 10 · G1 5 · S2 5 · G2 5
    expect(r.veinSetLabel).toBe("S1 10 / G1 5 / S2 5 / G2 5");
    expect(r.construction.setLabel).toBe("S1 10 / G1 5 / S2 5 / G2 5");
    // Detail stack keeps depth ranges with S codes
    expect(r.layerStackLabel).toContain("S5-15");
    expect(r.layerStackLabel).toContain("G25-30");
    expect(r.layerStackLabel).toContain("S40-45");
    // Only G counts as aquifer thickness / vein bottoms
    expect(r.veinThicknessesFt).toEqual([5, 5]);
    expect(r.veinBottomsFt).toEqual([30, 50]);
  });

  it("dry sand only → S face chips, not G", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "40",
        casing_length: "40",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 10, formation: "CLAY" },
          { top: 10, bottom: 25, formation: "BROWN SAND" },
          { top: 25, bottom: 40, formation: "CLAY" },
        ]),
      }),
    );
    expect(r.veinSetLabel).toBe("S1 15");
    expect(r.construction.setLabel).toBe("S1 15");
    expect(r.veinThicknessesFt).toEqual([]);
    expect(r.layers.find((L) => L.formation.includes("SAND"))?.code).toBe("S");
  });

  it("dry sand above rock → S chips with R rock top", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "120",
        casing_length: "22",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 8, formation: "CLAY" },
          { top: 8, bottom: 20, formation: "YELLOW SAND" },
          { top: 20, bottom: 120, formation: "LIMESTONE" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    expect(r.layers.find((L) => L.formation.includes("SAND"))?.code).toBe("S");
    expect(r.construction.setLabel).toBe("S1 12 / R20");
  });

  it("gravel above rock → G then R (never R before G)", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "120",
        casing_length: "45",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 20, formation: "CLAY" },
          { top: 20, bottom: 40, formation: "SAND AND GRAVEL" },
          { top: 40, bottom: 120, formation: "LIMESTONE" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    expect(r.construction.setLabel).toBe("G1 20 / R40");
    expect(r.rockTopFt).toBe(40);
    // Rock chip is last — gravel cannot follow rock on the face
    expect(r.construction.setLabel).toMatch(/^G1 20 \/ R40$/);
  });

  it("chunk rock_start inside gravel is rejected; lith rock top kept", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "100",
        casing_length: "50",
        depth_bedrock: "20",
        rock_start_ft: "20",
        aquifer: "Bedrock",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 10, formation: "CLAY" },
          { top: 10, bottom: 45, formation: "GRAVEL" },
          { top: 45, bottom: 100, formation: "LIMESTONE" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    // Was G1 35 / R20 (rock top inside gravel). Now R at true lith rock.
    expect(r.rockTopFt).toBe(45);
    expect(r.construction.setLabel).toBe("G1 35 / R45");
    expect(r.reasons.some((x) => /inside_sg/.test(x))).toBe(true);
  });

  it("gravel below first rock is dropped from face (rock-only face)", () => {
    const r = classifyFormationFromWell(
      well({
        depth: "100",
        casing_length: "25",
        aquifer: "Bedrock",
        lithology_json: JSON.stringify([
          { top: 0, bottom: 15, formation: "CLAY" },
          { top: 15, bottom: 40, formation: "LIMESTONE" },
          { top: 40, bottom: 55, formation: "SAND AND GRAVEL" },
          { top: 55, bottom: 100, formation: "LIMESTONE" },
        ]),
      }),
    );
    expect(r.formationClass).toBe("rock");
    expect(r.rockTopFt).toBe(15);
    // No G after R — gravel below rock is not a face chip
    expect(r.construction.setLabel).toBe("R15");
    expect(r.construction.setLabel).not.toMatch(/G/i);
  });

  it("ensureRockChipLastOnFaceLabel moves R after G/S", () => {
    expect(ensureRockChipLastOnFaceLabel("R20 / G1 15")).toBe("G1 15 / R20");
    expect(ensureRockChipLastOnFaceLabel("G1 20 / R40")).toBe("G1 20 / R40");
    expect(ensureRockChipLastOnFaceLabel("S1 12 / R20")).toBe("S1 12 / R20");
  });

  it("S that matches a G span defaults to G only", () => {
    // Prefer G when S and G claim the same interval (Dom 2026-07-22).
    const chips = preferGOverMatchingS([
      { code: "S", index: 1, topFt: 10, bottomFt: 20, thicknessFt: 10 },
      { code: "G", index: 1, topFt: 10, bottomFt: 20, thicknessFt: 10 },
    ]);
    expect(chips).toEqual([
      { code: "G", index: 1, topFt: 10, bottomFt: 20, thicknessFt: 10 },
    ]);
    // Distinct dry then wet stays both
    const both = preferGOverMatchingS([
      { code: "S", index: 1, topFt: 5, bottomFt: 15, thicknessFt: 10 },
      { code: "G", index: 1, topFt: 15, bottomFt: 20, thicknessFt: 5 },
    ]);
    expect(both.map((c) => `${c.code}${c.index} ${c.thicknessFt}`)).toEqual([
      "S1 10",
      "G1 5",
    ]);
  });
});
