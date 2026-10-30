import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  result?: { protocolVersion?: string; tools?: { name: string }[] };
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

describe("POST /api/mcp", () => {
  let prevKeys: string | undefined;

  beforeEach(() => {
    prevKeys = process.env.DRILLER_MCP_API_KEYS;
    process.env.DRILLER_MCP_API_KEYS = "test:tk1";
  });

  afterEach(() => {
    if (prevKeys === undefined) delete process.env.DRILLER_MCP_API_KEYS;
    else process.env.DRILLER_MCP_API_KEYS = prevKeys;
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
      "wells_nearby",
    ]);
  });
});
