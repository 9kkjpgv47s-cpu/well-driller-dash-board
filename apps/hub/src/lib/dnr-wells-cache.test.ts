import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WellRecord } from "@/lib/area-well-analytics";

const loadAllDnrChunksFromPublic = vi.fn<() => Promise<WellRecord[]>>();

vi.mock("@/lib/dnr-chunk-browser", () => ({
  loadAllDnrChunksFromPublic: (...args: unknown[]) =>
    loadAllDnrChunksFromPublic(...(args as [])),
}));

const { getDnrWellsCached, resetDnrWellsCache } = await import("./dnr-wells-cache");

const WELLS: WellRecord[] = [{ lat: 39.5, lon: -86.2 }];

describe("getDnrWellsCached", () => {
  beforeEach(() => {
    resetDnrWellsCache();
    loadAllDnrChunksFromPublic.mockReset();
  });

  afterEach(() => {
    resetDnrWellsCache();
  });

  it("loads once and serves later callers from cache", async () => {
    loadAllDnrChunksFromPublic.mockResolvedValue(WELLS);
    await expect(getDnrWellsCached()).resolves.toEqual(WELLS);
    await expect(getDnrWellsCached()).resolves.toEqual(WELLS);
    expect(loadAllDnrChunksFromPublic).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let release: (w: WellRecord[]) => void = () => {};
    loadAllDnrChunksFromPublic.mockReturnValue(
      new Promise<WellRecord[]>((resolve) => {
        release = resolve;
      }),
    );
    const both = Promise.all([getDnrWellsCached(), getDnrWellsCached()]);
    release(WELLS);
    expect(await both).toEqual([WELLS, WELLS]);
    expect(loadAllDnrChunksFromPublic).toHaveBeenCalledTimes(1);
  });

  it("allows a retry after a failed load", async () => {
    loadAllDnrChunksFromPublic.mockRejectedValueOnce(new Error("schema drift"));
    await expect(getDnrWellsCached()).rejects.toThrow("schema drift");
    loadAllDnrChunksFromPublic.mockResolvedValue(WELLS);
    await expect(getDnrWellsCached()).resolves.toEqual(WELLS);
    expect(loadAllDnrChunksFromPublic).toHaveBeenCalledTimes(2);
  });

  it("reloads after an explicit reset and forwards the progress callback", async () => {
    loadAllDnrChunksFromPublic.mockResolvedValue(WELLS);
    const onProgress = vi.fn();
    await getDnrWellsCached(onProgress);
    expect(loadAllDnrChunksFromPublic).toHaveBeenCalledWith(onProgress);
    resetDnrWellsCache();
    await getDnrWellsCached();
    expect(loadAllDnrChunksFromPublic).toHaveBeenCalledTimes(2);
  });
});
