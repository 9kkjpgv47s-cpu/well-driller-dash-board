import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { registerDrillerTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const maxDuration = 30;

const handler = createMcpHandler(registerDrillerTools, {
  serverInfo: { name: "driller-hub", version: "0.1.0" },
  instructions:
    "Indiana water-well registry tools from Driller Hub. All tools are Indiana-only. Typical flow: geocode_address → area_insights (and optionally wells_nearby) → dnr_well_record for a specific refno.",
});

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: true,
});

export { authHandler as GET, authHandler as POST };
