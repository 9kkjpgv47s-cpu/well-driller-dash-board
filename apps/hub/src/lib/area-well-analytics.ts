/**
 * Area-level drilling insights from DNR-style well rows (chunk CSV columns).
 * Lithology *counts* use hub-only normalization (merge contiguous identical intervals);
 * chunk `lithology_json` stays raw for the embedded well viewer.
 */

import { finalizeLithologyLayersForHub } from "./hub-lithology-normalize";

export type WellRecord = Record<string, string | number | undefined>;

/** Positive depth in feet from chunk columns (viewer vein / rock fields from ETL). */
export function parseChunkPositiveFt(
  w: WellRecord,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = w[k];
    if (v == null || v === "") continue;
    const n = parseFloat(
      String(v).replace(/,/g, "").replace(/[^\d.\-]/g, ""),
    );
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function chunkGravelThicknessFt(w: WellRecord): number | null {
  return parseChunkPositiveFt(w, [
    "gravel_thickness_ft",
    "vein_size_ft",
    "vein_size",
  ]);
}

export function chunkRockTopFt(w: WellRecord): number | null {
  return parseChunkPositiveFt(w, ["rock_start_ft", "depth_bedrock"]);
}

const ROCK_FORM =
  /lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|chert|quartzite|basalt|gneiss|schist|conglomerate|argillite|\brock\b/i;

export const LITHO_FORMATION_KEYS = [
  "formation",
  "Formation",
  "material",
  "Material",
  "description",
  "Description",
  "lithology",
  "Lithology",
  "strata",
  "Strata",
] as const;

export const LITHO_TOP_KEYS = [
  "top",
  "Top",
  "from",
  "From",
  "depth_from",
  "DepthFrom",
  "depth_top",
  "DepthTop",
  "start_depth",
  "upper_depth",
  "upperDepth",
  "begin_depth",
  "BeginDepth",
  "start",
  "Start",
] as const;

export const LITHO_BOTTOM_KEYS = [
  "bottom",
  "Bottom",
  "to",
  "To",
  "depth_to",
  "DepthTo",
  "depth_bottom",
  "DepthBottom",
  "end_depth",
  "lower_depth",
  "lowerDepth",
  "end",
  "End",
] as const;

export function lithologyFormationName(layer: unknown): string {
  if (!layer || typeof layer !== "object") return "";
  const o = layer as Record<string, unknown>;
  return String(
    LITHO_FORMATION_KEYS.map((k) => o[k]).find((v) => v != null && v !== "") ??
      "",
  ).trim();
}

function parseDepthField(v: unknown): number {
  if (v == null || v === "") return NaN;
  return parseFloat(String(v).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
}

function formationName(layer: unknown): string {
  return lithologyFormationName(layer);
}

export function lithologyLayerTopBottomFt(
  layer: unknown,
  prevBottom: number,
): { top: number; bot: number } {
  if (!layer || typeof layer !== "object")
    return { top: NaN, bot: NaN };
  const o = layer as Record<string, unknown>;
  let top = parseDepthField(
    LITHO_TOP_KEYS.map((k) => o[k]).find((v) => v != null && v !== ""),
  );
  const bot = parseDepthField(
    LITHO_BOTTOM_KEYS.map((k) => o[k]).find((v) => v != null && v !== ""),
  );
  if (Number.isNaN(top) && !Number.isNaN(prevBottom)) top = prevBottom;
  return { top, bot };
}

function layerTopBottom(
  layer: unknown,
  prevBottom: number,
): { top: number; bot: number } {
  return lithologyLayerTopBottomFt(layer, prevBottom);
}

/** Merged lithology when valid; otherwise raw log intervals (many exports only use From/To). */
function lithologyLayersForStats(w: WellRecord): unknown[] {
  const fin = getLithLayersForAnalytics(w);
  if (fin.length) return fin;
  return getLithLayers(w);
}

function lithologyArrayFromParsed(j: unknown): unknown[] {
  if (Array.isArray(j)) return j;
  if (j && typeof j === "object") {
    const o = j as Record<string, unknown>;
    for (const key of [
      "layers",
      "intervals",
      "data",
      "well_log",
      "WellLog",
      "Lithology",
      "records",
    ]) {
      const a = o[key];
      if (Array.isArray(a)) return a;
    }
  }
  return [];
}

export function getLithLayers(w: WellRecord): unknown[] {
  const raw =
    w.lithology_json ??
    w.lithology ??
    w.well_log_json ??
    w.welllog_json ??
    w.log_json;
  if (raw == null || String(raw).trim() === "") return [];
  try {
    let j = JSON.parse(String(raw).trim()) as unknown;
    if (typeof j === "string") {
      const inner = (j as string).trim();
      if (inner.startsWith("[") || inner.startsWith("{"))
        j = JSON.parse(inner) as unknown;
    }
    return lithologyArrayFromParsed(j);
  } catch {
    return [];
  }
}

/** Raw registry intervals as in chunks / viewer; use for display parity with viewer only. */
export function getLithLayersForAnalytics(w: WellRecord): unknown[] {
  return finalizeLithologyLayersForHub(getLithLayers(w));
}

function isWaterBearingFormation(fmRaw: string): boolean {
  const l = String(fmRaw ?? "").toLowerCase();
  if (!l.trim()) return false;
  if (/dry\s*hole|no\s*water|abandon|plugged|cement\s*fill/i.test(l))
    return false;
  if (
    (/limestone|dolomite|shale|slate|bedrock|granite|marble|chert|quartzite|basalt|gneiss|schist|conglomerate|argillite|\b(ls|lm|dl)\b/i.test(
      l,
    ) &&
      !/sand|grav|gravel|drift|sa\b|gr\b|sg\b|outwash|till|alluv|esker|kame/i.test(
        l,
      )) ||
    (/\bsandstone\b|\bsiltstone\b/i.test(l) &&
      !/grav|gravel|drift|glacial|outwash|till|alluv/i.test(l))
  )
    return false;
  if (
    /grav|gravel|\bsg\b|sand\s*\/\s*g|s\s*&\s*g|sand\s*grav|water\s*b\.?|water\s*bearing|water\s*grav|pea\s*grav|gravelly|w\s*\/\s*grav|producing\s*zone|producing\s*formation|producing\s*interval|\baquifer\b|unconsolidated|water\s*zone|pervious|glacial\s*drift|\boutwash\b|\btill\b|alluv|terrace|esker|kame|dirty\s*grav|sandy\s*grav|grav\s*sand/i.test(
      l,
    )
  )
    return true;
  if (/\bsandstone\b|\bsiltstone\b/i.test(l)) return false;
  if (/\bwet\b/.test(l) && /sand|grav|gravel|sa\b|gr\b|silt|drift/i.test(l))
    return true;
  if (/\b(sa|gr|sg)\b/.test(l)) return true;
  if (
    /\bsand\b/.test(l) &&
    /\bclayey\s*sand\b|sandy\s*clay|sand\s*(and|&|\/)\s*clay|clay\s*(and|&|\/)\s*sand/i.test(
      l,
    )
  )
    return true;
  if (/\bsand\b/.test(l) && l.indexOf("clay") < 0) return true;
  if (
    l.indexOf("sand") >= 0 &&
    (l.indexOf("gravel") >= 0 ||
      l.indexOf("water") >= 0 ||
      l.indexOf("bearing") >= 0)
  )
    return true;
  return false;
}

export function lithoLooksLikeSandGravelMaterial(fmRaw: string): boolean {
  const l = String(fmRaw ?? "").toLowerCase();
  if (!l.trim()) return false;
  if (/dry\s*hole|no\s*water|abandon|plugged/i.test(l)) return false;
  if (
    (/shale|limestone|dolomite|slate|bedrock|granite|marble|chert|quartzite|basalt|gneiss|schist|conglomerate|argillite/i.test(
      l,
    ) ||
      /\b(ls|lm|dl)\b/i.test(l)) &&
    !/sand|grav|sa\b|gr\b|drift|alluv|outwash|till|esker|kame|muck/i.test(l)
  )
    return false;
  return /grav|gravel|\bsand\b|\bsa\b|\bgr\b|\bsg\b|s\s*\/\s*g|s\s*&\s*g|drift|outwash|glacial|fill|till|alluv|terrace|esker|kame|muck|coarse\s*sand|fine\s*sand|medium\s*sand|dirty\s*grav|sandy\s*grav|grav\s*sand|silty\s*sand|sandy\s*silt|topsoil|surface\s*fill|sand\s*fill|pea\s*stone/i.test(
    l,
  );
}

function rockOnlyInterval(l: string): boolean {
  return (
    ROCK_FORM.test(l) &&
    l.indexOf("sand and") === -1 &&
    l.indexOf("gravel") === -1
  );
}

/** Count discrete sand/gravel/drift intervals (min thickness ft) from lithology. */
export function countGravelLikeIntervals(
  w: WellRecord,
  minThickFt = 2,
): number {
  const layers = lithologyLayersForStats(w);
  let prev = NaN;
  let n = 0;
  for (let i = 0; i < layers.length; i++) {
    const fm = formationName(layers[i]);
    const tb = layerTopBottom(layers[i], prev);
    if (!Number.isNaN(tb.bot)) prev = tb.bot;
    if (!lithoLooksLikeSandGravelMaterial(fm)) continue;
    if (Number.isNaN(tb.top) || Number.isNaN(tb.bot)) continue;
    const th = tb.bot - tb.top;
    if (th >= minThickFt) n++;
  }
  const veinFt = chunkGravelThicknessFt(w);
  if (n === 0 && veinFt != null && veinFt >= minThickFt) return 1;
  return n;
}

/** Water-bearing gravel/sand intervals (usable column). */
export function countUsableGravelIntervals(
  w: WellRecord,
  minThickFt = 2,
): number {
  const layers = lithologyLayersForStats(w);
  let prev = NaN;
  let n = 0;
  for (let i = 0; i < layers.length; i++) {
    const fm = formationName(layers[i]);
    const tb = layerTopBottom(layers[i], prev);
    if (!Number.isNaN(tb.bot)) prev = tb.bot;
    if (!lithoLooksLikeSandGravelMaterial(fm)) continue;
    if (!isWaterBearingFormation(fm)) continue;
    if (Number.isNaN(tb.top) || Number.isNaN(tb.bot)) continue;
    if (tb.bot - tb.top >= minThickFt) n++;
  }
  const veinFt = chunkGravelThicknessFt(w);
  if (n === 0 && veinFt != null && veinFt >= minThickFt) return 1;
  return n;
}

export function lithoDepthToRockFt(w: WellRecord): number | null {
  const chunkRock = chunkRockTopFt(w);
  if (chunkRock != null) return Math.round(chunkRock);
  const layers = lithologyLayersForStats(w);
  if (!layers.length) return null;
  let prev = NaN;
  for (let i = 0; i < layers.length; i++) {
    const tb = layerTopBottom(layers[i], prev);
    if (!Number.isNaN(tb.bot)) prev = tb.bot;
    const fm = formationName(layers[i]).toLowerCase();
    if (ROCK_FORM.test(fm) && fm.indexOf("sand and") === -1 && fm.indexOf("gravel") === -1) {
      if (!Number.isNaN(tb.top) && tb.top >= 0) return Math.round(tb.top);
    }
  }
  return null;
}

/** Rock as primary water source: registry aquifer or rock column with water-bearing rock. */
export function isRockPrimaryWater(w: WellRecord): boolean {
  const aq = primaryAquiferText(w).toLowerCase();
  if (aq.includes("bedrock")) return true;
  if (aq.includes("limestone") || aq.includes("dolomite")) return true;
  const rs = chunkRockTopFt(w);
  const d = displayDepthFt(w);
  if (rs != null && d != null && d > rs + 2) return true;
  const layers = lithologyLayersForStats(w);
  if (!layers.length) return false;
  let prev = NaN;
  let sawRock = false;
  for (let i = 0; i < layers.length; i++) {
    const fm = formationName(layers[i]);
    const l = fm.toLowerCase();
    const tb = layerTopBottom(layers[i], prev);
    if (!Number.isNaN(tb.bot)) prev = tb.bot;
    if (rockOnlyInterval(l)) sawRock = true;
    if (sawRock && isWaterBearingFormation(fm) && rockOnlyInterval(l))
      return true;
  }
  return false;
}

export function isDryOrAbandoned(w: WellRecord): boolean {
  const aq = primaryAquiferText(w).toLowerCase();
  const wt = String((w as WellRecord).well_type ?? "").toLowerCase();
  const notes = String(w.notes ?? "").toLowerCase();
  if (aq.includes("dry")) return true;
  if (wt.includes("dry")) return true;
  if (/dry\s*hole|abandon|plugged/i.test(notes)) return true;
  return false;
}

/** First non-empty registry aquifer / water-bearing field (chunk column names vary by export). */
export function primaryAquiferText(w: WellRecord): string {
  const keys = [
    "aquifer",
    "aquifer_type",
    "aquifer_desc",
    "primary_aquifer",
    "water_bearing",
    "water_bearing_formation",
    "formation_pumped",
    "pumped_from",
  ] as const;
  for (const k of keys) {
    const v = w[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** Sand/gravel “vein” stats: 1′ minimum thickness (was 2′; many state exports use thin surficial intervals). */
export const AREA_INSIGHTS_GRAVEL_MIN_THICK_FT = 1;

export function parseGpm(w: WellRecord): number | null {
  const keys = [
    "pump_rate",
    "gpm",
    "yield_gpm",
    "yield",
    "test_yield",
    "gallons_per_minute",
    "pump_capacity",
    "capacity_gpm",
    "well_yield",
    "discharge_rate",
  ];
  for (const k of keys) {
    const raw = w[k];
    if (raw == null || raw === "") continue;
    const m = String(raw).match(/([\d.]+)/);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export function displayDepthFt(w: WellRecord): number | null {
  const keys = [
    "depth",
    "well_depth",
    "total_depth",
    "completed_depth",
    "drilled_depth",
  ] as const;
  for (const k of keys) {
    const d = w[k];
    if (d != null && d !== "") {
      const n = parseFloat(String(d).replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  return null;
}

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.7613;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function wellsWithinRadius(
  wells: WellRecord[],
  lat: number,
  lon: number,
  radiusMiles: number,
): WellRecord[] {
  return wells.filter((w) => {
    const la = Number(w.lat);
    const lo = Number(w.lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
    return haversineMiles(lat, lon, la, lo) <= radiusMiles;
  });
}

export type NarrativeScope = "all" | "unconsolidated" | "rock";

export type AreaNarrative = {
  text: string;
  scope: NarrativeScope;
};

export type AreaInsightsReport = {
  center: { lat: number; lon: number };
  radiusMiles: number;
  totalWellsInRadius: number;
  wellsWithLithology: number;
  wellsWithGpm: number;
  /** How many wells in radius actually carry each signal (visible in UI). */
  dataCoverage: {
    /** At least one parseable lithology interval (any of lithology_json / lithology / well_log_json, etc.). */
    lithologyIntervals: number;
    veinThicknessCol: number;
    rockTopCol: number;
    registryAquiferNonBlank: number;
  };
  insightQuality: {
    grade: "high" | "medium" | "low";
    /** 0-100 weighted confidence from available well signals in-radius. */
    score: number;
    reasons: string[];
  };
  /** Narrative bullets (complete analysis, not single-bar UI). */
  narratives: AreaNarrative[];
  /** Structured buckets for tables / future charts. */
  aquiferMix: {
    unconsolidated: number;
    bedrock: number;
    estimated: number;
    other: number;
    blank: number;
  };
  gravelVeinDistribution: {
    zero: number;
    one: number;
    two: number;
    threePlus: number;
    unknown: number;
  };
  usableGravel: { none: number; onePlus: number; unknown: number };
  /** Registry aquifer text (primary classification). */
  registryAquifer: {
    unconsolidated: number;
    rock: number;
    estimated: number;
    blank: number;
    other: number;
  };
  yieldBuckets: {
    under10: number;
    tenTo25: number;
    over25: number;
    unknown: number;
  };
  dryOrAbandoned: number;
  depthMedianFt: number | null;
  depthMedianHighYieldFt: number | null;
  depthMedianLowYieldFt: number | null;
  disclaimers: string[];
};

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0";
  return ((100 * part) / whole).toFixed(0);
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function aquiferBucketForGpm(w: WellRecord): "unconsolidated" | "bedrock" | "other" {
  const aqText = primaryAquiferText(w);
  const aqTrim = aqText.trim();
  const mixLower = aqTrim ? aqText.toLowerCase() : inferAquiferForMix(w);
  if (
    mixLower.includes("unconsolidated") ||
    mixLower.includes("sand") ||
    mixLower.includes("gravel")
  )
    return "unconsolidated";
  if (
    mixLower.includes("bedrock") ||
    mixLower.includes("limestone") ||
    mixLower.includes("dolomite")
  )
    return "bedrock";
  return "other";
}

function yieldBreakdownText(values: number[], label: string): string | null {
  if (values.length < 3) return null;
  const under10 = values.filter((g) => g < 10).length;
  const tenTo25 = values.filter((g) => g >= 10 && g <= 25).length;
  const over25 = values.filter((g) => g > 25).length;
  const n = values.length;
  const avg = average(values);
  if (avg == null) return null;
  return `Among **${n}** ${label} wells with GPM: **${pct(under10, n)}%** under **10 GPM**, **${pct(tenTo25, n)}%** at **10–25 GPM**, **${pct(over25, n)}%** over **25 GPM** (avg **${avg.toFixed(1)} GPM**).`;
}

/**
 * When registry aquifer text is blank, infer a bucket from lithology, completed
 * depth vs rock top, and location type (Illinois / multi-state exports often omit aquifer).
 */
function inferAquiferForMix(w: WellRecord): string {
  const loc = String(w.loc_type ?? w.location_type ?? "").toLowerCase();
  if (loc.includes("estimated")) return "estimated";
  const gt = chunkGravelThicknessFt(w);
  if (gt != null && gt >= 1) return "unconsolidated";
  const rockTop = lithoDepthToRockFt(w);
  const d = displayDepthFt(w);
  if (rockTop != null && d != null && d > rockTop + 2) return "bedrock";
  const thin = Math.min(AREA_INSIGHTS_GRAVEL_MIN_THICK_FT, 0.5);
  if (countGravelLikeIntervals(w, thin) >= 1) return "unconsolidated";
  const lay = lithologyLayersForStats(w);
  if (!lay.length) return "";
  const last = formationName(lay[lay.length - 1]).toLowerCase();
  const hasSand =
    /sand|grav|drift|fill|till|outwash|alluv|esker|kame|muck|topsoil|loess|silty|loam/i.test(
      last,
    );
  const hasRock =
    /lime|dolomite|shale|slate|bedrock|sandstone|siltstone|granite|marble|chert/i.test(
      last,
    );
  if (hasSand && (!hasRock || /sand|grav|drift/i.test(last)))
    return "unconsolidated";
  if (hasRock && !/sand|grav|drift|fill|till/i.test(last)) return "bedrock";
  return "";
}

export function computeAreaInsights(
  wells: WellRecord[],
  lat: number,
  lon: number,
  radiusMiles: number,
): AreaInsightsReport {
  const inR = wellsWithinRadius(wells, lat, lon, radiusMiles);
  const n = inR.length;

  const aquiferMix = {
    unconsolidated: 0,
    bedrock: 0,
    estimated: 0,
    other: 0,
    blank: 0,
  };
  const minGravelFt = AREA_INSIGHTS_GRAVEL_MIN_THICK_FT;
  const gravelVeinDistribution = {
    zero: 0,
    one: 0,
    two: 0,
    threePlus: 0,
    unknown: 0,
  };
  const usableGravel = { none: 0, onePlus: 0, unknown: 0 };
  const registryAquifer = {
    unconsolidated: 0,
    rock: 0,
    estimated: 0,
    blank: 0,
    other: 0,
  };
  const yieldBuckets = {
    under10: 0,
    tenTo25: 0,
    over25: 0,
    unknown: 0,
  };
  let dryOrAbandoned = 0;
  let lithN = 0;
  let gpmN = 0;
  let covLithIntervals = 0;
  let covVein = 0;
  let covRock = 0;
  let covAq = 0;

  const depthsHigh: number[] = [];
  const depthsLow: number[] = [];
  const depthsAll: number[] = [];
  const gpmUnconsolidated: number[] = [];
  const gpmBedrock: number[] = [];
  const gpmAllValues: number[] = [];
  const rockTopDepths: number[] = [];
  let rockTopWithGravelBefore = 0;

  for (const w of inR) {
    if (isDryOrAbandoned(w)) dryOrAbandoned++;

    if (getLithLayers(w).length > 0) covLithIntervals++;
    if (chunkGravelThicknessFt(w) != null) covVein++;
    if (chunkRockTopFt(w) != null) covRock++;

    const aqText = primaryAquiferText(w);
    const aqTrim = aqText.trim();
    if (aqTrim) covAq++;
    const aqLower = aqText.toLowerCase();
    const mixLower = aqTrim ? aqLower : inferAquiferForMix(w);
    if (
      mixLower.includes("unconsolidated") ||
      mixLower.includes("sand") ||
      mixLower.includes("gravel")
    )
      aquiferMix.unconsolidated++;
    else if (
      mixLower.includes("bedrock") ||
      mixLower.includes("limestone") ||
      mixLower.includes("dolomite")
    )
      aquiferMix.bedrock++;
    else if (mixLower.includes("estimated")) aquiferMix.estimated++;
    else if (mixLower.trim()) aquiferMix.other++;
    else aquiferMix.blank++;

    if (!aqTrim) registryAquifer.blank++;
    else if (aqLower.includes("estimated")) registryAquifer.estimated++;
    else if (
      /\bbedrock\b|\blimestone\b|\bdolomite\b/i.test(aqLower) &&
      !aqLower.includes("unconsolidated")
    )
      registryAquifer.rock++;
    else if (
      aqLower.includes("unconsolidated") ||
      aqLower.includes("sand") ||
      aqLower.includes("gravel")
    )
      registryAquifer.unconsolidated++;
    else registryAquifer.other++;

    const layers = lithologyLayersForStats(w);
    const gc = countGravelLikeIntervals(w, minGravelFt);
    const uc = countUsableGravelIntervals(w, minGravelFt);
    const hasLithSignal =
      layers.length > 0 ||
      chunkGravelThicknessFt(w) != null ||
      chunkRockTopFt(w) != null;
    if (hasLithSignal) {
      lithN++;
      const rockTop = lithoDepthToRockFt(w);
      if (rockTop != null) {
        rockTopDepths.push(rockTop);
        if (countGravelLikeIntervals(w, minGravelFt) >= 1) {
          rockTopWithGravelBefore++;
        }
      }
      if (gc >= 3) gravelVeinDistribution.threePlus++;
      else if (gc === 2) gravelVeinDistribution.two++;
      else if (gc === 1) gravelVeinDistribution.one++;
      else gravelVeinDistribution.zero++;
      if (uc >= 1) usableGravel.onePlus++;
      else usableGravel.none++;
    } else {
      gravelVeinDistribution.unknown++;
      usableGravel.unknown++;
    }

    const g = parseGpm(w);
    const d = displayDepthFt(w);
    if (g != null) {
      gpmN++;
      gpmAllValues.push(g);
      const bucket = aquiferBucketForGpm(w);
      if (bucket === "unconsolidated") gpmUnconsolidated.push(g);
      else if (bucket === "bedrock") gpmBedrock.push(g);
      if (g < 10) yieldBuckets.under10++;
      else if (g <= 25) yieldBuckets.tenTo25++;
      else yieldBuckets.over25++;
      if (d != null) {
        if (g > 25) depthsHigh.push(d);
        else depthsLow.push(d);
      }
    } else {
      yieldBuckets.unknown++;
    }
    if (d != null) depthsAll.push(d);
  }

  const depthMedianFt = median(depthsAll);
  const depthMedianHighYieldFt = median(depthsHigh);
  const depthMedianLowYieldFt = median(depthsLow);

  const narratives: AreaNarrative[] = [];
  const add = (text: string, scope: NarrativeScope) =>
    narratives.push({ text, scope });

  if (n === 0) {
    add(
      "No registry wells in this radius. Widen the search or confirm coordinates.",
      "all",
    );
  } else {
    add(
      `Found **${n}** DNR registry wells within **${radiusMiles} mi** of the point (all statistics below use only those wells).`,
      "all",
    );
  }

  if (lithN > 0) {
    const denom = lithN;
    add(
      `Among **${lithN}** wells with **lithology intervals and/or chunk vein/rock fields** (\`vein_size_ft\`, \`gravel_thickness_ft\`, \`rock_start_ft\`, \`depth_bedrock\`): **${pct(gravelVeinDistribution.threePlus, denom)}%** show **three or more** sand/gravel/drift intervals (≥${minGravelFt}′ each), **${pct(gravelVeinDistribution.one, denom)}%** show **exactly one**, **${pct(gravelVeinDistribution.two, denom)}%** show **two**, and **${pct(gravelVeinDistribution.zero, denom)}%** show **none** by parsed log + vein thickness rules.`,
      "unconsolidated",
    );
    add(
      `**${pct(usableGravel.onePlus, denom)}%** of those wells have at least **one water-bearing** sand/gravel interval by text rules; **${pct(usableGravel.none, denom)}%** have gravel-like intervals flagged but none matched the water-bearing heuristic (re-check raw logs for borderline wording).`,
      "unconsolidated",
    );
  } else {
    add(
      "No lithology intervals **and** no vein/rock thickness columns in chunk data for wells in this radius — run the statewide ETL (\`build_statewide_data.py\` / chunk sync) so rows include \`lithology_json\` and \`vein_size_ft\` / \`rock_start_ft\` from the same gravel–vein corrector as the well viewer.",
      "all",
    );
  }

  const aqClassified =
    registryAquifer.unconsolidated +
    registryAquifer.rock +
    registryAquifer.estimated +
    registryAquifer.other;
  if (aqClassified > 0) {
    add(
      `Registry **aquifer** field (where present): **${pct(registryAquifer.unconsolidated, aqClassified)}%** unconsolidated/sand/gravel, **${pct(registryAquifer.rock, aqClassified)}%** bedrock/limestone/dolomite, **${pct(registryAquifer.estimated, aqClassified)}%** estimated location, **${pct(registryAquifer.other, aqClassified)}%** other/uncategorized (**${registryAquifer.blank}** wells with blank aquifer in this radius).`,
      "all",
    );
  }

  if (lithN > 0 && rockTopDepths.length > 0) {
    const rockMin = Math.min(...rockTopDepths);
    const rockMax = Math.max(...rockTopDepths);
    const depthBand =
      rockMin === rockMax ? `${rockMin} ft` : `${rockMin}–${rockMax} ft`;
    add(
      `**${pct(rockTopDepths.length, lithN)}%** of wells with lithology logged a **rock top**. Of those, **${pct(rockTopWithGravelBefore, rockTopDepths.length)}%** drilled **sand/gravel before rock** — rock tops here run **${depthBand}**.`,
      "rock",
    );
  }

  if (n > 0) {
    const productive = n - dryOrAbandoned;
    add(
      dryOrAbandoned === 0
        ? "By registry **aquifer / notes** flags, **no dry-hole records** appeared in this slice (still verify on-site)."
        : `**${dryOrAbandoned}** well(s) flagged as dry/abandoned in registry text; **${productive}** treated as water found for this summary.`,
      "all",
    );
  }

  if (gpmN > 0) {
    const gd = gpmN;
    const noGpm = n - gpmN;
    const overallAvg = average(gpmAllValues);
    add(
      `Among **${gpmN}** wells with a parseable **pump/test GPM** field: **${pct(yieldBuckets.under10, gd)}%** are **under 10 GPM**, **${pct(yieldBuckets.tenTo25, gd)}%** fall **10–25 GPM**, **${pct(yieldBuckets.over25, gd)}%** report **over 25 GPM**${overallAvg != null ? ` (avg **${overallAvg.toFixed(1)} GPM** across those wells)` : ""}. Across **all ${n}** wells in the radius, **${pct(noGpm, n)}%** have **no GPM** in the export (older records or missing pump fields).`,
      "all",
    );
    const gravelGpm = yieldBreakdownText(
      gpmUnconsolidated,
      "sand/gravel (unconsolidated)",
    );
    if (gravelGpm) add(gravelGpm, "unconsolidated");
    const rockGpm = yieldBreakdownText(gpmBedrock, "bedrock/rock");
    if (rockGpm) add(rockGpm, "rock");
    if (depthsHigh.length >= 3 && depthsLow.length >= 3) {
      const hi = depthMedianHighYieldFt;
      const lo = depthMedianLowYieldFt;
      if (hi != null && lo != null) {
        add(
          hi > lo
            ? `Wells reporting **over 25 GPM** have a **higher median completed depth (${hi} ft)** here than those at **25 GPM or below (${lo} ft)** — consistent with needing more footage to reach a stronger producing zone in this neighborhood (sample sizes: ${depthsHigh.length} vs ${depthsLow.length}).`
            : `Median depth for **over 25 GPM** wells (**${hi} ft**) is **not deeper** than for **25 GPM or below (${lo} ft)** in this slice — treat yield–depth coupling as **weak** until more tests are in the export.`,
          "all",
        );
      }
    }
  } else {
    add(
      "No GPM values parsed in this radius — enrich chunks with pump/test fields or DNR HTML parsing for capacity data.",
      "all",
    );
  }

  if (depthMedianFt != null) {
    add(
      `**Median completed depth** in the radius: **${depthMedianFt} ft** (from registry depth / construction fields).`,
      "all",
    );
  }

  const disclaimers = [
    "Official DNR registry + WellLogs-derived lithology only; not a guarantee for any new hole.",
    "Percentages are descriptive for the loaded chunk set — widen radius or refresh data to reduce sampling noise.",
    `Vein-style counts use merged lithology when possible, else raw intervals, with flexible depth fields; sand/gravel intervals ≥${minGravelFt}′ thick. When intervals are missing, **vein_size_ft / gravel_thickness_ft** (ETL) count as at least one gravel-like interval if ≥${minGravelFt}′. **rock_start_ft / depth_bedrock** inform rock-top and aquifer inference. Aquifer mix fills blanks via those signals + lithology + completed depth.`,
    "The well viewer modal may still show raw chunk lithology strings.",
  ];

  const covLithPct = n > 0 ? covLithIntervals / n : 0;
  const covVeinPct = n > 0 ? covVein / n : 0;
  const covRockPct = n > 0 ? covRock / n : 0;
  const covAqPct = n > 0 ? covAq / n : 0;
  const weightedScore = Math.round(
    100 * (covLithPct * 0.45 + covVeinPct * 0.2 + covRockPct * 0.15 + covAqPct * 0.2),
  );
  const grade: "high" | "medium" | "low" =
    weightedScore >= 75 ? "high" : weightedScore >= 45 ? "medium" : "low";
  const reasons: string[] = [];
  if (covLithIntervals < n * 0.6) {
    reasons.push("Many nearby wells do not have parseable lithology intervals.");
  }
  if (covAq < n * 0.5) {
    reasons.push("Registry aquifer text is sparse, so inference contributes heavily.");
  }
  if (covVein === 0 && covRock === 0) {
    reasons.push("No vein/rock helper columns were found in this radius.");
  }
  if (!reasons.length) {
    reasons.push("Coverage is strong across lithology, vein/rock columns, and aquifer text.");
  }

  return {
    center: { lat, lon },
    radiusMiles,
    totalWellsInRadius: n,
    wellsWithLithology: lithN,
    wellsWithGpm: gpmN,
    dataCoverage: {
      lithologyIntervals: covLithIntervals,
      veinThicknessCol: covVein,
      rockTopCol: covRock,
      registryAquiferNonBlank: covAq,
    },
    insightQuality: {
      grade,
      score: weightedScore,
      reasons,
    },
    narratives,
    aquiferMix,
    gravelVeinDistribution,
    usableGravel,
    registryAquifer,
    yieldBuckets,
    dryOrAbandoned,
    depthMedianFt,
    depthMedianHighYieldFt,
    depthMedianLowYieldFt,
    disclaimers,
  };
}

/** Convert **bold** markdown-like segments to <strong> for simple rendering. */
export function formatNarrativeHtml(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** Left accent bar color keyed to well-type scope. */
export function narrativeBorderClass(scope: NarrativeScope): string {
  const base =
    "relative pl-3 before:absolute before:left-0 before:top-0 before:h-full before:w-0.5";
  switch (scope) {
    case "unconsolidated":
      return `${base} before:bg-blue-600 dark:before:bg-blue-500`;
    case "rock":
      return `${base} before:bg-red-600 dark:before:bg-red-500`;
    case "all":
    default:
      return `${base} before:bg-[linear-gradient(to_bottom,#2563eb_0%,#2563eb_33.33%,#16a34a_33.33%,#16a34a_66.66%,#dc2626_66.66%,#dc2626_100%)] dark:before:bg-[linear-gradient(to_bottom,#3b82f6_0%,#3b82f6_33.33%,#22c55e_33.33%,#22c55e_66.66%,#ef4444_66.66%,#ef4444_100%)]`;
  }
}
