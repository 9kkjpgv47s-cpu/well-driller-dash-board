import { describe, expect, it } from "vitest";
import { extractPumpHp } from "./dispatch-parse";

describe("extractPumpHp", () => {
  it("captures decimal horsepower before hp suffix", () => {
    expect(
      extractPumpHp(
        "5\" New Con 1.5hp CPPS 40.058703,-86.113849 200' off of drive",
      ),
    ).toBe("1.5hp");
  });

  it("captures whole-number hp", () => {
    expect(extractPumpHp("Install 2hp submersible")).toBe("2hp");
  });
});
