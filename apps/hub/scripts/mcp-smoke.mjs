#!/usr/bin/env node
/**
 * Smoke test for the hosted MCP endpoint (`/api/mcp`).
 *
 *   DRILLER_MCP_API_KEY=<key> node scripts/mcp-smoke.mjs <url>
 *   e.g. DRILLER_MCP_API_KEY=sk_local_test npm run mcp:smoke -- http://localhost:3000/api/mcp
 *
 * Connects over Streamable HTTP with a bearer key, lists tools, then calls
 * area_insights and wells_nearby at Kokomo, printing the text content.
 */
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const url = process.argv[2];
if (!url) {
  console.error("usage: node scripts/mcp-smoke.mjs <mcp-url>");
  process.exit(2);
}
const apiKey = process.env.DRILLER_MCP_API_KEY;
if (!apiKey) {
  console.error("DRILLER_MCP_API_KEY env var is required");
  process.exit(2);
}

const client = new Client({ name: "driller-hub-smoke", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
});

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content ?? [])
    .map((c) => (c.type === "text" ? c.text : ""))
    .filter(Boolean)
    .join("\n");
  console.log(`\n=== ${name} ${JSON.stringify(args)} ===`);
  console.log(text || "(no text content)");
}

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(`connected to ${url}`);
  console.log(`tools: ${tools.map((t) => t.name).join(", ")}`);

  await call("area_insights", {
    lat: 40.4865,
    lon: -86.1336,
    radius_miles: 3,
  });
  await call("wells_nearby", {
    lat: 40.4865,
    lon: -86.1336,
    radius_miles: 1,
    limit: 5,
  });
} finally {
  await client.close().catch(() => {});
}
