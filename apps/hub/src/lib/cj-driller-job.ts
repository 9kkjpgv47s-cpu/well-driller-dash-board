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
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CJ_DRILLER_JOB_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(
      (x): x is CjDrillerJobEntry =>
        x != null &&
        typeof x === "object" &&
        typeof (x as CjDrillerJobEntry).wellId === "string",
    );
  } catch {
    return [];
  }
}

export function saveDrillerJob(entries: CjDrillerJobEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CJ_DRILLER_JOB_KEY, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

/** Returns false if this wellId is already on the job. */
export function appendDrillerJobEntry(entry: CjDrillerJobEntry): boolean {
  const cur = loadDrillerJob();
  if (cur.some((e) => e.wellId === entry.wellId)) return false;
  saveDrillerJob([...cur, entry]);
  return true;
}
