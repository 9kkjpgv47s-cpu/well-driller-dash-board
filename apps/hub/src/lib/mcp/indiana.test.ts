import { describe, expect, it } from "vitest";
import { isInIndiana, queryScopesOutOfIndiana } from "./indiana";

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

describe("queryScopesOutOfIndiana", () => {
  it("catches a trailing state name or abbrev", () => {
    expect(queryScopesOutOfIndiana("Chicago, Illinois")).toBe(true);
    expect(queryScopesOutOfIndiana("Portland, OR")).toBe(true);
    expect(queryScopesOutOfIndiana("Springfield, Ohio")).toBe(true);
  });

  it("leaves Indiana and unscoped queries alone", () => {
    expect(queryScopesOutOfIndiana("Kokomo")).toBe(false);
    expect(queryScopesOutOfIndiana("Kokomo, Indiana")).toBe(false);
    expect(queryScopesOutOfIndiana("Marion, IN")).toBe(false);
    expect(queryScopesOutOfIndiana("4620 E 550 S, Marion IN 46953")).toBe(false);
    expect(queryScopesOutOfIndiana("Kokomo, USA")).toBe(false);
    // a city in Indiana named after another state — no comma-state tail
    expect(queryScopesOutOfIndiana("Michigan City")).toBe(false);
  });
});
