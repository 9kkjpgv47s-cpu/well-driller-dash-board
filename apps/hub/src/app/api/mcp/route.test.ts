import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetOAuthVerifierForTests } from "@/lib/mcp/oauth";
import { POST } from "./route";

const URL = "http://localhost/api/mcp";

function rpcRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

type JsonRpcMessage = {
  result?: {
    protocolVersion?: string;
    tools?: {
      name: string;
      annotations?: { readOnlyHint?: boolean };
      outputSchema?: unknown;
    }[];
    prompts?: { name: string }[];
    resources?: { uri: string }[];
  };
  error?: unknown;
};

/** Reads the JSON-RPC payload from a plain-JSON or SSE-framed response. */
async function readRpc(res: Response): Promise<JsonRpcMessage> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data:")) {
        return JSON.parse(line.slice(5).trim()) as JsonRpcMessage;
      }
    }
    throw new Error(`No SSE data frame in response: ${text}`);
  }
  return (await res.json()) as JsonRpcMessage;
}

const ENV_KEYS = [
  "DRILLER_MCP_API_KEYS",
  "MCP_OAUTH_ISSUER",
  "MCP_OAUTH_AUDIENCE",
  "HUB_PUBLIC_URL",
] as const;

describe("POST /api/mcp", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
    process.env.DRILLER_MCP_API_KEYS = "test:tk1";
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    resetOAuthVerifierForTests();
  });

  it("returns 401 without an Authorization header", async () => {
    const res = await POST(
      rpcRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.1" },
        },
      }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).not.toMatch(/\bscope=/);
  });

  it("serves initialize and tools/list for a valid bearer key", async () => {
    const auth = { Authorization: "Bearer tk1" };

    const initRes = await POST(
      rpcRequest(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "test", version: "0.0.1" },
          },
        },
        auth,
      ),
    );
    expect(initRes.status).toBe(200);
    const init = await readRpc(initRes);
    const protocolVersion = init.result?.protocolVersion ?? "2025-11-25";

    const listRes = await POST(
      rpcRequest(
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        { ...auth, "MCP-Protocol-Version": protocolVersion },
      ),
    );
    expect(listRes.status).toBe(200);
    const list = await readRpc(listRes);
    const names = (list.result?.tools ?? []).map((t) => t.name).sort();
    expect(names).toEqual([
      "area_insights",
      "dnr_well_record",
      "geocode_address",
      "ground_layers",
      "job_brief",
      "job_weather",
      "parse_dispatch",
      "site_optimization",
      "wells_nearby",
    ]);
    for (const tool of list.result?.tools ?? []) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.outputSchema).toBeTruthy();
    }
  });

  it("lists prompts and resources for a valid bearer key", async () => {
    const auth = { Authorization: "Bearer tk1" };
    const initRes = await POST(
      rpcRequest(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "test", version: "0.0.1" },
          },
        },
        auth,
      ),
    );
    const init = await readRpc(initRes);
    const pv = init.result?.protocolVersion ?? "2025-11-25";
    const headers = { ...auth, "MCP-Protocol-Version": pv };

    const promptsRes = await POST(
      rpcRequest(
        { jsonrpc: "2.0", id: 2, method: "prompts/list", params: {} },
        headers,
      ),
    );
    const prompts = (await readRpc(promptsRes)).result?.prompts ?? [];
    expect(prompts.map((p) => p.name).sort()).toEqual([
      "compare-sites",
      "prep-drilling-job",
    ]);

    const resRes = await POST(
      rpcRequest(
        { jsonrpc: "2.0", id: 3, method: "resources/list", params: {} },
        headers,
      ),
    );
    const uris = (await readRpc(resRes)).result?.resources?.map((r) => r.uri);
    expect(uris?.sort()).toEqual([
      "driller-hub://data-coverage",
      "driller-hub://glossary",
    ]);
  });

  it("challenges with an absolute resource_metadata URL in WWW-Authenticate", async () => {
    process.env.MCP_OAUTH_ISSUER = "https://issuer.test";
    const res = await POST(
      rpcRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.1" },
        },
      }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(
      /resource_metadata="https?:\/\/[^"]+\/\.well-known\/oauth-protected-resource"/,
    );
    expect(res.headers.get("www-authenticate")).not.toMatch(/\bscope=/);
  });
});
