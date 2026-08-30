import { describe, expect, it } from "vitest";
import {
  computeOptimizationFromWells,
  computeOptimizationMock,
  parseOptimizationSearchParams,
} from "./optimization";

describe("optimization", () => {
  it("rejects out-of-range coordinates and radius", () => {
    expect(
      parseOptimizationSearchParams({ lat: "39.7", lon: "-86.1", radius: "5" }),
    ).toMatchObject({ radiusMiles: 5 });
    expect(
      parseOptimizationSearchParams({
        lat: "39.7",
        lon: "-86.1",
        radius: "5000",
      }),
    ).toBeNull();
    expect(
      parseOptimizationSearchParams({ lat: "91", lon: "-86.1", radius: "5" }),
    ).toBeNull();
    expect(
      parseOptimizationSearchParams({ lat: "39.7", lon: "-86.1", radius: "0" }),
    ).toBeNull();
  });

  it("mock path returns deterministic illustrative stats", () => {
    const a = computeOptimizationMock({
      lat: 39.7684,
      lon: -86.1581,
      radiusMiles: 2,
      priority: "balanced",
    });
    const b = computeOptimizationMock({
      lat: 39.7684,
      lon: -86.1581,
      radiusMiles: 2,
      priority: "balanced",
    });
    expect(a.dataSource).toBe("mock");
    expect(a.neighborhood.sampleWellsInRadius).toBe(b.neighborhood.sampleWellsInRadius);
  });

  it("registry path uses wells in radius", () => {
    const wells = [
      {
        lat: 40.0,
        lon: -85.0,
        depth: "120",
        static_water: "15",
        pump_rate: "18",
        aquifer: "Unconsolidated sand and gravel",
        lithology_json: JSON.stringify([
          { from: 0, to: 40, formation: "Sand and gravel" },
          { from: 40, to: 120, formation: "Limestone" },
        ]),
      },
      {
        lat: 40.01,
        lon: -85.01,
        depth: "140",
        static_water: "22",
        pump_rate: "30",
        aquifer: "Bedrock limestone",
        lithology_json: JSON.stringify([
          { from: 0, to: 20, formation: "Sand" },
          { from: 20, to: 140, formation: "Dolomite" },
        ]),
      },
    ];
    const result = computeOptimizationFromWells(
      {
        lat: 40.0,
        lon: -85.0,
        radiusMiles: 5,
        priority: "balanced",
      },
      wells,
    );
    expect(result.dataSource).toBe("registry");
    expect(result.neighborhood.sampleWellsInRadius).toBe(2);
    expect(result.neighborhood.medianDepthFt).toBeGreaterThan(0);
    expect(result.neighborhood.typicalStaticBandFt).toMatch(/ft$/);
    expect(result.scores.dataConfidence).toBeGreaterThan(0);
  });
});
