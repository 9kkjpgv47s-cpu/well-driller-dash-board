import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISPATCH_SESSION_KEY,
  DISPATCH_SESSION_TTL_MS,
  clearDispatchSession,
  loadDispatchSession,
  parseDispatchSessionCache,
  saveDispatchSession,
} from "./dispatch-session-cache";

describe("parseDispatchSessionCache", () => {
  it("returns null for empty / invalid", () => {
    expect(parseDispatchSessionCache(null)).toBeNull();
    expect(parseDispatchSessionCache("")).toBeNull();
    expect(parseDispatchSessionCache("{")).toBeNull();
    expect(parseDispatchSessionCache(JSON.stringify({ v: 2, raw: "x" }))).toBeNull();
    expect(
      parseDispatchSessionCache(
        JSON.stringify({ v: 1, raw: "   ", savedAt: Date.now() }),
      ),
    ).toBeNull();
  });

  it("parses a full session", () => {
    const now = 1_700_000_000_000;
    const parsed = parseDispatchSessionCache(
      JSON.stringify({
        v: 1,
        raw: "Dispatch\n39.35,-86.23",
        savedAt: now,
        lat: 39.35,
        lon: -86.23,
        title: "Hall",
        feetOffDrive: 10,
      }),
      now,
    );
    expect(parsed).toEqual({
      v: 1,
      raw: "Dispatch\n39.35,-86.23",
      savedAt: now,
      lat: 39.35,
      lon: -86.23,
      title: "Hall",
      feetOffDrive: 10,
    });
  });

  it("expires after TTL", () => {
    const savedAt = 1_000;
    expect(
      parseDispatchSessionCache(
        JSON.stringify({ v: 1, raw: "old job", savedAt }),
        savedAt + DISPATCH_SESSION_TTL_MS + 1,
      ),
    ).toBeNull();
    expect(
      parseDispatchSessionCache(
        JSON.stringify({ v: 1, raw: "old job", savedAt }),
        savedAt + DISPATCH_SESSION_TTL_MS - 1,
      )?.raw,
    ).toBe("old job");
  });

  it("drops invalid coordinates", () => {
    const now = Date.now();
    const parsed = parseDispatchSessionCache(
      JSON.stringify({
        v: 1,
        raw: "job",
        savedAt: now,
        lat: 999,
        lon: -86,
      }),
      now,
    );
    expect(parsed?.lat).toBeUndefined();
    expect(parsed?.lon).toBeUndefined();
    expect(parsed?.raw).toBe("job");
  });
});

describe("load/saveDispatchSession (localStorage)", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and loads raw + jobsite", () => {
    const now = 5_000;
    saveDispatchSession(
      {
        raw: "Paste me\n39.1,-86.2",
        lat: 39.1,
        lon: -86.2,
        title: "Site",
      },
      now,
    );
    const loaded = loadDispatchSession(now);
    expect(loaded?.raw).toContain("Paste me");
    expect(loaded?.lat).toBe(39.1);
    expect(loaded?.lon).toBe(-86.2);
    expect(loaded?.title).toBe("Site");
    expect(store.has(DISPATCH_SESSION_KEY)).toBe(true);
  });

  it("merges jobsite when only raw is updated", () => {
    const t0 = 10_000;
    saveDispatchSession(
      { raw: "v1", lat: 40, lon: -85, title: "A" },
      t0,
    );
    saveDispatchSession({ raw: "v2 edited" }, t0 + 100);
    const loaded = loadDispatchSession(t0 + 100);
    expect(loaded?.raw).toBe("v2 edited");
    expect(loaded?.lat).toBe(40);
    expect(loaded?.lon).toBe(-85);
    expect(loaded?.title).toBe("A");
  });

  it("clears storage when raw is emptied", () => {
    saveDispatchSession({ raw: "x", lat: 1, lon: 2 }, 1);
    expect(loadDispatchSession(1)).not.toBeNull();
    saveDispatchSession({ raw: "   " }, 2);
    expect(loadDispatchSession(2)).toBeNull();
    expect(store.has(DISPATCH_SESSION_KEY)).toBe(false);
  });

  it("clearDispatchSession removes key", () => {
    saveDispatchSession({ raw: "keep" }, 1);
    clearDispatchSession();
    expect(loadDispatchSession(1)).toBeNull();
  });
});
