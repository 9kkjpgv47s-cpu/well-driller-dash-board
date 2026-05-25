/**
 * V2 lithology classification sidecar (read-only overlay).
 * Original lithology_json in chunks is never modified.
 *
 * Disable: set NEXT_PUBLIC_LITHOLOGY_V2=0 or pass ?litho_v2=0 on embedded viewer.
 */

import type { WellRecord } from "@/lib/area-well-analytics";

export type LithologyV2Record = {
  well_type_v2: "bedrock" | "unconsolidated" | "unknown";
  label_kind_v2: "g" | "r" | "none";
  unconsolidated_ft_v2?: number | null;
  rock_top_ft_v2?: number | null;
  ruleset_id?: string;
};

let byRef: Record<string, LithologyV2Record> | null = null;
let loadPromise: Promise<Record<string, LithologyV2Record> | null> | null = null;

function enabled(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_LITHOLOGY_V2 === "0") {
    return false;
  }
  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("litho_v2") === "0") return false;
    } catch {
      /* ignore */
    }
  }
  return true;
}

async function loadSidecar(): Promise<Record<string, LithologyV2Record> | null> {
  if (!enabled()) return null;
  if (byRef) return byRef;
  if (loadPromise) return loadPromise;

  const url = "/well-viewer/lithology_v2/out/well_classification_v2.jsonl.gz";
  loadPromise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`v2 sidecar HTTP ${res.status}`);
      let text: string;
      if (typeof DecompressionStream !== "undefined" && res.body) {
        const ds = new DecompressionStream("gzip");
        const stream = res.body.pipeThrough(ds);
        text = await new Response(stream).text();
      } else {
        text = await res.text();
      }
      const map: Record<string, LithologyV2Record> = {};
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
          const rec = JSON.parse(t) as LithologyV2Record & { refno?: string };
          if (rec.refno) map[String(rec.refno)] = rec;
        } catch {
          /* skip */
        }
      }
      byRef = map;
      return map;
    } catch (err) {
      console.warn("[lithology-v2] sidecar load failed — v1 only", err);
      byRef = {};
      return byRef;
    }
  })();

  return loadPromise;
}

export function initLithologyV2(): Promise<Record<string, LithologyV2Record> | null> {
  return loadSidecar();
}

export function lithologyV2Ready(): boolean {
  return !!byRef;
}

/** true = gravel/unconsolidated, false = rock, null = use v1 logic */
export function wellTypeV2(w: WellRecord): boolean | null {
  if (!byRef) return null;
  const ref = w.refno != null ? String(w.refno).replace(/\.0+$/, "").trim() : "";
  if (!ref) return null;
  const rec = byRef[ref];
  if (!rec) return null;
  if (rec.well_type_v2 === "unconsolidated") return true;
  if (rec.well_type_v2 === "bedrock") return false;
  return null;
}

export function lithologyV2Record(w: WellRecord): LithologyV2Record | null {
  if (!byRef) return null;
  const ref = w.refno != null ? String(w.refno).replace(/\.0+$/, "").trim() : "";
  return ref ? byRef[ref] ?? null : null;
}
