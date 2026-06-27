import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DNR_WELLS_SERVER_LOAD_TIMEOUT_MS,
  DNR_WELLS_SERVER_LOAD_TIMEOUT_VERCEL_MS,
  getDnrWellsServerCachedWithTimeout,
  getDnrWellsServerLoadTimeoutMs,
  resetDnrWellsServerCache,
} from "./dnr-wells-server-cache";
import * as chunkServer from "./dnr-chunk-server";

describe("dnr-wells-server-cache", () => {
  afterEach(() => {
    resetDnrWellsServerCache();
    vi.restoreAllMocks();
  });

  it("returns wells when load finishes before timeout", async () => {
    const wells = [{ lat: 40, lon: -85, depth: "120" }];
    vi.spyOn(chunkServer, "loadAllDnrChunksFromDisk").mockResolvedValue(wells);

    await expect(getDnrWellsServerCachedWithTimeout(500)).resolves.toEqual(
      wells,
    );
  });

  it("rejects when load exceeds timeout", async () => {
    vi.spyOn(chunkServer, "loadAllDnrChunksFromDisk").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ lat: 40, lon: -85 }]), 200);
        }),
    );

    await expect(getDnrWellsServerCachedWithTimeout(50)).rejects.toThrow(
      /timed out after 50ms/,
    );
  });

  it("uses a 20s default timeout budget locally", () => {
    expect(DNR_WELLS_SERVER_LOAD_TIMEOUT_MS).toBe(20_000);
  });

  it("uses an 8s timeout budget on Vercel", () => {
    expect(DNR_WELLS_SERVER_LOAD_TIMEOUT_VERCEL_MS).toBe(8_000);
    const prev = process.env.VERCEL;
    process.env.VERCEL = "1";
    expect(getDnrWellsServerLoadTimeoutMs()).toBe(8_000);
    delete process.env.VERCEL;
    if (prev !== undefined) process.env.VERCEL = prev;
  });
});
