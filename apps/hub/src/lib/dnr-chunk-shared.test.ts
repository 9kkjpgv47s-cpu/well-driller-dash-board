import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  CHUNK_PREFIX,
  CHUNK_SUFFIX,
  chunkUrl,
  gunzipText,
  missingCoreColumns,
  normalizeHeaderSet,
  normalizeRow,
  parseChunkCsvText,
} from "./dnr-chunk-shared";

describe("chunkUrl", () => {
  it("builds a same-origin chunk path", () => {
    expect(chunkUrl(3)).toBe(`${CHUNK_PREFIX}3${CHUNK_SUFFIX}`);
    expect(chunkUrl(0)).toBe("/well-viewer/dnr_wells_chunk_0.csv.gz");
  });
});

describe("normalizeRow", () => {
  it("lowercases keys, strips a BOM, and coerces coordinates to numbers", () => {
    const row = normalizeRow({
      "\ufeffLat": "39.5",
      " LON ": "-86.25",
      County: "Bartholomew",
    });
    expect(row.lat).toBeCloseTo(39.5);
    expect(row.lon).toBeCloseTo(-86.25);
    expect(row.county).toBe("Bartholomew");
  });

  it("accepts latitude/longitude aliases and yields NaN when unparseable", () => {
    const aliased = normalizeRow({ Latitude: "40", Longitude: "-85" });
    expect(aliased.lat).toBe(40);
    expect(aliased.lon).toBe(-85);
    expect(Number.isNaN(Number(normalizeRow({ lat: "n/a" }).lat))).toBe(true);
  });
});

describe("normalizeHeaderSet / missingCoreColumns", () => {
  it("normalizes header casing and whitespace", () => {
    const h = normalizeHeaderSet(["\ufeffLAT", " Longitude ", "lithology"]);
    expect([...h]).toEqual(["lat", "longitude", "lithology"]);
  });

  it("treats an undefined field list as empty", () => {
    expect(normalizeHeaderSet(undefined).size).toBe(0);
  });

  it("reports the core columns that no alias satisfies", () => {
    expect(
      missingCoreColumns(
        normalizeHeaderSet(["lat", "lng", "well_log_json", "lithology_source"]),
      ),
    ).toEqual([]);
    expect(missingCoreColumns(normalizeHeaderSet(["lat", "lon"]))).toEqual([
      "lithology_json",
      "lithology_source",
    ]);
  });
});

describe("parseChunkCsvText", () => {
  it("keeps only rows with finite coordinates and reports raw headers", () => {
    const csv = [
      "Lat,Lon,county,lithology_json,lithology_source",
      "39.5,-86.2,Bartholomew,[],html",
      ",,Marion,[],html",
      "not-a-number,-86.2,Marion,[],html",
      "40.1,-85.9,Hamilton,[],csv",
    ].join("\n");
    const { rows, fields } = parseChunkCsvText(csv);
    expect(fields).toEqual([
      "Lat",
      "Lon",
      "county",
      "lithology_json",
      "lithology_source",
    ]);
    expect(rows.map((r) => r.county)).toEqual(["Bartholomew", "Hamilton"]);
  });

  it("returns empty results for empty text", () => {
    expect(parseChunkCsvText("")).toEqual({ rows: [], fields: [] });
  });
});

describe("gunzipText", () => {
  it("decodes plain (non-gzip) buffers as UTF-8", async () => {
    const buf = new TextEncoder().encode("lat,lon\n39,-86\n");
    await expect(gunzipText(buf.buffer as ArrayBuffer)).resolves.toBe(
      "lat,lon\n39,-86\n",
    );
  });

  it("inflates gzip buffers", async () => {
    const gz = gzipSync(Buffer.from("lat,lon\n39,-86\n"));
    const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength);
    await expect(gunzipText(buf as ArrayBuffer)).resolves.toBe("lat,lon\n39,-86\n");
  });
});
