import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DNR_WELLS_SERVER_LOAD_TIMEOUT_MS,
  DNR_WELLS_SERVER_LOAD_TIMEOUT_VERCEL_MS,
  getDnrWellsBaseCachedForApi,
  getDnrWellsForRadiusCachedForApi,
  getDnrWellsServerCachedWithTimeout,
  getDnrWellsServerLoadTimeoutMs,
  resetDnrWellsServerCache,
} from "./dnr-wells-server-cache";
import * as chunkServer from "./dnr-chunk-server";
import * as tileServer from "./dnr-tile-server";

describe("dnr-wells-server-cache", () => {
  afterEach(() => {
    resetDnrWellsServerCache();
    vi.restoreAllMocks();
  });

  it("returns wells when load finishes before timeout", async () => {
    const wells = [{ lat: 40, lon: -85, depth: "120" }];
    vi.spyOn(chunkServer, "loadBaseChunksFromDisk").mockResolvedValue(wells);

    await expect(getDnrWellsBaseCachedForApi()).resolves.toEqual(wells);
  });

  it("rejects when load exceeds timeout", async () => {
    vi.spyOn(chunkServer, "loadBaseChunksFromDisk").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ lat: 40, lon: -85 }]), 200);
        }),
    );

    const slowPromise = new Promise<never>(() => {}); // never resolves
    await expect(getDnrWellsServerCachedWithTimeout(slowPromise, 50)).rejects.toThrow(
      /timed out after 50ms/,
    );
  });

  it("uses a 20s default timeout budget locally", () => {
    expect(DNR_WELLS_SERVER_LOAD_TIMEOUT_MS).toBe(20_000);
  });

  it("uses a short timeout budget on Vercel for fast client-chunk fallback", () => {
    expect(DNR_WELLS_SERVER_LOAD_TIMEOUT_VERCEL_MS).toBe(4_000);
    const prev = process.env.VERCEL;
    process.env.VERCEL = "1";
    expect(getDnrWellsServerLoadTimeoutMs()).toBe(4_000);
    delete process.env.VERCEL;
    if (prev !== undefined) process.env.VERCEL = prev;
  });
});

describe("getDnrWellsForRadiusCachedForApi", () => {
  afterEach(() => {
    resetDnrWellsServerCache();
    vi.restoreAllMocks();
  });

  it("returns source:'tiles' when the tile set exists", async () => {
    vi.spyOn(tileServer, "hasWellTiles").mockResolvedValue(true);
    const load = vi
      .spyOn(tileServer, "loadWellsForRadiusFromTiles")
      .mockResolvedValue({ wells: [{ lat: 40, lon: -86 }], tiles: 3 });

    const res = await getDnrWellsForRadiusCachedForApi(39.7, -86.1, 2, {
      lithology: true,
    });
    expect(res).toEqual({
      wells: [{ lat: 40, lon: -86 }],
      source: "tiles",
      tiles: 3,
    });
    expect(load).toHaveBeenCalledWith(39.7, -86.1, 2, { lithology: true });
  });

  it("falls back to the full registry (lithology) when tiles are absent", async () => {
    vi.spyOn(tileServer, "hasWellTiles").mockResolvedValue(false);
    const wells = [{ lat: 40, lon: -86, lithology_json: "[]" }];
    const full = vi
      .spyOn(chunkServer, "loadFullChunksFromDisk")
      .mockResolvedValue(wells);

    const res = await getDnrWellsForRadiusCachedForApi(39.7, -86.1, 2, {
      lithology: true,
    });
    expect(res).toEqual({ wells, source: "registry", tiles: 0 });
    expect(full).toHaveBeenCalled();
  });

  it("falls back to the base registry when tiles are absent and no lithology", async () => {
    vi.spyOn(tileServer, "hasWellTiles").mockResolvedValue(false);
    const wells = [{ lat: 40, lon: -86 }];
    const base = vi
      .spyOn(chunkServer, "loadBaseChunksFromDisk")
      .mockResolvedValue(wells);

    const res = await getDnrWellsForRadiusCachedForApi(39.7, -86.1, 2, {
      lithology: false,
    });
    expect(res).toEqual({ wells, source: "registry", tiles: 0 });
    expect(base).toHaveBeenCalled();
  });

  it("rejects when the tile load exceeds the timeout", async () => {
    vi.spyOn(tileServer, "hasWellTiles").mockResolvedValue(true);
    vi.spyOn(tileServer, "loadWellsForRadiusFromTiles").mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    await expect(
      getDnrWellsForRadiusCachedForApi(39.7, -86.1, 2, { lithology: false }, 50),
    ).rejects.toThrow(/timed out after 50ms/);
  });
});
