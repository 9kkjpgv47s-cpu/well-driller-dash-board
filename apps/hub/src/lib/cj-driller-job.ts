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

export function saveDrillerJob(entries: CjDrillerJobEntry[]) {
  writeStoredJson(CJ_DRILLER_JOB_KEY, entries);
}

/** Returns false if this wellId is already on the job. */
export function appendDrillerJobEntry(entry: CjDrillerJobEntry): boolean {
  const cur = loadDrillerJob();
  if (cur.some((e) => e.wellId === entry.wellId)) return false;
  saveDrillerJob([...cur, entry]);
  return true;
}
