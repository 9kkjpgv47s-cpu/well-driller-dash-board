import { describe, expect, it } from "vitest";
import { isInIndiana } from "./indiana";

describe("isInIndiana", () => {
  it("accepts Kokomo", () => {
    expect(isInIndiana(40.4865, -86.1336)).toBe(true);
  });

  it("rejects Chicago", () => {
    expect(isInIndiana(41.88, -87.63)).toBe(false);
  });

  it("rejects Dallas", () => {
    expect(isInIndiana(32.7767, -96.797)).toBe(false);
  });
});
