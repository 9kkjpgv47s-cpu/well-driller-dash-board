import { afterEach, describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

const KEYS = [
  "MCP_OAUTH_ISSUER",
  "MCP_OAUTH_AUDIENCE",
  "MCP_OAUTH_SCOPES",
  "HUB_PUBLIC_URL",
] as const;

describe("GET /.well-known/oauth-protected-resource/api/mcp", () => {
  let saved: Record<string, string | undefined>;

  function stash() {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
  }

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("404s when OAuth is not configured", async () => {
    stash();
    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "OAuth not configured" });
  });

  it("serves the same protected-resource metadata when configured", async () => {
    stash();
    process.env.MCP_OAUTH_ISSUER = "https://issuer.test/";
    process.env.HUB_PUBLIC_URL = "https://hub.test";
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resource).toBe("https://hub.test/api/mcp");
    expect(body.authorization_servers).toEqual(["https://issuer.test"]);
  });
});

describe("OPTIONS /.well-known/oauth-protected-resource/api/mcp", () => {
  it("204s with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
