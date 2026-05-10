import { describe, expect, it } from "vitest";
import {
  computeAreaInsights,
  getLithLayers,
  lithologyLayerTopBottomFt,
} from "./area-well-analytics";

describe("area-well-analytics", () => {
  it("parses nested stringified lithology_json payloads", () => {
    const row = {
      lithology_json: JSON.stringify(
        JSON.stringify({
          layers: [
            { from: 0, to: 12, formation: "Sand" },
            { from: 12, to: 24, formation: "Gravel" },
          ],
        }),
      ),
    };
    const layers = getLithLayers(row);
    expect(layers).toHaveLength(2);
  });

  it("supports alternate depth field names", () => {
    const tb = lithologyLayerTopBottomFt(
      { depth_from: "15", depth_to: "42", formation: "Sand" },
      NaN,
    );
    expect(tb.top).toBe(15);
    expect(tb.bot).toBe(42);
  });

  it("computes low-confidence insights when coverage is sparse", () => {
    const report = computeAreaInsights(
      [
        {
          lat: 40.1,
          lon: -85.1,
          lithology_json: "",
          aquifer: "",
          pump_rate: "",
        },
        {
          lat: 40.12,
          lon: -85.12,
          lithology_json: "",
          aquifer: "",
          pump_rate: "",
        },
      ],
      40.1,
      -85.1,
      5,
    );
    expect(report.insightQuality.grade).toBe("low");
    expect(report.insightQuality.score).toBeLessThan(45);
  });
});
