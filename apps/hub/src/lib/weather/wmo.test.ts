import { describe, expect, it } from "vitest";
import { wmoCodeLabel } from "./wmo";

describe("wmoCodeLabel", () => {
  it("labels the cloud-cover ramp distinctly", () => {
    expect(wmoCodeLabel(0)).toBe("Clear");
    expect(wmoCodeLabel(1)).toBe("Mainly clear");
    expect(wmoCodeLabel(2)).toBe("Partly cloudy");
    expect(wmoCodeLabel(3)).toBe("Overcast");
  });

  it("groups precipitation families", () => {
    expect([45, 48].map(wmoCodeLabel)).toEqual(["Fog", "Fog"]);
    expect([51, 53, 55].map(wmoCodeLabel)).toEqual([
      "Drizzle",
      "Drizzle",
      "Drizzle",
    ]);
    expect(wmoCodeLabel(56)).toBe("Freezing drizzle");
    expect(wmoCodeLabel(63)).toBe("Rain");
    expect(wmoCodeLabel(67)).toBe("Freezing rain");
    expect(wmoCodeLabel(73)).toBe("Snow");
    expect(wmoCodeLabel(77)).toBe("Snow grains");
    expect(wmoCodeLabel(81)).toBe("Rain showers");
    expect(wmoCodeLabel(86)).toBe("Snow showers");
  });

  it("separates plain thunderstorms from hail", () => {
    expect(wmoCodeLabel(95)).toBe("Thunderstorm");
    expect([96, 97, 99].map(wmoCodeLabel)).toEqual([
      "Thunderstorm / hail",
      "Thunderstorm / hail",
      "Thunderstorm / hail",
    ]);
  });

  it("falls back to the raw code when unknown", () => {
    expect(wmoCodeLabel(42)).toBe("Code 42");
    expect(wmoCodeLabel(-1)).toBe("Code -1");
  });
});
