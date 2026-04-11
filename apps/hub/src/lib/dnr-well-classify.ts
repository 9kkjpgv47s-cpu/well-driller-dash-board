import type { WellRecord } from "@/lib/area-well-analytics";
import { primaryAquiferText } from "@/lib/area-well-analytics";

/**
 * Hub map classification (aligned with standalone viewer toggle intent, simplified
 * vs full lithology / dry-yield rules).
 */
export type DrillingWellCategory =
  | "dry"
  | "bucket"
  | "estimated"
  | "unconsolidated"
  | "rock";

function isEstimated(w: WellRecord): boolean {
  const aq = primaryAquiferText(w).toLowerCase();
  const lt = String(
    w.loc_type ?? (w as WellRecord).location_type ?? "",
  ).toLowerCase();
  return aq.includes("estimated") || lt.includes("estimated");
}

function isBucketWellSimple(w: WellRecord): boolean {
  const blob =
    `${w.loc_type ?? ""} ${(w as WellRecord).well_type ?? ""} ${(w as WellRecord).pump_type ?? ""} ${(w as WellRecord).well_use ?? ""}`.toLowerCase();
  return (
    blob.includes("bucket") ||
    blob.includes("hand dug") ||
    blob.includes("dug well") ||
    blob.includes("dug domestic")
  );
}

function isDrySimple(w: WellRecord): boolean {
  const aq = primaryAquiferText(w).toLowerCase();
  return aq.includes("dry");
}

function isUnconsolidatedSimple(w: WellRecord): boolean {
  const aq = primaryAquiferText(w).toLowerCase();
  if (!aq.trim()) return false;
  if (
    aq.includes("bedrock") ||
    aq.includes("limestone") ||
    aq.includes("dolomite") ||
    aq.includes("shale") ||
    aq.includes("sandstone") ||
    aq.includes("siltstone")
  )
    return false;
  if (
    aq.includes("unconsolidated") ||
    aq.includes("sand") ||
    aq.includes("gravel")
  )
    return true;
  return false;
}

export function classifyDrillingWell(w: WellRecord): DrillingWellCategory {
  if (isDrySimple(w)) return "dry";
  if (isBucketWellSimple(w)) return "bucket";
  if (isEstimated(w)) return "estimated";
  if (isUnconsolidatedSimple(w)) return "unconsolidated";
  return "rock";
}

export function markerColorForCategory(c: DrillingWellCategory): string {
  switch (c) {
    case "unconsolidated":
      return "#2563eb";
    case "rock":
      return "#dc2626";
    case "estimated":
      return "#16a34a";
    case "bucket":
      return "#f97316";
    case "dry":
    default:
      return "#111827";
  }
}

export type DrillingTypeFilters = {
  showUnconsolidated: boolean;
  showRock: boolean;
  showUnverified: boolean;
};

/**
 * Unverified = registry estimated location (aquifer / loc type wording).
 * Dry / bucket: visible when any of the three primary toggles is on (planning context).
 */
export function wellMatchesDrillingFilters(
  w: WellRecord,
  opts: DrillingTypeFilters,
): boolean {
  const { showUnconsolidated, showRock, showUnverified } = opts;
  if (!showUnconsolidated && !showRock && !showUnverified) return false;
  const cat = classifyDrillingWell(w);
  if (cat === "dry" || cat === "bucket") return true;
  if (cat === "estimated") return showUnverified;
  if (cat === "unconsolidated") return showUnconsolidated;
  return showRock;
}
