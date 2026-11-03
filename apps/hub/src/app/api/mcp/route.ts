import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { checkRateLimit, rateLimitKey } from "@/lib/mcp/rate-limit";
import { registerDrillerTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const maxDuration = 30;

const handler = createMcpHandler(registerDrillerTools, {
  serverInfo: { name: "driller-hub", version: "0.2.0" },
  instructions:
    "Indiana water-well registry tools from Driller Hub. All tools are Indiana-only. Start with job_brief — it resolves an address, place name, or pasted dispatch text into a field brief (area insights, nearest wells, shared-aquifer drill windows, weather). Deeper dives: area_insights, wells_nearby, ground_layers, site_optimization, job_weather, parse_dispatch, and dnr_well_record for a specific refno. The driller-hub://glossary and driller-hub://data-coverage resources explain fields and coverage.",
});

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: true,
});

/** Fixed-window per-key rate limit in front of auth. */
const limited = async (req: Request): Promise<Response> => {
  const { allowed, retryAfterS } = checkRateLimit(rateLimitKey(req));
  if (!allowed) {
    return Response.json(
      { error: "rate_limited", retry_after_s: retryAfterS },
      { status: 429, headers: { "Retry-After": String(retryAfterS) } },
    );
  }
  return authHandler(req);
};

export { limited as GET, limited as POST };
