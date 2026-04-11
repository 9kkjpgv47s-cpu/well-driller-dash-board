import type { WellRecord } from "@/lib/area-well-analytics";
import { displayDepthFt } from "@/lib/area-well-analytics";
import type { CjDrillerJobEntry } from "@/lib/cj-driller-job";

function parseRefno(w: WellRecord): number | undefined {
  const raw = w.refno ?? w.id;
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  const m = String(raw).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

export function wellRecordToDrillerEntry(w: WellRecord): CjDrillerJobEntry | null {
  const lat = Number(w.lat);
  const lon = Number(w.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const refno = parseRefno(w);
  const idStr = String(w.id ?? "").trim();
  const wellId =
    idStr || (refno != null ? `DNR-${refno}` : `hub-${lat.toFixed(5)}-${lon.toFixed(5)}`);
  let report = String(w.report ?? "").trim();
  if (!report && refno != null) {
    report = `https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=${refno}&_from=SUMMARY&_action=Details`;
  }
  const depth = displayDepthFt(w);
  return {
    wellId,
    notes: "",
    addedAt: Date.now(),
    snap: {
      id: idStr || undefined,
      refno,
      lat,
      lon,
      county: String(w.county ?? ""),
      depth: depth ?? undefined,
      aquifer: String(w.aquifer ?? ""),
      owner: String(w.owner ?? ""),
      report,
      loc_type: String(w.loc_type ?? ""),
      lithology_json: String(w.lithology_json ?? ""),
    },
  };
}
