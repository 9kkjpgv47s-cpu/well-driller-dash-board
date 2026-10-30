import { describe, expect, it } from "vitest";
import type { AuthInfo } from "@modelcontextprotocol/server";
import {
  createMcpTokenVerifier,
  parseApiKeys,
  verifyApiKey,
} from "./auth";

const RAW = "acme:k1, beta:k2 ,bad";

describe("parseApiKeys", () => {
  it("parses label:key entries, trimming whitespace and skipping colon-less entries", () => {
    const keys = parseApiKeys(RAW);
    expect(keys.size).toBe(2);
    expect(keys.get("k1")).toBe("acme");
    expect(keys.get("k2")).toBe("beta");
  });

  it("returns an empty map for undefined or empty env", () => {
    expect(parseApiKeys(undefined).size).toBe(0);
    expect(parseApiKeys("").size).toBe(0);
  });
});

describe("verifyApiKey", () => {
  it("returns the client label for a configured key", () => {
    expect(verifyApiKey("k1", RAW)).toEqual({ clientId: "acme" });
    expect(verifyApiKey("k2", RAW)).toEqual({ clientId: "beta" });
  });

  it("denies a wrong key", () => {
    expect(verifyApiKey("nope", RAW)).toBeUndefined();
  });

  it("denies everything when env is undefined or empty", () => {
    expect(verifyApiKey("k1", undefined)).toBeUndefined();
    expect(verifyApiKey("k1", "")).toBeUndefined();
  });

  it("denies an undefined bearer", () => {
    expect(verifyApiKey(undefined, RAW)).toBeUndefined();
  });
});

describe("createMcpTokenVerifier", () => {
  const req = new Request("http://localhost/api/mcp");

  const oauthStub = async (token: string): Promise<AuthInfo | undefined> =>
    token === "valid-jwt"
      ? {
          token,
          clientId: "user_123",
          scopes: ["wells:read"],
          extra: { authMethod: "oauth" },
        }
      : undefined;

  it("authenticates an allowlisted API key first", async () => {
    const verify = createMcpTokenVerifier({
      apiKeysRaw: "acme:k1",
      oauthVerifier: oauthStub,
    });
    const auth = await verify(req, "k1");
    expect(auth?.clientId).toBe("acme");
    expect(auth?.extra?.authMethod).toBe("api-key");
    expect(auth?.scopes).toEqual(["wells:read"]);
  });

  it("falls through to OAuth for a non-key bearer", async () => {
    const verify = createMcpTokenVerifier({
      apiKeysRaw: "acme:k1",
      oauthVerifier: oauthStub,
    });
    const auth = await verify(req, "valid-jwt");
    expect(auth?.clientId).toBe("user_123");
    expect(auth?.extra?.authMethod).toBe("oauth");
  });

  it("denies a bearer that fails OAuth verification", async () => {
    const verify = createMcpTokenVerifier({
      apiKeysRaw: "acme:k1",
      oauthVerifier: oauthStub,
    });
    expect(await verify(req, "bad-jwt")).toBeUndefined();
  });

  it("denies a non-key bearer when OAuth is disabled", async () => {
    const verify = createMcpTokenVerifier({
      apiKeysRaw: "acme:k1",
      oauthVerifier: null,
    });
    expect(await verify(req, "valid-jwt")).toBeUndefined();
    expect(await verify(req, undefined)).toBeUndefined();
  });
});
