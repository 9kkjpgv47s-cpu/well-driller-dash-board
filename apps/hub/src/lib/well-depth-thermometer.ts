import type { WellRecord } from "@/lib/area-well-analytics";
import { getWellDisplayDepthFtViewer } from "@/lib/viewer-well-map";

export const DEFAULT_CURSOR_BAND_FT = 15;
export const MAX_THERMOMETER_WELLS = 800;
export const DEFAULT_HISTOGRAM_BIN_FT = 10;

export type DepthDomain = {
  minFt: number;
  maxFt: number;
};

export type PositionedWellLine = {
  well: WellRecord;
  key: string;
  depthFt: number;
  /** 0–1 horizontal offset within the well-lines column */
  jitterX: number;
  inBand: boolean;
};

export type DepthHistogramBin = {
  startFt: number;
  endFt: number;
  count: number;
};

export type DepthTick = {
  depthFt: number;
  label: string;
};

export type ThermometerLayout = {
  domain: DepthDomain;
  lines: PositionedWellLine[];
  histogram: DepthHistogramBin[];
  missingDepthCount: number;
  truncatedCount: number;
  defaultCursorFt: number;
};

export function wellThermometerKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}

/** Deterministic 0–1 jitter from well id for overlap separation. */
export function jitterFractionForKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

export function computeDepthDomain(
  depthsFt: number[],
  paddingRatio = 0.05,
  options?: { surfaceAtZero?: boolean },
): DepthDomain {
  if (!depthsFt.length) {
    return { minFt: 0, maxFt: 300 };
  }
  const rawMin = Math.min(...depthsFt);
  const rawMax = Math.max(...depthsFt);
  const span = Math.max(rawMax - rawMin, 25);
  const pad = Math.max(span * paddingRatio, 5);
  const minFt = options?.surfaceAtZero
    ? 0
    : Math.max(0, Math.floor(rawMin - pad));
  const maxFt = Math.ceil(rawMax + pad);
  if (maxFt <= minFt) return { minFt: 0, maxFt: Math.max(minFt + 50, rawMax + 25) };
  return { minFt, maxFt };
}

export function depthToY(
  depthFt: number,
  domain: DepthDomain,
  chartHeight: number,
  paddingTop = 8,
  paddingBottom = 8,
): number {
  const inner = Math.max(chartHeight - paddingTop - paddingBottom, 1);
  const span = Math.max(domain.maxFt - domain.minFt, 1);
  const t = (depthFt - domain.minFt) / span;
  const clamped = Math.min(1, Math.max(0, t));
  return paddingTop + inner * clamped;
}

export function yToDepth(
  y: number,
  domain: DepthDomain,
  chartHeight: number,
  paddingTop = 8,
  paddingBottom = 8,
): number {
  const inner = Math.max(chartHeight - paddingTop - paddingBottom, 1);
  const t = (y - paddingTop) / inner;
  const span = Math.max(domain.maxFt - domain.minFt, 1);
  const depth = domain.minFt + t * span;
  return Math.round(Math.min(domain.maxFt, Math.max(domain.minFt, depth)));
}

export function buildDepthHistogram(
  depthsFt: number[],
  domain: DepthDomain,
  binSizeFt = DEFAULT_HISTOGRAM_BIN_FT,
): DepthHistogramBin[] {
  if (binSizeFt <= 0) return [];
  const start = Math.floor(domain.minFt / binSizeFt) * binSizeFt;
  const end = Math.ceil(domain.maxFt / binSizeFt) * binSizeFt;
  const bins: DepthHistogramBin[] = [];
  for (let s = start; s < end; s += binSizeFt) {
    bins.push({ startFt: s, endFt: s + binSizeFt, count: 0 });
  }
  for (const d of depthsFt) {
    const idx = Math.floor((d - start) / binSizeFt);
    if (idx >= 0 && idx < bins.length) bins[idx]!.count++;
  }
  return bins;
}

export function chooseTickStepFt(spanFt: number): number {
  if (spanFt <= 80) return 10;
  if (spanFt <= 200) return 25;
  if (spanFt <= 400) return 50;
  return 100;
}

export function buildDepthTicks(domain: DepthDomain): DepthTick[] {
  const span = domain.maxFt - domain.minFt;
  const step = chooseTickStepFt(span);
  const ticks: DepthTick[] = [];
  const first = Math.ceil(domain.minFt / step) * step;
  for (let d = first; d <= domain.maxFt; d += step) {
    ticks.push({ depthFt: d, label: String(d) });
  }
  if (!ticks.some((t) => t.depthFt === domain.minFt) && domain.minFt === 0) {
    ticks.unshift({ depthFt: 0, label: "0" });
  }
  return ticks;
}

export function isDepthInCursorBand(
  depthFt: number,
  cursorFt: number,
  bandFt = DEFAULT_CURSOR_BAND_FT,
): boolean {
  return Math.abs(depthFt - cursorFt) <= bandFt;
}

export function clampCursorDepth(
  depthFt: number,
  domain: DepthDomain,
): number {
  return Math.round(
    Math.min(domain.maxFt, Math.max(domain.minFt, depthFt)),
  );
}

export function buildThermometerLayout(
  wells: WellRecord[],
  options?: {
    cursorFt?: number | null;
    bandFt?: number;
    maxLines?: number;
    binSizeFt?: number;
    medianDepthFt?: number | null;
  },
): ThermometerLayout {
  const bandFt = options?.bandFt ?? DEFAULT_CURSOR_BAND_FT;
  const maxLines = options?.maxLines ?? MAX_THERMOMETER_WELLS;
  const binSizeFt = options?.binSizeFt ?? DEFAULT_HISTOGRAM_BIN_FT;

  const withDepth: { well: WellRecord; key: string; depthFt: number }[] = [];
  let missingDepthCount = 0;

  for (const well of wells) {
    const depthFt = getWellDisplayDepthFtViewer(well);
    if (depthFt == null || !Number.isFinite(depthFt)) {
      missingDepthCount++;
      continue;
    }
    withDepth.push({ well, key: wellThermometerKey(well), depthFt });
  }

  withDepth.sort((a, b) => b.depthFt - a.depthFt || a.key.localeCompare(b.key));

  const truncatedCount = Math.max(0, withDepth.length - maxLines);
  const capped = withDepth.slice(0, maxLines);
  const depths = capped.map((x) => x.depthFt);
  const domain = computeDepthDomain(depths, 0.05, { surfaceAtZero: true });

  const defaultCursorFt =
    options?.cursorFt != null && Number.isFinite(options.cursorFt)
      ? clampCursorDepth(options.cursorFt, domain)
      : options?.medianDepthFt != null && Number.isFinite(options.medianDepthFt)
        ? clampCursorDepth(options.medianDepthFt, domain)
        : clampCursorDepth(
            depths.length
              ? depths[Math.floor(depths.length / 2)]!
              : (domain.minFt + domain.maxFt) / 2,
            domain,
          );

  const cursorFt = defaultCursorFt;

  const lines: PositionedWellLine[] = capped.map(({ well, key, depthFt }) => ({
    well,
    key,
    depthFt,
    jitterX: jitterFractionForKey(key),
    inBand: isDepthInCursorBand(depthFt, cursorFt, bandFt),
  }));

  const histogram = buildDepthHistogram(depths, domain, binSizeFt);

  return {
    domain,
    lines,
    histogram,
    missingDepthCount,
    truncatedCount,
    defaultCursorFt,
  };
}

export function parseDepthInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function formatRadiusMiShort(radiusMiles: number): string {
  const s = String(radiusMiles);
  return s.includes(".") ? `${s} mi` : `${s} mi`;
}

export type BoreholeLabelSide = "left" | "right";

export type BoreholeWellLabel = {
  key: string;
  depthFt: number;
  /** True depth on the borehole wall (pixels). */
  anchorY: number;
  /** Adjusted label Y to avoid overlap (pixels). */
  labelY: number;
  side: BoreholeLabelSide;
  label: string;
};

export type BoreholeLabelLayoutInput = {
  key: string;
  depthFt: number;
  anchorY: number;
};

export type BoreholeLabelLayoutOptions = {
  minGapPx?: number;
  minY?: number;
  maxY?: number;
  maxVerticalOffsetPx?: number;
};

/** Assign left/right sides and separate label Y positions to prevent overlap. */
export function layoutBoreholeWellLabels(
  items: BoreholeLabelLayoutInput[],
  options?: BoreholeLabelLayoutOptions,
): BoreholeWellLabel[] {
  const minGap = options?.minGapPx ?? 13;
  const minY = options?.minY ?? 0;
  const maxY = options?.maxY ?? Number.POSITIVE_INFINITY;
  const maxOffset = options?.maxVerticalOffsetPx ?? 48;

  if (!items.length) return [];

  const sorted = [...items].sort(
    (a, b) => a.anchorY - b.anchorY || a.depthFt - b.depthFt || a.key.localeCompare(b.key),
  );

  const leftKeys = new Set<string>();
  const rightKeys = new Set<string>();
  const leftYs: number[] = [];
  const rightYs: number[] = [];

  function nearestGap(ys: number[], y: number): number {
    if (!ys.length) return minGap;
    let best = minGap;
    for (const prev of ys) {
      best = Math.min(best, Math.abs(y - prev));
    }
    return best;
  }

  for (const item of sorted) {
    const leftGap = nearestGap(leftYs, item.anchorY);
    const rightGap = nearestGap(rightYs, item.anchorY);
    const leftCount = leftYs.length;
    const rightCount = rightYs.length;
    const pickLeft =
      leftGap > rightGap + 0.5 ||
      (Math.abs(leftGap - rightGap) <= 0.5 && leftCount <= rightCount);
    if (pickLeft) {
      leftKeys.add(item.key);
      leftYs.push(item.anchorY);
    } else {
      rightKeys.add(item.key);
      rightYs.push(item.anchorY);
    }
  }

  function resolveSide(side: BoreholeLabelSide, sideItems: BoreholeLabelLayoutInput[]) {
    const ordered = [...sideItems].sort(
      (a, b) => a.anchorY - b.anchorY || a.depthFt - b.depthFt,
    );
    const labelYs: number[] = [];
    for (const item of ordered) {
      let y = item.anchorY;
      const prev = labelYs[labelYs.length - 1];
      if (prev != null && y - prev < minGap) y = prev + minGap;
      y = Math.min(maxY, Math.max(minY, y));
      if (Math.abs(y - item.anchorY) > maxOffset) {
        y = item.anchorY + Math.sign(y - item.anchorY) * maxOffset;
        y = Math.min(maxY, Math.max(minY, y));
      }
      labelYs.push(y);
    }
    for (let i = labelYs.length - 2; i >= 0; i--) {
      if (labelYs[i + 1]! - labelYs[i]! < minGap) {
        labelYs[i] = labelYs[i + 1]! - minGap;
      }
      labelYs[i] = Math.max(minY, labelYs[i]!);
    }
    for (let i = 1; i < labelYs.length; i++) {
      if (labelYs[i]! - labelYs[i - 1]! < minGap) {
        labelYs[i] = labelYs[i - 1]! + minGap;
      }
      labelYs[i] = Math.min(maxY, labelYs[i]!);
    }
    return ordered.map((item, i) => ({
      key: item.key,
      depthFt: item.depthFt,
      anchorY: item.anchorY,
      labelY: labelYs[i]!,
      side,
      label: `${item.depthFt} ft`,
    }));
  }

  const leftItems = sorted.filter((x) => leftKeys.has(x.key));
  const rightItems = sorted.filter((x) => rightKeys.has(x.key));

  return [
    ...resolveSide("left", leftItems),
    ...resolveSide("right", rightItems),
  ].sort((a, b) => a.anchorY - b.anchorY || a.key.localeCompare(b.key));
}

/** Polyline from borehole anchor to label; elbows up to 90° when label Y is offset. */
export function boreholeLeaderPath(
  side: BoreholeLabelSide,
  anchorX: number,
  anchorY: number,
  labelX: number,
  labelY: number,
): string {
  if (Math.abs(labelY - anchorY) < 1.5) {
    return `M ${anchorX} ${anchorY} L ${labelX} ${labelY}`;
  }
  const elbowX =
    side === "right"
      ? anchorX + (labelX - anchorX) * 0.55
      : anchorX - (anchorX - labelX) * 0.55;
  return `M ${anchorX} ${anchorY} L ${elbowX} ${anchorY} L ${elbowX} ${labelY} L ${labelX} ${labelY}`;
}

export type BoreholeGeometry = {
  svgW: number;
  chartHeight: number;
  paddingTop: number;
  paddingBottom: number;
  scaleW: number;
  formationW: number;
  boreW: number;
  boreLeft: number;
  boreRight: number;
  leftLabelX: number;
  rightLabelX: number;
  labelReach: number;
  groundY: number;
  boreBottomY: number;
};

/** Dynamic vertical gap between well labels — tighter when crowded, looser when sparse. */
export function computeDynamicLabelMinGap(
  lineCount: number,
  plotTopY: number,
  plotBottomY: number,
  spreadLabels: boolean,
): number {
  const plotHeight = Math.max(plotBottomY - plotTopY, 48);
  const denseFloor = spreadLabels ? 14 : 16;
  const sparseCeil = spreadLabels ? 28 : 24;
  if (lineCount <= 1) return sparseCeil;
  const ideal = (plotHeight / lineCount) * 0.92;
  return Math.max(denseFloor, Math.min(sparseCeil, ideal));
}

/** Symmetric borehole layout — cylinder centered; labels equidistant from walls. */
export function computeBoreholeGeometry(
  containerWidth: number,
  chartHeight = 420,
  paddingTop = 28,
  paddingBottom = 16,
  spreadLabels = false,
): BoreholeGeometry {
  const maxSvgW = spreadLabels ? 420 : 360;
  const svgW = Math.max(200, Math.min(maxSvgW, Math.round(containerWidth)));
  const boreW = Math.round(svgW * 0.28);
  const labelReach = Math.round(svgW * (spreadLabels ? 0.22 : 0.18));
  const boreLeft = Math.round((svgW - boreW) / 2);
  const boreRight = boreLeft + boreW;
  const leftLabelX = boreLeft - labelReach;
  const rightLabelX = boreRight + labelReach;
  const scaleW = Math.max(8, leftLabelX - 6);
  const formationW = labelReach;

  return {
    svgW,
    chartHeight,
    paddingTop,
    paddingBottom,
    scaleW,
    formationW,
    boreW,
    boreLeft,
    boreRight,
    leftLabelX,
    rightLabelX,
    labelReach,
    groundY: paddingTop,
    boreBottomY: chartHeight - paddingBottom,
  };
}
