import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStoredJson, writeStoredJson } from "./browser-storage";

function installStorage(store: Map<string, string>) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    },
  });
}

describe("writeStoredJson", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    installStorage(store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists serializable values", () => {
    expect(writeStoredJson("k", [1, 2])).toBe(true);
    expect(readStoredJson<number[]>("k")).toEqual([1, 2]);
  });

  it("reports failure for values JSON.stringify drops", () => {
    expect(writeStoredJson("k", undefined)).toBe(false);
    expect(writeStoredJson("k", () => {})).toBe(false);
    expect(store.has("k")).toBe(false);
  });

  it("reports failure for circular values", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(writeStoredJson("k", circular)).toBe(false);
  });
});
