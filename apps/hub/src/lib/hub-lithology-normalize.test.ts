import { describe, expect, it } from "vitest";
import { finalizeLithologyLayersForHub } from "./hub-lithology-normalize";

describe("hub-lithology-normalize", () => {
  it("merges contiguous intervals with same formation", () => {
    const out = finalizeLithologyLayersForHub([
      { from: "0", to: "10", formation: "Sand" },
      { from: "10", to: "20", formation: "sand" },
      { from: "20", to: "30", formation: "Gravel" },
    ]) as { top: string; bottom: string; formation: string }[];

    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ top: "0", bottom: "20", formation: "Sand" });
    expect(out[1]).toEqual({ top: "20", bottom: "30", formation: "Gravel" });
  });
});
