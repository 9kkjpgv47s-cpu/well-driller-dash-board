import { afterEach, describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { WellRecord } from "@/lib/area-well-analytics";
import * as wellCache from "@/lib/dnr-wells-server-cache";
import {
  areaInsightsTool,
  geocodeAddressTool,
  wellsNearbyTool,
} from "./tools";

const CENTER = { lat: 40.48, lon: -86.13 };

/** Synthetic registry rows clustered within ~0.6 mi of CENTER (Howard Co). */
const ROWS: WellRecord[] = [
  {
    refno: "100001",
    well_id: "w1",
    lat: 40.481,
    lon: -86.131,
    depth: "120",
    static_water: "25",
    pump_rate: "15",
    aquifer: "Unconsolidated",
    county: "Howard",
  },
  {
    refno: "100002",
    lat: 40.478,
    lon: -86.128,
    depth: "95",
    static_water: "30",
    pump_rate: "20",
    aquifer: "Bedrock",
    county: "Howard",
  },
  {
    refno: "100003",
    lat: 40.483,
    lon: -86.135,
    depth: "140",
    pump_rate: "10",
    aquifer: "Unconsolidated",
    county: "Howard",
  },
  {
    refno: "100004",
    lat: 40.476,
    lon: -86.133,
    depth: "80",
    static_water: "20",
    aquifer: "Unconsolidated",
    county: "Howard",
  },
  {
    refno: "100005",
    lat: 40.485,
    lon: -86.127,
    depth: "110",
    pump_rate: "25",
    aquifer: "Bedrock",
    county: "Howard",
  },
];

function textOf(result: CallToolResult): string {
  const block = result.content[0] as { type: string; text?: string };
  return block.text ?? "";
}

function mockWellRows(wells: WellRecord[] = ROWS) {
  return vi
    .spyOn(wellCache, "getDnrWellsForRadiusCachedForApi")
    .mockResolvedValue({ wells, source: "registry", tiles: 0 });
}

describe("areaInsightsTool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the report text with map link, source footer, and structured content", async () => {
    mockWellRows();
    const res = await areaInsightsTool({ ...CENTER, radius_miles: 3 });
    const text = textOf(res);
    expect(text).toContain("Map: ");
    expect(text).toContain("lat=40.48");
    expect(text).toContain(
      "Source: Indiana DNR water well registry via Driller Hub",
    );
    const sc = res.structuredContent as { totalWellsInRadius: number };
    expect(sc.totalWellsInRadius).toBe(ROWS.length);
  });

  it("rejects out-of-Indiana coordinates without loading wells", async () => {
    const spy = mockWellRows();
    const res = await areaInsightsTool({ lat: 41.88, lon: -87.63 });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("outside Indiana");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns a cold-start error when the registry load fails", async () => {
    vi.spyOn(
      wellCache,
      "getDnrWellsForRadiusCachedForApi",
    ).mockRejectedValue(new Error("timeout"));
    const res = await areaInsightsTool({ ...CENTER, radius_miles: 3 });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("temporarily unavailable");
  });
});

describe("wellsNearbyTool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("limits rows, reports truncation, and includes all in-radius in the total", async () => {
    mockWellRows();
    const res = await wellsNearbyTool({ ...CENTER, radius_miles: 1, limit: 2 });
    const text = textOf(res);
    const wellLines = text.split("\n").filter((l) => l.startsWith("#"));
    expect(wellLines).toHaveLength(2);
    expect(text).toContain("(truncated)");
    const sc = res.structuredContent as {
      wells: unknown[];
      total_in_radius: number;
      truncated: boolean;
    };
    expect(sc.truncated).toBe(true);
    expect(sc.total_in_radius).toBe(ROWS.length);
  });

  it("rejects out-of-Indiana coordinates without loading wells", async () => {
    const spy = mockWellRows();
    const res = await wellsNearbyTool({ lat: 32.78, lon: -96.8 });
    expect(res.isError).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("geocodeAddressTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns numbered candidates for Nominatim rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            lat: "40.4865",
            lon: "-86.1336",
            display_name: "Kokomo, Howard County, Indiana, USA",
          },
          {
            lat: "40.4",
            lon: "-86.1",
            display_name: "Center, Howard County, Indiana, USA",
          },
        ],
      })),
    );
    const res = await geocodeAddressTool({ query: "Kokomo" });
    const text = textOf(res);
    expect(text).toContain("1. Kokomo, Howard County, Indiana, USA");
    expect(text).toContain("2. Center, Howard County, Indiana, USA");
    expect(text).toContain("Map: ");
  });

  it("returns isError on an empty geocode result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => [] })),
    );
    const res = await geocodeAddressTool({ query: "Nowhere" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('No Indiana match for "Nowhere"');
  });
});
