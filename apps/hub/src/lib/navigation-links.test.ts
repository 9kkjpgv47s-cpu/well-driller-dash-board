import { describe, expect, it } from "vitest";
import type { DispatchParseResult } from "@/lib/dispatch-parse";
import { directionsLinksForDispatch } from "./navigation-links";

function parsed(over: Partial<DispatchParseResult>): DispatchParseResult {
  return {
    title: null,
    lat: null,
    lon: null,
    address: null,
    notes: "",
    locationSource: "none",
    warnings: [],
    scheduleLine: null,
    contactName: null,
    phone: null,
    pumpHp: null,
    distanceOffDrive: null,
    ...over,
  };
}

describe("directionsLinksForDispatch", () => {
  it("prefers coordinates over the address", () => {
    const links = directionsLinksForDispatch(
      parsed({ lat: 39.40795, lon: -85.86295, address: "123 Main St" }),
    );
    expect(links).not.toBeNull();
    expect(links!.google).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=39.40795%2C-85.86295",
    );
    expect(links!.apple).toBe("https://maps.apple.com/?daddr=39.40795%2C-85.86295");
    expect(links!.waze).toBe(
      "https://www.waze.com/ul?ll=39.40795%2C-85.86295&navigate=yes",
    );
    expect(links!.destinationLabel).toBe("39.40795, -85.86295");
  });

  it("falls back to a URL-encoded address search", () => {
    const links = directionsLinksForDispatch(
      parsed({ address: "  123 Main St, Greensburg IN  " }),
    );
    expect(links!.destinationLabel).toBe("123 Main St, Greensburg IN");
    expect(links!.google).toContain("123%20Main%20St%2C%20Greensburg%20IN");
    expect(links!.waze).toContain("?q=123%20Main%20St");
  });

  it("returns null without coordinates or a usable address", () => {
    expect(directionsLinksForDispatch(parsed({}))).toBeNull();
    expect(directionsLinksForDispatch(parsed({ address: "   " }))).toBeNull();
    expect(directionsLinksForDispatch(parsed({ lat: 39.4, lon: null }))).toBeNull();
  });
});
