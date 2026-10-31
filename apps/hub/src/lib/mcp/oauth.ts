import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { mcpResourceUrl } from "./hub-url";

export type OAuthTokenVerifier = (
  token: string,
) => Promise<AuthInfo | undefined>;

/**
 * Dependencies for {@link createOAuthVerifier} — `jwks` takes jose's key-getter
 * type so tests can inject `createLocalJWKSet` and prod uses a remote set.
 */
export type OAuthVerifierConfig = {
  issuer: string;
  audience: string;
  jwks: JWTVerifyGetKey;
};

/**
 * JWT verifier for the hub's resource-server role. Every failure mode —
 * bad signature, wrong iss/aud, expired, malformed, JWKS fetch errors —
 * returns `undefined`; never throws, never logs the token.
 */
export function createOAuthVerifier(
  cfg: OAuthVerifierConfig,
): OAuthTokenVerifier {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, cfg.jwks, {
        issuer: cfg.issuer,
        audience: cfg.audience,
      });
      return {
        token,
        clientId: String(payload.sub ?? "unknown"),
        // The IdP doesn't know our scope names — audience-valid tokens get
        // the read scope so `requiredScopes` in withMcpAuth stays meaningful.
        scopes: ["wells:read"],
        expiresAt: payload.exp,
        extra: {
          authMethod: "oauth",
          ...(typeof payload.email === "string"
            ? { email: payload.email }
            : {}),
        },
      };
    } catch {
      return undefined;
    }
  };
}

export type OAuthEnvConfig = {
  issuer: string;
  audience: string;
  jwksUrl?: string;
  scopes: string[];
};

/**
 * Scopes advertised in PRM `scopes_supported` (and therefore requested by
 * clients like ChatGPT). WorkOS grants dynamically-registered clients only
 * `openid profile email offline_access` — advertising anything else fails at
 * the authorize endpoint with `invalid_scope`. `offline_access` is what makes
 * the IdP issue a refresh token.
 */
export const DEFAULT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
];

/** Comma- and/or whitespace-separated, trimmed, de-duped, order preserved. */
function parseScopes(raw: string | undefined): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(/[\s,]+/)) {
    const scope = part.trim();
    if (scope) seen.add(scope);
  }
  return [...seen];
}

/** `undefined` when `MCP_OAUTH_ISSUER` is unset — OAuth path disabled. */
export function getOAuthConfigFromEnv(): OAuthEnvConfig | undefined {
  const issuer = process.env.MCP_OAUTH_ISSUER?.replace(/\/$/, "");
  if (!issuer) return undefined;
  const scopes = parseScopes(process.env.MCP_OAUTH_SCOPES);
  return {
    issuer,
    audience: process.env.MCP_OAUTH_AUDIENCE || mcpResourceUrl(),
    jwksUrl: process.env.MCP_OAUTH_JWKS_URL || undefined,
    scopes: scopes.length ? scopes : [...DEFAULT_OAUTH_SCOPES],
  };
}

/**
 * Resolves the JWKS endpoint: explicit `MCP_OAUTH_JWKS_URL` wins, else RFC 8414
 * discovery (`/.well-known/oauth-authorization-server`), falling back to OIDC
 * discovery (`/.well-known/openid-configuration`). A 404 or a 2xx doc without
 * `jwks_uri` (optional per RFC 8414) advances to the next well-known; network
 * errors and non-404 non-2xx statuses abort with `undefined` (retried next
 * token). WorkOS AuthKit's documented AS metadata does not list `jwks_uri`, so
 * as a last resort `*.authkit.app` issuers use their conventional `/oauth2/jwks`.
 */
export async function discoverJwks(
  cfg: OAuthEnvConfig,
): Promise<JWTVerifyGetKey | undefined> {
  if (cfg.jwksUrl) return createRemoteJWKSet(new URL(cfg.jwksUrl));
  for (const wellKnown of [
    "oauth-authorization-server",
    "openid-configuration",
  ]) {
    try {
      const res = await fetch(`${cfg.issuer}/.well-known/${wellKnown}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 404) continue;
      if (!res.ok) return undefined;
      const meta = (await res.json()) as { jwks_uri?: string };
      if (meta.jwks_uri) return createRemoteJWKSet(new URL(meta.jwks_uri));
      // 2xx without jwks_uri → try the next well-known.
    } catch {
      return undefined;
    }
  }
  try {
    if (new URL(cfg.issuer).hostname.endsWith(".authkit.app")) {
      return createRemoteJWKSet(new URL(`${cfg.issuer}/oauth2/jwks`));
    }
  } catch {
    // Malformed issuer URL — treat as non-AuthKit.
  }
  return undefined;
}

function createEnvVerifier(cfg: OAuthEnvConfig): OAuthTokenVerifier {
  let jwks: JWTVerifyGetKey | undefined;
  let pending: Promise<JWTVerifyGetKey | undefined> | undefined;
  const getJwks = async () => {
    if (jwks) return jwks;
    // Cache the resolved key set per process; failed discovery is retried on
    // the next call so a transient network blip doesn't disable OAuth.
    pending ??= discoverJwks(cfg);
    const resolved = await pending;
    pending = undefined;
    if (resolved) jwks = resolved;
    return jwks;
  };
  const verify = createOAuthVerifier({
    issuer: cfg.issuer,
    audience: cfg.audience,
    jwks: async (protectedHeader, token) => {
      const key = await getJwks();
      if (!key) throw new Error("JWKS unavailable");
      return key(protectedHeader, token);
    },
  });
  return verify;
}

let envVerifierCache: { key: string; verifier: OAuthTokenVerifier } | undefined;

/** Lazy env-driven verifier; `undefined` keeps the OAuth path fully off. */
export function getEnvOAuthVerifier(): OAuthTokenVerifier | undefined {
  const cfg = getOAuthConfigFromEnv();
  if (!cfg) return undefined;
  const key = `${cfg.issuer}|${cfg.audience}|${cfg.jwksUrl ?? ""}`;
  if (!envVerifierCache || envVerifierCache.key !== key) {
    envVerifierCache = { key, verifier: createEnvVerifier(cfg) };
  }
  return envVerifierCache.verifier;
}

export function resetOAuthVerifierForTests(): void {
  envVerifierCache = undefined;
}
