import { describe, expect, it } from "vitest";
import {
  buildViewerWellMarker,
  DEFAULT_VIEWER_MAP_FILTERS,
  estimatedTypeBorderColorViewer,
  getOrderedTagTokensViewer,
  parseFaceLabelTokens,
  wellGrRNumberForTagViewer,
  wellTypeColorViewer,
  wellTypeLabelViewer,
} from "./viewer-well-map";

describe("viewer-well-map g/r tags — lithology dual-label first", () => {
  it("uses lithology sand/gravel interval (not polluted CSV vein) for G tag", () => {
    // gravel_thickness 18 was often rock-top pollution; lithology S&G 0–20 wins
    const tag = wellGrRNumberForTagViewer({
      id: "X-1",
      lat: 40,
      lon: -85,
      aquifer: "Bedrock limestone",
      depth: "140",
      vein_size_ft: "18",
      gravel_thickness_ft: "18",
      rock_start_ft: "20",
      pump_rate: "12",
      static_water: "10",
      lithology_json: JSON.stringify([
        { from: 0, to: 20, formation: "Sand and gravel" },
        { from: 20, to: 140, formation: "Limestone" },
      ]),
    });
    expect(tag).toEqual({ kind: "g", n: 20 });
  });

  it("rock tags from shale/limestone when no sand/gravel water-bearing", () => {
    const tag = wellGrRNumberForTagViewer({
      id: "X-2",
      lat: 40,
      lon: -85,
      aquifer: "Bedrock limestone",
      depth: "160",
      casing_length: "42",
      pump_rate: "10",
      static_water: "20",
      lithology_json: JSON.stringify([
        { depth_from: 0, depth_to: 40, formation: "Clay" },
        { depth_from: 40, depth_to: 160, formation: "Shale" },
      ]),
    });
    expect(tag?.kind).toBe("r");
    expect(tag?.n).toBeGreaterThanOrEqual(40);
  });

  it("rejects polluted gravel_thickness == rock_start on hardpan→shale", () => {
    const tag = wellGrRNumberForTagViewer({
      id: "X-3",
      lat: 39.35,
      lon: -86.23,
      aquifer: "Unconsolidated",
      depth: "105",
      casing_length: "20",
      gravel_thickness_ft: "17",
      rock_start_ft: "17",
      pump_rate: "4",
      static_water: "12",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 17, formation: "BLUE & BROWN HARDPAN" },
        { top: 17, bottom: 105, formation: "BLUE SHALE" },
      ]),
    });
    // Rock top 17, casing 20 — single R tag at rock top (no dual 17 vs 20)
    expect(tag).toEqual({ kind: "r", n: 17 });
  });

  it("clay-only 36ft: no g/r invent; map face is Well (stack detail-only)", () => {
    const w = {
      id: "208958",
      lat: 39.35,
      lon: -86.23,
      depth: "36",
      depth_bedrock: "36",
      static_water: "18",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 18, formation: "HARD GRAY SOIL" },
        { top: 18, bottom: 36, formation: "BLUE CLAY" },
      ]),
    };
    expect(wellGrRNumberForTagViewer(w)).toBeNull();
    const label = wellTypeLabelViewer(w);
    expect(label).toBe("Well");
    expect(label).not.toMatch(/^G/);
    expect(label).not.toMatch(/^R/);
    expect(label).not.toMatch(/C0/);
    expect(label).not.toMatch(/Est/i);
  });

  it("does not prefix Est· on estimated rock wells", () => {
    const label = wellTypeLabelViewer({
      id: "est-r",
      lat: 39.35,
      lon: -86.23,
      loc_type: "Estimated",
      aquifer: "Estimated",
      depth: "150",
      casing_length: "25",
      lithology_json: JSON.stringify([
        { from: 0, to: 20, formation: "Clay" },
        { from: 20, to: 150, formation: "Dolomite" },
      ]),
    });
    expect(label).toBe("R20");
    expect(label).not.toMatch(/Est/i);
  });

  it("estimated green boxes get type-colored outline (blue gravel / red rock)", () => {
    const estRock = {
      id: "est-rock-outline",
      lat: 39.35,
      lon: -86.23,
      loc_type: "Estimated",
      aquifer: "Estimated",
      depth: "150",
      casing_length: "25",
      lithology_json: JSON.stringify([
        { from: 0, to: 20, formation: "Clay" },
        { from: 20, to: 150, formation: "Dolomite" },
      ]),
    };
    const estGravel = {
      id: "est-g-outline",
      lat: 39.35,
      lon: -86.23,
      loc_type: "Estimated location",
      aquifer: "Estimated",
      depth: "40",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 12, formation: "Sand and gravel" },
        { top: 12, bottom: 40, formation: "Clay" },
      ]),
    };
    const verifiedRock = {
      id: "ver-rock",
      lat: 39.35,
      lon: -86.23,
      depth: "150",
      casing_length: "25",
      lithology_json: JSON.stringify([
        { from: 0, to: 20, formation: "Clay" },
        { from: 20, to: 150, formation: "Dolomite" },
      ]),
    };

    // Green fill stays for estimated
    expect(wellTypeColorViewer(estRock)).toBe("#16a34a");
    expect(wellTypeColorViewer(estGravel)).toBe("#16a34a");
    // Subtle type ring: red rock / blue gravel
    expect(estimatedTypeBorderColorViewer(estRock)).toBe("#dc2626");
    expect(estimatedTypeBorderColorViewer(estGravel)).toBe("#2563eb");
    // Verified wells keep default white ring (no override)
    expect(estimatedTypeBorderColorViewer(verifiedRock)).toBeNull();
    expect(wellTypeLabelViewer(estRock)).toBe("R20");
    expect(wellTypeLabelViewer(estGravel)).toMatch(/^G/);

    const typeFilters = {
      ...DEFAULT_VIEWER_MAP_FILTERS,
      typeUncon: true,
      typeRock: true,
      typeEstimated: true,
    };
    const rockHtml = buildViewerWellMarker(estRock, typeFilters, 14).html;
    const gHtml = buildViewerWellMarker(estGravel, typeFilters, 14).html;
    const verHtml = buildViewerWellMarker(verifiedRock, typeFilters, 14).html;
    // Minimal 1px type ring (v4) — fill size unchanged; no fat 3px + outer halo
    expect(rockHtml).toContain("border:1px solid #dc2626");
    expect(rockHtml).toContain("vj-est-rock");
    expect(rockHtml).toContain('data-est-type="vj-est-rock"');
    expect(rockHtml).toContain('data-est-border="#dc2626"');
    expect(rockHtml).toContain("background:#16a34a");
    expect(gHtml).toContain("border:1px solid #2563eb");
    expect(gHtml).toContain("vj-est-gravel");
    expect(gHtml).toContain('data-est-type="vj-est-gravel"');
    expect(gHtml).toContain('data-est-border="#2563eb"');
    expect(gHtml).toContain("background:#16a34a");
    // Verified: no type-outline override (CSS default white ring)
    expect(verHtml).not.toContain("border:1px solid #dc2626");
    expect(verHtml).not.toContain("border:1px solid #2563eb");
    expect(verHtml).not.toContain("vj-est-rock");
    expect(verHtml).not.toContain("vj-est-gravel");
  });

  it("parseFaceLabelTokens splits multi G/S/R without inventing duplicates", () => {
    expect(parseFaceLabelTokens("R20")).toEqual(["r20"]);
    expect(parseFaceLabelTokens("G1 2 / G2 10")).toEqual(["g1 2", "g2 10"]);
    expect(parseFaceLabelTokens("S1 12 / R20")).toEqual(["s1 12", "r20"]);
    expect(parseFaceLabelTokens("S1 10 / G1 5 / S2 5 / G2 5")).toEqual([
      "s1 10",
      "g1 5",
      "s2 5",
      "g2 5",
    ]);
    // Defensive: R never stays before G even if a bad string arrives
    expect(parseFaceLabelTokens("R20 / G1 15")).toEqual(["g1 15", "r20"]);
  });

  it("getOrderedTagTokensViewer matches face label only (no dual R/G)", () => {
    const rock = {
      id: "tok-r",
      lat: 39.35,
      lon: -86.23,
      depth: "105",
      casing_length: "20",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 17, formation: "BLUE & BROWN HARDPAN" },
        { top: 17, bottom: 105, formation: "BLUE SHALE" },
      ]),
    };
    const face = wellTypeLabelViewer(rock);
    const toks = getOrderedTagTokensViewer(rock);
    expect(face).toBe("R17");
    // One R chip only — not plain face + second r token series
    expect(toks).toEqual(["r17"]);

    const multiG = {
      id: "tok-g",
      lat: 39.35,
      lon: -86.23,
      depth: "40",
      lithology_json: JSON.stringify([
        { top: 0, bottom: 2, formation: "Sand and gravel" },
        { top: 2, bottom: 12, formation: "Clay" },
        { top: 12, bottom: 22, formation: "Sand and gravel" },
      ]),
    };
    expect(wellTypeLabelViewer(multiG)).toBe("G1 2 / G2 10");
    expect(getOrderedTagTokensViewer(multiG)).toEqual(["g1 2", "g2 10"]);
  });
});
