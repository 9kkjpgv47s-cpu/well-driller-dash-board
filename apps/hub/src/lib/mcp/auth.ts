import { timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { getEnvOAuthVerifier, type OAuthTokenVerifier } from "./oauth";

/**
 * Bearer API keys for the hosted MCP endpoint, from the
 * `DRILLER_MCP_API_KEYS` env var: comma-separated `label:key` entries
 * (`acme:dk_abc123,beta:dk_xyz`). Entries without a colon are ignored.
 * Key → label map.
 */
export function parseApiKeys(raw: string | undefined): Map<string, string> {
  const keys = new Map<string, string>();
  if (!raw) return keys;
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const label = trimmed.slice(0, colon).trim();
    const key = trimmed.slice(colon + 1).trim();
    if (!label || !key) continue;
    keys.set(key, label);
  }
  return keys;
}

/**
 * Constant-time bearer check against the configured allowlist. Iterates every
 * configured key so a non-match does not short-circuit on position. Missing
 * bearer or empty/missing env denies.
 */
export function verifyApiKey(
  bearer: string | undefined,
  raw = process.env.DRILLER_MCP_API_KEYS,
): { clientId: string } | undefined {
  if (!bearer) return undefined;
  const keys = parseApiKeys(raw);
  if (keys.size === 0) return undefined;
  const candidate = Buffer.from(bearer, "utf8");
  let clientId: string | undefined;
  for (const [key, label] of keys) {
    const kb = Buffer.from(key, "utf8");
    if (kb.length === candidate.length && timingSafeEqual(kb, candidate)) {
      clientId = label;
    }
  }
  return clientId ? { clientId } : undefined;
}

export type McpTokenVerifierDeps = {
  /** Raw `DRILLER_MCP_API_KEYS` value; defaults to the env var at call time. */
  apiKeysRaw?: string;
  /** OAuth verifier; `null` forces the OAuth path off even when env configures it. */
  oauthVerifier?: OAuthTokenVerifier | null;
};

/**
 * Builds the `withMcpAuth` verifier. API-key allowlist is tried first; when no
 * key matches, the OAuth verifier (when configured) gets the bearer. A bearer
 * that fails OAuth verification denies — there is no further fallback.
 */
export function createMcpTokenVerifier(
  deps: McpTokenVerifierDeps = {},
): (req: Request, bearerToken?: string) => Promise<AuthInfo | undefined> {
  return async (_req, bearerToken) => {
    const verified = verifyApiKey(bearerToken, deps.apiKeysRaw);
    if (verified && bearerToken !== undefined) {
      return {
        token: bearerToken,
        clientId: verified.clientId,
        scopes: ["wells:read"],
        extra: { authMethod: "api-key" },
      };
    }
    if (bearerToken === undefined) return undefined;
    const oauth =
      deps.oauthVerifier === undefined
        ? getEnvOAuthVerifier()
        : (deps.oauthVerifier ?? undefined);
    if (!oauth) return undefined;
    return oauth(bearerToken);
  };
}

/**
 * `withMcpAuth` token verifier; env is read per call so route-level env
 * changes (and tests) take effect without a reload. Never logs the token.
 */
export const verifyMcpToken = (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> =>
  createMcpTokenVerifier({ apiKeysRaw: process.env.DRILLER_MCP_API_KEYS })(
    req,
    bearerToken,
  );
