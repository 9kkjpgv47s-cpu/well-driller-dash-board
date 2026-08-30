import { describe, expect, it } from "vitest";
import {
  chunkHasCoordinateColumns,
  normalizeRow,
  parseChunkCsvText,
} from "./dnr-chunk-shared";

describe("dnr-chunk-shared", () => {
  it("drops well rows without usable coordinates", async () => {
    const csv = [
      "id,lat,lon,depth",
      "DNR-1,40.1,-85.7,120",
      "DNR-2,,,90",
      "DNR-3,not-a-number,-85.7,80",
    ].join("\n");

    const { rows } = await parseChunkCsvText(csv);
    expect(rows.map((r) => r.id)).toEqual(["DNR-1"]);
    expect(rows[0]!.lat).toBe(40.1);
  });

  it("keeps lithology sidecar rows that carry no coordinates", async () => {
    const csv = [
      "id,lithology_json,lithology_source",
      'DNR-1,"[{""top"":""0"",""bottom"":""10""}]",html',
      "DNR-2,,html",
    ].join("\n");

    const { rows, fields } = await parseChunkCsvText(csv);
    expect(chunkHasCoordinateColumns(fields)).toBe(false);
    expect(rows.map((r) => r.id)).toEqual(["DNR-1", "DNR-2"]);
    expect(rows[0]!.lithology_json).toBe('[{"top":"0","bottom":"10"}]');
    // No coordinate keys are invented for sidecar rows.
    expect(rows[0]!.lat).toBeUndefined();
    expect(rows[0]!.lon).toBeUndefined();
  });

  it("normalizeRow parses coordinate aliases and lowercases headers", () => {
    const row = normalizeRow({ ID: "DNR-1", Latitude: "40.5", LON: "-86.25" });
    expect(row.id).toBe("DNR-1");
    expect(row.lat).toBe(40.5);
    expect(row.lon).toBe(-86.25);
  });

  it("chunkHasCoordinateColumns accepts header aliases", () => {
    expect(chunkHasCoordinateColumns(["id", "latitude", "lng"])).toBe(true);
    expect(chunkHasCoordinateColumns(["id", "lat"])).toBe(false);
    expect(chunkHasCoordinateColumns(undefined)).toBe(false);
  });
});
