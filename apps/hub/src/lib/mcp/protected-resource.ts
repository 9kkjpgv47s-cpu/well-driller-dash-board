import { NextResponse } from "next/server";
import { mcpResourceUrl } from "./hub-url";
import { getOAuthConfigFromEnv } from "./oauth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
} as const;

/**
 * RFC 9728 OAuth Protected Resource Metadata. Hand-written (not mcp-handler's
 * `protectedResourceHandler`) so `resource` is deterministically the canonical
 * MCP resource URL. 404 when OAuth is not configured — don't advertise an
 * authorization server that doesn't exist.
 */
export function protectedResourceResponse(): Response {
  const cfg = getOAuthConfigFromEnv();
  if (!cfg) {
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 404 },
    );
  }
  return NextResponse.json(
    {
      resource: mcpResourceUrl(),
      authorization_servers: [cfg.issuer],
      bearer_methods_supported: ["header"],
      scopes_supported: cfg.scopes,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export function protectedResourceOptionsResponse(): Response {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
