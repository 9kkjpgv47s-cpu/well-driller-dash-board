import { describe, expect, it } from "vitest";
import { wellGrRNumberForTagViewer } from "./viewer-well-map";

describe("viewer-well-map g/r tags", () => {
  it("prefers baked gravel vein columns even when aquifer text says bedrock", () => {
    const tag = wellGrRNumberForTagViewer({
      id: "X-1",
      lat: 40,
      lon: -85,
      aquifer: "Bedrock limestone",
      depth: "140",
      vein_size_ft: "18",
      pump_rate: "12",
      lithology_json: JSON.stringify([
        { from: 0, to: 20, formation: "Sand and gravel" },
        { from: 20, to: 140, formation: "Limestone" },
      ]),
    });
    expect(tag).toEqual({ kind: "g", n: 18 });
  });

  it("detects rock tags from depth_from/depth_to rock intervals", () => {
    const tag = wellGrRNumberForTagViewer({
      id: "X-2",
      lat: 40,
      lon: -85,
      aquifer: "Bedrock limestone",
      depth: "160",
      pump_rate: "10",
      lithology_json: JSON.stringify([
        { depth_from: 0, depth_to: 40, formation: "Sand" },
        { depth_from: 40, depth_to: 160, formation: "Shale" },
      ]),
    });
    expect(tag).toEqual({ kind: "r", n: 40 });
  });
});
