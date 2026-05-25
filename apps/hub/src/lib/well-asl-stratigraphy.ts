import {
  getLithLayers,
  lithologyFormationName,
  lithologyLayerTopBottomFt,
  type WellRecord,
} from "./area-well-analytics";
import { wellThermometerKey } from "./well-depth-thermometer";

export type LithologyClass = "unconsolidated" | "rock" | "clay" | "other";

export type AslStratum = {
  formation: string;
  lithClass: LithologyClass;
  topDepthFt: number;
  bottomDepthFt: number;
  /** Higher number = shallower (ground surface). */
  topAslFt: number;
  bottomAslFt: number;
};

export type AslWellColumn = {
  key: string;
  well: WellRecord;
  label: string;
  groundAslFt: number;
  strata: AslStratum[];
};

export type AslChartDomain = {
  minAslFt: number;
  maxAslFt: number;
};

export type AslStratigraphyLayout = {
  columns: AslWellColumn[];
  domain: AslChartDomain;
  skippedNoGround: number;
  skippedNoLithology: number;
};

const GRAVEL_RE =
  /\bgravel\b|\bgrav\b|pea\s*stone|outwash|esker|kame|glacial\s*drift/i;

/** Shared-aquifer matching uses gravel-bearing formations only (not sand-only). */
export function isGravelFormation(name: string): boolean {
  const l = name.toLowerCase().trim();
  if (!l) return false;
  if (GRAVEL_RE.test(l)) return true;
  if (/sand/.test(l) && /grav/.test(l)) return true;
  return false;
}

const ROCK_RE =
  /lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|chert|quartzite|basalt|gneiss|schist|conglomerate|argillite|\brock\b/i;
const UNCON_RE =
  /sand|grav|drift|outwash|esker|kame|fill|loess|alluv|terrace|pea\s*stone|water\s*bearing|aquifer|unconsolidated/i;
const CLAY_RE = /clay|till|silt|muck|topsoil|loam/i;

export function classifyFormation(name: string): LithologyClass {
  const l = name.toLowerCase().trim();
  if (!l) return "other";
  if (UNCON_RE.test(l) && !ROCK_RE.test(l)) return "unconsolidated";
  if (ROCK_RE.test(l) && !/sand|grav|drift/i.test(l)) return "rock";
  if (CLAY_RE.test(l)) return "clay";
  if (/sand|grav|drift/i.test(l)) return "unconsolidated";
  return "other";
}

export function lithologyClassColors(c: LithologyClass): {
  fill: string;
  stroke: string;
  label: string;
} {
  switch (c) {
    case "unconsolidated":
      return { fill: "#bfdbfe", stroke: "#2563eb", label: "Sand / gravel" };
    case "rock":
      return { fill: "#fecaca", stroke: "#dc2626", label: "Rock / bedrock" };
    case "clay":
      return { fill: "#fde68a", stroke: "#b45309", label: "Clay / till" };
    default:
      return { fill: "#e5e7eb", stroke: "#6b7280", label: "Other" };
  }
}

export function getWellGroundElevFt(
  w: WellRecord,
  demElevFtByKey?: Map<string, number> | null,
): number | null {
  const key = wellThermometerKey(w);
  const dem = demElevFtByKey?.get(key);
  if (dem != null && Number.isFinite(dem)) return Math.round(dem);
  const ge = w.ground_elev;
  if (ge != null && ge !== "" && Number.isFinite(Number(ge))) {
    return Math.round(Number(ge));
  }
  return null;
}

/** Depth below ground → elevation above sea level (ft). */
export function depthFtToAslFt(groundAslFt: number, depthBelowGroundFt: number): number {
  return groundAslFt - depthBelowGroundFt;
}

export function buildAslStrataForWell(
  w: WellRecord,
  groundAslFt: number,
): AslStratum[] {
  const layers = getLithLayers(w);
  if (!layers.length) return [];

  const out: AslStratum[] = [];
  let prevBottom = 0;
  for (const layer of layers) {
    const { top, bot } = lithologyLayerTopBottomFt(layer, prevBottom);
    if (!Number.isFinite(top) || !Number.isFinite(bot) || bot <= top) {
      if (Number.isFinite(bot)) prevBottom = bot;
      continue;
    }
    prevBottom = bot;
    const formation = lithologyFormationName(layer) || "Layer";
    out.push({
      formation,
      lithClass: classifyFormation(formation),
      topDepthFt: top,
      bottomDepthFt: bot,
      topAslFt: depthFtToAslFt(groundAslFt, top),
      bottomAslFt: depthFtToAslFt(groundAslFt, bot),
    });
  }
  return out;
}

export function computeAslDomain(
  columns: AslWellColumn[],
  paddingFt = 15,
): AslChartDomain {
  if (!columns.length) {
    return { minAslFt: 500, maxAslFt: 850 };
  }
  let minAsl = Infinity;
  let maxAsl = -Infinity;
  for (const col of columns) {
    maxAsl = Math.max(maxAsl, col.groundAslFt);
    for (const s of col.strata) {
      minAsl = Math.min(minAsl, s.bottomAslFt);
      maxAsl = Math.max(maxAsl, s.topAslFt);
    }
  }
  if (!Number.isFinite(minAsl)) minAsl = maxAsl - 100;
  return {
    minAslFt: Math.floor(minAsl - paddingFt),
    maxAslFt: Math.ceil(maxAsl + paddingFt),
  };
}

export function buildAslStratigraphyLayout(
  wells: WellRecord[],
  demElevFtByKey?: Map<string, number> | null,
  options?: { maxColumns?: number },
): AslStratigraphyLayout {
  const maxColumns = options?.maxColumns ?? 24;
  let skippedNoGround = 0;
  let skippedNoLithology = 0;
  const columns: AslWellColumn[] = [];

  for (const well of wells) {
    if (columns.length >= maxColumns) break;
    const ground = getWellGroundElevFt(well, demElevFtByKey);
    if (ground == null) {
      skippedNoGround++;
      continue;
    }
    const strata = buildAslStrataForWell(well, ground);
    if (!strata.length) {
      skippedNoLithology++;
      continue;
    }
    columns.push({
      key: wellThermometerKey(well),
      well,
      label: String(well.well_id ?? well.id ?? well.refno ?? "?"),
      groundAslFt: ground,
      strata,
    });
  }

  return {
    columns,
    domain: computeAslDomain(columns),
    skippedNoGround,
    skippedNoLithology,
  };
}

const DEFAULT_CHART_MAX_COLUMNS = 24;

export function filterAslLayoutColumns(
  layout: AslStratigraphyLayout,
  options?: { wellKeys?: Set<string> | null; maxColumns?: number | null },
): AslStratigraphyLayout {
  let columns = layout.columns;
  if (options?.wellKeys?.size) {
    columns = columns.filter((c) => options.wellKeys!.has(c.key));
  }
  if (options?.maxColumns != null && options.maxColumns > 0) {
    columns = columns.slice(0, options.maxColumns);
  }
  return {
    ...layout,
    columns,
    domain: computeAslDomain(columns),
  };
}

/** Unique well keys participating in any shared aquifer band. */
export function collectSharedAquiferWellKeys(
  bands: SharedAquiferBand[],
): Set<string> {
  const keys = new Set<string>();
  for (const band of bands) {
    for (const key of band.wellKeys) keys.add(key);
  }
  return keys;
}

export { DEFAULT_CHART_MAX_COLUMNS };

export function aslToChartY(
  aslFt: number,
  domain: AslChartDomain,
  chartHeight: number,
  paddingTop = 24,
  paddingBottom = 36,
): number {
  const inner = Math.max(chartHeight - paddingTop - paddingBottom, 1);
  const span = Math.max(domain.maxAslFt - domain.minAslFt, 1);
  const t = (domain.maxAslFt - aslFt) / span;
  const clamped = Math.min(1, Math.max(0, t));
  return paddingTop + inner * clamped;
}

export function chooseAslTickStepFt(spanFt: number): number {
  if (spanFt <= 60) return 10;
  if (spanFt <= 150) return 25;
  if (spanFt <= 300) return 50;
  return 100;
}

export function buildAslTicks(domain: AslChartDomain): { aslFt: number; label: string }[] {
  const span = domain.maxAslFt - domain.minAslFt;
  const step = chooseAslTickStepFt(span);
  const ticks: { aslFt: number; label: string }[] = [];
  const first = Math.ceil(domain.minAslFt / step) * step;
  for (let a = first; a <= domain.maxAslFt; a += step) {
    ticks.push({ aslFt: a, label: String(a) });
  }
  return ticks;
}

export type SharedAquiferContributor = {
  wellKey: string;
  formation: string;
  topAslFt: number;
  bottomAslFt: number;
  midAslFt: number;
};

export type SharedAquiferBand = {
  centerAslFt: number;
  wellCount: number;
  /** ASL range where every contributor overlaps (shared footage). */
  sharedTopAslFt: number;
  sharedBottomAslFt: number;
  /** Full union ASL span across contributors (drill window). */
  topAslFt: number;
  bottomAslFt: number;
  wellKeys: string[];
  /** Gravel layers that share ASL footage with at least one other well. */
  contributors: SharedAquiferContributor[];
};

function gravelSpans(columns: AslWellColumn[]): SharedAquiferContributor[] {
  const spans: SharedAquiferContributor[] = [];
  for (const col of columns) {
    for (const s of col.strata) {
      if (!isGravelFormation(s.formation)) continue;
      spans.push({
        wellKey: col.key,
        formation: s.formation,
        topAslFt: s.topAslFt,
        bottomAslFt: s.bottomAslFt,
        midAslFt: Math.round((s.topAslFt + s.bottomAslFt) / 2),
      });
    }
  }
  return spans;
}

/** True when two layers share at least one foot of ASL (including boundary touch). */
export function aslSpansShareFootage(
  a: Pick<SharedAquiferContributor, "topAslFt" | "bottomAslFt">,
  b: Pick<SharedAquiferContributor, "topAslFt" | "bottomAslFt">,
): boolean {
  return (
    Math.max(a.bottomAslFt, b.bottomAslFt) <= Math.min(a.topAslFt, b.topAslFt)
  );
}

function intersectionAslSpan(
  spans: SharedAquiferContributor[],
): { topAslFt: number; bottomAslFt: number } | null {
  const topAslFt = Math.min(...spans.map((s) => s.topAslFt));
  const bottomAslFt = Math.max(...spans.map((s) => s.bottomAslFt));
  if (bottomAslFt > topAslFt) return null;
  return { topAslFt, bottomAslFt };
}

function clusterGravelBySharedAsl(
  spans: SharedAquiferContributor[],
): SharedAquiferContributor[][] {
  if (!spans.length) return [];

  const sorted = [...spans].sort((a, b) => b.midAslFt - a.midAslFt);
  const clusters: SharedAquiferContributor[][] = [];

  for (const span of sorted) {
    let placed = false;
    for (const cluster of clusters) {
      if (intersectionAslSpan([...cluster, span])) {
        cluster.push(span);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([span]);
  }

  return clusters.filter((cluster) => {
    const wellKeys = new Set(cluster.map((c) => c.wellKey));
    return wellKeys.size >= 2 && intersectionAslSpan(cluster) != null;
  });
}

export function stratumContributesToBand(
  stratum: AslStratum,
  wellKey: string,
  band: SharedAquiferBand,
): boolean {
  if (!isGravelFormation(stratum.formation)) return false;
  return band.contributors.some(
    (c) =>
      c.wellKey === wellKey &&
      c.topAslFt === stratum.topAslFt &&
      c.bottomAslFt === stratum.bottomAslFt,
  );
}

export function countBandWellsInColumns(
  band: SharedAquiferBand,
  columns: AslWellColumn[],
): number {
  const keys = new Set(columns.map((c) => c.key));
  return band.wellKeys.filter((k) => keys.has(k)).length;
}

/** Depth below ground from elevation ASL (ft). */
export function aslFtToDepthBelowGroundFt(
  groundElevFt: number,
  aslFt: number,
): number {
  return Math.round(groundElevFt - aslFt);
}

/** Drill window for a shared aquifer band at a given ground elevation. */
export function sharedAquiferDrillWindowFt(
  band: Pick<SharedAquiferBand, "topAslFt" | "bottomAslFt">,
  groundElevFt: number,
): { startDepthFt: number; endDepthFt: number } {
  const startDepthFt = aslFtToDepthBelowGroundFt(groundElevFt, band.topAslFt);
  const endDepthFt = aslFtToDepthBelowGroundFt(groundElevFt, band.bottomAslFt);
  return {
    startDepthFt: Math.min(startDepthFt, endDepthFt),
    endDepthFt: Math.max(startDepthFt, endDepthFt),
  };
}

export function formatSharedAquiferDrillAdvice(
  band: SharedAquiferBand,
  groundElevFt: number,
): string {
  const { startDepthFt, endDepthFt } = sharedAquiferDrillWindowFt(
    band,
    groundElevFt,
  );
  return `Drill ${startDepthFt}–${endDepthFt} ft to hit this aquifer. Below ~${endDepthFt} ft you've likely passed it.`;
}

/** ASL bands where multiple wells share gravel layers at the same ASL footage. */
export function findSharedAquiferBands(
  columns: AslWellColumn[],
): SharedAquiferBand[] {
  const clusters = clusterGravelBySharedAsl(gravelSpans(columns));
  const bands: SharedAquiferBand[] = [];

  for (const contributors of clusters) {
    const wellKeys = [...new Set(contributors.map((c) => c.wellKey))];
    if (wellKeys.length < 2) continue;

    const shared = intersectionAslSpan(contributors);
    if (!shared) continue;

    const topAslFt = Math.max(...contributors.map((c) => c.topAslFt));
    const bottomAslFt = Math.min(...contributors.map((c) => c.bottomAslFt));
    const centerAslFt = Math.round(
      (shared.topAslFt + shared.bottomAslFt) / 2,
    );

    bands.push({
      centerAslFt,
      wellCount: wellKeys.length,
      sharedTopAslFt: shared.topAslFt,
      sharedBottomAslFt: shared.bottomAslFt,
      topAslFt,
      bottomAslFt,
      wellKeys,
      contributors,
    });
  }

  return bands.sort((a, b) => b.centerAslFt - a.centerAslFt);
}

export function abbrevFormation(name: string, maxLen = 14): string {
  const t = name.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
