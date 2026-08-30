import { readStoredJson, writeStoredJson } from "@/lib/browser-storage";

/** Same storage key as the static C&J well viewer — shared when hub + viewer are same origin. */
export const CJ_DRILLER_JOB_KEY = "cjDrillerJobV1";

export type CjWellSnap = {
  id?: string;
  refno?: number;
  well_id_canonical?: string;
  well_identity_aliases?: string;
  well_identity_confidence?: "high" | "medium" | "low";
  well_identity_provenance?: string;
  well_identity_resolver_version?: string;
  lat?: number;
  lon?: number;
  county?: string;
  depth?: number;
  aquifer?: string;
  owner?: string;
  report?: string;
  loc_type?: string;
  lithology_json?: string;
};

export type CjDrillerJobEntry = {
  wellId: string;
  notes: string;
  addedAt: number;
  snap: CjWellSnap;
};

export function loadDrillerJob(): CjDrillerJobEntry[] {
  const parsed = readStoredJson<unknown>(CJ_DRILLER_JOB_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (x): x is CjDrillerJobEntry =>
      x != null &&
      typeof x === "object" &&
      typeof (x as CjDrillerJobEntry).wellId === "string",
  );
}

/** False when the write failed (quota, blocked storage) — the job list is unchanged. */
export function saveDrillerJob(entries: CjDrillerJobEntry[]): boolean {
  return writeStoredJson(CJ_DRILLER_JOB_KEY, entries);
}

export type AppendDrillerJobResult =
  | { status: "added" }
  | { status: "duplicate" }
  | { status: "not-saved" };

/** Appends unless the wellId is already on the job or the write is rejected. */
export function appendDrillerJobEntry(
  entry: CjDrillerJobEntry,
): AppendDrillerJobResult {
  const cur = loadDrillerJob();
  if (cur.some((e) => e.wellId === entry.wellId)) return { status: "duplicate" };
  if (!saveDrillerJob([...cur, entry])) return { status: "not-saved" };
  return { status: "added" };
}
