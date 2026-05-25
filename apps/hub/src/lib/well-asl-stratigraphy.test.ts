import { describe, expect, it } from "vitest";
import {
  aslSpansShareFootage,
  buildAslStrataForWell,
  buildAslStratigraphyLayout,
  classifyFormation,
  collectSharedAquiferWellKeys,
  depthFtToAslFt,
  filterAslLayoutColumns,
  findSharedAquiferBands,
  formatSharedAquiferDrillAdvice,
  isGravelFormation,
  sharedAquiferDrillWindowFt,
} from "./well-asl-stratigraphy";

describe("well-asl-stratigraphy", () => {
  it("converts depth below ground to ASL", () => {
    expect(depthFtToAslFt(775, 25)).toBe(750);
    expect(depthFtToAslFt(725, 75)).toBe(650);
  });

  it("classifies sand/gravel and rock formations", () => {
    expect(classifyFormation("Coarse sand and gravel")).toBe("unconsolidated");
    expect(classifyFormation("Limestone")).toBe("rock");
  });

  it("matches gravel formations only for shared aquifers", () => {
    expect(isGravelFormation("Gravel")).toBe(true);
    expect(isGravelFormation("Sand and gravel")).toBe(true);
    expect(isGravelFormation("Coarse sand")).toBe(false);
  });

  it("requires shared ASL footage to overlap", () => {
    expect(
      aslSpansShareFootage(
        { topAslFt: 800, bottomAslFt: 750 },
        { topAslFt: 850, bottomAslFt: 800 },
      ),
    ).toBe(true);
    expect(
      aslSpansShareFootage(
        { topAslFt: 750, bottomAslFt: 700 },
        { topAslFt: 850, bottomAslFt: 800 },
      ),
    ).toBe(false);
  });

  it("aligns the same aquifer ASL across different ground elevations", () => {
    const highGround = buildAslStrataForWell(
      {
        id: "A",
        lithology_json: JSON.stringify({
          layers: [
            { from: 0, to: 20, formation: "Clay" },
            { from: 20, to: 45, formation: "Sand and gravel" },
          ],
        }),
      },
      775,
    );
    const lowGround = buildAslStrataForWell(
      {
        id: "B",
        lithology_json: JSON.stringify({
          layers: [
            { from: 0, to: 70, formation: "Till" },
            { from: 70, to: 95, formation: "Sand and gravel" },
          ],
        }),
      },
      725,
    );
    const gravelA = highGround.find((s) => isGravelFormation(s.formation));
    const gravelB = lowGround.find((s) => isGravelFormation(s.formation));
    expect(gravelA?.topAslFt).toBe(755);
    expect(gravelB?.topAslFt).toBe(655);
    expect(gravelA?.bottomAslFt).toBe(730);
    expect(gravelB?.bottomAslFt).toBe(630);
  });

  it("builds layout and finds shared gravel bands at the same ASL", () => {
    const layout = buildAslStratigraphyLayout(
      [
        {
          id: "1",
          lat: 40,
          lon: -86,
          ground_elev: "775",
          lithology_json: JSON.stringify({
            layers: [{ from: 20, to: 45, formation: "Sand and gravel" }],
          }),
        },
        {
          id: "2",
          lat: 40.01,
          lon: -86.01,
          ground_elev: "825",
          lithology_json: JSON.stringify({
            layers: [{ from: 70, to: 95, formation: "Gravel" }],
          }),
        },
      ],
      null,
    );
    expect(layout.columns).toHaveLength(2);
    const bands = findSharedAquiferBands(layout.columns);
    expect(bands.some((b) => b.wellCount >= 2)).toBe(true);
    expect(bands[0]?.sharedTopAslFt).toBe(755);
    expect(bands[0]?.sharedBottomAslFt).toBe(730);
    expect(bands[0]?.wellKeys).toHaveLength(2);
  });

  it("filters layout to shared aquifer wells only", () => {
    const layout = buildAslStratigraphyLayout(
      [
        {
          id: "1",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 50, to: 75, formation: "Sand and gravel" }],
          }),
        },
        {
          id: "2",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 65, to: 90, formation: "Gravel" }],
          }),
        },
        {
          id: "3",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 10, to: 30, formation: "Limestone" }],
          }),
        },
      ],
      null,
    );
    const bands = findSharedAquiferBands(layout.columns);
    const keys = collectSharedAquiferWellKeys(bands);
    expect(keys.size).toBe(2);
    const filtered = filterAslLayoutColumns(layout, { wellKeys: keys });
    expect(filtered.columns).toHaveLength(2);
    expect(filtered.columns.every((c) => keys.has(c.key))).toBe(true);
  });

  it("matches gravel layers that touch at a shared ASL boundary", () => {
    const layout = buildAslStratigraphyLayout(
      [
        {
          id: "A",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 0, to: 50, formation: "Gravel" }],
          }),
        },
        {
          id: "B",
          ground_elev: "850",
          lithology_json: JSON.stringify({
            layers: [{ from: 0, to: 50, formation: "Gravel" }],
          }),
        },
      ],
      null,
    );
    const bands = findSharedAquiferBands(layout.columns);
    expect(bands).toHaveLength(1);
    expect(bands[0]?.sharedTopAslFt).toBe(800);
    expect(bands[0]?.sharedBottomAslFt).toBe(800);
    expect(bands[0]?.centerAslFt).toBe(800);
  });

  it("unions overlapping gravel spans for drill depth at your elevation", () => {
    const layout = buildAslStratigraphyLayout(
      [
        {
          id: "A",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 50, to: 75, formation: "Sand and gravel" }],
          }),
        },
        {
          id: "B",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 65, to: 90, formation: "Gravel" }],
          }),
        },
      ],
      null,
    );
    const bands = findSharedAquiferBands(layout.columns);
    expect(bands).toHaveLength(1);
    expect(bands[0]?.wellCount).toBe(2);
    expect(bands[0]?.topAslFt).toBe(750);
    expect(bands[0]?.bottomAslFt).toBe(710);

    const window = sharedAquiferDrillWindowFt(bands[0]!, 800);
    expect(window.startDepthFt).toBe(50);
    expect(window.endDepthFt).toBe(90);
    expect(formatSharedAquiferDrillAdvice(bands[0]!, 800)).toContain("50–90 ft");
  });

  it("ignores sand-only layers and distant gravel with no shared ASL", () => {
    const layout = buildAslStratigraphyLayout(
      [
        {
          id: "deep",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 200, to: 225, formation: "Gravel" }],
          }),
        },
        {
          id: "mid",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 120, to: 145, formation: "Gravel" }],
          }),
        },
        {
          id: "shallow-sand",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 40, to: 65, formation: "Sand" }],
          }),
        },
        {
          id: "shallow-gravel",
          ground_elev: "800",
          lithology_json: JSON.stringify({
            layers: [{ from: 45, to: 70, formation: "Gravel" }],
          }),
        },
      ],
      null,
    );
    const bands = findSharedAquiferBands(layout.columns);
    expect(bands.some((b) => b.wellKeys.includes("shallow-sand"))).toBe(false);
    expect(bands.some((b) => b.wellCount >= 3)).toBe(false);
  });
});
