/**
 * DNR well classification — dual-label (v2 default).
 *
 * Axes:
 * 1) locationQuality — verified | estimated (unverified coords; green marker)
 * 2) formationClass — unconsolidated | rock | unknown (from lithology + registry)
 *
 * Marker color still uses a single category for map paint (estimated wins green).
 * Filters OR both axes so estimated wells can appear under uncon and/or rock.
 *
 * Revert to frozen v1 anytime:
 *   NEXT_PUBLIC_DNR_CLASSIFY_VERSION=v1
 * See docs/DNR_CLASSIFY_REVERT.md and archive/dnr-well-classify-v1.ts
 */

import type { WellRecord } from "@/lib/area-well-analytics";
import { primaryAquiferText } from "@/lib/area-well-analytics";
import {
  classifyFormationFromWell,
  isEstimatedLocation,
  isMapFaceSetLabel,
  type FormationClass,
  type FormationClassResult,
} from "@/lib/formation-class";
import * as v1 from "@/lib/archive/dnr-well-classify-v1";

export type DrillingWellCategory =
  | "dry"
  | "bucket"
  | "estimated"
  | "unconsolidated"
  | "rock";

export type LocationQuality = "verified" | "estimated";

export type DualWellClassification = {
  /** Map marker / paint category — estimated stays green even when formation is known. */
  markerCategory: DrillingWellCategory;
  locationQuality: LocationQuality;
  formationClass: FormationClass;
  special: "dry" | "bucket" | null;
  rockTopFt: number | null;
  unconsolidatedFt: number | null;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  rulesetId: string;
  /**
   * Compact **map / home-face** label (Dom 2026-07-22):
   * - R17 = top of rock (ft) — plain R, no @
   * - G1 2 / G2 10 = sand/gravel aquifer thickness
   * - Well = no R/G (clay-only, unknown)
   * - Dry / Bucket specials
   * NEVER Est… (estimated = green marker only)
   * NEVER C0-36 / full C/G/R stack (those stay on layerStackLabel for well detail)
   */
  displayLabel: string;
  /** Short set chip only (Rxx / G1 2 / G2 10) when known. */
  setLabel: string | null;
  /**
   * Full lithology stack C/G/R for well-detail / log view only.
   * Not shown on map face.
   */
  layerStackLabel: string;
  formation: FormationClassResult | null;
};

export type DrillingTypeFilters = {
  showUnconsolidated: boolean;
  showRock: boolean;
  showUnverified: boolean;
};

function classifyVersion(): "v1" | "v2" {
  const env =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_DNR_CLASSIFY_VERSION ||
        process.env.DNR_CLASSIFY_VERSION)) ||
    "v2";
  return String(env).toLowerCase() === "v1" ? "v1" : "v2";
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

/**
 * Map/home face: R (rock top), G aquifer-thickness, S dry-sand chips.
 * No Est prefix (estimated is green color only).
 * No C / layer-stack chips (detail view only via layerStackLabel).
 */
function displayLabelFor(dual: {
  special: DualWellClassification["special"];
  setLabel: string | null;
}): string {
  if (dual.special === "dry") return "Dry";
  if (dual.special === "bucket") return "Bucket";

  // Only authoritative set chips on the face (R / G / S — possibly interleaved)
  if (dual.setLabel && isMapFaceSetLabel(dual.setLabel)) {
    return dual.setLabel;
  }

  // Clay-only / unknown / bare class without R / G / S → neutral face label
  return "Well";
}

/**
 * Full dual classification (v2). Prefer this for new code.
 */
export function classifyWellDual(w: WellRecord): DualWellClassification {
  if (classifyVersion() === "v1") {
    const cat = v1.classifyDrillingWell(w);
    const locationQuality: LocationQuality =
      cat === "estimated" ? "estimated" : "verified";
    const formationClass: FormationClass =
      cat === "unconsolidated"
        ? "unconsolidated"
        : cat === "rock"
          ? "rock"
          : "unknown";
    return {
      markerCategory: cat,
      locationQuality,
      formationClass,
      special: cat === "dry" ? "dry" : cat === "bucket" ? "bucket" : null,
      rockTopFt: null,
      unconsolidatedFt: null,
      confidence: "low",
      reasons: ["classify_version:v1"],
      rulesetId: "dnr-well-classify-v1",
      displayLabel:
        cat === "estimated"
          ? "Est"
          : cat === "unconsolidated"
            ? "G"
            : cat === "rock"
              ? "R"
              : cat === "bucket"
                ? "Bucket"
                : "Dry",
      setLabel: null,
      layerStackLabel: "",
      formation: null,
    };
  }

  if (isDrySimple(w)) {
    return {
      markerCategory: "dry",
      locationQuality: isEstimatedLocation(w) ? "estimated" : "verified",
      formationClass: "unknown",
      special: "dry",
      rockTopFt: null,
      unconsolidatedFt: null,
      confidence: "high",
      reasons: ["dry_aquifer"],
      rulesetId: "dnr-well-classify-v2",
      displayLabel: "Dry",
      setLabel: null,
      layerStackLabel: "",
      formation: null,
    };
  }
  if (isBucketWellSimple(w)) {
    return {
      markerCategory: "bucket",
      locationQuality: isEstimatedLocation(w) ? "estimated" : "verified",
      formationClass: "unknown",
      special: "bucket",
      rockTopFt: null,
      unconsolidatedFt: null,
      confidence: "high",
      reasons: ["bucket_or_hand_dug"],
      rulesetId: "dnr-well-classify-v2",
      displayLabel: "Bucket",
      setLabel: null,
      layerStackLabel: "",
      formation: null,
    };
  }

  const estimated = isEstimatedLocation(w);
  const formation = classifyFormationFromWell(w);
  const formationClass = formation.formationClass;
  const setLabel = formation.construction?.setLabel ?? null;
  const layerStackLabel = formation.layerStackLabel ?? "";

  // Marker: estimated location always green (user requirement).
  const markerCategory: DrillingWellCategory = estimated
    ? "estimated"
    : formationClass === "unconsolidated"
      ? "unconsolidated"
      : formationClass === "rock"
        ? "rock"
        : "rock"; // residual same as v1 when unknown + verified

  return {
    markerCategory,
    locationQuality: (estimated ? "estimated" : "verified") as LocationQuality,
    formationClass,
    special: null,
    rockTopFt: formation.rockTopFt,
    unconsolidatedFt: formation.unconsolidatedFt,
    confidence: formation.confidence,
    reasons: [
      estimated ? "location:estimated" : "location:verified",
      ...formation.reasons,
    ],
    rulesetId: formation.rulesetId,
    displayLabel: displayLabelFor({ special: null, setLabel }),
    setLabel,
    layerStackLabel,
    formation,
  };
}

/**
 * Single marker category for map paint (backward compatible).
 * Estimated short-circuits to green; formation is available via classifyWellDual.
 */
export function classifyDrillingWell(w: WellRecord): DrillingWellCategory {
  if (classifyVersion() === "v1") return v1.classifyDrillingWell(w);
  return classifyWellDual(w).markerCategory;
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

/**
 * Dual-axis OR filters (v2):
 * - Uncon toggle includes estimated wells whose formation is unconsolidated
 * - Rock toggle includes estimated wells whose formation is rock
 * - Unverified toggle includes any estimated location (green set)
 * Dry / bucket: visible when any primary toggle is on (planning context).
 */
export function wellMatchesDrillingFilters(
  w: WellRecord,
  opts: DrillingTypeFilters,
): boolean {
  if (classifyVersion() === "v1") {
    return v1.wellMatchesDrillingFilters(w, opts);
  }

  const { showUnconsolidated, showRock, showUnverified } = opts;
  if (!showUnconsolidated && !showRock && !showUnverified) return false;

  const dual = classifyWellDual(w);
  if (dual.special === "dry" || dual.special === "bucket") return true;

  if (showUnverified && dual.locationQuality === "estimated") return true;
  if (showUnconsolidated && dual.formationClass === "unconsolidated")
    return true;
  if (showRock && dual.formationClass === "rock") return true;

  // Verified unknown with rock residual: match rock filter like v1 residual
  if (
    showRock &&
    dual.locationQuality === "verified" &&
    dual.formationClass === "unknown"
  )
    return true;

  return false;
}

/** Formation class for analytics (never "estimated"). */
export function formationClassForWell(w: WellRecord): FormationClass {
  return classifyWellDual(w).formationClass;
}

export function isEstimatedLocationWell(w: WellRecord): boolean {
  return isEstimatedLocation(w);
}
