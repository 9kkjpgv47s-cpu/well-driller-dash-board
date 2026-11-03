import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import {
  capDaySummariesAroundAnchor,
  getWeatherBundle,
} from "@/lib/weather/bundle";
import type { DayWeatherSummary } from "@/lib/weather/types";
import {
  daySummaryOutputSchema,
  errorResult,
  SOURCE_LINE,
} from "./common";
import { isInIndiana, outsideIndianaMessage } from "./indiana";

export const jobWeatherInputSchema = z.object({
  lat: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude in WGS84 decimal degrees"),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude in WGS84 decimal degrees"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "Anchor date YYYY-MM-DD (defaults to today, America/Indiana/Indianapolis)",
    ),
});

export const jobWeatherOutputSchema = z.looseObject({
  timezone: z.string(),
  anchor_date: z.string(),
  sources: z.array(z.string()),
  day_summaries: z.array(daySummaryOutputSchema),
  explanations: z.array(z.string()),
});

/** Days kept around the anchor for the MCP response (~2 back, rest forward). */
const JOB_WEATHER_MAX_DAYS = 16;

export function weatherDayLine(d: DayWeatherSummary): string {
  const parts = [d.date];
  if (d.dominantCondition) parts.push(d.dominantCondition);
  if (d.minTempF != null && d.maxTempF != null) {
    parts.push(`${Math.round(d.minTempF)}–${Math.round(d.maxTempF)}°F`);
  }
  if (d.maxPrecipPop != null) parts.push(`POP ${Math.round(d.maxPrecipPop)}%`);
  if (d.totalPrecipInches != null) {
    parts.push(`${d.totalPrecipInches.toFixed(2)}in`);
  }
  if (d.maxWindMph != null) parts.push(`wind ${Math.round(d.maxWindMph)} mph`);
  if (d.thunderstormHours > 0) parts.push(`thunder ${d.thunderstormHours}h`);
  return `- ${parts.join(" · ")}`;
}

export type JobWeatherSummary = {
  timezone: string;
  anchor_date: string;
  sources: string[];
  day_summaries: DayWeatherSummary[];
  explanations: string[];
};

/** Bundle → the trimmed structured content shared by job_weather / job_brief. */
export function summarizeWeatherBundle(
  response: {
    timezone: string;
    anchorDate: string;
    sources: { label: string }[];
    daySummaries: DayWeatherSummary[];
    explanations: string[];
  },
  maxDays = JOB_WEATHER_MAX_DAYS,
  beforeDays = 2,
): JobWeatherSummary {
  return {
    timezone: response.timezone,
    anchor_date: response.anchorDate,
    sources: response.sources.map((s) => s.label),
    day_summaries: capDaySummariesAroundAnchor(
      response.daySummaries,
      response.anchorDate,
      maxDays,
      beforeDays,
    ),
    explanations: response.explanations,
  };
}

export async function jobWeatherTool(args: {
  lat: number;
  lon: number;
  date?: string;
}): Promise<CallToolResult> {
  const { lat, lon } = args;
  if (!isInIndiana(lat, lon)) {
    return errorResult(outsideIndianaMessage(lat, lon));
  }

  const bundle = await getWeatherBundle(lat, lon, undefined, args.date);
  if (!bundle.ok) {
    return errorResult(
      `Weather sources unavailable for ${lat},${lon}: ${bundle.error}.`,
    );
  }

  const summary = summarizeWeatherBundle(bundle.response);
  const lines = [
    `Weather near ${lat},${lon} — anchor ${summary.anchor_date} (${summary.timezone})`,
    `Sources: ${summary.sources.join(" + ")}`,
    ...summary.day_summaries.map(weatherDayLine),
    ...summary.explanations.map((e) => `Note: ${e}`),
    SOURCE_LINE,
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: summary as unknown as Record<string, unknown>,
  };
}

export function registerJobWeatherTool(server: McpServer): void {
  server.registerTool(
    "job_weather",
    {
      title: "Indiana jobsite weather",
      description:
        "Day-by-day weather outlook for an Indiana drilling site: Open-Meteo GFS + ECMWF blended with NWS hourly, summarized per calendar day around the anchor date (defaults to today). Returns high/low °F, precip probability %, precipitation inches, wind mph, thunderstorm hours, plus model-spread notes. Indiana only.",
      inputSchema: jobWeatherInputSchema,
      outputSchema: jobWeatherOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ lat, lon, date }) => jobWeatherTool({ lat, lon, date }),
  );
}
