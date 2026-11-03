import { afterEach, describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { McpServer } from "@modelcontextprotocol/server";
import type { WellRecord } from "@/lib/area-well-analytics";
import * as dnrReportServer from "@/lib/dnr-report-server";
import * as wellCache from "@/lib/dnr-wells-server-cache";
import {
  areaInsightsTool,
  dnrWellRecordTool,
  geocodeAddressTool,
  registerDrillerTools,
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

  it("returns isError when the geocoder only matches out of state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            lat: "41.8781",
            lon: "-87.6298",
            display_name: "Chicago, Illinois, USA",
          },
        ],
      })),
    );
    const res = await geocodeAddressTool({ query: "Chicago, Illinois" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('No Indiana match for "Chicago, Illinois"');
  });

  it("keeps only the Indiana rows from a mixed geocoder result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            lat: "41.8781",
            lon: "-87.6298",
            display_name: "Chicago, Illinois, USA",
          },
          {
            lat: "40.4865",
            lon: "-86.1336",
            display_name: "Kokomo, Howard County, Indiana, USA",
          },
        ],
      })),
    );
    const res = await geocodeAddressTool({ query: "Kokomo" });
    expect(res.isError).not.toBe(true);
    const sc = res.structuredContent as {
      results: { lat: number; label: string }[];
    };
    expect(sc.results).toHaveLength(1);
    expect(sc.results[0]?.label).toContain("Kokomo");
    expect(textOf(res)).not.toContain("Chicago");
  });
});

describe("dnrWellRecordTool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns isError when the record body is null", async () => {
    vi.spyOn(dnrReportServer, "fetchDnrReport").mockResolvedValue({
      status: 204,
      body: null,
    });
    const res = await dnrWellRecordTool({ ref_no: "999" });
    expect(res.isError).toBe(true);
  });

  it("returns isError when the record body is an empty object", async () => {
    vi.spyOn(dnrReportServer, "fetchDnrReport").mockResolvedValue({
      status: 200,
      body: {},
    });
    const res = await dnrWellRecordTool({ ref_no: "999" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("empty record body");
  });

  it("returns isError when all top-level fields are blank", async () => {
    vi.spyOn(dnrReportServer, "fetchDnrReport").mockResolvedValue({
      status: 200,
      body: { refno: "", depth: null },
    });
    const res = await dnrWellRecordTool({ ref_no: "999" });
    expect(res.isError).toBe(true);
  });

  it("keeps the raw body and adds a scalar summary map", async () => {
    vi.spyOn(dnrReportServer, "fetchDnrReport").mockResolvedValue({
      status: 200,
      body: {
        refno: "100001",
        depth: 120,
        lithology: [{ from: 0, to: 40, formation: "Sand" }],
        plugged: false,
      },
    });
    const res = await dnrWellRecordTool({ ref_no: "100001" });
    expect(res.isError).not.toBe(true);
    const sc = res.structuredContent as Record<string, unknown>;
    expect(sc.refno).toBe("100001");
    expect(sc.depth).toBe(120);
    const summary = sc.summary as Record<string, unknown>;
    expect(summary).toEqual({ refno: "100001", depth: 120, plugged: false });
    expect(textOf(res)).toContain("Source: Indiana DNR");
  });
});

describe("registerDrillerTools", () => {
  it("registers every tool with an outputSchema and readOnlyHint", () => {
    const server = new McpServer({ name: "test", version: "0" });
    registerDrillerTools(server);
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { outputSchema?: unknown; annotations?: { readOnlyHint?: boolean } }
        >;
      }
    )._registeredTools;
    const names = Object.keys(tools).sort();
    expect(names).toEqual([
      "area_insights",
      "dnr_well_record",
      "geocode_address",
      "ground_layers",
      "job_brief",
      "job_weather",
      "parse_dispatch",
      "site_optimization",
      "wells_nearby",
    ]);
    for (const name of names) {
      expect(tools[name]?.outputSchema, name).toBeTruthy();
      expect(tools[name]?.annotations?.readOnlyHint, name).toBe(true);
    }
  });

  it("registers prompts and resources", () => {
    const server = new McpServer({ name: "test", version: "0" });
    registerDrillerTools(server);
    const prompts = Object.keys(
      (
        server as unknown as {
          _registeredPrompts: Record<string, unknown>;
        }
      )._registeredPrompts,
    ).sort();
    expect(prompts).toEqual(["compare-sites", "prep-drilling-job"]);
    const resources = (
      server as unknown as {
        _registeredResources: Record<string, { uri?: unknown }>;
      }
    )._registeredResources;
    expect(Object.keys(resources).sort()).toEqual([
      "driller-hub://data-coverage",
      "driller-hub://glossary",
    ]);
  });
});
