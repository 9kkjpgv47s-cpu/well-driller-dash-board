/**
 * Port of C&J DNR well viewer map logic (index.html) for marker chips, g/r tags,
 * and filter toggles — kept aligned with the standalone viewer behavior.
 */
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  getLithLayers,
  lithologyFormationName,
  lithologyLayerTopBottomFt,
  primaryAquiferText,
} from "@/lib/area-well-analytics";
import { wellTypeV2 } from "@/lib/lithology-v2";

export const SHOW_G_VEIN_THICKNESS_FT = true;

const ROCK_FORM =
  /lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|rock/i;
const DRY_HOLE_COMMENT_RE =
  /dry hole|dry test|dry well|no water|abandoned|\bplugged\b|insufficient|bad water|can\x27t locate|cannot locate/i;

const WELL_GR_R_OVERRIDES: Record<string, "bedrock" | "unconsolidated"> = {};

export type ViewerMapFilters = {
  elevBlue: boolean;
  elevGreen: boolean;
  elevOrange: boolean;
  elevRed: boolean;
  yieldBlue: boolean;
  yieldGreen: boolean;
  yieldOrange: boolean;
  yieldRed: boolean;
  typeUncon: boolean;
  typeRock: boolean;
  typeBucket: boolean;
  typeDry: boolean;
  typeEstimated: boolean;
  hideWellLabels: boolean;
  minDepth: number;
  maxDepth: number;
  textSearch: string;
  /** Matches viewer marker label +/- control */
  markerLabelScale: number;
};

export const DEFAULT_VIEWER_MAP_FILTERS: ViewerMapFilters = {
  elevBlue: false,
  elevGreen: false,
  elevOrange: false,
  elevRed: false,
  yieldBlue: false,
  yieldGreen: false,
  yieldOrange: false,
  yieldRed: false,
  typeUncon: true,
  typeRock: true,
  typeBucket: true,
  typeDry: true,
  typeEstimated: true,
  hideWellLabels: false,
  minDepth: 0,
  maxDepth: 9999,
  textSearch: "",
  markerLabelScale: 0.62,
};

function lithoFormationName(layer: unknown): string {
  return lithologyFormationName(layer);
}

function lithoLayerTopBottomFt(
  L: unknown,
  prevBot: number,
): { top: number; bot: number } {
  const tb = lithologyLayerTopBottomFt(L, prevBot);
  let top = tb.top;
  if (Number.isNaN(tb.bot)) return { top, bot: NaN };
  if (Number.isNaN(top)) top = Number.isNaN(prevBot) ? 0 : prevBot;
  return { top, bot: tb.bot };
}

function lithoMaxBottomFtForDisplay(w: WellRecord): number | null {
  const layers = getLithLayers(w);
  if (!layers.length) return null;
  let prev = NaN;
  let maxB = -Infinity;
  let sawReal = false;
  for (let i = 0; i < layers.length; i++) {
    const fm = lithoFormationName(layers[i]);
    if (/no digitized|dnr report/i.test(String(fm))) continue;
    sawReal = true;
    const tb = lithoLayerTopBottomFt(layers[i], prev);
    if (!Number.isNaN(tb.bot)) {
      if (tb.bot > maxB) maxB = tb.bot;
      prev = tb.bot;
    }
  }
  if (!sawReal || maxB === -Infinity || maxB < 5) return null;
  return Math.round(maxB);
}

export function getWellDisplayDepthFtViewer(w: WellRecord): number | null {
  if (!w || typeof w !== "object") return null;
  const d = w.depth != null && w.depth !== "" ? parseFloat(String(w.depth).replace(/,/g, "")) : NaN;
  if (!Number.isNaN(d) && d > 0) return Math.round(d);
  const lm = lithoMaxBottomFtForDisplay(w);
  if (lm != null && lm > 0) return lm;
  const cl = parseFloat(String(w.casing_length ?? "").replace(/,/g, ""));
  const sl = parseFloat(String(w.screen_length ?? "").replace(/,/g, ""));
  if (!Number.isNaN(cl) && !Number.isNaN(sl) && cl > 0 && sl > 0)
    return Math.round(cl + sl);
  if (!Number.isNaN(cl) && cl > 0) return Math.round(cl);
  return null;
}

function lastLithoFormation(w: WellRecord): string | null {
  const layers = getLithLayers(w);
  if (!layers.length) return null;
  return lithoFormationName(layers[layers.length - 1]).trim().toLowerCase();
}

function lithoIsJustSand(w: WellRecord): boolean {
  const last = lastLithoFormation(w);
  if (!last) return false;
  return (
    last === "sand" ||
    last === "fine sand" ||
    last === "coarse sand" ||
    last === "brown sand" ||
    last === "yellow sand" ||
    last === "white sand" ||
    last === "red sand" ||
    last === "quicksand"
  );
}

function lithoDepthToRock(w: WellRecord): number | null {
  const layers = getLithLayers(w);
  if (!layers.length) return null;
  let prevBot = NaN;
  for (let i = 0; i < layers.length; i++) {
    const tb = lithoLayerTopBottomFt(layers[i], prevBot);
    if (!Number.isNaN(tb.bot)) prevBot = tb.bot;
    const fm = lithoFormationName(layers[i]).toLowerCase();
    if (
      ROCK_FORM.test(fm) &&
      fm.indexOf("sand and") === -1 &&
      fm.indexOf("gravel") === -1
    ) {
      if (!Number.isNaN(tb.top) && tb.top >= 0) return Math.round(tb.top);
    }
  }
  return null;
}

function isWaterBearingFormation(fmRaw: string): boolean {
  const l = String(fmRaw ?? "").toLowerCase();
  if (!l.trim()) return false;
  if (/dry\s*hole|no\s*water|abandon|plugged|cement\s*fill/i.test(l))
    return false;
  if (
    (/limestone|dolomite|shale|slate|bedrock|granite|marble|\b(ls|lm|dl)\b/i.test(
      l,
    ) &&
      !/sand|grav|gravel|drift|sa\b|gr\b|sg\b|outwash|till/i.test(l)) ||
    (/\bsandstone\b|\bsiltstone\b/i.test(l) &&
      !/grav|gravel|drift|glacial|outwash|till/i.test(l))
  )
    return false;
  if (
    /grav|gravel|\bsg\b|sand\s*\/\s*g|s\s*&\s*g|sand\s*grav|water\s*b\.?|water\s*bearing|water\s*grav|pea\s*grav|gravelly|w\s*\/\s*grav|producing|\baquifer\b|unconsolidated|water\s*zone|pervious|glacial\s*drift/i.test(
      l,
    )
  )
    return true;
  if (l.includes("sandstone") || l.includes("siltstone")) return false;
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

function lithoLooksLikeSandGravelMaterial(fmRaw: string): boolean {
  const l = String(fmRaw ?? "").toLowerCase();
  if (!l.trim()) return false;
  if (/dry\s*hole|no\s*water|abandon|plugged/i.test(l)) return false;
  if (
    (/shale|limestone|dolomite|slate|bedrock|granite|marble/i.test(l) ||
      /\b(ls|lm|dl)\b/i.test(l)) &&
    !/sand|grav|sa\b|gr\b|drift/i.test(l)
  )
    return false;
  return /grav|gravel|\bsand\b|\bsa\b|\bgr\b|\bsg\b|s\s*\/\s*g|s\s*&\s*g|drift|outwash|glacial|fill|till|alluv|terrace|esker|kame|muck|coarse\s*sand|fine\s*sand|medium\s*sand|dirty\s*grav|sandy\s*grav|grav\s*sand|silty\s*sand|sandy\s*silt|topsoil|surface\s*fill|sand\s*fill|pea\s*stone/i.test(
    l,
  );
}

function lastWaterBearingVeinThicknessFt(w: WellRecord): number | null {
  const layers = getLithLayers(w);
  if (!layers.length) return null;
  let bestBottom = -Infinity;
  let bestThick: number | null = null;
  let prevBot = NaN;
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    const fm = lithoFormationName(L);
    const tb = lithoLayerTopBottomFt(L, prevBot);
    if (Number.isNaN(tb.bot)) continue;
    prevBot = tb.bot;
    const top = tb.top;
    const bot = tb.bot;
    if (!isWaterBearingFormation(fm)) continue;
    if (bot <= top) continue;
    const thick = bot - top;
    if (
      bot > bestBottom ||
      (Math.abs(bot - bestBottom) < 1e-6 &&
        bestThick != null &&
        thick > bestThick)
    ) {
      bestBottom = bot;
      bestThick = thick;
    }
  }
  if (bestThick != null) return Math.round(bestThick);
  bestBottom = -Infinity;
  bestThick = null;
  prevBot = NaN;
  for (let j = 0; j < layers.length; j++) {
    const L2 = layers[j];
    const fm2 = lithoFormationName(L2);
    const l2 = fm2.toLowerCase();
    if (!l2.trim() || /dry\s*hole|no\s*water|abandon|plugged/i.test(l2))
      continue;
    if (
      (/shale|limestone|dolomite|bedrock|granite|marble/i.test(l2) ||
        /\b(ls|lm|dl)\b/i.test(l2)) &&
      !/sand|grav|gravel|drift/i.test(l2)
    )
      continue;
    if (
      !/grav|gravel|\bsand\b|\bsa\b|\bgr\b|\bsg\b|s\s*\/\s*g|s\s*&\s*g|drift|outwash|glacial/i.test(
        l2,
      )
    )
      continue;
    const tb2 = lithoLayerTopBottomFt(L2, prevBot);
    if (Number.isNaN(tb2.bot)) continue;
    prevBot = tb2.bot;
    if (tb2.bot <= tb2.top) continue;
    const th2 = tb2.bot - tb2.top;
    if (
      tb2.bot > bestBottom ||
      (Math.abs(tb2.bot - bestBottom) < 1e-6 &&
        bestThick != null &&
        th2 > bestThick)
    ) {
      bestBottom = tb2.bot;
      bestThick = th2;
    }
  }
  if (bestThick == null) return null;
  return Math.round(bestThick);
}

function _csvKeyNorm(k: string): string {
  return String(k ?? "")
    .replace(/^\ufeff/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function _parseCsvFt(val: unknown): number {
  if (val == null || val === "") return NaN;
  return parseFloat(String(val).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
}

/**
 * Same geometry as `build_statewide_data.g_registry_vein_to_rock_sane_vs_depth`:
 * trust baked `vein_size_ft` / `gravel_thickness_ft` from chunks when thickness is
 * strictly less than completed depth (reject typos / full-depth mistakes).
 */
export function gRegistryVeinSaneVsCompletedDepthFt(
  g: number,
  depthFt: number | null,
): boolean {
  if (!Number.isFinite(g) || g <= 0) return false;
  if (depthFt == null || !Number.isFinite(depthFt) || depthFt <= 0) return true;
  if (g > depthFt + 0.5) return false;
  if (g >= depthFt) return false;
  return true;
}

function getVeinSizeFromCsvNumericColumns(w: WellRecord): number | null {
  const exact = [
    "gravel_thickness_ft",
    "vein_size_ft",
    "g_vein_ft",
    "gravel_vein_ft",
    "vein_thickness_ft",
    "gravel_interval_ft",
    "g_ft",
    "gravel_vein",
    "gravel_vein_thickness",
    "gravel_thickness",
  ];
  for (const k of exact) {
    const n0 = _parseCsvFt(w[k]);
    if (!Number.isNaN(n0) && n0 > 0) return Math.round(n0);
  }
  const veinAliases: Record<string, boolean> = {
    gravelthicknessft: true,
    gravelthickness: true,
    gravethickness: true,
    gravelft: true,
    veinsizeft: true,
    veinsize: true,
    veinthicknessft: true,
    veinthickness: true,
    veinthick: true,
    gravelveinft: true,
    gravelvein: true,
    gveinft: true,
    gvein: true,
    gthick: true,
    gravelintervalft: true,
    gravelinterval: true,
    sandgravelthick: true,
    sandgravelthickness: true,
    unconsolidatedvein: true,
    aquiferthicknessft: true,
    producingzoneft: true,
    screengravelft: true,
  };
  for (const pk of Object.keys(w)) {
    const nn = _csvKeyNorm(pk);
    if (!veinAliases[nn]) continue;
    const nv = _parseCsvFt(w[pk]);
    if (!Number.isNaN(nv) && nv > 0) return Math.round(nv);
  }
  return null;
}

function getRockTopFtForGravelMath(w: WellRecord): number | null {
  const lr = lithoDepthToRock(w);
  if (lr != null && lr > 0) return lr;
  const db = parseFloat(String(w.depth_bedrock ?? ""));
  if (!Number.isNaN(db) && db > 0) return Math.round(db);
  return null;
}

function sumAquiferThicknessAboveRockFt(w: WellRecord): number | null {
  const rockTop = getRockTopFtForGravelMath(w);
  if (rockTop == null || Number.isNaN(rockTop)) return null;
  const dS = getWellDisplayDepthFtViewer(w);
  const depth = dS != null ? dS : NaN;
  let effRock = rockTop;
  if (!Number.isNaN(depth) && depth > 0) effRock = Math.min(rockTop, depth);
  const layers = getLithLayers(w);
  if (!layers.length) return null;
  let prevBot = NaN;
  let sum = 0;
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    const fm = lithoFormationName(L);
    const l = fm.toLowerCase();
    const tb = lithoLayerTopBottomFt(L, prevBot);
    if (!Number.isNaN(tb.bot)) prevBot = tb.bot;
    if (
      ROCK_FORM.test(l) &&
      l.indexOf("sand and") === -1 &&
      l.indexOf("gravel") === -1
    )
      break;
    const top = tb.top;
    const bot = tb.bot;
    if (Number.isNaN(bot)) continue;
    if (top >= effRock) break;
    const effBot = Math.min(bot, effRock);
    if (effBot <= top) continue;
    if (isWaterBearingFormation(fm) || lithoLooksLikeSandGravelMaterial(fm))
      sum += effBot - top;
  }
  if (sum <= 0) return null;
  return Math.round(sum);
}

function _testRockOnlyInterval(l: string): boolean {
  return (
    ROCK_FORM.test(l) &&
    l.indexOf("sand and") === -1 &&
    l.indexOf("gravel") === -1
  );
}

function columnSandGravelTopToRockFt(w: WellRecord): number | null {
  const rockTop = getRockTopFtForGravelMath(w);
  if (rockTop == null || Number.isNaN(rockTop)) return null;
  const depthD = getWellDisplayDepthFtViewer(w);
  const depth = depthD != null ? depthD : NaN;
  let effRock = rockTop;
  if (!Number.isNaN(depth) && depth > 0) effRock = Math.min(rockTop, depth);
  const layers = getLithLayers(w);
  if (!layers.length) return null;
  let prevBot = NaN;
  let firstTop: number | null = null;
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    const fm = lithoFormationName(L);
    const l = fm.toLowerCase();
    const tb = lithoLayerTopBottomFt(L, prevBot);
    if (!Number.isNaN(tb.bot)) prevBot = tb.bot;
    if (_testRockOnlyInterval(l)) break;
    if (
      firstTop == null &&
      (lithoLooksLikeSandGravelMaterial(fm) || isWaterBearingFormation(fm))
    ) {
      const tp = tb.top;
      if (!Number.isNaN(tp) && tp >= 0) firstTop = tp;
    }
  }
  if (firstTop == null) firstTop = 0;
  const g = effRock - firstTop;
  if (!(g > 0 && g < 900)) return null;
  return Math.round(g);
}

function getGravelVeinDisplayFt(w: WellRecord): number | null {
  if (!SHOW_G_VEIN_THICKNESS_FT) return null;
  const depth = getWellDisplayDepthFtViewer(w);
  const vCsv = getVeinSizeFromCsvNumericColumns(w);
  if (vCsv != null && gRegistryVeinSaneVsCompletedDepthFt(vCsv, depth)) return vCsv;
  const a = lastWaterBearingVeinThicknessFt(w);
  const b = sumAquiferThicknessAboveRockFt(w);
  const c = columnSandGravelTopToRockFt(w);
  const lithoCand: number[] = [];
  if (a != null && a > 0) lithoCand.push(a);
  if (b != null && b > 0) lithoCand.push(b);
  if (c != null && c > 0) lithoCand.push(c);
  if (lithoCand.length) return Math.max(...lithoCand);
  return null;
}

function getRockTagDepthFt(w: WellRecord): number | null {
  let r = lithoDepthToRock(w);
  if (r == null || Number.isNaN(r)) {
    const db = parseFloat(String(w.depth_bedrock ?? ""));
    if (!Number.isNaN(db) && db > 0) r = Math.round(db);
  }
  if (r == null || Number.isNaN(r)) {
    const cl = parseFloat(String(w.casing_length ?? ""));
    if (!Number.isNaN(cl) && cl > 0) r = Math.round(cl);
  }
  if (r == null || Number.isNaN(r)) return null;
  const depth = getWellDisplayDepthFtViewer(w);
  const depthN = depth != null ? depth : NaN;
  if (!Number.isNaN(depthN) && depthN > 0 && r > depthN + 1) r = Math.round(depthN);
  return r;
}

export function getYieldGpmForWellViewer(w: WellRecord): number | null {
  const pr = w.pump_rate;
  if (
    pr != null &&
    pr !== "" &&
    !Number.isNaN(Number(pr)) &&
    Number(pr) > 0
  )
    return Number(pr);
  const candidates = [
    w.gpm,
    w.gallons_per_minute,
    w.capacity_gpm,
    w.well_yield,
    w.discharge_rate,
    w.yield_gpm,
    w.yield,
    w.pump_capacity,
    w.test_yield,
    w.bailer_rate,
    w.bail_rate,
    w.test_rate,
  ];
  for (const v of candidates) {
    if (v == null || v === "") continue;
    const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

function wellAnalyzerCommentsBlob(w: WellRecord): string {
  const parts: unknown[] = [
    w.notes,
    w.remark,
    w.remarks,
    primaryAquiferText(w),
    w.owner,
    w.static_water,
    w.pump_type,
    w.well_use,
    w.loc_type,
  ];
  const layers = getLithLayers(w);
  for (const L of layers) {
    const lfn = lithoFormationName(L);
    if (lfn) parts.push(lfn);
  }
  return parts
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .toLowerCase();
}

function wellHasStaticWaterIndicator(w: WellRecord): boolean {
  const blob = wellAnalyzerCommentsBlob(w);
  if (blob.indexOf("flowing") >= 0 || blob.indexOf("artesian") >= 0)
    return true;
  function valOk(v: unknown): boolean {
    const s = String(v ?? "")
      .trim()
      .toLowerCase();
    if (!s) return false;
    if (/^(none|unknown|n\/a|dry)$/i.test(s)) return false;
    return /\d/.test(s);
  }
  if (valOk(w.static_water)) return true;
  for (const k of Object.keys(w)) {
    const kl = String(k).toLowerCase();
    if (
      kl.indexOf("static") >= 0 &&
      (kl.indexOf("water") >= 0 ||
        kl.indexOf("wl") >= 0 ||
        kl.indexOf("level") >= 0 ||
        kl.indexOf("swl") >= 0)
    ) {
      if (valOk(w[k])) return true;
    }
  }
  return false;
}

export function isDryHoleViewer(w: WellRecord): boolean {
  const blob = wellAnalyzerCommentsBlob(w);
  if (DRY_HOLE_COMMENT_RE.test(blob)) return true;
  const yieldGpm = getYieldGpmForWellViewer(w);
  const staticPresent = wellHasStaticWaterIndicator(w);
  if ((yieldGpm == null || yieldGpm <= 0) && !staticPresent) return true;
  return false;
}

export function isBucketWellViewer(w: WellRecord): boolean {
  const text =
    `${w.notes ?? ""} ${w.owner ?? ""} ${w.loc_type ?? ""} ${(w as WellRecord).well_type ?? ""} ${(w as WellRecord).pump_type ?? ""} ${(w as WellRecord).well_use ?? ""}`.toLowerCase();
  if (
    text.includes("bucket") ||
    text.includes("hand dug") ||
    text.includes("dug well") ||
    text.includes("dug domestic")
  )
    return true;
  if (lithoIsJustSand(w)) return true;
  if (isDryHoleViewer(w)) return false;
  const cm = String((w as WellRecord).casing_material ?? "").toUpperCase();
  if (
    cm.includes("CONCRETE") ||
    cm.includes("TILE") ||
    cm.includes("BRICK") ||
    cm.includes("STONE")
  ) {
    const depth = parseFloat(String(w.depth));
    const sl = parseFloat(String(w.screen_length ?? ""));
    const sd = parseFloat(
      String((w as WellRecord).screen_diam ?? (w as WellRecord).screen_diameter ?? ""),
    );
    const hasScreen =
      (!Number.isNaN(sl) && sl > 0) || (!Number.isNaN(sd) && sd > 0);
    if (!Number.isNaN(depth) && depth > 0 && depth <= 45 && !hasScreen)
      return true;
  }
  return false;
}

function wellGrRockOverrideKind(w: WellRecord): "bedrock" | "unconsolidated" | null {
  const r =
    w.refno != null && w.refno !== ""
      ? String(w.refno).replace(/\.0+$/, "").trim()
      : "";
  const id = w.id != null && w.id !== "" ? String(w.id).trim() : "";
  if (r && WELL_GR_R_OVERRIDES[r]) return WELL_GR_R_OVERRIDES[r]!;
  if (id && WELL_GR_R_OVERRIDES[id]) return WELL_GR_R_OVERRIDES[id]!;
  return null;
}

export function isUnconsolidatedWellViewer(w: WellRecord): boolean {
  const ov = wellGrRockOverrideKind(w);
  if (ov === "bedrock") return false;
  if (ov === "unconsolidated") return true;

  const v2 = wellTypeV2(w);
  if (v2 === true) return true;
  if (v2 === false) return false;

  const layers = getLithLayers(w);
  const hasRealLitho = layers.length > 0;
  if (hasRealLitho) {
    const wb = lastWaterBearingVeinThicknessFt(w);
    const sg = sumAquiferThicknessAboveRockFt(w);
    const col = columnSandGravelTopToRockFt(w);
    if (
      (wb != null && wb > 0) ||
      (sg != null && sg > 0) ||
      (col != null && col > 0)
    )
      return true;
    const rockFromLitho = lithoDepthToRock(w);
    if (rockFromLitho != null) return false;
  }

  const aq = primaryAquiferText(w).toLowerCase();
  if (
    /\b(bedrock|limestone|dolomite|dolostone|shale|sandstone|siltstone|greensand|granite|marble|basalt|quartzite|chert|gneiss|schist|conglomerate)\b/.test(
      aq,
    )
  )
    return false;
  if (
    aq.includes("unconsolidated") ||
    aq.includes("gravel") ||
    (aq.includes("sand") && !aq.includes("sandstone"))
  )
    return true;

  const db = parseFloat(String(w.depth_bedrock ?? ""));
  let depth = parseFloat(String(w.depth ?? ""));
  if (Number.isNaN(depth) || depth <= 0) {
    const dInf = getWellDisplayDepthFtViewer(w);
    if (dInf != null) depth = dInf;
  }
  if (!Number.isNaN(db) && db > 0 && !Number.isNaN(depth)) {
    if (depth > db) return false;
    return true;
  }

  const lithoRock = lithoDepthToRock(w);
  if (lithoRock != null && !Number.isNaN(depth) && depth > lithoRock)
    return false;
  if (lithoRock != null && !Number.isNaN(depth) && depth <= lithoRock)
    return true;

  const sd = parseFloat(
    String((w as WellRecord).screen_diam ?? (w as WellRecord).screen_diameter ?? ""),
  );
  const sl = parseFloat(String(w.screen_length ?? ""));
  if (!Number.isNaN(sd) && sd > 0) {
    const deepDiamOnly =
      !Number.isNaN(depth) &&
      depth >= 120 &&
      (!sl || sl <= 0) &&
      (Number.isNaN(db) || db <= 0);
    if (!deepDiamOnly) return true;
  }
  if (!Number.isNaN(sl) && sl > 0) return true;
  return false;
}

export function wellGrRNumberForTagViewer(
  w: WellRecord,
): { kind: "g" | "r"; n: number } | null {
  if (isBucketWellViewer(w) || isDryHoleViewer(w)) return null;
  /** Baked chunk `vein_size_ft` (registry / corrector) must show as g even when aquifer text = bedrock. */
  const depth = getWellDisplayDepthFtViewer(w);
  const csvG = getVeinSizeFromCsvNumericColumns(w);
  if (
    csvG != null &&
    csvG > 0 &&
    gRegistryVeinSaneVsCompletedDepthFt(csvG, depth)
  ) {
    return { kind: "g", n: Math.round(csvG) };
  }
  if (isUnconsolidatedWellViewer(w)) {
    const gv = getGravelVeinDisplayFt(w);
    if (gv != null && gv > 0) return { kind: "g", n: Math.round(gv) };
    return null;
  }
  const r = getRockTagDepthFt(w);
  if (r != null && r > 0) return { kind: "r", n: Math.round(r) };
  const rdN = getWellDisplayDepthFtViewer(w);
  if (rdN != null && rdN > 0) return { kind: "r", n: Math.round(rdN) };
  return null;
}

export function wellMapGrTagViewer(w: WellRecord): string {
  const t = wellGrRNumberForTagViewer(w);
  return t ? ` ${t.kind}${t.n}` : "";
}

function getGravelLayerThicknessesFtViewer(w: WellRecord): number[] {
  const layers = getLithLayers(w);
  if (!layers.length) return [];
  const depthFt = getWellDisplayDepthFtViewer(w);
  const depthN = depthFt != null ? Number(depthFt) : NaN;
  const out: number[] = [];
  let prevBot = NaN;
  const gLabelLayerEligibleFormation = (fmRaw: string): boolean => {
    const l = String(fmRaw ?? "").toLowerCase();
    if (!l.trim()) return false;
    if (/dry\s*hole|no\s*water|abandon|plugged/i.test(l)) return false;
    const hasSand =
      /\bsand\b|\bsnds?\b|\bsa\b|fine\s*sand|medium\s*sand|coarse\s*sand|silty\s*sand|sand\s*fill|sandy\b/i.test(
        l,
      );
    const hasGravel =
      /\bgravel\b|\bgrav\b|\bgr\b|\bsg\b|s\s*\/\s*g|s\s*&\s*g|sand\s*and\s*gravel|pea\s*stone/i.test(
        l,
      );
    if (!hasSand && !hasGravel) return false;
    if (
      (/shale|limestone|dolomite|slate|bedrock|granite|marble|sandstone/i.test(
        l,
      ) ||
        /\b(ls|lm|dl)\b/i.test(l)) &&
      !hasSand &&
      !hasGravel
    )
      return false;
    return true;
  };
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    const fm = lithoFormationName(L);
    if (!fm) continue;
    if (/no digitized|merged welllogs|open dnr report|placeholder/i.test(fm))
      continue;
    const tb = lithoLayerTopBottomFt(L, prevBot);
    if (!Number.isNaN(tb.bot)) prevBot = tb.bot;
    if (Number.isNaN(tb.bot) || Number.isNaN(tb.top) || tb.bot <= tb.top) continue;
    if (!gLabelLayerEligibleFormation(fm)) continue;
    let top = tb.top;
    let bot = tb.bot;
    if (!Number.isNaN(depthN) && depthN > 0) {
      if (top < 0) top = 0;
      if (bot > depthN) bot = depthN;
    }
    if (Number.isNaN(top) || Number.isNaN(bot) || bot <= top) continue;
    const thick = Math.round(bot - top);
    if (thick > 0) out.push(thick);
  }
  return out;
}

export function getGravelLayerTagsViewer(w: WellRecord): string[] {
  const layers = getGravelLayerThicknessesFtViewer(w);
  return layers.map((n, i) => `g${i + 1} ${n}`);
}

export function getOrderedTagTokensViewer(w: WellRecord): string[] {
  const t = wellGrRNumberForTagViewer(w);
  const gLayers = getGravelLayerTagsViewer(w);
  const out: string[] = [];
  const aqBed = /bedrock/i.test(String(w.aquifer ?? ""));
  const rDepth = getRockTagDepthFt(w);
  if (rDepth != null && rDepth > 0 && (t?.kind === "r" || aqBed)) out.push(`r${Math.round(rDepth)}`);
  else if (t?.kind === "r") out.push(`r${t.n}`);
  if (gLayers.length) out.push(...gLayers);
  if (!out.length && t?.kind === "g") out.push(`g${t.n}`);
  if (!out.length && t?.kind === "r") out.push(`r${t.n}`);
  return out;
}

export function getWellBottomElevViewer(w: WellRecord): number | null {
  const wbe = w.well_bottom_elev;
  if (wbe != null && wbe !== "" && !Number.isNaN(Number(wbe)))
    return Number(wbe);
  const ge = w.ground_elev;
  const d = w.depth;
  if (
    ge != null &&
    ge !== "" &&
    d != null &&
    d !== "" &&
    !Number.isNaN(Number(ge)) &&
    !Number.isNaN(Number(d)) &&
    Number(d) > 0
  )
    return Math.round(Number(ge) - Number(d));
  return null;
}

export function elevColorViewer(elev: number | null): string {
  if (elev == null) return "#6b7280";
  if (elev >= 700) return "#1d4ed8";
  if (elev >= 600) return "#059669";
  if (elev >= 500) return "#d97706";
  return "#dc2626";
}

export function elevRangeViewer(elev: number | null): "blue" | "green" | "orange" | "red" | null {
  if (elev == null) return null;
  if (elev >= 700) return "blue";
  if (elev >= 600) return "green";
  if (elev >= 500) return "orange";
  return "red";
}

export function yieldColorViewer(gpm: number | null): string {
  if (gpm == null) return "#6b7280";
  if (gpm <= 10) return "#1d4ed8";
  if (gpm <= 25) return "#059669";
  if (gpm <= 50) return "#d97706";
  return "#dc2626";
}

export function yieldRangeViewer(gpm: number | null): "blue" | "green" | "orange" | "red" | null {
  if (gpm == null || gpm <= 0) return null;
  if (gpm <= 10) return "blue";
  if (gpm <= 25) return "green";
  if (gpm <= 50) return "orange";
  return "red";
}

export function wellTypeColorViewer(w: WellRecord): string {
  if (isDryHoleViewer(w)) return "#111827";
  if (isBucketWellViewer(w)) return "#f97316";
  const aq = primaryAquiferText(w).toLowerCase();
  const locType = String(
    (w as WellRecord).location_type ?? w.loc_type ?? "",
  ).toLowerCase();
  if (aq.includes("estimated") || locType.includes("estimated"))
    return "#16a34a";
  if (isUnconsolidatedWellViewer(w)) return "#2563eb";
  return "#dc2626";
}

export function wellTypeLabelViewer(w: WellRecord): string {
  if (isDryHoleViewer(w)) return "Dry";
  if (isBucketWellViewer(w)) return "Bucket";
  const aq = primaryAquiferText(w).toLowerCase();
  const locType = String(
    (w as WellRecord).location_type ?? w.loc_type ?? "",
  ).toLowerCase();
  if (aq.includes("estimated") || locType.includes("estimated")) return "Est";
  if (isUnconsolidatedWellViewer(w)) return "Gravel";
  return "Rock";
}

function checkedIds(f: ViewerMapFilters, ids: (keyof ViewerMapFilters)[]): string[] {
  return ids.filter((id) => f[id] === true) as string[];
}

function hasElevToggles(f: ViewerMapFilters): boolean {
  return checkedIds(f, ["elevBlue", "elevGreen", "elevOrange", "elevRed"]).length > 0;
}

function hasYieldToggles(f: ViewerMapFilters): boolean {
  return checkedIds(f, ["yieldBlue", "yieldGreen", "yieldOrange", "yieldRed"]).length > 0;
}

function hasTypeToggles(f: ViewerMapFilters): boolean {
  return checkedIds(f, [
    "typeUncon",
    "typeRock",
    "typeBucket",
    "typeDry",
    "typeEstimated",
  ]).length > 0;
}

export function getViewerActiveMode(
  f: ViewerMapFilters,
): "both" | "elev" | "yield" | "type" | null {
  const e = hasElevToggles(f);
  const y = hasYieldToggles(f);
  const t = hasTypeToggles(f);
  if (e && y) return "both";
  if (e) return "elev";
  if (y) return "yield";
  if (t) return "type";
  return null;
}

function getElevRanges(f: ViewerMapFilters): ("blue" | "green" | "orange" | "red")[] {
  const map: Record<string, "blue" | "green" | "orange" | "red"> = {
    elevBlue: "blue",
    elevGreen: "green",
    elevOrange: "orange",
    elevRed: "red",
  };
  return (["elevBlue", "elevGreen", "elevOrange", "elevRed"] as const)
    .filter((id) => f[id])
    .map((id) => map[id]);
}

function getYieldRanges(f: ViewerMapFilters): ("blue" | "green" | "orange" | "red")[] {
  const map: Record<string, "blue" | "green" | "orange" | "red"> = {
    yieldBlue: "blue",
    yieldGreen: "green",
    yieldOrange: "orange",
    yieldRed: "red",
  };
  return (["yieldBlue", "yieldGreen", "yieldOrange", "yieldRed"] as const)
    .filter((id) => f[id])
    .map((id) => map[id]);
}

export function passesTypeFilterViewer(w: WellRecord, f: ViewerMapFilters): boolean {
  const showUncon = f.typeUncon;
  const showRock = f.typeRock;
  const showBucket = f.typeBucket;
  const showDry = f.typeDry;
  const showEst = f.typeEstimated;

  if (!showUncon && !showRock && !showBucket && !showDry && !showEst)
    return true;

  const dry = isDryHoleViewer(w);
  if (dry) return showDry;
  const bucket = isBucketWellViewer(w);
  if (bucket) return showBucket;
  const aq = primaryAquiferText(w).toLowerCase();
  const locType = String(
    (w as WellRecord).location_type ?? w.loc_type ?? "",
  ).toLowerCase();
  const estimated =
    aq.includes("estimated") || locType.includes("estimated");
  if (estimated) return showEst;
  const uncon = isUnconsolidatedWellViewer(w);
  if (uncon) return showUncon;
  return showRock;
}

function passesElevFilterViewer(
  w: WellRecord,
  elevRanges: ("blue" | "green" | "orange" | "red")[],
): boolean {
  if (!elevRanges.length) return true;
  const be = getWellBottomElevViewer(w);
  if (be == null) return false;
  const r = elevRangeViewer(be);
  return r != null && elevRanges.includes(r);
}

function passesYieldFilterViewer(
  w: WellRecord,
  yldRanges: ("blue" | "green" | "orange" | "red")[],
): boolean {
  if (!yldRanges.length) return true;
  const gpm = getYieldGpmForWellViewer(w);
  if (gpm == null) return false;
  const r = yieldRangeViewer(gpm);
  return r != null && yldRanges.includes(r);
}

function wellMatchesTextSearch(w: WellRecord, q: string): boolean {
  if (!q.trim()) return true;
  const t = q.toLowerCase().trim();
  const dDisp = getWellDisplayDepthFtViewer(w);
  const identityText = String(
    (w as WellRecord).well_key ??
      (w as WellRecord).well_id_canonical ??
      "",
  )
    .toLowerCase()
    .trim();
  const aliasText = String((w as WellRecord).well_identity_aliases ?? "")
    .toLowerCase()
    .trim();
  const provenanceText = String((w as WellRecord).well_identity_provenance ?? "")
    .toLowerCase()
    .trim();
  const confidenceText = String((w as WellRecord).well_identity_confidence ?? "")
    .toLowerCase()
    .trim();
  return (
    String(w.id ?? "")
      .toLowerCase()
      .includes(t) ||
    identityText.includes(t) ||
    aliasText.includes(t) ||
    provenanceText.includes(t) ||
    confidenceText.includes(t) ||
    primaryAquiferText(w).toLowerCase().includes(t) ||
    String(w.owner ?? "")
      .toLowerCase()
      .includes(t) ||
    String(w.notes ?? "")
      .toLowerCase()
      .includes(t) ||
    String(w.depth ?? "").includes(t) ||
    (dDisp != null && String(dDisp).includes(t)) ||
    String((w as WellRecord).permit ?? "")
      .toLowerCase()
      .includes(t)
  );
}

export function wellPassesHubViewerFilters(w: WellRecord, f: ViewerMapFilters): boolean {
  if (!passesTypeFilterViewer(w, f)) return false;
  const dM = getWellDisplayDepthFtViewer(w);
  const d = dM != null ? dM : NaN;
  if (
    !Number.isNaN(d) &&
    (d < f.minDepth || d > f.maxDepth)
  )
    return false;

  const showElev = hasElevToggles(f);
  const showYield = hasYieldToggles(f);
  if (showElev && !passesElevFilterViewer(w, getElevRanges(f))) return false;
  if (showYield && !passesYieldFilterViewer(w, getYieldRanges(f))) return false;

  if (!wellMatchesTextSearch(w, f.textSearch)) return false;
  return true;
}

function cjComboChipMaxBounds(
  effRows: number,
  zScale: number,
): { maxW: number; maxH: number } {
  const z = Math.max(0.55, Math.min(1.35, zScale));
  if (effRows <= 1) {
    return { maxW: Math.min(200, Math.round(142 * z)), maxH: Math.round(40 * z) };
  }
  if (effRows === 2) {
    return { maxW: Math.min(188, Math.round(128 * z)), maxH: Math.round(54 * z) };
  }
  return { maxW: Math.min(178, Math.round(118 * z)), maxH: Math.round(70 * z) };
}

function cjComboMarkerMeasure(
  comboFs: number,
  longestText: number,
  effRows: number,
  zScale: number,
): { innerW: number; innerH: number; rowH: number } {
  const lt = Math.max(longestText, 3);
  const er = Math.max(1, effRows);
  const charPx = comboFs * 0.64;
  const innerW = Math.max(32, Math.ceil(lt * charPx + 14));
  const rowH = Math.max(Math.ceil(comboFs * 1.48), Math.round(13 * zScale));
  const innerH = Math.max(
    Math.ceil(comboFs * 1.22),
    er * rowH + (er > 1 ? er - 1 : 0),
  );
  return { innerW, innerH, rowH };
}

function cjFitComboMarkerFs(
  longestText: number,
  effRows: number,
  zScale: number,
  markerLabelScale: number,
): number {
  const lt = Math.max(longestText, 3);
  const er = Math.max(1, effRows);
  const bounds = cjComboChipMaxBounds(er, zScale);
  const maxW = bounds.maxW;
  const maxH = bounds.maxH;
  const mls = Math.max(0.45, Math.min(1.25, markerLabelScale));
  let lo = 3.6 * mls;
  let hi = (er <= 1 ? 13.5 : er === 2 ? 10.5 : 8.8) * mls;
  if (hi > 14.5) hi = 14.5;
  let best = lo;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) / 2;
    const m = cjComboMarkerMeasure(mid, lt, er, zScale);
    if (m.innerW <= maxW && m.innerH <= maxH) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  let fs = Math.max(3.6, Math.round(best * 10) / 10);
  let meas = cjComboMarkerMeasure(fs, lt, er, zScale);
  for (let fix = 0; fix < 6; fix++) {
    if (meas.innerW <= maxW && meas.innerH <= maxH) break;
    fs = Math.max(3.6, Math.round(fs * 0.9 * 10) / 10);
    meas = cjComboMarkerMeasure(fs, lt, er, zScale);
  }
  return fs;
}

export type ViewerMarkerBuild = {
  html: string;
  iconW: number;
  iconH: number;
  iconAnchor: [number, number];
  popupHtml: string;
  isCombo: boolean;
};

function escAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build Leaflet divIcon HTML + popup — mirrors viewer refreshMap() branches. */
export function buildViewerWellMarker(
  w: WellRecord,
  f: ViewerMapFilters,
  mapZoom: number,
): ViewerMarkerBuild {
  const latNum = Number(w.lat);
  const lonNum = Number(w.lon);
  const showElev = hasElevToggles(f);
  const showYield = hasYieldToggles(f);
  const showType = hasTypeToggles(f);
  const mode = getViewerActiveMode(f);

  const depthVal = getWellDisplayDepthFtViewer(w);
  const depthStr = depthVal != null ? `${Math.round(depthVal)}'` : "–";
  const depthFtPlain = depthVal != null ? String(Math.round(depthVal)) : "–";
  const extraTag = wellMapGrTagViewer(w);

  const popupLines: string[] = [
    `<b>${escAttr(String(w.id ?? w.refno ?? "?"))}</b>`,
  ];
  if (w.county) popupLines.push(`${escAttr(String(w.county))} County`);

  const rowCount =
    (showType ? 1 : 0) + (showElev ? 1 : 0) + (showYield ? 1 : 0);
  const zScale =
    Math.max(0.38, Math.min(1.2, 0.2 + (mapZoom - 7) * 0.065)) *
    f.markerLabelScale;
  const dotSize = Math.max(7, Math.round(12 * zScale));

  if (rowCount >= 1 && mode) {
    const rows: string[] = [];
    let gROnCombo = false;
    if (showType) {
      const tc = wellTypeColorViewer(w);
      const tl = wellTypeLabelViewer(w);
      const grn = wellGrRNumberForTagViewer(w);
      const typeRowInner = grn
        ? `${depthFtPlain} ${grn.kind}${grn.n}`
        : `${tl} ${depthStr}${extraTag}`;
      rows.push(
        `<div class="cm-row" style="background:${tc};color:#fff">${escAttr(typeRowInner)}</div>`,
      );
      popupLines.push(
        escAttr(
          grn
            ? `${tl} · ${depthFtPlain} ft · ${grn.kind}${grn.n}`
            : `${tl} · ${depthStr}${extraTag ? ` · ${extraTag.trim()}` : ""}`,
        ),
      );
      if (extraTag || grn) gROnCombo = true;
    }
    if (showElev) {
      const be = getWellBottomElevViewer(w);
      const beLabel = be != null ? `${be}'` : "–";
      const eSuf = !gROnCombo && extraTag ? extraTag : "";
      if (eSuf) gROnCombo = true;
      rows.push(
        `<div class="cm-row" style="background:${elevColorViewer(be)};color:#fff">${escAttr(beLabel)} ASL${escAttr(eSuf)}</div>`,
      );
      popupLines.push(
        escAttr(
          `Bottom: ${be != null ? `${be} ft ASL` : "unknown"}${eSuf ? ` · ${eSuf.trim()}` : ""}`,
        ),
      );
    }
    if (showYield) {
      const gpm = getYieldGpmForWellViewer(w);
      const gpmLabel = gpm != null ? `${gpm} gpm` : "–";
      const ySuf = !gROnCombo && extraTag ? extraTag : "";
      if (ySuf) gROnCombo = true;
      rows.push(
        `<div class="cm-row" style="background:${yieldColorViewer(gpm)};color:#fff">${escAttr(gpmLabel)}${escAttr(ySuf)}</div>`,
      );
      popupLines.push(
        escAttr(
          `Yield: ${gpm != null ? `${gpm} GPM` : "unknown"}${ySuf ? ` · ${ySuf.trim()}` : ""}`,
        ),
      );
    }
    if (!gROnCombo && extraTag) {
      rows.push(
        `<div class="cm-row" style="background:#475569;color:#fff">${escAttr(extraTag.trim())}</div>`,
      );
      popupLines.push(escAttr(extraTag.trim()));
      gROnCombo = true;
    }
    if (!showType && depthVal != null)
      popupLines.push(escAttr(`Depth: ${depthVal} ft`));

    const effRows = rows.length || rowCount;
    let longestText = 0;
    for (const row of rows) {
      const stripped = row.replace(/<[^>]+>/g, "");
      if (stripped.length > longestText) longestText = stripped.length;
    }
    const comboFs = cjFitComboMarkerFs(
      longestText,
      effRows,
      zScale,
      f.markerLabelScale,
    );
    const lay = cjComboMarkerMeasure(comboFs, longestText, effRows, zScale);
    const innerW = lay.innerW;
    const innerH = lay.innerH;
    const padB = 4;
    const iconW = innerW + padB * 2;
    const iconH = innerH + padB * 2;
    const markerHtml = `<div class="vj-combo-marker" style="font-size:${comboFs}px;width:${innerW}px;min-width:${innerW}px;max-width:${innerW}px">${rows.join("")}</div>`;

    return {
      html: markerHtml,
      iconW,
      iconH,
      iconAnchor: [Math.round(iconW / 2), Math.round(iconH / 2)],
      popupHtml: popupLines.join("<br/>"),
      isCombo: true,
    };
  }

  const color = wellTypeColorViewer(w);
  popupLines.push(
    escAttr(
      `${depthVal != null ? depthVal : "—"} ft${extraTag ? ` · ${extraTag.trim()}` : ""}`,
    ),
  );
  popupLines.push(
    `<a href="https://maps.apple.com/?daddr=${latNum},${lonNum}" target="_blank" rel="noopener">Apple Maps</a> · <a href="https://www.google.com/maps/dir/?api=1&destination=${latNum},${lonNum}" target="_blank" rel="noopener">Google Maps</a>`,
  );
  const depthTxt = depthVal != null ? String(Math.round(depthVal)) : "–";
  const tagFs = Math.max(5, Math.round(7 * zScale));
  const tagEsc = extraTag
    ? String(extraTag)
        .trim()
        .replace(/</g, "")
        .replace(/>/g, "")
    : "";
  const dotBlock = `<div style="display:flex;flex-direction:column;align-items:center;"><div class="vj-well-marker" style="background:${color};width:${dotSize}px;height:${dotSize}px;flex-shrink:0;"><span class="vj-well-depth-label" style="font-size:${Math.max(6, Math.round(9 * zScale))}px">${escAttr(depthTxt)}</span></div>${tagEsc ? `<div style="margin-top:1px;font-size:${tagFs}px;font-weight:800;color:#0f172a;text-shadow:0 0 3px #fff,0 0 4px #fff;line-height:1.1;white-space:nowrap">${escAttr(tagEsc)}</div>` : ""}</div>`;
  const bw = tagEsc
    ? Math.max(dotSize, Math.min(130, Math.round(6 + tagEsc.length * tagFs * 0.52)))
    : dotSize;
  const bh = tagEsc ? dotSize + Math.round(tagFs + 8) : dotSize;

  return {
    html: dotBlock,
    iconW: bw,
    iconH: bh,
    iconAnchor: [Math.round(bw / 2), Math.round(dotSize / 2)],
    popupHtml: popupLines.join("<br/>"),
    isCombo: false,
  };
}
