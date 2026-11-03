import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import {
  parseDispatchEmail,
  type DispatchParseResult,
} from "@/lib/dispatch-parse";
import { geocodeIndiana } from "@/lib/geocode-server";
import { geoFooter, SOURCE_LINE } from "./common";

export const parseDispatchInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(20_000)
    .describe("Raw pasted dispatch email / job text"),
});

export const dispatchParseResultSchema = z.looseObject({
  title: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  address: z.string().nullable(),
  notes: z.string(),
  locationSource: z.enum(["coordinates", "address_only", "stub", "none"]),
  warnings: z.array(z.string()),
  scheduleLine: z.string().nullable(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  pumpHp: z.string().nullable(),
  distanceOffDrive: z.string().nullable(),
});

export const parseDispatchOutputSchema = z.looseObject({
  parsed: dispatchParseResultSchema,
  geocoded: z
    .looseObject({ label: z.string(), lat: z.number(), lon: z.number() })
    .optional(),
});

export type GeocodedResult = { label: string; lat: number; lon: number };

/**
 * Resolve coordinates for a parsed dispatch when the paste itself lacked GPS.
 * `address_only`/`stub`/`none` produce placeholder coords from the parser —
 * try the Indiana geocoder on the address (or a text slice) instead.
 */
export async function geocodeForDispatch(
  parsed: DispatchParseResult,
  text: string,
): Promise<GeocodedResult | null> {
  if (parsed.locationSource === "coordinates") return null;
  const query = parsed.address ?? text.slice(0, 160);
  if (!query.trim()) return null;
  try {
    const results = await geocodeIndiana(query);
    const top = results[0];
    return top ?? null;
  } catch {
    return null;
  }
}

export function dispatchFieldLines(
  parsed: DispatchParseResult,
  geocoded?: GeocodedResult | null,
): string[] {
  const lines: string[] = [];
  const push = (label: string, v: string | number | null | undefined) => {
    if (v != null && String(v).trim() !== "") lines.push(`- ${label}: ${v}`);
  };
  push("Job", parsed.title);
  push("Contact", parsed.contactName);
  push("Phone", parsed.phone);
  push("Schedule", parsed.scheduleLine);
  push("Address", parsed.address);
  if (parsed.locationSource === "coordinates") {
    push(
      "GPS",
      `${parsed.lat}, ${parsed.lon} (from dispatch)`,
    );
  } else if (geocoded) {
    push("GPS", `${geocoded.lat}, ${geocoded.lon} (geocoded: ${geocoded.label})`);
  } else if (parsed.lat != null && parsed.lon != null) {
    push("GPS", `${parsed.lat}, ${parsed.lon} (stub — unverified)`);
  }
  push("Pump", parsed.pumpHp);
  push("Access", parsed.distanceOffDrive);
  return lines;
}

export async function parseDispatchTool(args: {
  text: string;
}): Promise<CallToolResult> {
  const parsed = parseDispatchEmail(args.text);
  const geocoded = await geocodeForDispatch(parsed, args.text);

  const lines = [
    "Dispatch parse:",
    ...dispatchFieldLines(parsed, geocoded),
    `Location source: ${parsed.locationSource}`,
    ...parsed.warnings.map((w) => `Warning: ${w}`),
  ];
  if (parsed.locationSource === "coordinates" && parsed.lat != null) {
    lines.push(geoFooter(parsed.lat, parsed.lon!));
  } else if (geocoded) {
    lines.push(geoFooter(geocoded.lat, geocoded.lon));
  } else {
    lines.push(SOURCE_LINE);
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: {
      parsed,
      ...(geocoded ? { geocoded } : {}),
    } as Record<string, unknown>,
  };
}

export function registerParseDispatchTool(server: McpServer): void {
  server.registerTool(
    "parse_dispatch",
    {
      title: "Parse a dispatch email",
      description:
        "Extract structured job fields from a pasted Indiana dispatch email: GPS lat/lon (WGS84 degrees), street address, contact name, phone, schedule line, pump horsepower, and distance off drive (feet). When the paste only has an address (or no usable location), the address is forward-geocoded and returned under `geocoded`. Indiana only.",
      inputSchema: parseDispatchInputSchema,
      outputSchema: parseDispatchOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ text }) => parseDispatchTool({ text }),
  );
}

