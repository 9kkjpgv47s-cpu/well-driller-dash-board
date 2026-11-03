import { createHash } from "node:crypto";

/**
 * In-memory fixed-window rate limiter for the MCP endpoint. Keyed by a
 * truncated bearer-token hash (never the raw key), or `anon:` + first
 * x-forwarded-for hop when the request is unauthenticated.
 */
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitKey(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = /^bearer\s+(.+)$/i.exec(auth.trim())?.[1]?.trim();
  if (bearer) {
    return `key:${createHash("sha256").update(bearer).digest("hex").slice(0, 16)}`;
  }
  const hop = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `anon:${hop || "local"}`;
}

export function rateLimitPerMinute(): number {
  const raw = Number(process.env.MCP_RATE_LIMIT_PER_MIN);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 120;
}

export function checkRateLimit(
  key: string,
  limit = rateLimitPerMinute(),
  now = Date.now(),
): { allowed: boolean; retryAfterS: number } {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    return { allowed: true, retryAfterS: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return {
      allowed: false,
      retryAfterS: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterS: 0 };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
