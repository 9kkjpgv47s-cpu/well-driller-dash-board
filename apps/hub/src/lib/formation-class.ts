/**
 * Formation / well-type classification from lithology + **construction geometry**.
 *
 * Dual-label model:
 * - locationQuality (verified | estimated) is separate
 * - formationClass (unconsolidated | rock | unknown) never uses "estimated"
 *
 * Construction policy (driller practice — higher confidence than word matching alone):
 * - **Rock well**: no screen; casing set at/into rock top; total depth continues
 *   below casing (open hole into rock). A few feet into rock is normal
 *   (rock @ 100 → casing 102–105). There is **never** a rock well where casing
 *   ends exactly at rock top with **no** additional drill footage below casing.
 * - **Unconsolidated well**: screen used (or open sand/gravel completion with
 *   real S&G water-bearing interval — not sandstone / sand-rock).
 *
 * Lithology names are diverse (sandstone, sand rock, sandrock, sandra rock) but
 * construction is the verifier when casing/screen/depth are present.
 */

import {
  chunkGravelThicknessFt,
  chunkRockTopFt,
  getLithLayers,
  lithologyFormationName,
  lithologyLayerTopBottomFt,
  primaryAquiferText,
  type WellRecord,
} from "@/lib/area-well-analytics";

export type LayerCategory =
  | "rock"
  | "unconsolidated"
  | "mixed"
  | "overburden"
  | "ignore"
  | "unknown";

/**
 * Single-letter lithology code for map/detail stack labels (Dom 2026-07-22+).
 * C = clay/hardpan/soil · G = water-bearing sand/gravel · S = non-water-bearing sand · R = rock
 */
export type LayerCode = "C" | "G" | "S" | "R" | "?";

export type FormationClass = "unconsolidated" | "rock" | "unknown";

export type ConstructionKind =
  | "rock_open_hole"
  | "screen_set"
  | "unknown";

export type LayerLabel = {
  index: number;
  formation: string;
  topFt: number | null;
  bottomFt: number | null;
  thicknessFt: number | null;
  category: LayerCategory;
  /** C=clay/hardpan/soil, G=water-bearing sand/gravel, S=dry sand, R=rock, ?=unknown */
  code: LayerCode;
  ruleId: string;
  countsTowardUncon: boolean;
  isRockTopSignal: boolean;
};

export type ConstructionSignals = {
  casingLengthFt: number | null;
  screenLengthFt: number | null;
  screenDiam: number | null;
  hasScreen: boolean;
  noScreen: boolean;
  totalDepthFt: number | null;
  /** Footage drilled below bottom of casing (open hole). */
  openHoleBelowCasingFt: number | null;
  /** How far casing extends past rock top (positive = into rock). */
  casingIntoRockFt: number | null;
  /** Feet from casing shoe to rock top (positive = casing stops above rock). */
  casingAboveRockFt: number | null;
  kind: ConstructionKind;
  /** Producing set depth for map chip: bottom of casing (rock) or mid-screen / casing+screen. */
  producingSetFt: number | null;
  /**
   * Compact map text only:
   * - R17 = top of rock (ft) — not casing shoe when they differ (no @)
   * - G1 2 / G2 10 = water-bearing sand/gravel aquifer thickness (ft)
   * - S1 5 = non-water-bearing sand thickness (driller insight)
   * - Interleaved by depth: S1 5 / G1 2 / S2 8 or S1 5 / R45
   * Never C-stack or Est text (those are detail / marker color).
   */
  setLabel: string | null;
  reasons: string[];
};

export type FormationClassResult = {
  formationClass: FormationClass;
  rockTopFt: number | null;
  unconsolidatedFt: number | null;
  layers: LayerLabel[];
  /**
   * Merged lithology stack, e.g. `C0-36` or `C0-14 / S14-16 / C16-20 / G20-22 / C22-45`.
   * Empty string when no parseable layers.
   */
  layerStackLabel: string;
  /** Bottoms (ft) of every water-bearing G interval — multi-vein wells list all. */
  veinBottomsFt: number[];
  /** Thickness (ft) of every water-bearing G aquifer interval, shallow → deep. */
  veinThicknessesFt: number[];
  /**
   * Face chip for S + G intervals in depth order: `S1 5 / G1 2` or `G1 2 / G2 10`.
   * G = water-bearing sand/gravel thickness; S = non-water-bearing sand thickness.
   * Null when neither S nor G layers exist.
   */
  veinSetLabel: string | null;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  rulesetId: string;
  construction: ConstructionSignals;
};

export const FORMATION_CLASS_RULESET =
  "formation-class-v3-construction-2026-07-23-g-before-r";

/**
 * Chip separator on map face and detail stacks.
 * Dom 2026-07-22: no mid-dot (·) — use a plain slash.
 */
export const LABEL_CHIP_SEP = " / ";

/** True when label is a gravel/sand aquifer chip (G@… legacy or G1 2 thickness form). */
export function isGravelSetLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  // Accept mid-dot, slash, or start-of-string so old and new labels both match.
  return /(?:^|[·/])\s*G@/i.test(label) || /(?:^|[·/])\s*G\d+(\s+\d+)?/i.test(label);
}

/** True when label includes a non-water-bearing sand chip (S1 5). */
export function isSandSetLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /(?:^|[·/])\s*S\d+(\s+\d+)?/i.test(label);
}

/** True when label is a rock-top chip (R20 or legacy R@20), possibly after S/G chips. */
export function isRockSetLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /(?:^|[·/])\s*R@?\d+/i.test(label);
}

/** Map/home face chips: R rock top, G thickness, and/or S thickness (not C stacks). */
export function isMapFaceSetLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return (
    isRockSetLabel(label) ||
    isGravelSetLabel(label) ||
    isSandSetLabel(label)
  );
}

/**
 * Field map R chip = **top of rock** (lithology first), not casing shoe.
 * Format is plain `R20` (no @). Dom 2026-07-22: drop the @ sign; single standard R.
 * Prefer rockTop; fall back to casing only when rock top is unknown.
 */
export function rockSetLabelFromTop(
  rockTopFt: number | null | undefined,
  casingLengthFt: number | null | undefined = null,
): string | null {
  if (rockTopFt != null && rockTopFt > 0) return `R${Math.round(rockTopFt)}`;
  if (casingLengthFt != null && casingLengthFt > 0)
    return `R${Math.round(casingLengthFt)}`;
  return null;
}

/** Min water-bearing uncon ft that can override weak rock construction. */
const MIN_UNCON_OVERRIDE_FT = 8;

/**
 * Casing may stop slightly above rock top (measurement noise) or a few feet into rock.
 * Typical: rock @ 100, casing 102–105.
 */
const CASING_ROCK_ABOVE_TOL_FT = 3;
const CASING_INTO_ROCK_MAX_FT = 15;

/** Minimum open hole below casing required to call a rock well. */
const MIN_OPEN_HOLE_ROCK_FT = 1.5;

const DRY_RE = /dry\s*hole|no\s*water|abandon|plugged|cement\s*fill/i;

const ROCK_AQ_RE =
  /\b(bedrock|limestone|dolomite|dolostone|shale|sandstone|siltstone|granite|marble)\b/i;
const UNCON_AQ_RE = /\b(unconsolidated|sand|gravel|drift|outwash)\b/i;

/**
 * Consolidated sandstone / sandrock variants — MUST run before generic "sand".
 * Includes spaced forms and common OCR/typos (sandra rock).
 */
const SANDSTONE_VARIANTS_RE =
  /sand\s*stone|sandstone|\bss\b|sand\s*[-_]?\s*rock|sandrock|sandy\s*rock|sandra\s*rock|sandr\s*rock|snd\s*rock|s\s*rock(?!\s*(and|&|\/)\s*g)|white\s*sand\s*rock|yel(?:low)?\s*sand\s*rock|brn\s*sand\s*rock|gray\s*sand\s*rock|grey\s*sand\s*rock|soft\s*sand\s*rock|hard\s*sand\s*rock/i;

/** Ordered pattern rules (first match wins). */
const PATTERN_RULES: { id: string; re: RegExp; category: LayerCategory }[] = [
  {
    id: "placeholder",
    re: /no digitized|merged welllogs|open dnr report|placeholder|^\s*-\s*$/i,
    category: "ignore",
  },
  {
    id: "dry_abandon",
    re: DRY_RE,
    category: "ignore",
  },
  // Sandstone family BEFORE any free "sand" match
  {
    id: "sandstone_family",
    re: SANDSTONE_VARIANTS_RE,
    category: "rock",
  },
  {
    id: "water_bearing_stone",
    re: /water\s*bear.*\bstone\b|\bstone\b.*water\s*bear/i,
    category: "rock",
  },
  {
    id: "hard_rock",
    re: /hard\s*rock|solid\s*rock|bedrock|rip\s*rap/i,
    category: "rock",
  },
  {
    id: "limestone_dolomite",
    re: /limestone|dolomite|dolostone|lime\s*stone|\blime\b|gray\s*lime|grey\s*lime|br\s*lime|hard\s*lime|sandy\s*lime/i,
    category: "rock",
  },
  {
    id: "shale_slate",
    re: /\bshale\b|\bslate\b|\bsh\b(?!\s*&\s*g)/i,
    category: "rock",
  },
  {
    id: "siltstone_quartzite",
    re: /\bsiltstone\b|\bquartzite\b|\bchert\b/i,
    category: "rock",
  },
  {
    id: "igneous_metamorphic",
    re: /granite|marble|basalt|gneiss|schist|conglomerate|argillite|\bcoal\b/i,
    category: "rock",
  },
  {
    id: "bedrock_abbrev",
    re: /\b(ls|lm|dl|dol)\b/i,
    category: "rock",
  },
  {
    id: "topsoil_fill",
    re: /^top\s*soil$|^topsoil$|^fill$|^soil$|^surface$|^top$|^dirt$|fill\s*dirt|surface\s*fill|blanket|overburden|top\s*dirt|black\s*dirt|hard\s*gray\s*soil|gray\s*soil/i,
    category: "overburden",
  },
  {
    id: "sand_gravel_explicit",
    re: /\bs\s*&\s*g\b|\bsg\b|sand\s*\/\s*g|sand\s*grav|sand\s+and\s+grav|s\s+and\s+g/i,
    category: "unconsolidated",
  },
  {
    id: "gravel",
    re: /\bgrav\b|\bgravel\b|pea\s*grav|gravelly|pea\s*stone/i,
    category: "unconsolidated",
  },
  {
    id: "water_bearing_uncons",
    // Do NOT match bare "vein" alone — too many false positives on rock notes.
    re: /water\s*b\.?|water\s*bearing|water\s*grav|water\s*zone|producing|water\s*vein|gravel\s*vein|sand\s*vein/i,
    category: "unconsolidated",
  },
  {
    id: "drift_outwash",
    re: /glacial\s*drift|\bdrift\b|outwash|esker|kame|\btill\b|alluv|terrace/i,
    category: "unconsolidated",
  },
  {
    id: "sand",
    // Explicit loose sand — sandstone family already claimed above.
    // \bsand\b does not match "sandy" (word continues), so sandy clay hits clay_silt.
    re: /\bsand\b|\bsa\b|\bgr\b(?!\s*ls)|\bfine\s+sand\b|\bcoarse\s+sand\b|\bmedium\s+sand\b/i,
    category: "unconsolidated",
  },
  {
    id: "clay_silt",
    // hard pan / hardpan / clay / silt — non-water-bearing unless mixed with gravel
    re: /\bclay\b|\bsilt\b|\bmuck\b|\bpeat\b|\bloam\b|hard\s*pan|hardpan|caliche|sandy\s*clay|clayey/i,
    category: "mixed",
  },
  {
    id: "generic_rock_word",
    re: /\brock\b|\bstone\b/i,
    category: "rock",
  },
];

export function formationCategoryForName(name: string): {
  category: LayerCategory;
  ruleId: string;
} {
  const raw = (name || "").trim();
  if (!raw) return { category: "ignore", ruleId: "empty" };
  if (DRY_RE.test(raw)) return { category: "ignore", ruleId: "dry" };
  for (const rule of PATTERN_RULES) {
    if (rule.re.test(raw)) return { category: rule.category, ruleId: rule.id };
  }
  return { category: "unknown", ruleId: "none" };
}

/**
 * Water-bearing sand/gravel signals → G (aquifer).
 * Includes gravel, S&G, wet sand, water-bearing, glacial outwash/drift.
 */
const WATER_BEARING_MATERIAL_RE =
  /water\s*b\.?|water\s*bearing|\bwet\b|producing|water\s*vein|gravel\s*vein|sand\s*vein|\bgrav|\bgravel|pea\s*stone|\bs\s*&\s*g\b|\bsg\b|sand\s*\/\s*g|sand\s*grav|sand\s+and\s+grav|s\s+and\s+g|outwash|esker|kame|glacial\s*drift|\bdrift\b/i;

/** Loose sand word (not sandstone family — caller must exclude that first). */
const LOOSE_SAND_WORD_RE =
  /\bsand\b|\bsa\b|\bfine\s+sand\b|\bcoarse\s+sand\b|\bmedium\s+sand\b/i;

/** True when formation is water-bearing uncon material (G). */
export function isWaterBearingMaterial(fm: string): boolean {
  if (!fm || isSandstoneFamily(fm)) return false;
  return WATER_BEARING_MATERIAL_RE.test(fm);
}

/**
 * True when formation is loose sand that is NOT water-bearing (S).
 * Sandy clay stays C; wet/gravel/S&G stay G.
 */
export function isNonWaterBearingSand(fm: string): boolean {
  if (!fm || isSandstoneFamily(fm)) return false;
  if (isWaterBearingMaterial(fm)) return false;
  if (/sandy\s*clay|clayey\s*sand|sand\s*rock|sandstone/i.test(fm)) return false;
  return LOOSE_SAND_WORD_RE.test(fm);
}

/**
 * Map a classified layer to Dom's single-letter code:
 * C = clay / hardpan / soil / non-water overburden
 * G = water-bearing sand / gravel / S&G / wet sand
 * S = sand that is not water-bearing (driller insight)
 * R = rock / bedrock / sandstone family
 * ? = unknown / blank
 */
export function layerCodeFor(
  category: LayerCategory,
  formation: string,
  countsTowardUncon: boolean,
): LayerCode {
  if (category === "ignore") return "?";
  if (category === "rock" || isSandstoneFamily(formation)) return "R";
  // Water-bearing first (gravel, wet, S&G, outwash…)
  if (isWaterBearingMaterial(formation)) return "G";
  // Plain sand without water signals → S (not G)
  if (isNonWaterBearingSand(formation)) return "S";
  // Other uncon that still counts (e.g. rare abbreviated forms) → G
  if (category === "unconsolidated" || countsTowardUncon) return "G";
  if (
    category === "overburden" ||
    category === "mixed" ||
    /clay|hard\s*pan|hardpan|silt|muck|peat|loam|soil|dirt|fill|till/i.test(
      formation || "",
    )
  )
    return "C";
  if (category === "unknown") return "?";
  return "?";
}

/**
 * Merge consecutive same-code layers into a compact stack string.
 * Example: clay 0–18 + clay 18–36 → `C0-36`; hardpan→shale → `C0-17 / R17-105`.
 */
export function buildLayerStackLabel(layers: LayerLabel[]): string {
  type Seg = { code: LayerCode; top: number; bot: number };
  const segs: Seg[] = [];
  for (const L of layers) {
    if (L.code === "?" && L.category === "ignore") continue;
    if (L.topFt == null || L.bottomFt == null) continue;
    if (!(L.bottomFt > L.topFt)) continue;
    const code = L.code === "?" ? "?" : L.code;
    const last = segs[segs.length - 1];
    if (last && last.code === code && Math.abs(last.bot - L.topFt) < 0.51) {
      last.bot = Math.max(last.bot, L.bottomFt);
    } else {
      segs.push({ code, top: L.topFt, bot: L.bottomFt });
    }
  }
  if (!segs.length) return "";
  return segs
    .map(
      (s) =>
        `${s.code}${Math.round(s.top)}-${Math.round(s.bot)}`,
    )
    .join(LABEL_CHIP_SEP);
}

export type VeinInterval = {
  /** 1-based order from top of hole (G1, G2, …). */
  index: number;
  topFt: number;
  bottomFt: number;
  /** Aquifer footage (bottom − top), rounded to whole feet (≥1 when interval is real). */
  thicknessFt: number;
};

export type SandFaceChip = {
  /** G = water-bearing · S = non-water-bearing sand */
  code: "G" | "S";
  /** 1-based index within that code (G1, G2… or S1, S2…). */
  index: number;
  topFt: number;
  bottomFt: number;
  thicknessFt: number;
};

/**
 * Water-bearing G aquifer intervals from lithology, shallow → deep.
 * Consecutive G layers that touch are merged into one aquifer.
 */
export function veinIntervalsFromLayers(layers: LayerLabel[]): VeinInterval[] {
  return faceChipsFromLayers(layers)
    .filter((c) => c.code === "G")
    .map((c, i) => ({
      index: i + 1,
      topFt: c.topFt,
      bottomFt: c.bottomFt,
      thicknessFt: c.thicknessFt,
    }));
}

/**
 * Dom 2026-07-22: if an S chip matches a G chip (same depth span or same
 * top+thickness), keep G only. Water-bearing wins over dry-sand insight.
 */
export function preferGOverMatchingS(chips: SandFaceChip[]): SandFaceChip[] {
  if (!chips.length) return chips;
  const gChips = chips.filter((c) => c.code === "G");
  if (!gChips.length) return chips;
  const kept = chips.filter((c) => {
    if (c.code !== "S") return true;
    for (const g of gChips) {
      const sameTop = Math.abs(c.topFt - g.topFt) <= 1;
      const sameBot = Math.abs(c.bottomFt - g.bottomFt) <= 1;
      const sameThick = c.thicknessFt === g.thicknessFt;
      // Exact/near-same interval, or same top + same thickness → G wins
      if ((sameTop && sameBot) || (sameTop && sameThick)) return false;
      // S fully contained inside a G aquifer → drop S (it's the wet sand)
      if (c.topFt >= g.topFt - 0.5 && c.bottomFt <= g.bottomFt + 0.5) {
        return false;
      }
    }
    return true;
  });
  // Re-index after drops so S1/G1 stay sequential without gaps
  let gIdx = 0;
  let sIdx = 0;
  return kept.map((c) => {
    const index = c.code === "G" ? ++gIdx : ++sIdx;
    return { ...c, index };
  });
}

/**
 * S + G face chips in hole order (top → bottom).
 * Consecutive same-code layers that touch merge into one chip.
 * Indices restart per letter: S1, G1, S2, G2…
 * When S matches G on the same span, G wins (Dom).
 */
export function faceChipsFromLayers(layers: LayerLabel[]): SandFaceChip[] {
  type Seg = { code: "G" | "S"; top: number; bot: number };
  const segs: Seg[] = [];
  for (const L of layers) {
    if (L.code !== "G" && L.code !== "S") continue;
    if (L.topFt == null || L.bottomFt == null) continue;
    if (!(L.bottomFt > L.topFt)) continue;
    const code = L.code as "G" | "S";
    const last = segs[segs.length - 1];
    if (
      last &&
      last.code === code &&
      Math.abs(last.bot - L.topFt) < 0.51
    ) {
      last.bot = Math.max(last.bot, L.bottomFt);
    } else {
      segs.push({ code, top: L.topFt, bot: L.bottomFt });
    }
  }
  let gIdx = 0;
  let sIdx = 0;
  const raw = segs.map((s) => {
    const top = Math.round(s.top);
    const bot = Math.round(s.bot);
    const rawTh = bot - top;
    const thicknessFt =
      rawTh > 0 ? rawTh : Math.max(1, Math.round(s.bot - s.top));
    const index = s.code === "G" ? ++gIdx : ++sIdx;
    return {
      code: s.code,
      index,
      topFt: top,
      bottomFt: bot,
      thicknessFt,
    };
  });
  return preferGOverMatchingS(raw);
}

/** Bottoms of every G (sand/gravel) interval, shallow → deep. */
export function veinBottomsFromLayers(layers: LayerLabel[]): number[] {
  return veinIntervalsFromLayers(layers)
    .map((v) => v.bottomFt)
    .filter((n) => n > 0);
}

/** Thickness (ft) of every G aquifer, shallow → deep. */
export function veinThicknessesFromLayers(layers: LayerLabel[]): number[] {
  return veinIntervalsFromLayers(layers).map((v) => v.thicknessFt);
}

/**
 * Field map face chips for S + G in depth order.
 * - Water-bearing 2 ft → `G1 2`
 * - Dry sand 5 ft then wet 2 ft → `S1 5 / G1 2`
 * - Multi aquifer: `G1 2 / G2 10`
 *
 * G = water-bearing thickness; S = non-water-bearing sand (insight only).
 */
export function faceSetLabelFromChips(chips: SandFaceChip[]): string | null {
  if (!chips.length) return null;
  return chips
    .map((c) => `${c.code}${c.index} ${c.thicknessFt}`)
    .join(LABEL_CHIP_SEP);
}

/**
 * True when depth falls inside a sand/gravel (S or G) lith interval.
 * Used to reject chunk rock_start that lands mid-gravel (Dom 2026-07-23:
 * rock top cannot sit before/inside gravel).
 */
export function depthInsideSandGravelInterval(
  depthFt: number,
  layers: LayerLabel[],
): boolean {
  if (!(depthFt > 0)) return false;
  for (const L of layers) {
    if (L.code !== "G" && L.code !== "S") continue;
    if (L.topFt == null || L.bottomFt == null) continue;
    if (!(L.bottomFt > L.topFt)) continue;
    // Interior of the package (not the exact bottom = rock contact OK)
    if (depthFt > L.topFt + 0.5 && depthFt < L.bottomFt - 0.5) return true;
  }
  return false;
}

/**
 * Keep only S/G face chips that sit above rock top. Clip straddling chips.
 * Gravel/sand below rock never appear on the map face (impossible stack).
 * Re-indexes S1/G1… after filter. Dom 2026-07-23 depth-order rule.
 */
export function faceChipsAboveRockTop(
  chips: SandFaceChip[],
  rockTopFt: number | null | undefined,
): SandFaceChip[] {
  if (rockTopFt == null || !(rockTopFt > 0)) return chips;
  const rt = rockTopFt;
  const clipped: SandFaceChip[] = [];
  for (const c of chips) {
    if (c.topFt >= rt - 0.5) continue; // entirely at/below rock
    const bot = Math.min(c.bottomFt, rt);
    const top = c.topFt;
    if (!(bot > top)) continue;
    const thicknessFt = Math.max(1, Math.round(bot - top));
    clipped.push({
      code: c.code,
      index: c.index,
      topFt: Math.round(top),
      bottomFt: Math.round(bot),
      thicknessFt,
    });
  }
  // Re-index sequential S1/G1 after drops
  let gIdx = 0;
  let sIdx = 0;
  return clipped.map((c) => {
    const index = c.code === "G" ? ++gIdx : ++sIdx;
    return { ...c, index };
  });
}

/**
 * Defensive label order: all S/G chips first (already depth-ordered), rock last.
 * Never emit R… / G… on the face (rock cannot come before gravel).
 */
export function ensureRockChipLastOnFaceLabel(
  label: string | null | undefined,
): string | null {
  if (!label) return null;
  const raw = String(label).trim();
  if (!raw) return null;
  const parts = raw
    .split(/\s*[·/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const rock: string[] = [];
  const other: string[] = [];
  for (const p of parts) {
    if (/^R@?\d+$/i.test(p)) rock.push(p.replace(/^R@/i, "R"));
    else other.push(p);
  }
  if (!rock.length) return other.join(LABEL_CHIP_SEP);
  return [...other, ...rock].join(LABEL_CHIP_SEP);
}

/**
 * Field map G-only chip (legacy helper). Prefer faceSetLabelFromLayers for map face.
 */
export function veinSetLabelFromIntervals(
  intervals: VeinInterval[],
): string | null {
  if (!intervals.length) return null;
  return intervals
    .map((v) => `G${v.index} ${v.thicknessFt}`)
    .join(LABEL_CHIP_SEP);
}

/** S + G face label from layers (depth order). */
export function faceSetLabelFromLayers(layers: LayerLabel[]): string | null {
  return faceSetLabelFromChips(faceChipsFromLayers(layers));
}

/** @deprecated Bottoms alone cannot express aquifer footage — use veinSetLabelFromIntervals. */
export function veinSetLabelFromBottoms(_bottoms: number[]): string | null {
  return null;
}

function isSandstoneFamily(fm: string): boolean {
  return SANDSTONE_VARIANTS_RE.test(fm || "");
}

function layerCountsTowardUnconsolidated(
  category: LayerCategory,
  fm: string,
): boolean {
  // Never count sandstone / sand-rock as uncon water-bearing
  if (isSandstoneFamily(fm)) return false;
  // Dry / non-water-bearing sand is insight only (S) — does not count as aquifer
  if (isNonWaterBearingSand(fm)) return false;
  // Water-bearing materials always count
  if (isWaterBearingMaterial(fm)) return true;
  if (category === "unconsolidated") {
    // Remaining uncon (e.g. pure gravel already matched; till without sand word)
    // Do not count bare category alone for plain sand (handled above as S).
    return !isNonWaterBearingSand(fm);
  }
  if (category === "rock" || category === "overburden" || category === "ignore")
    return false;
  if (category === "mixed") {
    const l = fm.toLowerCase();
    return /grav|gravel|\bsg\b|s\s*&\s*g|sand\s*grav|s\s+and\s+g/i.test(l);
  }
  const l = fm.toLowerCase();
  if (
    /lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|\brock\b/i.test(
      l,
    ) &&
    !/sand\s+and|gravel|drift|sa\b|gr\b|sg\b|outwash|till/i.test(l)
  )
    return false;
  // Aquifer-only materials (no plain dry sand — that is S)
  return /grav|gravel|\bsg\b|s\s*&\s*g|sand\s*grav|water\s*b\.?|water\s*bearing|outwash|drift|\bwet\b|\bgr\b/i.test(
    l,
  );
}

function layerIsRockTopSignal(category: LayerCategory, fm: string): boolean {
  if (isSandstoneFamily(fm) || category === "rock") return true;
  if (
    category === "unconsolidated" ||
    category === "overburden" ||
    category === "ignore"
  )
    return false;
  const l = fm.toLowerCase();
  return (
    /lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|\brock\b/i.test(
      l,
    ) &&
    !l.includes("sand and") &&
    !l.includes("gravel")
  );
}

function aquiferClass(aq: string): "bedrock" | "unconsolidated" | "unknown" {
  const s = (aq || "").trim();
  if (!s) return "unknown";
  if (/^estimated\b/i.test(s) || s.toLowerCase() === "estimated location")
    return "unknown";
  if (ROCK_AQ_RE.test(s) && !/unconsolidated|sand\s*(and|&)?\s*grav/i.test(s))
    return "bedrock";
  if (UNCON_AQ_RE.test(s) && !/sandstone|siltstone/i.test(s))
    return "unconsolidated";
  if (ROCK_AQ_RE.test(s)) return "bedrock";
  return "unknown";
}

function positiveFt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function displayDepthFt(w: WellRecord): number | null {
  return positiveFt(w.depth);
}

/**
 * Construction geometry from casing / screen / total depth / rock top.
 *
 * Rock open-hole well requires ALL of:
 *  1) no screen
 *  2) rock top known
 *  3) casing set near rock top (slightly above OK within tol, or a few ft into rock)
 *  4) total depth > casing by MIN_OPEN_HOLE_ROCK_FT
 *     — casing ending at rock top with no open hole is NOT a rock well
 */
export function analyzeConstruction(
  w: WellRecord,
  rockTopFt: number | null,
  formationHint: FormationClass | null = null,
): ConstructionSignals {
  const reasons: string[] = [];
  const casingLengthFt = positiveFt(w.casing_length);
  const screenLengthFt = positiveFt(w.screen_length);
  const screenDiam = positiveFt(
    (w as WellRecord).screen_diam ?? (w as WellRecord).screen_diameter,
  );
  const totalDepthFt = displayDepthFt(w);

  const hasScreen =
    (screenLengthFt != null && screenLengthFt > 0) ||
    (screenDiam != null && screenDiam > 0);
  const noScreen = !hasScreen;

  let openHoleBelowCasingFt: number | null = null;
  if (
    casingLengthFt != null &&
    totalDepthFt != null &&
    totalDepthFt > casingLengthFt
  ) {
    openHoleBelowCasingFt = Math.round((totalDepthFt - casingLengthFt) * 10) / 10;
  } else if (casingLengthFt != null && totalDepthFt != null) {
    openHoleBelowCasingFt = 0;
  }

  let casingIntoRockFt: number | null = null;
  let casingAboveRockFt: number | null = null;
  if (casingLengthFt != null && rockTopFt != null && rockTopFt > 0) {
    const delta = casingLengthFt - rockTopFt;
    if (delta >= 0) {
      casingIntoRockFt = Math.round(delta * 10) / 10;
      casingAboveRockFt = 0;
    } else {
      casingAboveRockFt = Math.round(-delta * 10) / 10;
      casingIntoRockFt = 0;
    }
  }

  let kind: ConstructionKind = "unknown";
  let producingSetFt: number | null = null;
  let setLabel: string | null = null;

  if (hasScreen) {
    kind = "screen_set";
    reasons.push("construction:screen_present");
    // Tentative G@ — final label may become R@ when formation is rock and
    // lithology has no sand/gravel water-bearing interval (caller re-hints).
    if (casingLengthFt != null && screenLengthFt != null) {
      // Screen typically hangs below casing shoe
      producingSetFt = Math.round(casingLengthFt + screenLengthFt / 2);
      setLabel = `G@${Math.round(casingLengthFt)}`;
    } else if (casingLengthFt != null) {
      producingSetFt = Math.round(casingLengthFt);
      setLabel = `G@${Math.round(casingLengthFt)}`;
    } else if (screenLengthFt != null && totalDepthFt != null) {
      producingSetFt = Math.round(totalDepthFt - screenLengthFt / 2);
      setLabel = `G@${producingSetFt}`;
    }
  } else if (
    noScreen &&
    rockTopFt != null &&
    rockTopFt > 0 &&
    casingLengthFt != null &&
    totalDepthFt != null
  ) {
    const into = casingIntoRockFt ?? -999;
    const above = casingAboveRockFt ?? 999;
    const open = openHoleBelowCasingFt ?? 0;
    const casingNearRock =
      (into >= 0 && into <= CASING_INTO_ROCK_MAX_FT) ||
      (above >= 0 && above <= CASING_ROCK_ABOVE_TOL_FT && into === 0);

    if (open < MIN_OPEN_HOLE_ROCK_FT) {
      // Explicit rule: casing ends at rock with no open hole → NOT rock well
      reasons.push(
        `construction:reject_rock_no_open_hole casing=${casingLengthFt} depth=${totalDepthFt} rock=${rockTopFt}`,
      );
      kind = "unknown";
    } else if (casingNearRock) {
      kind = "rock_open_hole";
      reasons.push(
        `construction:rock_open_hole casing=${casingLengthFt} rock_top=${rockTopFt} open_hole=${open}`,
      );
      if (into > 0) {
        reasons.push(`construction:casing_into_rock_ft:${into}`);
      }
      producingSetFt = Math.round(rockTopFt ?? casingLengthFt);
      setLabel = rockSetLabelFromTop(rockTopFt, casingLengthFt);
    } else if (above > CASING_ROCK_ABOVE_TOL_FT) {
      reasons.push(
        `construction:casing_stops_${above}ft_above_rock_top`,
      );
    } else if (into > CASING_INTO_ROCK_MAX_FT) {
      reasons.push(
        `construction:casing_deep_into_rock_${into}ft`,
      );
      // Still can be rock if no screen + open hole — casing long into rock is unusual but open hole still rock
      if (open >= MIN_OPEN_HOLE_ROCK_FT) {
        kind = "rock_open_hole";
        reasons.push("construction:rock_open_hole_deep_casing");
        producingSetFt = Math.round(rockTopFt ?? casingLengthFt);
        setLabel = rockSetLabelFromTop(rockTopFt, casingLengthFt);
      }
    }
  } else if (noScreen && totalDepthFt != null && casingLengthFt != null) {
    const open = openHoleBelowCasingFt ?? 0;
    if (open >= MIN_OPEN_HOLE_ROCK_FT && rockTopFt == null) {
      // No screen + open hole without rock top — weak rock hint only
      reasons.push(
        `construction:no_screen_open_hole_${open}ft_no_rock_top`,
      );
    }
  }

  // Final set chip: rock always prefers R@rockTop (even if a screen length is
  // listed but there is no sand/gravel completion). G@ only for unconsolidated.
  // Dom: R@ = top of rock, never casing shoe when rock top is known (avoids R@20 vs R@17).
  if (formationHint === "rock") {
    const rLab = rockSetLabelFromTop(rockTopFt, casingLengthFt);
    if (rLab) {
      setLabel = rLab;
      producingSetFt =
        rockTopFt != null && rockTopFt > 0
          ? Math.round(rockTopFt)
          : casingLengthFt != null
            ? Math.round(casingLengthFt)
            : producingSetFt;
      if (kind === "screen_set") {
        reasons.push("construction:set_label_rock_overrides_screen_G");
      }
      if (
        rockTopFt != null &&
        casingLengthFt != null &&
        Math.round(rockTopFt) !== Math.round(casingLengthFt)
      ) {
        reasons.push(
          `construction:R_at_rock_top_not_casing rock=${Math.round(rockTopFt)} casing=${Math.round(casingLengthFt)}`,
        );
      }
    }
  } else if (
    formationHint === "unconsolidated" &&
    casingLengthFt != null &&
    !setLabel
  ) {
    setLabel = `G@${Math.round(casingLengthFt)}`;
    producingSetFt = Math.round(casingLengthFt);
  } else if (
    formationHint === "unconsolidated" &&
    casingLengthFt != null &&
    setLabel?.startsWith("G@")
  ) {
    // keep tentative G@ from screen
  } else if (formationHint === "unknown" || formationHint == null) {
    // leave setLabel as-is for intermediate construction pass
  }

  // Unknown formation: strip G@ that came only from a bare screen field —
  // caller may re-apply when final type is uncon with real sand/gravel.
  if (formationHint === "unknown" && setLabel?.startsWith("G@") && hasScreen) {
    // Keep during intermediate null-hint pass; strip only on explicit unknown.
    // (null hint keeps G for construction.kind detection)
  }
  if (formationHint === "unknown" && kind === "screen_set") {
    setLabel = null;
    producingSetFt = null;
    reasons.push("construction:no_G_label_without_uncon_formation");
  }

  return {
    casingLengthFt,
    screenLengthFt,
    screenDiam,
    hasScreen,
    noScreen,
    totalDepthFt,
    openHoleBelowCasingFt,
    casingIntoRockFt,
    casingAboveRockFt,
    kind,
    producingSetFt,
    setLabel,
    reasons,
  };
}

/**
 * Label every lithology layer and decide well formation class.
 * Construction geometry can override pure word matching.
 */
export function classifyFormationFromWell(w: WellRecord): FormationClassResult {
  const reasons: string[] = [];
  const layersRaw = getLithLayers(w);
  const layers: LayerLabel[] = [];
  let prevBot = NaN;
  let rockTop: number | null = null;
  let wbSum = 0;
  let onlyOverburdenUncon = true;
  let hadSandstoneFamilyInUnconPath = false;

  for (let i = 0; i < layersRaw.length; i++) {
    const L = layersRaw[i];
    const fm = lithologyFormationName(L);
    const tb = lithologyLayerTopBottomFt(L, prevBot);
    if (!Number.isNaN(tb.bot)) prevBot = tb.bot;

    const { category, ruleId } = formationCategoryForName(fm);
    const topOk = !Number.isNaN(tb.top);
    const botOk = !Number.isNaN(tb.bot);
    const thick =
      topOk && botOk && tb.bot > tb.top ? tb.bot - tb.top : null;
    const countsTowardUncon = layerCountsTowardUnconsolidated(category, fm);
    const isRockTop = layerIsRockTopSignal(category, fm);
    const code = layerCodeFor(category, fm, countsTowardUncon);

    if (rockTop == null && isRockTop && topOk && tb.top >= 0) {
      rockTop = tb.top;
    }

    if (countsTowardUncon && thick != null && thick > 0) {
      wbSum += thick;
      if (category !== "overburden") onlyOverburdenUncon = false;
    }
    // Track if sandstone family was mis-tagged historically (should be rock now)
    if (isSandstoneFamily(fm) && thick != null && thick > 0) {
      hadSandstoneFamilyInUnconPath = true;
    }

    layers.push({
      index: i,
      formation: fm,
      topFt: topOk ? tb.top : null,
      bottomFt: botOk ? tb.bot : null,
      thicknessFt: thick,
      category,
      code,
      ruleId,
      countsTowardUncon,
      isRockTopSignal: isRockTop,
    });
  }

  const lithHadRockSignal = layers.some((L) => L.isRockTopSignal);
  const hasLithLayers = layersRaw.length > 0;
  const totalDepthForSane = displayDepthFt(w);

  const chunkRock = chunkRockTopFt(w);
  if (chunkRock != null && chunkRock > 0) {
    const chunkInSg = depthInsideSandGravelInterval(chunkRock, layers);
    if (rockTop == null) {
      // Distrust depth_bedrock / rock_start when lithology has no rock and the
      // column equals completed depth (common clay-only bad fill, e.g. 36=36).
      const equalsDepth =
        totalDepthForSane != null &&
        Math.abs(chunkRock - totalDepthForSane) < 0.51;
      if (hasLithLayers && !lithHadRockSignal && equalsDepth) {
        reasons.push(
          `reject_chunk_rock_top_equals_depth_no_lith_rock:${chunkRock}`,
        );
      } else if (hasLithLayers && !lithHadRockSignal) {
        reasons.push(`reject_chunk_rock_top_no_lith_rock:${chunkRock}`);
      } else if (chunkInSg) {
        // Rock top cannot sit inside gravel/sand (Dom 2026-07-23)
        reasons.push(`reject_chunk_rock_top_inside_sg:${chunkRock}`);
      } else {
        rockTop = chunkRock;
        reasons.push(`rock_top_from_chunk:${chunkRock}`);
      }
    } else if (chunkInSg) {
      reasons.push(`reject_chunk_rock_top_inside_sg_keep_lith:${chunkRock}`);
    } else if (chunkRock < rockTop) {
      rockTop = chunkRock;
      reasons.push(`rock_top_min_chunk:${chunkRock}`);
    }
  }

  // Vein / gravel_thickness column — often polluted with rock_start value.
  // G label requires real sand / sand&gravel; never invent uncon from a bad col.
  const veinFt = chunkGravelThicknessFt(w);
  if (veinFt != null && veinFt > 0 && wbSum <= 0) {
    const rockCol = chunkRockTopFt(w);
    const equalsRockCol =
      rockCol != null && Math.abs(veinFt - rockCol) < 0.51;
    const exceedsOrEqualsDepth =
      totalDepthForSane != null && veinFt >= totalDepthForSane;
    if (equalsRockCol) {
      reasons.push(
        `reject_vein_column_equals_rock_start:${veinFt}`,
      );
    } else if (exceedsOrEqualsDepth) {
      reasons.push(`reject_vein_column_vs_depth:${veinFt}`);
    } else if (hasLithLayers && wbSum <= 0) {
      // Lithology present with zero sand/gravel intervals — do not trust column
      reasons.push(
        `reject_vein_column_no_sand_gravel_lithology:${veinFt}`,
      );
    } else {
      wbSum = veinFt;
      onlyOverburdenUncon = false;
      reasons.push(`uncon_from_vein_column:${veinFt}`);
    }
  }

  const aq = primaryAquiferText(w);
  const aqCls = aquiferClass(aq);
  if (aqCls !== "unknown") reasons.push(`aquifer_text:${aqCls}`);

  let wellType: FormationClass = "unknown";
  const wb = wbSum > 0 ? Math.round(wbSum) : null;
  const hasRealUncon = wb != null && wb > 0;

  // --- Construction analysis (uses rock top) ---
  const construction = analyzeConstruction(w, rockTop, null);
  reasons.push(...construction.reasons);

  // --- Primary decision with construction priority ---

  // 1) Strong rock construction: no screen + casing at/into rock + open hole
  if (construction.kind === "rock_open_hole") {
    wellType = "rock";
    reasons.push("decide:rock_by_construction");
  }

  // 2) Screen set → unconsolidated ONLY when real sand/gravel (or no lithology).
  // Clay / hardpan / soil alone must NOT get a G label.
  if (wellType === "unknown" && construction.kind === "screen_set") {
    if (hasRealUncon) {
      wellType = "unconsolidated";
      reasons.push(`decide:uncon_by_screen_and_thickness:${wb}`);
    } else if (rockTop != null && rockTop > 0) {
      // Screen field present but log is rock / no S&G — treat as rock set
      reasons.push("screen_present_but_no_sand_gravel_prefer_rock_path");
    } else if (!hasLithLayers) {
      wellType = "unconsolidated";
      reasons.push("decide:uncon_by_screen_no_lithology");
    } else {
      reasons.push(
        "decide:skip_screen_uncon_clay_or_non_water_bearing_lithology",
      );
    }
  }

  // 3) Lithology thickness when construction inconclusive
  if (wellType === "unknown") {
    if (hasRealUncon) {
      wellType = "unconsolidated";
      reasons.push(`uncon_thickness_ft:${wb}`);
    } else if (rockTop != null && rockTop > 0) {
      // Rock top alone is NOT enough — need open hole past rock (below casing if known)
      // Screen alone does not block rock when there is no sand/gravel.
      const screenBlocksRock = construction.hasScreen && hasRealUncon;
      if (screenBlocksRock) {
        reasons.push("reject:rock_top_screen_with_uncon");
      } else if (
        construction.casingLengthFt != null &&
        construction.openHoleBelowCasingFt != null &&
        construction.openHoleBelowCasingFt < MIN_OPEN_HOLE_ROCK_FT &&
        construction.noScreen
      ) {
        reasons.push("reject:rock_top_without_open_hole_below_casing");
      } else if (
        construction.noScreen &&
        construction.openHoleBelowCasingFt != null &&
        construction.openHoleBelowCasingFt >= MIN_OPEN_HOLE_ROCK_FT
      ) {
        wellType = "rock";
        reasons.push(
          `rock_top_ft:${Math.round(rockTop)}_with_open_hole:${construction.openHoleBelowCasingFt}`,
        );
      } else if (
        construction.hasScreen &&
        !hasRealUncon &&
        construction.casingLengthFt != null &&
        construction.totalDepthFt != null &&
        (construction.totalDepthFt > rockTop + MIN_OPEN_HOLE_ROCK_FT ||
          construction.casingLengthFt >= rockTop)
      ) {
        // Rock log + screen field but no S&G → R@ (producing set at casing)
        wellType = "rock";
        reasons.push(
          `rock_top_ft:${Math.round(rockTop)}_screen_ignored_no_uncon`,
        );
      } else if (
        construction.casingLengthFt == null &&
        construction.totalDepthFt != null &&
        construction.totalDepthFt > rockTop + MIN_OPEN_HOLE_ROCK_FT
      ) {
        // No casing field: completed depth below rock top = open hole into rock
        wellType = "rock";
        reasons.push(
          `rock_top_ft:${Math.round(rockTop)}_depth_below_rock:${construction.totalDepthFt}`,
        );
      } else {
        // Lithology alone: rock layers continue below rock top, no sand/gravel
        let lithBotMax: number | null = null;
        for (const L of layers) {
          if (L.bottomFt != null && Number.isFinite(L.bottomFt)) {
            lithBotMax =
              lithBotMax == null
                ? L.bottomFt
                : Math.max(lithBotMax, L.bottomFt);
          }
        }
        if (
          !hasRealUncon &&
          lithBotMax != null &&
          lithBotMax > rockTop + MIN_OPEN_HOLE_ROCK_FT
        ) {
          wellType = "rock";
          reasons.push(
            `rock_from_lithology_into_rock top=${Math.round(rockTop)} bot=${Math.round(lithBotMax)}`,
          );
        } else {
          reasons.push(
            `rock_top_seen:${Math.round(rockTop)}_insufficient_construction`,
          );
        }
      }
    }
  }

  // 4) Sandstone family must not remain uncon
  if (wellType === "unconsolidated" && hadSandstoneFamilyInUnconPath && (wb ?? 0) < 8) {
    // If "uncon" thickness was actually all misread before fix, re-check:
    // with current rules sandstone doesn't count toward wb, so this is rare
  }

  // 5) Construction rock overrides false uncon (thin surface fill only)
  if (
    wellType === "unconsolidated" &&
    construction.kind === "rock_open_hole" &&
    (wb ?? 0) < MIN_UNCON_OVERRIDE_FT
  ) {
    wellType = "rock";
    reasons.push("override:rock_construction_beats_thin_uncon");
  }

  // 6) Bedrock aquifer + thin uncon/overburden + evidence of rock completion
  // Screen only blocks rock when there is real sand/gravel thickness.
  if (wellType === "unconsolidated" && aqCls === "bedrock") {
    if ((wb ?? 0) < MIN_UNCON_OVERRIDE_FT && rockTop != null) {
      if (construction.hasScreen && hasRealUncon) {
        reasons.push("override:skipped_bedrock_aq_because_screen_with_uncon");
      } else {
        const depthPastRock =
          construction.totalDepthFt != null &&
          construction.totalDepthFt > rockTop + MIN_OPEN_HOLE_ROCK_FT;
        const openPastCasing =
          (construction.openHoleBelowCasingFt ?? 0) >= MIN_OPEN_HOLE_ROCK_FT;
        // Reject if we explicitly know casing ends with no open hole (no screen path)
        const casingSealedNoOpen =
          construction.noScreen &&
          construction.casingLengthFt != null &&
          construction.openHoleBelowCasingFt != null &&
          construction.openHoleBelowCasingFt < MIN_OPEN_HOLE_ROCK_FT;

        if (casingSealedNoOpen) {
          reasons.push("override:skipped_bedrock_aq_no_open_hole");
        } else if (
          construction.kind === "rock_open_hole" ||
          openPastCasing ||
          depthPastRock ||
          onlyOverburdenUncon ||
          (construction.hasScreen && !hasRealUncon)
        ) {
          wellType = "rock";
          reasons.push("override:bedrock_aq_thin_uncon_with_rock_completion");
        }
      }
    }
  }

  // 7) Screen + real sand/gravel → not a rock open-hole well
  if (wellType === "rock" && construction.hasScreen && hasRealUncon) {
    wellType = "unconsolidated";
    reasons.push("override:screen_with_uncon_thickness_not_rock");
  } else if (wellType === "rock" && construction.hasScreen && !hasRealUncon) {
    reasons.push("screen_ignored_no_sand_gravel_keep_rock");
  }

  // 8) Registry aquifer fallback — never invent G from "Unconsolidated" alone
  // when lithology is clay/hardpan/soil with no sand/gravel.
  if (wellType === "unknown") {
    if (aqCls === "unconsolidated") {
      if (hasRealUncon) {
        wellType = "unconsolidated";
        reasons.push("fallback_aquifer_unconsolidated_with_thickness");
      } else if (!hasLithLayers) {
        wellType = "unconsolidated";
        reasons.push("fallback_aquifer_unconsolidated_no_lithology");
      } else {
        reasons.push(
          "fallback:skip_aquifer_uncon_no_sand_gravel_in_lithology",
        );
      }
    } else if (aqCls === "bedrock") {
      if (construction.hasScreen && hasRealUncon) {
        wellType = "unconsolidated";
        reasons.push("fallback:bedrock_aq_but_screen_with_uncon");
      } else if (
        construction.casingLengthFt != null &&
        construction.totalDepthFt != null &&
        (construction.openHoleBelowCasingFt ?? 0) < MIN_OPEN_HOLE_ROCK_FT &&
        construction.noScreen
      ) {
        reasons.push("fallback:bedrock_aq_but_no_open_hole_rejected");
      } else {
        wellType = "rock";
        reasons.push("fallback_aquifer_bedrock");
      }
    }
  }

  // 9) Last resort: screen present + real uncon OR no lithology
  if (wellType === "unknown" && construction.hasScreen) {
    if (hasRealUncon || !hasLithLayers) {
      wellType = "unconsolidated";
      reasons.push("fallback_screen_present");
    } else {
      reasons.push("fallback:skip_screen_without_sand_gravel_lithology");
    }
  }

  // Refresh set label with final formation (R@ wins for rock; G@ only for uncon)
  const constructionFinal = analyzeConstruction(w, rockTop, wellType);
  // Keep original construction reasons already pushed; merge set label
  construction.setLabel = constructionFinal.setLabel;
  construction.producingSetFt = constructionFinal.producingSetFt;
  if (wellType === "rock" && construction.kind === "screen_set") {
    construction.kind =
      constructionFinal.kind === "rock_open_hole"
        ? "rock_open_hole"
        : construction.kind;
  } else {
    construction.kind =
      construction.kind === "unknown"
        ? constructionFinal.kind
        : construction.kind;
  }

  // Strip G labels when final formation is not unconsolidated (clay-only etc.)
  if (wellType !== "unconsolidated" && isGravelSetLabel(construction.setLabel)) {
    if (wellType === "rock") {
      // R@ = rock top (not casing) when known
      const rLab = rockSetLabelFromTop(rockTop, construction.casingLengthFt);
      if (rLab) {
        construction.setLabel = rLab;
        construction.producingSetFt =
          rockTop != null && rockTop > 0
            ? Math.round(rockTop)
            : construction.casingLengthFt != null
              ? Math.round(construction.casingLengthFt)
              : null;
      } else {
        construction.setLabel = null;
        construction.producingSetFt = null;
      }
    } else {
      construction.setLabel = null;
      construction.producingSetFt = null;
      reasons.push("strip_G_label_non_uncon_formation");
    }
  }
  // Force rock map chip to rock top even when construction already set R@casing
  if (wellType === "rock") {
    const rLab = rockSetLabelFromTop(rockTop, construction.casingLengthFt);
    if (rLab) {
      construction.setLabel = rLab;
      if (rockTop != null && rockTop > 0) {
        construction.producingSetFt = Math.round(rockTop);
      }
    }
  }
  // Strip G for uncon with zero sand/gravel thickness and only clay lithology
  if (
    wellType === "unconsolidated" &&
    !hasRealUncon &&
    hasLithLayers &&
    isGravelSetLabel(construction.setLabel)
  ) {
    construction.setLabel = null;
    construction.producingSetFt = null;
    reasons.push("strip_G_label_no_sand_gravel_thickness");
  }

  // Layer stack + face chips: S (dry sand) + G (water-bearing) in depth order
  const layerStackLabel = buildLayerStackLabel(layers);
  const faceChipsAll = faceChipsFromLayers(layers);
  // Dom 2026-07-23: gravel/sand on the face must sit ABOVE rock top.
  // Drop or clip any S/G at/below rock so labels never read rock-before-gravel.
  const faceChips =
    wellType === "rock"
      ? faceChipsAboveRockTop(faceChipsAll, rockTop)
      : faceChipsAll;
  const veinIntervals = veinIntervalsFromLayers(layers).filter((v) => {
    if (wellType !== "rock" || rockTop == null || !(rockTop > 0)) return true;
    return v.topFt < rockTop - 0.5;
  });
  const veinBottomsFt = veinIntervals.map((v) => v.bottomFt).filter((n) => n > 0);
  const veinThicknessesFt = veinIntervals.map((v) => v.thicknessFt);
  // Full face label includes S + G interleaved (Dom 2026-07-22 S-label request)
  const veinSetLabel = faceSetLabelFromChips(faceChips);
  const hasG = faceChips.some((c) => c.code === "G");
  const hasS = faceChips.some((c) => c.code === "S");
  const rockChip = rockSetLabelFromTop(
    rockTop,
    construction.casingLengthFt,
  );

  // Prefer lithology S/G footage over construction G@casing set depth.
  // Map chip: S1 5 / G1 2 / G2 10 (depth order), not G@ bottoms.
  // Rock always last: G… / S… / R{top} — never R before gravel.
  if (veinSetLabel && faceChips.length >= 1) {
    if (wellType === "rock" && rockChip) {
      // Sand/gravel insight above rock stays visible; R chip is always last
      construction.setLabel = ensureRockChipLastOnFaceLabel(
        `${veinSetLabel}${LABEL_CHIP_SEP}${rockChip}`,
      );
      reasons.push(`face_S_G_with_rock:${construction.setLabel}`);
    } else if (wellType === "unconsolidated" || hasG || hasS) {
      construction.setLabel = veinSetLabel;
      if (hasG) {
        construction.producingSetFt =
          veinBottomsFt[veinBottomsFt.length - 1] ?? construction.producingSetFt;
      }
      reasons.push(
        faceChips.length >= 2
          ? `multi_face_thickness_label:${veinSetLabel}`
          : `face_thickness_label:${veinSetLabel}`,
      );
    }
  } else if (
    wellType === "unconsolidated" &&
    !veinSetLabel &&
    construction.screenLengthFt != null &&
    construction.screenLengthFt > 0 &&
    isGravelSetLabel(construction.setLabel)
  ) {
    // No digitized sand/gravel intervals — use screen length as aquifer footage proxy.
    const g1 = `G1 ${Math.round(construction.screenLengthFt)}`;
    construction.setLabel = g1;
    reasons.push(`screen_thickness_proxy_label:${g1}`);
  } else if (
    wellType === "unconsolidated" &&
    !veinSetLabel &&
    isGravelSetLabel(construction.setLabel) &&
    construction.setLabel?.startsWith("G@")
  ) {
    // Construction set depth without screen length or lith veins — drop bare G@
    // so we do not imply aquifer thickness equals casing depth.
    construction.setLabel = null;
    reasons.push("strip_legacy_G_at_set_without_aquifer_thickness");
  }

  // Clay/soil-only: never leave a bare unknown with no readable stack chip —
  // setLabel stays null; layerStackLabel (C0-36) is the display path.
  if (
    wellType === "unknown" &&
    layerStackLabel &&
    !/[GSR]/.test(layerStackLabel.replace(/C[\d\-]+/g, ""))
  ) {
    reasons.push(`clay_or_non_water_stack:${layerStackLabel}`);
  }

  let confidence: "high" | "medium" | "low" = "low";
  if (construction.kind === "rock_open_hole" || construction.kind === "screen_set") {
    confidence =
      layersRaw.length > 0 || rockTop != null || (wb != null && wb > 0)
        ? "high"
        : "medium";
  } else if (layersRaw.length > 0 && (wb != null || rockTop != null)) {
    confidence = aqCls !== "unknown" ? "high" : "medium";
  } else if (aqCls !== "unknown") {
    confidence = "medium";
  } else if (wellType !== "unknown") {
    confidence = "low";
  }

  return {
    formationClass: wellType,
    rockTopFt: rockTop != null ? Math.round(rockTop) : null,
    unconsolidatedFt: wb,
    layers,
    layerStackLabel,
    veinBottomsFt,
    veinThicknessesFt,
    veinSetLabel,
    confidence,
    reasons,
    rulesetId: FORMATION_CLASS_RULESET,
    construction,
  };
}

export function isEstimatedLocation(w: WellRecord): boolean {
  const aq = primaryAquiferText(w).toLowerCase();
  const lt = String(
    w.loc_type ?? (w as WellRecord).location_type ?? "",
  ).toLowerCase();
  return aq.includes("estimated") || lt.includes("estimated");
}
