import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type LithologyV2Module = typeof import("./lithology-v2");

const SIDECAR = [
  JSON.stringify({
    refno: "12345",
    well_type_v2: "unconsolidated",
    label_kind_v2: "g",
    unconsolidated_ft_v2: 88,
  }),
  "",
  "{ not json",
  JSON.stringify({ well_type_v2: "bedrock", label_kind_v2: "r" }),
  JSON.stringify({ refno: "67890", well_type_v2: "bedrock", label_kind_v2: "r" }),
  JSON.stringify({ refno: "111", well_type_v2: "unknown", label_kind_v2: "none" }),
].join("\n");

function stubFetchText(text: string, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status: ok ? 200 : 404, text: async () => text })),
  );
}

async function freshModule(): Promise<LithologyV2Module> {
  vi.resetModules();
  return import("./lithology-v2");
}

describe("lithology-v2 sidecar", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_LITHOLOGY_V2;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_LITHOLOGY_V2;
  });

  it("indexes sidecar lines by refno and skips unusable ones", async () => {
    stubFetchText(SIDECAR);
    const mod = await freshModule();
    expect(mod.lithologyV2Ready()).toBe(false);
    const map = await mod.initLithologyV2();
    expect(Object.keys(map ?? {}).sort()).toEqual(["111", "12345", "67890"]);
    expect(mod.lithologyV2Ready()).toBe(true);
  });

  it("maps records to a gravel / rock / unknown answer", async () => {
    stubFetchText(SIDECAR);
    const mod = await freshModule();
    await mod.initLithologyV2();
    expect(mod.wellTypeV2({ refno: "12345.0" })).toBe(true);
    expect(mod.wellTypeV2({ refno: 67890 })).toBe(false);
    expect(mod.wellTypeV2({ refno: "111" })).toBeNull();
    expect(mod.wellTypeV2({ refno: "99999" })).toBeNull();
    expect(mod.wellTypeV2({})).toBeNull();
    expect(mod.lithologyV2Record({ refno: 12345 })).toMatchObject({
      well_type_v2: "unconsolidated",
      unconsolidated_ft_v2: 88,
    });
    expect(mod.lithologyV2Record({})).toBeNull();
  });

  it("caches the load and single-flights concurrent callers", async () => {
    stubFetchText(SIDECAR);
    const mod = await freshModule();
    const [a, b] = await Promise.all([
      mod.initLithologyV2(),
      mod.initLithologyV2(),
    ]);
    expect(a).toBe(b);
    await mod.initLithologyV2();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("degrades to v1 logic when the sidecar is missing", async () => {
    stubFetchText("", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await freshModule();
    expect(await mod.initLithologyV2()).toEqual({});
    expect(mod.wellTypeV2({ refno: "12345" })).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("skips loading entirely when disabled by env flag", async () => {
    process.env.NEXT_PUBLIC_LITHOLOGY_V2 = "0";
    stubFetchText(SIDECAR);
    const mod = await freshModule();
    expect(await mod.initLithologyV2()).toBeNull();
    expect(mod.lithologyV2Ready()).toBe(false);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
