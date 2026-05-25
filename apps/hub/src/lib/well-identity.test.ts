import { describe, expect, it } from "vitest";
import {
  resolveCanonicalWellIdentity,
  resolveWellRefNo,
} from "./well-identity";

describe("well-identity", () => {
  it("prefers DNR-style numeric identity when available", () => {
    const w = {
      refno: "0012345",
      id: "legacy-id",
      lat: 39.7,
      lon: -86.1,
    };
    const id = resolveCanonicalWellIdentity(w);
    expect(id.refno).toBe(12345);
    expect(id.canonicalId).toBe("DNR-12345");
    expect(id.aliases).toContain("12345");
    expect(id.confidence).toBe("high");
    expect(id.provenance).toContain("numeric_ref");
    expect(id.resolverVersion).toBe("well-identity-v2");
  });

  it("extracts refNo from report url when explicit refno missing", () => {
    const w = {
      report:
        "https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=889977&_from=SUMMARY&_action=Details",
      lat: 39.7,
      lon: -86.1,
    };
    expect(resolveWellRefNo(w)).toBe(889977);
    expect(resolveCanonicalWellIdentity(w).canonicalId).toBe("DNR-889977");
  });

  it("uses normalized textual id when no numeric identifier is present", () => {
    const w = {
      id: "Well A-17 South",
      lat: 39.71,
      lon: -86.12,
    };
    const id = resolveCanonicalWellIdentity(w);
    expect(id.canonicalId).toBe("WELL-WELLA17SOUTH");
    expect(id.confidence).toBe("medium");
    expect(id.provenance).toContain("text_identifier");
  });

  it("falls back to stable hash based identity", () => {
    const w = {
      owner: "Holgworth",
      county: "Hendricks",
      lat: 39.6009415,
      lon: -86.5264834,
      depth: 82,
    };
    const a = resolveCanonicalWellIdentity(w).canonicalId;
    const b = resolveCanonicalWellIdentity(w).canonicalId;
    expect(a).toBe(b);
    expect(a.startsWith("WELL-")).toBe(true);
    expect(resolveCanonicalWellIdentity(w).confidence).toBe("low");
  });

  it("tracks report URL as provenance when refNo is extracted from report", () => {
    const w = {
      report:
        "https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=114477&_from=SUMMARY&_action=Details",
      lat: 39.7,
      lon: -86.1,
    };
    const id = resolveCanonicalWellIdentity(w);
    expect(id.canonicalId).toBe("DNR-114477");
    expect(id.provenance).toContain("report_url_ref");
    expect(id.sourceFieldsUsed).toContain("report");
  });
});
