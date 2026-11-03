import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitPerMinute,
} from "./rate-limit";

describe("rateLimitKey", () => {
  it("hashes the bearer token (never stores it raw)", () => {
    const key = rateLimitKey(
      new Request("http://x/api/mcp", {
        headers: { Authorization: "Bearer dk_secret_key_123" },
      }),
    );
    expect(key.startsWith("key:")).toBe(true);
    expect(key.length).toBe(20); // "key:" + 16 hex chars
    expect(key).not.toContain("dk_secret_key_123");
  });

  it("uses the first x-forwarded-for hop when unauthenticated", () => {
    const key = rateLimitKey(
      new Request("http://x/api/mcp", {
        headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
      }),
    );
    expect(key).toBe("anon:1.2.3.4");
  });

  it("falls back to a shared anon bucket", () => {
    expect(rateLimitKey(new Request("http://x/api/mcp"))).toBe("anon:local");
  });
});

describe("checkRateLimit", () => {
  it("allows up to the limit within a window", () => {
    const key = "test:allow";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 100_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 5, 100_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterS).toBeGreaterThanOrEqual(1);
  });

  it("resets after the window elapses", () => {
    const key = "test:reset";
    expect(checkRateLimit(key, 1, 0).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 30_000).allowed).toBe(false);
    // 61s later — new fixed window
    expect(checkRateLimit(key, 1, 61_000).allowed).toBe(true);
  });

  it("reports seconds remaining in the window", () => {
    const key = "test:retry";
    checkRateLimit(key, 1, 0);
    const r = checkRateLimit(key, 1, 45_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterS).toBe(15);
  });
});

describe("rateLimitPerMinute", () => {
  it("defaults to 120 and honors the env override", () => {
    const saved = process.env.MCP_RATE_LIMIT_PER_MIN;
    try {
      delete process.env.MCP_RATE_LIMIT_PER_MIN;
      expect(rateLimitPerMinute()).toBe(120);
      process.env.MCP_RATE_LIMIT_PER_MIN = "7";
      expect(rateLimitPerMinute()).toBe(7);
      process.env.MCP_RATE_LIMIT_PER_MIN = "bogus";
      expect(rateLimitPerMinute()).toBe(120);
    } finally {
      if (saved === undefined) delete process.env.MCP_RATE_LIMIT_PER_MIN;
      else process.env.MCP_RATE_LIMIT_PER_MIN = saved;
    }
  });
});
