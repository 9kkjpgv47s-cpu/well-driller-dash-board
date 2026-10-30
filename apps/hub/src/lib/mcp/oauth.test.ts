import {
  createLocalJWKSet,
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWK,
  SignJWT,
} from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createOAuthVerifier,
  discoverJwks,
  getEnvOAuthVerifier,
  getOAuthConfigFromEnv,
  resetOAuthVerifierForTests,
  type OAuthTokenVerifier,
} from "./oauth";

const ISS = "https://issuer.test";
const AUD = "https://hub.test/api/mcp";

let privateKey: CryptoKey;
let publicJwk: JWK;
let verify: OAuthTokenVerifier;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  jwk.use = "sig";
  publicJwk = jwk;
  verify = createOAuthVerifier({
    issuer: ISS,
    audience: AUD,
    jwks: createLocalJWKSet({ keys: [jwk] }),
  });
});

async function sign(
  overrides: {
    iss?: string;
    aud?: string;
    expSecondsFromNow?: number;
  } = {},
): Promise<string> {
  return new SignJWT({ email: "driller@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("user_123")
    .setIssuer(overrides.iss ?? ISS)
    .setAudience(overrides.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(
      Math.floor(Date.now() / 1000) + (overrides.expSecondsFromNow ?? 3600),
    )
    .sign(privateKey);
}

describe("createOAuthVerifier", () => {
  it("accepts a valid JWT and maps sub/scopes/extra", async () => {
    const auth = await verify(await sign());
    expect(auth?.clientId).toBe("user_123");
    expect(auth?.scopes).toEqual(["wells:read"]);
    expect(auth?.extra?.authMethod).toBe("oauth");
    expect(auth?.extra?.email).toBe("driller@example.com");
    expect(typeof auth?.expiresAt).toBe("number");
  });

  it("rejects a wrong audience", async () => {
    expect(await verify(await sign({ aud: "https://other.example" }))).toBeUndefined();
  });

  it("rejects a wrong issuer", async () => {
    expect(await verify(await sign({ iss: "https://evil.test" }))).toBeUndefined();
  });

  it("rejects an expired token", async () => {
    expect(await verify(await sign({ expSecondsFromNow: -60 }))).toBeUndefined();
  });

  it("rejects a tampered signature", async () => {
    const jwt = await sign();
    const [h, p, s] = jwt.split(".");
    const flipped =
      s[0] === "a" ? `b${s.slice(1)}` : `a${s.slice(1)}`;
    expect(await verify(`${h}.${p}.${flipped}`)).toBeUndefined();
  });

  it("rejects a garbage string without throwing", async () => {
    await expect(verify("not.a.jwt")).resolves.toBeUndefined();
    await expect(verify("")).resolves.toBeUndefined();
  });
});

describe("getOAuthConfigFromEnv", () => {
  const KEYS = [
    "MCP_OAUTH_ISSUER",
    "MCP_OAUTH_AUDIENCE",
    "MCP_OAUTH_JWKS_URL",
    "HUB_PUBLIC_URL",
  ] as const;
  let saved: Record<string, string | undefined>;

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    resetOAuthVerifierForTests();
  });

  function stash() {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
  }

  it("is undefined when MCP_OAUTH_ISSUER is unset", () => {
    stash();
    expect(getOAuthConfigFromEnv()).toBeUndefined();
  });

  it("strips a trailing slash and defaults audience to the MCP resource URL", () => {
    stash();
    process.env.MCP_OAUTH_ISSUER = "https://issuer.test/";
    process.env.HUB_PUBLIC_URL = "https://hub.test";
    expect(getOAuthConfigFromEnv()).toEqual({
      issuer: "https://issuer.test",
      audience: "https://hub.test/api/mcp",
      jwksUrl: undefined,
    });
  });

  it("honors MCP_OAUTH_AUDIENCE and MCP_OAUTH_JWKS_URL overrides", () => {
    stash();
    process.env.MCP_OAUTH_ISSUER = "https://issuer.test";
    process.env.MCP_OAUTH_AUDIENCE = "custom-aud";
    process.env.MCP_OAUTH_JWKS_URL = "https://issuer.test/jwks.json";
    expect(getOAuthConfigFromEnv()).toEqual({
      issuer: "https://issuer.test",
      audience: "custom-aud",
      jwksUrl: "https://issuer.test/jwks.json",
    });
  });
});

const ENV_KEYS = [
  "MCP_OAUTH_ISSUER",
  "MCP_OAUTH_AUDIENCE",
  "MCP_OAUTH_JWKS_URL",
  "HUB_PUBLIC_URL",
] as const;

function stashEnv(): Record<string, string | undefined> {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

const res200 = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const resWith = (status: number): Response =>
  ({ ok: false, status, json: async () => ({}) }) as Response;

const CFG = {
  issuer: ISS,
  audience: AUD,
};

describe("discoverJwks", () => {
  let saved: Record<string, string | undefined>;

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv(saved);
    resetOAuthVerifierForTests();
  });

  it("returns a key set after one fetch when the AS doc has jwks_uri", async () => {
    saved = stashEnv();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(res200({ jwks_uri: `${ISS}/jwks` }));
    const jwks = await discoverJwks(CFG);
    expect(jwks).toBeDefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain(
      "oauth-authorization-server",
    );
  });

  it("falls through to OIDC when the AS doc omits jwks_uri", async () => {
    saved = stashEnv();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(res200({ issuer: ISS }))
      .mockResolvedValueOnce(res200({ jwks_uri: `${ISS}/oidc-jwks` }));
    const jwks = await discoverJwks(CFG);
    expect(jwks).toBeDefined();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[0][0])).toContain(
      "oauth-authorization-server",
    );
    expect(String(spy.mock.calls[1][0])).toContain("openid-configuration");
  });

  it("uses the AuthKit fallback for *.authkit.app issuers when both docs 404", async () => {
    saved = stashEnv();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(resWith(404));
    const jwks = await discoverJwks({
      issuer: "https://tenant.authkit.app",
      audience: AUD,
    });
    expect(jwks).toBeDefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("returns undefined for non-AuthKit issuers when both docs 404", async () => {
    saved = stashEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(resWith(404));
    expect(await discoverJwks(CFG)).toBeUndefined();
  });

  it("aborts on a non-404 failure without trying OIDC", async () => {
    saved = stashEnv();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(resWith(500));
    expect(await discoverJwks(CFG)).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("short-circuits on an explicit jwksUrl with zero fetches", async () => {
    saved = stashEnv();
    const spy = vi.spyOn(globalThis, "fetch");
    const jwks = await discoverJwks({ ...CFG, jwksUrl: `${ISS}/jwks` });
    expect(jwks).toBeDefined();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("getEnvOAuthVerifier", () => {
  let saved: Record<string, string | undefined>;

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv(saved);
    resetOAuthVerifierForTests();
  });

  it("verifies a real JWT end to end via discovery + remote JWKS", async () => {
    saved = stashEnv();
    process.env.MCP_OAUTH_ISSUER = ISS;
    process.env.HUB_PUBLIC_URL = "https://hub.test";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("oauth-authorization-server")) return resWith(404);
      if (url.includes("openid-configuration")) {
        return res200({ jwks_uri: `${ISS}/jwks` });
      }
      if (url === `${ISS}/jwks`) return res200({ keys: [publicJwk] });
      throw new Error(`unexpected fetch ${url}`);
    });

    const verifier = getEnvOAuthVerifier();
    expect(verifier).toBeDefined();
    const auth = await verifier!(await sign());
    expect(auth?.clientId).toBe("user_123");
  });
});
