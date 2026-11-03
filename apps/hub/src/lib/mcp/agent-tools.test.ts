import { afterEach, describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { WellRecord } from "@/lib/area-well-analytics";
import * as elevation from "@/lib/elevation";
import * as wellCache from "@/lib/dnr-wells-server-cache";
import { parseDispatchEmail } from "@/lib/dispatch-parse";
import { parseDispatchTool } from "./dispatch";
import { groundLayersTool } from "./ground-layers";
import {
  jobBriefTool,
  resolveBriefLocation,
  type JobBriefDeps,
} from "./job-brief";
import { siteOptimizationTool } from "./optimization";
import { withRetry } from "./retry";

const CENTER = { lat: 40.48, lon: -86.13 };

const EVAL_DISPATCH = `New well — Megan Despain
4620 E 550 S, Marion IN 46953
GPS: 40.558, -85.659
Schedule: Tue 4/8 8:00 AM
Contact: Megan Despain (765) 555-0132
Pump: 1/2 HP
Well sits 180 ft off drive`;

const ROWS: WellRecord[] = [
  {
    refno: "100001",
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
];

const LITHO_ROWS: WellRecord[] = [
  {
    refno: "200001",
    lat: 40.481,
    lon: -86.131,
    depth: "60",
    ground_elev: "775",
    lithology_json: JSON.stringify({
      layers: [
        { from: 0, to: 20, formation: "Clay" },
        { from: 20, to: 45, formation: "Sand and gravel" },
      ],
    }),
  },
  {
    refno: "200002",
    lat: 40.482,
    lon: -86.132,
    depth: "110",
    ground_elev: "825",
    lithology_json: JSON.stringify({
      layers: [
        { from: 0, to: 70, formation: "Till" },
        { from: 70, to: 95, formation: "Sand and gravel" },
      ],
    }),
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

function stubDeps(overrides: Partial<JobBriefDeps> = {}): JobBriefDeps {
  return {
    parseDispatch: parseDispatchEmail,
    geocode: async () => [
      { label: "Kokomo, Howard County, Indiana", lat: 40.486, lon: -86.134 },
    ],
    loadWells: async () => ({ wells: ROWS, source: "registry", tiles: 0 }),
    weather: async () => ({ ok: false, error: "down" }),
    groundElevationFt: async () => 810,
    ...overrides,
  };
}

describe("parseDispatchTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("extracts coords, schedule, contact, and phone from a pasted dispatch", async () => {
    const res = await parseDispatchTool({ text: EVAL_DISPATCH });
    expect(res.isError).not.toBe(true);
    const sc = res.structuredContent as {
      parsed: {
        lat: number;
        phone: string | null;
        scheduleLine: string | null;
        locationSource: string;
      };
      geocoded?: { lat: number };
    };
    expect(sc.parsed.lat).toBeCloseTo(40.558, 3);
    expect(sc.parsed.locationSource).toBe("coordinates");
    expect(sc.parsed.phone).toBe("(765) 555-0132");
    expect(sc.parsed.scheduleLine).toBeTruthy();
    expect(sc.geocoded).toBeUndefined();
    expect(textOf(res)).toContain("Megan Despain");
  });

  it("geocodes the parsed address when the paste lacks GPS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            lat: "40.5585",
            lon: "-85.6591",
            display_name: "4620 E 550 S, Marion, Indiana",
          },
        ],
      })),
    );
    const res = await parseDispatchTool({
      text: "New well — Bob Jones\n4620 E 550 S, Marion IN 46953\nCall (765) 555-0100",
    });
    const sc = res.structuredContent as {
      parsed: { locationSource: string };
      geocoded?: { lat: number; lon: number; label: string };
    };
    expect(sc.parsed.locationSource).toBe("address_only");
    expect(sc.geocoded?.lat).toBeCloseTo(40.5585, 3);
    expect(sc.geocoded?.label).toContain("Marion");
  });
});

describe("resolveBriefLocation", () => {
  it("prefers explicit lat/lon over a query", async () => {
    const geocode = vi.fn().mockResolvedValue([]);
    const out = await resolveBriefLocation(
      { lat: 40.5, lon: -86.1, query: "Kokomo" },
      stubDeps({ geocode }),
    );
    expect("error" in out).toBe(false);
    if (!("error" in out)) {
      expect(out.location.source).toBe("coords");
      expect(out.location.lat).toBe(40.5);
    }
    expect(geocode).not.toHaveBeenCalled();
  });

  it("uses dispatch GPS coords before geocoding", async () => {
    const geocode = vi.fn().mockResolvedValue([]);
    const out = await resolveBriefLocation(
      { query: "Job for Despain\nGPS: 40.558, -85.659" },
      stubDeps({ geocode }),
    );
    if (!("error" in out)) {
      expect(out.location.source).toBe("dispatch");
      expect(out.location.lat).toBeCloseTo(40.558, 3);
      expect(out.parsed?.locationSource).toBe("coordinates");
    }
    expect(geocode).not.toHaveBeenCalled();
  });

  it("geocodes the parsed dispatch address", async () => {
    const geocode = vi
      .fn()
      .mockResolvedValue([
        { label: "Marion, Indiana", lat: 40.558, lon: -85.659 },
      ]);
    const out = await resolveBriefLocation(
      { query: "New well for Bob\n4620 E 550 S, Marion IN 46953" },
      stubDeps({ geocode }),
    );
    if (!("error" in out)) {
      expect(out.location.source).toBe("geocode");
      expect(out.location.lat).toBeCloseTo(40.558, 3);
      expect(out.parsed?.address).toContain("Marion");
    }
    expect(geocode).toHaveBeenCalledWith("4620 E 550 S, Marion IN 46953");
  });

  it("geocodes the raw query when the parse yields nothing", async () => {
    const out = await resolveBriefLocation(
      { query: "Kokomo" },
      stubDeps(),
    );
    if (!("error" in out)) {
      expect(out.location.source).toBe("geocode");
      expect(out.location.lat).toBeCloseTo(40.486, 3);
      // a plain place name produces no dispatch fields worth echoing
      expect(out.parsed).toBeUndefined();
    }
  });

  it("errors when nothing resolves", async () => {
    const out = await resolveBriefLocation(
      { query: "Nowhereville" },
      stubDeps({ geocode: async () => [] }),
    );
    expect("error" in out).toBe(true);
    if ("error" in out) expect(out.error).toContain("ouldn't locate");
  });

  it("requires lat and lon as a pair", async () => {
    const out = await resolveBriefLocation({ lat: 40.5 }, stubDeps());
    expect("error" in out).toBe(true);
  });
});

describe("jobBriefTool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("builds a field brief from a place-name query", async () => {
    const res = await jobBriefTool(
      { query: "Kokomo", radius_miles: 3 },
      stubDeps(),
    );
    expect(res.isError).not.toBe(true);
    const sc = res.structuredContent as {
      location: { lat: number; source: string };
      area: { wells_in_radius: number; confidence_grade: string };
      nearest_wells: { refno?: string | number; distance_miles: number }[];
      shared_aquifer: { bands: unknown[] } | null;
      elevation_ft?: number;
      weather?: unknown;
    };
    expect(sc.location.source).toBe("geocode");
    expect(sc.location.lat).toBeCloseTo(40.486, 2);
    expect(sc.area.wells_in_radius).toBe(ROWS.length);
    expect(sc.nearest_wells.length).toBeGreaterThanOrEqual(1);
    // nearest to the stub geocode (40.486,-86.134) is the 40.483,-86.135 well
    expect(sc.nearest_wells[0]?.refno).toBe("100003");
    expect(sc.nearest_wells[0]?.distance_miles).toBeTypeOf("number");
    expect(sc.elevation_ft).toBe(810);
    expect(sc.weather).toBeUndefined();
    expect(textOf(res)).toContain("Field brief");
    expect(textOf(res)).toContain("Source: Indiana DNR");
  });

  it("includes dispatch fields and shared-aquifer bands when available", async () => {
    const res = await jobBriefTool(
      {
        query: "Job for Tester\nGPS: 40.482, -86.133",
        radius_miles: 3,
      },
      stubDeps({
        loadWells: async () => ({
          wells: LITHO_ROWS,
          source: "registry",
          tiles: 0,
        }),
        groundElevationFt: async () => null,
      }),
    );
    const sc = res.structuredContent as {
      location: { source: string; lat: number };
      dispatch?: { locationSource: string };
      shared_aquifer: {
        bands: { window_start_ft: number | null; window_end_ft: number | null }[];
      } | null;
    };
    expect(sc.location.source).toBe("dispatch");
    expect(sc.location.lat).toBeCloseTo(40.482, 3);
    expect(sc.dispatch?.locationSource).toBe("coordinates");
    expect(sc.shared_aquifer).not.toBeNull();
    expect(sc.shared_aquifer!.bands.length).toBe(1);
    // DEM failed → window uses the nearest plotted well's ground ASL (825 ft):
    // drill 825−755=70 to 825−730=95 ft below ground.
    expect(sc.shared_aquifer!.bands[0]?.window_start_ft).toBe(70);
    expect(sc.shared_aquifer!.bands[0]?.window_end_ft).toBe(95);
  });

  it("errors outside Indiana without loading wells", async () => {
    const loadWells = vi
      .fn()
      .mockResolvedValue({ wells: ROWS, source: "registry", tiles: 0 });
    const res = await jobBriefTool(
      { lat: 41.88, lon: -87.63 },
      stubDeps({ loadWells }),
    );
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("outside Indiana");
    expect(loadWells).not.toHaveBeenCalled();
  });
});

describe("groundLayersTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns lithology counts and shared-aquifer drill windows", async () => {
    mockWellRows(LITHO_ROWS);
    vi.spyOn(elevation, "getGroundElevationFt").mockResolvedValue(810);
    const res = await groundLayersTool({ ...CENTER, radius_miles: 3 });
    expect(res.isError).not.toBe(true);
    const sc = res.structuredContent as {
      wells_with_lithology: number;
      shared_aquifer_bands: {
        center_asl_ft: number;
        well_count: number;
        window_start_ft: number | null;
        window_end_ft: number | null;
      }[];
      ground_elevation_ft?: number;
      ground_elevation_source?: string;
      dem_elevation_ft?: number;
      elevation_note?: string;
    };
    expect(sc.wells_with_lithology).toBe(2);
    // Reference ground = the wells' own median reported ground (825 ft), not
    // the DEM — the strata ASL values were derived from well ground elevations.
    expect(sc.ground_elevation_ft).toBe(825);
    expect(sc.ground_elevation_source).toBe("well_median");
    expect(sc.dem_elevation_ft).toBe(810);
    expect(sc.elevation_note).toBeUndefined();
    expect(sc.shared_aquifer_bands.length).toBe(1);
    const band = sc.shared_aquifer_bands[0]!;
    // shared band: ASL 755–730 across the 775-ft and 825-ft wells (midpoint 742.5 → 743)
    expect(band.center_asl_ft).toBe(743);
    // against the 825-ft reference: drill 825−755=70 to 825−730=95 ft below ground
    expect(band.window_start_ft).toBe(70);
    expect(band.window_end_ft).toBe(95);
  });

  it("flags a DEM vs well-ground disagreement over 25 ft", async () => {
    mockWellRows(LITHO_ROWS);
    // DEM 750 vs wells' median 825 → 75 ft disagreement → note, but windows
    // still use the wells' ground (consistent with the strata ASL values).
    vi.spyOn(elevation, "getGroundElevationFt").mockResolvedValue(750);
    const res = await groundLayersTool({ ...CENTER, radius_miles: 3 });
    const sc = res.structuredContent as {
      ground_elevation_ft?: number;
      ground_elevation_source?: string;
      dem_elevation_ft?: number;
      elevation_note?: string;
      shared_aquifer_bands: { window_start_ft: number | null }[];
    };
    expect(sc.ground_elevation_ft).toBe(825);
    expect(sc.ground_elevation_source).toBe("well_median");
    expect(sc.dem_elevation_ft).toBe(750);
    expect(sc.elevation_note).toContain("disagreement");
    expect(sc.shared_aquifer_bands[0]?.window_start_ft).toBe(70);
    expect(textOf(res)).toContain("disagreement");
  });

  it("clamps a surface-intersecting band to 0 ft instead of a negative depth", async () => {
    // Three wells whose shared gravel band tops above the median ground:
    // A ground 800 gravel 0–20 (800–780), B ground 810 gravel 0–30 (810–780),
    // C ground 800 gravel 0–25 (800–775). Shared top = 810 vs median ground
    // 800 → start −10 → clamps to 0; shared bottom = 775 → end = 25.
    const wells: WellRecord[] = [
      {
        refno: "300001",
        lat: 40.481,
        lon: -86.131,
        depth: "40",
        ground_elev: "800",
        lithology_json: JSON.stringify({
          layers: [{ from: 0, to: 20, formation: "Sand and gravel" }],
        }),
      },
      {
        refno: "300002",
        lat: 40.482,
        lon: -86.132,
        depth: "50",
        ground_elev: "810",
        lithology_json: JSON.stringify({
          layers: [{ from: 0, to: 30, formation: "Sand and gravel" }],
        }),
      },
      {
        refno: "300003",
        lat: 40.483,
        lon: -86.133,
        depth: "45",
        ground_elev: "800",
        lithology_json: JSON.stringify({
          layers: [{ from: 0, to: 25, formation: "Sand and gravel" }],
        }),
      },
    ];
    mockWellRows(wells);
    vi.spyOn(elevation, "getGroundElevationFt").mockResolvedValue(null);
    const res = await groundLayersTool({ ...CENTER, radius_miles: 3 });
    const sc = res.structuredContent as {
      shared_aquifer_bands: {
        window_start_ft: number | null;
        window_end_ft: number | null;
        advice: string;
      }[];
    };
    const band = sc.shared_aquifer_bands[0]!;
    expect(band.window_start_ft).toBe(0);
    expect(band.window_end_ft).toBe(25);
    expect(band.advice).toContain("surface");
  });

  it("returns an empty band list when no wells have lithology", async () => {
    mockWellRows();
    vi.spyOn(elevation, "getGroundElevationFt").mockResolvedValue(810);
    const res = await groundLayersTool({ ...CENTER, radius_miles: 3 });
    const sc = res.structuredContent as {
      wells_with_lithology: number;
      shared_aquifer_bands: unknown[];
    };
    expect(sc.wells_with_lithology).toBe(0);
    expect(sc.shared_aquifer_bands).toEqual([]);
  });
});

describe("siteOptimizationTool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns registry-backed snake_case optimization output", async () => {
    mockWellRows();
    const res = await siteOptimizationTool({
      ...CENTER,
      radius_miles: 5,
      priority: "balanced",
    });
    expect(res.isError).not.toBe(true);
    const sc = res.structuredContent as {
      data_source: string;
      neighborhood: {
        sample_wells_in_radius: number;
        median_depth_ft: number;
        typical_static_band_ft: string;
      };
      scores: { setup_readiness: number; data_confidence: number };
      checklist: string[];
    };
    expect(sc.data_source).toBe("registry");
    expect(sc.neighborhood.sample_wells_in_radius).toBe(ROWS.length);
    expect(sc.neighborhood.median_depth_ft).toBeGreaterThan(0);
    expect(sc.checklist.length).toBeGreaterThan(0);
  });

  it("errors (never mocks) when the registry load fails", async () => {
    const spy = vi
      .spyOn(wellCache, "getDnrWellsForRadiusCachedForApi")
      .mockRejectedValue(new Error("cold start"));
    const res = await siteOptimizationTool({ ...CENTER, radius_miles: 5 });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("temporarily unavailable");
    // withRetry: 1 initial try + 2 retries
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe("withRetry", () => {
  it("returns the first successful result after failures", async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("nope");
        return "ok";
      },
      { retries: 2, delayMs: 1 },
    );
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });

  it("rethrows after exhausting retries", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error(`fail ${calls}`);
        },
        { retries: 1, delayMs: 1 },
      ),
    ).rejects.toThrow("fail 2");
    expect(calls).toBe(2);
  });
});
