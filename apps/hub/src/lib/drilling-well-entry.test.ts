import { describe, expect, it } from "vitest";
import { wellRecordToDrillerEntry } from "./drilling-well-entry";

describe("wellRecordToDrillerEntry", () => {
  it("returns null without finite coordinates", () => {
    expect(wellRecordToDrillerEntry({ lat: "abc", lon: "-86.2" })).toBeNull();
    expect(wellRecordToDrillerEntry({})).toBeNull();
  });

  it("maps a chunk row onto a driller job entry snapshot", () => {
    const entry = wellRecordToDrillerEntry({
      id: " 12345 ",
      refno: 12345,
      lat: "39.5",
      lon: "-86.2",
      county: "Bartholomew",
      depth: "210",
      aquifer: "Sand and Gravel",
      owner: "Smith",
      loc_type: "GPS",
      lithology_json: "[]",
    });
    expect(entry).not.toBeNull();
    expect(entry!.wellId).toBe(entry!.snap.well_id_canonical);
    expect(entry!.notes).toBe("");
    expect(entry!.addedAt).toBeGreaterThan(0);
    expect(entry!.snap).toMatchObject({
      id: "12345",
      refno: 12345,
      lat: 39.5,
      lon: -86.2,
      county: "Bartholomew",
      depth: 210,
      aquifer: "Sand and Gravel",
      owner: "Smith",
      loc_type: "GPS",
    });
    expect(entry!.snap.well_identity_confidence).toBeTruthy();
    expect(entry!.snap.well_identity_resolver_version).toBeTruthy();
  });

  it("synthesizes the DNR report URL when the row has none", () => {
    const entry = wellRecordToDrillerEntry({ refno: 987654, lat: 39, lon: -86 });
    expect(entry!.snap.report).toBe(
      "https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=987654&_from=SUMMARY&_action=Details",
    );
  });

  it("keeps an existing report URL and blanks missing optional fields", () => {
    const entry = wellRecordToDrillerEntry({
      lat: 39,
      lon: -86,
      report: " https://example.test/report ",
    });
    expect(entry!.snap.report).toBe("https://example.test/report");
    expect(entry!.snap.id).toBeUndefined();
    expect(entry!.snap.depth).toBeUndefined();
    expect(entry!.snap.county).toBe("");
  });
});
