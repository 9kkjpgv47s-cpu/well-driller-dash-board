import type { WellRecord } from "@/lib/area-well-analytics";
import { displayDepthFt } from "@/lib/area-well-analytics";
import type { CjDrillerJobEntry } from "@/lib/cj-driller-job";
import { resolveCanonicalWellIdentity } from "@/lib/well-identity";

export function wellRecordToDrillerEntry(w: WellRecord): CjDrillerJobEntry | null {
  const lat = Number(w.lat);
  const lon = Number(w.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const identity = resolveCanonicalWellIdentity(w);
  const refno = identity.refno;
  const idStr = String(w.id ?? "").trim();
  const wellId = identity.canonicalId;
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
      well_id_canonical: identity.canonicalId,
      well_identity_aliases: identity.aliases.join("|"),
      well_identity_confidence: identity.confidence,
      well_identity_provenance: identity.provenance.join("|"),
      well_identity_resolver_version: identity.resolverVersion,
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
