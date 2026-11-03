import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import {
  computeAreaInsights,
  type WellRecord,
} from "@/lib/area-well-analytics";
import {
  extractPhone,
  parseDispatchEmail,
  type DispatchParseResult,
} from "@/lib/dispatch-parse";
import { getDnrWellsForRadiusCachedForApi } from "@/lib/dnr-wells-server-cache";
import { getGroundElevationFt } from "@/lib/elevation";
import { geocodeIndiana } from "@/lib/geocode-server";
import {
  getWeatherBundle,
  type WeatherBundleResult,
} from "@/lib/weather/bundle";
import { sortWellsByDistance } from "@/lib/well-ordering";
import { getWellSpatialIndex } from "@/lib/well-spatial-index";
import { MAX_RADIUS_MILES } from "@/lib/wells-nearby";
import {
  errorResult,
  geoFooter,
  nearbyWellLine,
  nearbyWellOutputSchema,
  projectNearbyWell,
  REGISTRY_UNAVAILABLE,
  sharedAquiferBandOutputSchema,
} from "./common";
import {
  dispatchParseResultSchema,
  type GeocodedResult,
} from "./dispatch";
import { computeSharedAquiferBandRows } from "./ground-layers";
import {
  isInIndiana,
  outsideIndianaMessage,
  queryScopesOutOfIndiana,
} from "./indiana";
import {
  jobWeatherOutputSchema,
  summarizeWeatherBundle,
  weatherDayLine,
} from "./job-weather";
import { withDeadline, withRetry } from "./retry";

export const jobBriefInputSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(4000)
    .optional()
    .describe(
      "Street address, place name, or a pasted dispatch email — used when lat/lon are not given",
    ),
  lat: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe("Latitude in WGS84 decimal degrees"),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe("Longitude in WGS84 decimal degrees"),
  radius_miles: z
    .number()
    .min(0.1)
    .max(MAX_RADIUS_MILES)
    .default(3)
    .describe("Search radius in miles (default 3)"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Anchor date YYYY-MM-DD for the weather summary"),
});

export const jobBriefOutputSchema = z.looseObject({
  location: z.looseObject({
    lat: z.number(),
    lon: z.number(),
    label: z.string().optional(),
    source: z.enum(["coords", "dispatch", "geocode"]),
  }),
  dispatch: dispatchParseResultSchema.optional(),
  area: z.looseObject({
    wells_in_radius: z.number(),
    confidence_grade: z.string(),
    confidence_score: z.number(),
    median_depth_ft: z.number().nullable(),
    narratives: z.array(z.looseObject({ text: z.string(), scope: z.string() })),
  }),
  nearest_wells: z.array(nearbyWellOutputSchema),
  shared_aquifer: z
    .looseObject({ bands: z.array(sharedAquiferBandOutputSchema) })
    .nullable(),
  elevation_ft: z.number().optional(),
  elevation_source: z.enum(["well_median", "dem"]).optional(),
  dem_elevation_ft: z.number().optional(),
  weather: jobWeatherOutputSchema.optional(),
});

export type BriefLocation = {
  lat: number;
  lon: number;
  label?: string;
  source: "coords" | "dispatch" | "geocode";
};

/** Injectable seams so tests can drive the resolution order without network. */
export type JobBriefDeps = {
  parseDispatch: (text: string) => DispatchParseResult;
  geocode: (query: string) => Promise<GeocodedResult[]>;
  loadWells: (
    lat: number,
    lon: number,
    radiusMiles: number,
    opts: { lithology: boolean },
  ) => Promise<{ wells: WellRecord[]; source: string; tiles: number }>;
  weather: (
    lat: number,
    lon: number,
    timezone?: string | null,
    date?: string | null,
  ) => Promise<WeatherBundleResult>;
  groundElevationFt: (lat: number, lon: number) => Promise<number | null>;
  /** Overall cap (ms) on the parallel weather+elevation stage. Default 10s. */
  deadlineMs?: number;
};

/** Resolved per call so `vi.spyOn` on the source modules still intercepts. */
function withDefaults(deps: Partial<JobBriefDeps>): JobBriefDeps {
  return {
    parseDispatch: deps.parseDispatch ?? parseDispatchEmail,
    geocode: deps.geocode ?? geocodeIndiana,
    loadWells: deps.loadWells ?? getDnrWellsForRadiusCachedForApi,
    weather: deps.weather ?? getWeatherBundle,
    groundElevationFt: deps.groundElevationFt ?? getGroundElevationFt,
    deadlineMs: deps.deadlineMs,
  };
}

/** True when a dispatch parse extracted anything an agent would care about. */
function parseIsMeaningful(parsed: DispatchParseResult): boolean {
  return (
    parsed.locationSource === "coordinates" ||
    parsed.address != null ||
    parsed.phone != null ||
    parsed.scheduleLine != null ||
    parsed.contactName != null
  );
}

export type ResolvedBriefLocation = {
  location: BriefLocation;
  /** Dispatch parse worth echoing back (omitted for plain place-name queries). */
  parsed?: DispatchParseResult;
};

const LOCATE_ERROR =
  "Couldn't locate the job in Indiana — include a street address with town, a place name, or GPS coordinates (lat, lon).";

/**
 * The raw-query geocode fallback sends the query to Nominatim — only worth it
 * when the text plausibly IS a place: one short line with no phone number and
 * no email. Pasted dispatch text carries PII that must not leave the hub.
 */
function looksLikePlaceQuery(query: string): boolean {
  if (query.includes("\n") || query.length > 120) return false;
  if (extractPhone(query)) return false;
  if (/\S+@\S+/.test(query)) return false;
  if (queryScopesOutOfIndiana(query)) return false;
  return true;
}

/** First geocoder hit inside Indiana — Nominatim's Indiana bias is a hint, not a guarantee. */
function firstInIndiana(results: GeocodedResult[]): GeocodedResult | undefined {
  return results.find((r) => isInIndiana(r.lat, r.lon));
}

/**
 * Location resolution order: explicit lat/lon → dispatch-extracted GPS →
 * geocode of the parsed address → geocode of the raw query → error.
 */
export async function resolveBriefLocation(
  args: { query?: string; lat?: number; lon?: number },
  depsArg: Partial<JobBriefDeps> = {},
): Promise<ResolvedBriefLocation | { error: string }> {
  const deps = withDefaults(depsArg);
  if (args.lat != null || args.lon != null) {
    if (args.lat == null || args.lon == null) {
      return { error: "Provide both lat and lon (WGS84 degrees) together." };
    }
    // Still surface a dispatch parse when the caller pasted one alongside
    // explicit coordinates — agents use the extracted contact/schedule fields.
    const parsed = args.query?.trim() ? deps.parseDispatch(args.query) : null;
    return {
      location: { lat: args.lat, lon: args.lon, source: "coords" },
      parsed: parsed && parseIsMeaningful(parsed) ? parsed : undefined,
    };
  }

  const query = args.query?.trim();
  if (!query) {
    return {
      error:
        "Couldn't locate the job: pass lat+lon, or a query (street address, place name, or pasted dispatch text).",
    };
  }

  const parsed = deps.parseDispatch(query);
  const echoParsed = parseIsMeaningful(parsed) ? parsed : undefined;

  if (
    parsed.locationSource === "coordinates" &&
    parsed.lat != null &&
    parsed.lon != null
  ) {
    return {
      location: {
        lat: parsed.lat,
        lon: parsed.lon,
        label: parsed.address ?? parsed.title ?? undefined,
        source: "dispatch",
      },
      parsed: echoParsed,
    };
  }

  if (parsed.address && !queryScopesOutOfIndiana(parsed.address)) {
    try {
      const hit = firstInIndiana(await deps.geocode(parsed.address));
      if (hit) {
        return {
          location: {
            lat: hit.lat,
            lon: hit.lon,
            label: hit.label,
            source: "geocode",
          },
          parsed: echoParsed,
        };
      }
    } catch {
      // fall through to raw-query geocode
    }
  }

  if (looksLikePlaceQuery(query)) {
    try {
      const hit = firstInIndiana(await deps.geocode(query));
      if (hit) {
        return {
          location: {
            lat: hit.lat,
            lon: hit.lon,
            label: hit.label,
            source: "geocode",
          },
          parsed: echoParsed,
        };
      }
    } catch {
      // fall through to the locate error
    }
  }

  return { error: LOCATE_ERROR };
}

export async function jobBriefTool(
  args: {
    query?: string;
    lat?: number;
    lon?: number;
    radius_miles?: number;
    date?: string;
  },
  depsArg: Partial<JobBriefDeps> = {},
): Promise<CallToolResult> {
  const deps = withDefaults(depsArg);
  const radiusMiles = args.radius_miles ?? 3;

  const resolved = await resolveBriefLocation(args, deps);
  if ("error" in resolved) return errorResult(resolved.error);
  const { location, parsed } = resolved;
  const { lat, lon } = location;

  if (!isInIndiana(lat, lon)) {
    return errorResult(outsideIndianaMessage(lat, lon));
  }

  let wells: WellRecord[];
  try {
    const loaded = await withRetry(
      () => deps.loadWells(lat, lon, radiusMiles, { lithology: true }),
      { retries: 2, delayMs: 400 },
    );
    wells = loaded.wells;
  } catch {
    return errorResult(REGISTRY_UNAVAILABLE);
  }

  // One radius-filtered set feeds insights, nearest-wells, and stratigraphy.
  const inRadius = getWellSpatialIndex(wells).queryRadius(
    lat,
    lon,
    radiusMiles,
  );
  const report = computeAreaInsights(wells, lat, lon, radiusMiles, {
    wellsInRadius: inRadius,
  });

  const nearestWells = sortWellsByDistance(inRadius, lat, lon)
    .slice(0, 10)
    .map((w) => projectNearbyWell(w, lat, lon));

  const stageDeadlineMs = deps.deadlineMs ?? 10_000;
  const [demGroundFt, weatherResult] = await Promise.all([
    withDeadline(
      deps.groundElevationFt(lat, lon).catch(() => null),
      stageDeadlineMs,
      null,
    ),
    withDeadline(
      deps
        .weather(lat, lon, undefined, args.date)
        .catch((): WeatherBundleResult | null => null),
      stageDeadlineMs,
      null,
    ),
  ]);

  const aquifer = computeSharedAquiferBandRows(inRadius, lat, lon, demGroundFt);
  // The windows were drilled against the wells' median ground when available —
  // report that same reference, not the DEM, so the number stays consistent.
  const groundFt = aquifer.referenceGroundAslFt ?? demGroundFt;
  const elevationSource =
    aquifer.referenceGroundAslFt != null
      ? aquifer.groundSource
      : demGroundFt != null
        ? ("dem" as const)
        : null;
  const demFt = demGroundFt != null ? Math.round(demGroundFt) : null;
  const weather =
    weatherResult && weatherResult.ok
      ? summarizeWeatherBundle(weatherResult.response, 3, 0)
      : undefined;

  const structured = {
    location: {
      lat,
      lon,
      ...(location.label ? { label: location.label } : {}),
      source: location.source,
    },
    ...(parsed ? { dispatch: parsed } : {}),
    area: {
      wells_in_radius: report.totalWellsInRadius,
      confidence_grade: report.insightQuality.grade,
      confidence_score: report.insightQuality.score,
      median_depth_ft: report.depthMedianFt,
      narratives: report.narratives.slice(0, 8),
    },
    nearest_wells: nearestWells,
    shared_aquifer:
      aquifer.columnsUsed > 0
        ? {
            bands: aquifer.bands,
            ...(aquifer.referenceGroundAslFt != null
              ? { reference_ground_asl_ft: aquifer.referenceGroundAslFt }
              : {}),
            ...(aquifer.elevationNote
              ? { elevation_note: aquifer.elevationNote }
              : {}),
          }
        : null,
    ...(groundFt != null ? { elevation_ft: groundFt } : {}),
    ...(elevationSource ? { elevation_source: elevationSource } : {}),
    ...(demFt != null ? { dem_elevation_ft: demFt } : {}),
    ...(weather ? { weather } : {}),
  };

  const lines: string[] = [
    `Field brief — ${location.label ?? `${lat},${lon}`} (${location.source})`,
    `Location: ${lat},${lon} · ${radiusMiles} mi radius${
      groundFt != null
        ? ` · ground ~${groundFt} ft ASL (${
            elevationSource === "well_median"
              ? `nearby wells' median${demFt != null ? `; DEM ${demFt}` : ""}`
              : "DEM"
          })`
        : ""
    }`,
    `Expected: ${report.totalWellsInRadius} registry wells in radius · confidence ${report.insightQuality.grade} (${report.insightQuality.score})${
      report.depthMedianFt != null
        ? ` · median depth ${Math.round(report.depthMedianFt)} ft`
        : ""
    }`,
    ...report.narratives.slice(0, 4).map((n) => `- ${n.text}`),
  ];

  if (nearestWells.length) {
    lines.push("Nearest wells:");
    lines.push(...nearestWells.slice(0, 4).map(nearbyWellLine));
    if (nearestWells.length > 4) {
      lines.push(`… +${nearestWells.length - 4} more in structured output`);
    }
  } else {
    lines.push("Nearest wells: none in radius.");
  }

  if (aquifer.elevationNote) {
    lines.push(`Note: ${aquifer.elevationNote}`);
  }

  if (aquifer.bands.length) {
    lines.push("Shared aquifer bands (ASL):");
    for (const b of aquifer.bands) {
      lines.push(
        `- ~${b.center_asl_ft} ft ASL · ${b.well_count} wells${
          b.window_start_ft != null
            ? ` · drill ${b.window_start_ft}–${b.window_end_ft} ft`
            : ""
        }${b.above_site_ground ? " (near surface — verify)" : ""}`,
      );
    }
  }

  if (weather) {
    lines.push(`Weather (${weather.anchor_date}):`);
    lines.push(...weather.day_summaries.map(weatherDayLine));
  }

  if (parsed) {
    const bits: string[] = [];
    if (parsed.scheduleLine) bits.push(`schedule: ${parsed.scheduleLine}`);
    if (parsed.contactName) bits.push(`contact: ${parsed.contactName}`);
    if (parsed.phone) bits.push(parsed.phone);
    if (bits.length) lines.push(`Dispatch — ${bits.join(" · ")}`);
  }

  lines.push(geoFooter(lat, lon));

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: structured as unknown as Record<string, unknown>,
  };
}

export function registerJobBriefTool(server: McpServer): void {
  server.registerTool(
    "job_brief",
    {
      title: "Indiana job field brief",
      description:
        "Primary entry point: resolves a jobsite from lat/lon (WGS84 degrees), a street address / place name, or a pasted dispatch email, then returns a field brief — area drilling insights (wells in radius, confidence grade, median depth in feet, narrative notes), the nearest registry wells (distance in miles, depth/static water in feet below ground, pump rate in GPM), shared aquifer bands with drill windows in feet below ground, jobsite ground elevation (ft above sea level), and a short weather summary. Indiana only.",
      inputSchema: jobBriefInputSchema,
      outputSchema: jobBriefOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, lat, lon, radius_miles, date }) =>
      jobBriefTool({ query, lat, lon, radius_miles, date }),
  );
}
