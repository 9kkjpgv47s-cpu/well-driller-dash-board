// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CJ_DRILLER_JOB_KEY,
  appendDrillerJobEntry,
  loadDrillerJob,
  saveDrillerJob,
  type CjDrillerJobEntry,
} from "./cj-driller-job";

function entry(wellId: string): CjDrillerJobEntry {
  return { wellId, notes: "", addedAt: 1, snap: { lat: 39, lon: -86 } };
}

describe("cj-driller-job storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips entries through localStorage", () => {
    saveDrillerJob([entry("DNR-1"), entry("DNR-2")]);
    expect(loadDrillerJob().map((e) => e.wellId)).toEqual(["DNR-1", "DNR-2"]);
  });

  it("returns an empty job for missing, malformed, or non-array payloads", () => {
    expect(loadDrillerJob()).toEqual([]);
    localStorage.setItem(CJ_DRILLER_JOB_KEY, "{not json");
    expect(loadDrillerJob()).toEqual([]);
    localStorage.setItem(CJ_DRILLER_JOB_KEY, JSON.stringify({ wellId: "x" }));
    expect(loadDrillerJob()).toEqual([]);
  });

  it("drops entries without a string wellId", () => {
    localStorage.setItem(
      CJ_DRILLER_JOB_KEY,
      JSON.stringify([entry("DNR-1"), null, { notes: "" }, { wellId: 7 }]),
    );
    expect(loadDrillerJob().map((e) => e.wellId)).toEqual(["DNR-1"]);
  });

  it("appends new wells and refuses duplicates", () => {
    expect(appendDrillerJobEntry(entry("DNR-1"))).toBe(true);
    expect(appendDrillerJobEntry(entry("DNR-2"))).toBe(true);
    expect(appendDrillerJobEntry(entry("DNR-1"))).toBe(false);
    expect(loadDrillerJob().map((e) => e.wellId)).toEqual(["DNR-1", "DNR-2"]);
  });

  it("swallows quota errors when saving", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveDrillerJob([entry("DNR-1")])).not.toThrow();
    spy.mockRestore();
  });
});
