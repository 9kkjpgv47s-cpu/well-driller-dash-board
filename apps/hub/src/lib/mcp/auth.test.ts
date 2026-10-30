import { describe, expect, it } from "vitest";
import { parseApiKeys, verifyApiKey } from "./auth";

const RAW = "acme:k1, beta:k2 ,bad";

describe("parseApiKeys", () => {
  it("parses label:key entries, trimming whitespace and skipping colon-less entries", () => {
    const keys = parseApiKeys(RAW);
    expect(keys.size).toBe(2);
    expect(keys.get("k1")).toBe("acme");
    expect(keys.get("k2")).toBe("beta");
  });

  it("returns an empty map for undefined or empty env", () => {
    expect(parseApiKeys(undefined).size).toBe(0);
    expect(parseApiKeys("").size).toBe(0);
  });
});

describe("verifyApiKey", () => {
  it("returns the client label for a configured key", () => {
    expect(verifyApiKey("k1", RAW)).toEqual({ clientId: "acme" });
    expect(verifyApiKey("k2", RAW)).toEqual({ clientId: "beta" });
  });

  it("denies a wrong key", () => {
    expect(verifyApiKey("nope", RAW)).toBeUndefined();
  });

  it("denies everything when env is undefined or empty", () => {
    expect(verifyApiKey("k1", undefined)).toBeUndefined();
    expect(verifyApiKey("k1", "")).toBeUndefined();
  });

  it("denies an undefined bearer", () => {
    expect(verifyApiKey(undefined, RAW)).toBeUndefined();
  });
});
