import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";

const GLOSSARY_MD = `# Driller Hub glossary

- **refno / well_id** — Indiana DNR water well reference number and the hub's
  internal well identifier. Pass a refno to \`dnr_well_record\` for the
  official driller's report.
- **static water** — static (rest) water level in the completed well, in feet
  below ground surface. Deeper static usually means a taller pump lift.
- **depth** — completed well depth in feet below ground surface.
- **GPM / pump rate** — reported pumping rate in gallons per minute.
- **lithology** — the driller's log of formations passed through (top/bottom
  depth + material), e.g. "clay 0–18, sand & gravel 18–42, limestone 42–90".
- **unconsolidated aquifer** — water-bearing sand/gravel in glacial drift;
  shallower, faster to drill, screened completion.
- **bedrock aquifer** — water-bearing limestone/dolomite/sandstone below the
  drift; deeper drilling, open-hole completion.
- **ASL** — elevation in feet above sea level. Well logs recorded as depth
  below ground are plotted in ASL so neighboring wells on different ground
  elevations line up; the shared-aquifer bands and drill windows are built
  from ASL columns.
- **shared aquifer band** — an ASL interval where ≥2 nearby wells logged a
  water-bearing sand/gravel layer at the same elevation; the drill window
  converts that band to feet below ground at the jobsite elevation.
`;

const DATA_COVERAGE_MD = `# Driller Hub data coverage

- **Registry:** Indiana DNR water well registry (~415k records) only. Every
  tool is Indiana-only; coordinates outside the state bounding box are
  rejected. There is no well data for other states.
- **Units:** depths, static water, drill windows and layer tops/bottoms are
  feet below ground surface unless a field says \`_asl_ft\` (feet above sea
  level). Pump rates are GPM. Distances are miles. Lat/lon are WGS84 degrees.
  Elevations are feet above sea level.
- **Not a guarantee:** registry records describe what past drillers reported
  nearby, not what a new hole will find. Confidence grades reflect how much
  signal (lithology, GPM, aquifer labels) the nearby records actually carry.
- **Cold starts:** the registry loads from gzipped chunks on first request;
  a brand-new instance may take a few seconds and briefly return
  "temporarily unavailable" — retrying usually lands on the warmed cache.
- **External lookups:** geocoding is Nominatim (Indiana-biased), ground
  elevation is SRTM90m DEM with an Open-Elevation fallback, weather blends
  Open-Meteo GFS/ECMWF with NWS hourly — all best-effort and cached.
`;

/**
 * Registers the server's agent-facing prompts and static resources.
 * Called alongside registerDrillerTools on the same McpServer.
 */
export function registerDrillerContent(server: McpServer): void {
  server.registerPrompt(
    "prep-drilling-job",
    {
      title: "Prep a drilling job",
      description:
        "Pull a Driller Hub field brief for a site and format a field-prep summary for the crew.",
      argsSchema: z.object({
        site: z
          .string()
          .describe(
            "Indiana street address, place name, or a pasted dispatch email",
          ),
      }),
    },
    ({ site }) => ({
      description: "Field-prep summary from a Driller Hub job_brief",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call the job_brief tool for this Indiana jobsite: ${site}\n\nFrom the result, format a short field-prep summary for the drilling crew: (1) site location and how it was resolved, (2) expected conditions — wells in radius, confidence grade, median depth, key narratives, (3) nearest registry wells worth pulling records for via dnr_well_record, (4) shared aquifer bands and the recommended drill window in feet below ground, (5) weather around the job date, and (6) the map deep link. Flag anything that looks sparse or low-confidence.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "compare-sites",
    {
      title: "Compare two drilling sites",
      description:
        "Run Driller Hub job_brief on two sites and compare expected drilling conditions.",
      argsSchema: z.object({
        site_a: z
          .string()
          .describe("First site: address, place name, or dispatch text"),
        site_b: z
          .string()
          .describe("Second site: address, place name, or dispatch text"),
      }),
    },
    ({ site_a, site_b }) => ({
      description: "Side-by-side comparison of two job_brief results",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call the job_brief tool twice — once for site A: ${site_a} and once for site B: ${site_b}.\n\nThen compare them for a driller choosing between the two jobs: wells in radius and confidence grade, median depth and expected static water, aquifer type and shared-band drill windows, nearest-well evidence, and weather. End with a plain recommendation on which site looks easier to drill and why, calling out where registry confidence is too low to judge.`,
          },
        },
      ],
    }),
  );

  server.registerResource(
    "glossary",
    "driller-hub://glossary",
    {
      title: "Driller Hub glossary",
      description:
        "Terms used in Driller Hub MCP tool responses (refno, static water, GPM, lithology, aquifer types, ASL).",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "text/markdown", text: GLOSSARY_MD },
      ],
    }),
  );

  server.registerResource(
    "data-coverage",
    "driller-hub://data-coverage",
    {
      title: "Driller Hub data coverage",
      description:
        "What the Driller Hub MCP server covers: Indiana DNR registry only, units, and its caveats.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "text/markdown", text: DATA_COVERAGE_MD },
      ],
    }),
  );
}
