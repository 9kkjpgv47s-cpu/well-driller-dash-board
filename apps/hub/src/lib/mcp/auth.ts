import { timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";

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

/** `withMcpAuth` token verifier. Never logs the token. */
export const verifyMcpToken = (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  const verified = verifyApiKey(bearerToken);
  if (!verified || bearerToken === undefined) return Promise.resolve(undefined);
  return Promise.resolve({
    token: bearerToken,
    clientId: verified.clientId,
    scopes: ["wells:read"],
  });
};
