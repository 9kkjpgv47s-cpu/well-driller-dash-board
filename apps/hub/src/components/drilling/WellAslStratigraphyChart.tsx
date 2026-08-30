"use client";

import { useMemo, useState } from "react";
import {
  haversineMiles,
  type WellRecord,
} from "@/lib/area-well-analytics";
import {
  abbrevFormation,
  aslToChartY,
  buildAslStratigraphyLayout,
  buildAslTicks,
  collectSharedAquiferWellKeys,
  countBandWellsInColumns,
  DEFAULT_CHART_MAX_COLUMNS,
  filterAslLayoutColumns,
  findSharedAquiferBands,
  lithologyClassColors,
  sharedAquiferDrillWindowFt,
  stratumContributesToBand,
  type AslWellColumn,
  type LithologyClass,
  type SharedAquiferBand,
} from "@/lib/well-asl-stratigraphy";
import { wellThermometerKey } from "@/lib/well-depth-thermometer";

const CHART_HEIGHT = 440;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 40;
/** Minimal left gutter — labels share the chart Y axis. */
const SHARED_PANEL_W = 108;
/** Vertical room reserved per shared-band label in the side panel. */
const SHARED_LABEL_SLOT_H = 96;
const Y_AXIS_W = 48;
const BAR_W = 52;
const BAR_GAP = 8;
const MARGIN_RIGHT = 12;
const SHARED_LINE_STROKE = "#ef4444";
const SHARED_LINE_DASH = "5 3";

function columnInAnyBand(colKey: string, bands: SharedAquiferBand[]): boolean {
  return bands.some((b) => b.wellKeys.includes(colKey));
}

function stratumLabelStyle(lithClass: LithologyClass): {
  fill: string;
  stroke: string;
  strokeWidth: number;
} {
  switch (lithClass) {
    case "unconsolidated":
      return { fill: "#1e3a8a", stroke: "#ffffff", strokeWidth: 1.5 };
    case "rock":
      return { fill: "#7f1d1d", stroke: "#ffffff", strokeWidth: 1.5 };
    case "clay":
      return { fill: "#78350f", stroke: "#ffffff", strokeWidth: 1.5 };
    default:
      return { fill: "#111827", stroke: "#ffffff", strokeWidth: 1.5 };
  }
}

function layoutBandLabelTops(
  rows: { key: string; y: number }[],
): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.y - b.y);
  const tops = new Map<string, number>();
  let lastBottom = -Infinity;
  for (const row of sorted) {
    const top = Math.max(row.y - 28, lastBottom + 4, 40);
    tops.set(row.key, top);
    lastBottom = top + SHARED_LABEL_SLOT_H;
  }
  return tops;
}

function SharedBandLabelContent({
  band,
  drillWindow,
  wellsOnChart,
  onViewWells,
  isActive,
}: {
  band: SharedAquiferBand;
  drillWindow: { startDepthFt: number; endDepthFt: number } | null;
  wellsOnChart: number;
  onViewWells?: () => void;
  isActive?: boolean;
}) {
  const sharedLabel =
    band.sharedTopAslFt === band.sharedBottomAslFt
      ? `${band.sharedTopAslFt} ft ASL shared`
      : `${band.sharedBottomAslFt}–${band.sharedTopAslFt} ft ASL shared`;

  return (
    <>
      <p className="font-semibold">{sharedLabel}</p>
      <p className="font-medium">
        {band.wellCount} well{band.wellCount === 1 ? "" : "s"} share this band
        {wellsOnChart < band.wellCount ? (
          <span className="text-amber-800 dark:text-amber-200">
            {" "}
            · {wellsOnChart} on chart
          </span>
        ) : null}
      </p>
      {drillWindow ? (
        <>
          <p className="mt-0.5 font-semibold text-emerald-900 dark:text-emerald-50">
            Drill {drillWindow.startDepthFt}–{drillWindow.endDepthFt} ft
          </p>
          <p className="text-emerald-800/90 dark:text-emerald-200/90">
            Below ~{drillWindow.endDepthFt} ft — likely past it
          </p>
        </>
      ) : (
        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
          Load site elevation for drill depths
        </p>
      )}
      {onViewWells ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewWells();
          }}
          className={`mt-1 w-full rounded border px-1 py-0.5 text-[8px] font-semibold transition-colors ${
            isActive
              ? "border-red-600 bg-red-600 text-white"
              : "border-red-300 bg-white text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-red-950/40"
          }`}
        >
          {isActive ? "Hide wells" : "View wells"}
        </button>
      ) : null}
    </>
  );
}

type SharedWellRow = {
  key: string;
  well: WellRecord;
  label: string;
  distanceMiles: number | null;
  groundAslFt: number | null;
  inSharedBand: boolean;
  bandLabel: string | null;
};

type Props = {
  wells: WellRecord[];
  demElevFtByKey: Map<string, number> | null;
  selectedWellKey?: string | null;
  /** Job-site ground elevation (ft ASL) for drill-depth targets. */
  referenceGroundElevFt?: number | null;
  /** Site / map center for distance-to-you on shared aquifer lists. */
  center?: { lat: number; lon: number } | null;
  onSelectWell: (w: WellRecord) => void;
  onRequestElevations?: () => void;
  elevLoading?: boolean;
  radiusMiles: number;
};

const LEGEND: LithologyClass[] = [
  "unconsolidated",
  "rock",
  "clay",
  "other",
];

function distanceMilesToCenter(
  w: WellRecord,
  center?: { lat: number; lon: number } | null,
): number | null {
  if (!center) return null;
  const la = Number(w.lat);
  const lo = Number(w.lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return haversineMiles(center.lat, center.lon, la, lo);
}

function formatDistMi(d: number | null): string {
  if (d == null || !Number.isFinite(d)) return "—";
  if (d < 0.1) return "<0.1 mi";
  return `${d.toFixed(d < 10 ? 2 : 1)} mi`;
}

function bandShortLabel(band: SharedAquiferBand): string {
  if (band.sharedTopAslFt === band.sharedBottomAslFt) {
    return `${band.sharedTopAslFt} ft ASL`;
  }
  return `${band.sharedBottomAslFt}–${band.sharedTopAslFt} ft ASL`;
}

export function WellAslStratigraphyChart({
  wells,
  demElevFtByKey,
  selectedWellKey,
  referenceGroundElevFt,
  center = null,
  onSelectWell,
  onRequestElevations,
  elevLoading = false,
  radiusMiles,
}: Props) {
  const [hover, setHover] = useState<{
    key: string;
    well: WellRecord;
    label: string;
    formation: string;
    topAsl: number;
    bottomAsl: number;
    topDepth: number;
    bottomDepth: number;
    aquiferMatch: boolean;
  } | null>(null);
  const [matchingAquiferOnly, setMatchingAquiferOnly] = useState(false);
  /** null = closed; "all" = every shared-aquifer well; band key = one shared band */
  const [wellsListMode, setWellsListMode] = useState<null | "all" | string>(
    null,
  );

  const fullLayout = useMemo(
    () =>
      buildAslStratigraphyLayout(wells, demElevFtByKey, {
        maxColumns: wells.length || 999,
      }),
    [wells, demElevFtByKey],
  );

  const sharedBands = useMemo(
    () => findSharedAquiferBands(fullLayout.columns),
    [fullLayout.columns],
  );

  const matchingWellKeys = useMemo(
    () => collectSharedAquiferWellKeys(sharedBands),
    [sharedBands],
  );

  const layout = useMemo(() => {
    if (matchingAquiferOnly && matchingWellKeys.size > 0) {
      return filterAslLayoutColumns(fullLayout, {
        wellKeys: matchingWellKeys,
      });
    }
    return filterAslLayoutColumns(fullLayout, {
      maxColumns: DEFAULT_CHART_MAX_COLUMNS,
    });
  }, [fullLayout, matchingAquiferOnly, matchingWellKeys]);

  const drillReferenceElevFt = useMemo(() => {
    if (referenceGroundElevFt != null && Number.isFinite(referenceGroundElevFt)) {
      return Math.round(referenceGroundElevFt);
    }
    if (selectedWellKey) {
      const col = layout.columns.find((c) => c.key === selectedWellKey);
      if (col) return col.groundAslFt;
    }
    return null;
  }, [referenceGroundElevFt, selectedWellKey, layout.columns]);

  const ticks = useMemo(() => buildAslTicks(layout.domain), [layout.domain]);

  const sharedBandRows = useMemo(() => {
    return sharedBands.map((band) => {
      const y = aslToChartY(
        band.centerAslFt,
        layout.domain,
        CHART_HEIGHT,
        PADDING_TOP,
        PADDING_BOTTOM,
      );
      return {
        key: `${band.sharedTopAslFt}-${band.sharedBottomAslFt}-${band.centerAslFt}`,
        band,
        y,
        drillWindow:
          drillReferenceElevFt != null
            ? sharedAquiferDrillWindowFt(band, drillReferenceElevFt)
            : null,
        wellsOnChart: countBandWellsInColumns(band, layout.columns),
      };
    });
  }, [sharedBands, layout.domain, layout.columns, drillReferenceElevFt]);

  const desktopBandTops = useMemo(
    () =>
      layoutBandLabelTops(
        sharedBandRows.map((row) => ({ key: row.key, y: row.y })),
      ),
    [sharedBandRows],
  );

  /** Tall enough for the last label; the side panel scrolls when it exceeds the chart. */
  const sharedPanelInnerH = useMemo(() => {
    let maxBottom = CHART_HEIGHT;
    for (const top of desktopBandTops.values()) {
      maxBottom = Math.max(maxBottom, top + SHARED_LABEL_SLOT_H + 8);
    }
    return maxBottom;
  }, [desktopBandTops]);

  const matchingWellTotal = matchingWellKeys.size;
  const matchingInChart = useMemo(
    () => layout.columns.filter((c) => matchingWellKeys.has(c.key)).length,
    [layout.columns, matchingWellKeys],
  );
  const chartLimited =
    !matchingAquiferOnly &&
    matchingWellTotal > 0 &&
    matchingInChart < matchingWellTotal;

  const columnByKey = useMemo(() => {
    const m = new Map<string, AslWellColumn>();
    for (const c of fullLayout.columns) m.set(c.key, c);
    return m;
  }, [fullLayout.columns]);

  const sharedWellsList: SharedWellRow[] = useMemo(() => {
    if (!wellsListMode) return [];

    let keys: string[] = [];
    let bandForKeys: SharedAquiferBand | null = null;
    if (wellsListMode === "all") {
      keys = [...matchingWellKeys];
    } else {
      const band = sharedBands.find(
        (b) =>
          `${b.sharedTopAslFt}-${b.sharedBottomAslFt}-${b.centerAslFt}` ===
          wellsListMode,
      );
      if (band) {
        bandForKeys = band;
        keys = [...band.wellKeys];
      }
    }

    const rows: SharedWellRow[] = [];
    for (const key of keys) {
      const col = columnByKey.get(key);
      const well =
        col?.well ??
        wells.find((w) => wellThermometerKey(w) === key) ??
        null;
      if (!well) continue;
      const dist = distanceMilesToCenter(well, center);
      const bandsForWell = sharedBands.filter((b) => b.wellKeys.includes(key));
      rows.push({
        key,
        well,
        label: col?.label ?? String(well.refno ?? well.id ?? key),
        distanceMiles: dist,
        groundAslFt: col?.groundAslFt ?? null,
        inSharedBand: bandsForWell.length > 0,
        bandLabel: bandForKeys
          ? bandShortLabel(bandForKeys)
          : bandsForWell.length
            ? bandsForWell.map(bandShortLabel).join("; ")
            : null,
      });
    }
    rows.sort((a, b) => {
      const da = a.distanceMiles ?? 9999;
      const db = b.distanceMiles ?? 9999;
      return da - db;
    });
    return rows;
  }, [
    wellsListMode,
    matchingWellKeys,
    sharedBands,
    columnByKey,
    wells,
    center,
  ]);

  const toggleBandWells = (bandKey: string) => {
    setWellsListMode((prev) => (prev === bandKey ? null : bandKey));
  };

  const plotW =
    layout.columns.length * (BAR_W + BAR_GAP) - BAR_GAP + MARGIN_RIGHT;
  const chartW = Y_AXIS_W + plotW;

  if (!wells.length) {
    return (
      <p className="text-center text-sm text-[var(--muted)]">
        No wells in this radius.
      </p>
    );
  }

  if (!fullLayout.columns.length) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Need ground elevation and lithology logs</p>
        <p className="text-xs opacity-90">
          This view plots each well&apos;s log intervals by elevation (ft ASL) so
          gravel and rock tops line up across the neighborhood — even when ground
          elevation differs.
          {fullLayout.skippedNoGround > 0
            ? ` ${fullLayout.skippedNoGround} well(s) missing ground elevation.`
            : ""}
          {fullLayout.skippedNoLithology > 0
            ? ` ${fullLayout.skippedNoLithology} well(s) have no parseable lithology.`
            : ""}
        </p>
        {onRequestElevations ? (
          <button
            type="button"
            onClick={onRequestElevations}
            disabled={elevLoading}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600"
          >
            {elevLoading ? "Loading elevations…" : "Load ground elevations"}
          </button>
        ) : null}
      </div>
    );
  }

  if (!layout.columns.length) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">No matching aquifer wells to display</p>
        <p className="text-xs opacity-90">
          Turn off &quot;Matching aquifer only&quot; to see all wells with logs in
          this radius.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <p className="text-[11px] leading-snug text-zinc-600 sm:text-xs dark:text-zinc-400">
        Lithology by <strong>elevation (ft ASL)</strong> within {radiusMiles} mi.
        {matchingAquiferOnly ? (
          <>
            {" "}
            Showing {layout.columns.length} well
            {layout.columns.length === 1 ? "" : "s"} with matching aquifer.
          </>
        ) : (
          <>
            {" "}
            Showing {layout.columns.length} of {fullLayout.columns.length} wells
            with logs
            {fullLayout.skippedNoGround + fullLayout.skippedNoLithology > 0
              ? ` (${fullLayout.skippedNoGround + fullLayout.skippedNoLithology} skipped — no elev or log).`
              : "."}
          </>
        )}
      </p>

      {matchingWellTotal > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-medium text-zinc-700 sm:text-[11px] dark:text-zinc-200">
            <input
              type="checkbox"
              checked={matchingAquiferOnly}
              onChange={(e) => setMatchingAquiferOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-400 accent-red-600"
            />
            Matching aquifer only ({matchingWellTotal} well
            {matchingWellTotal === 1 ? "" : "s"})
          </label>
          <button
            type="button"
            onClick={() =>
              setWellsListMode((prev) => (prev === "all" ? null : "all"))
            }
            className={`rounded-md border px-2 py-1 text-[10px] font-semibold sm:text-[11px] ${
              wellsListMode === "all"
                ? "border-red-600 bg-red-600 text-white"
                : "border-red-300 bg-white text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-red-950/30"
            }`}
          >
            {wellsListMode === "all"
              ? "Hide shared aquifer wells"
              : `View all shared aquifer wells (${matchingWellTotal})`}
          </button>
          {chartLimited ? (
            <span className="text-[10px] text-amber-800 dark:text-amber-200">
              Only {matchingInChart} of {matchingWellTotal} matching wells in chart
              — enable filter above to see all
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
        Click a lithology layer or well name to open that well. Use{" "}
        <strong>View all</strong> / <strong>View wells</strong> for distances to
        overlapping aquifers.
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] text-zinc-600 sm:text-[10px] dark:text-zinc-400">
        {LEGEND.map((c) => {
          const { fill, stroke, label } = lithologyClassColors(c);
          return (
            <span key={c} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border sm:h-3 sm:w-3"
                style={{ background: fill, borderColor: stroke }}
              />
              {label}
            </span>
          );
        })}
        {sharedBands.length ? (
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
            <svg width={16} height={6} aria-hidden>
              <line
                x1={0}
                y1={3}
                x2={16}
                y2={3}
                stroke={SHARED_LINE_STROKE}
                strokeWidth={2}
                strokeDasharray={SHARED_LINE_DASH}
              />
            </svg>
            Shared gravel aquifer
          </span>
        ) : null}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="flex min-w-0">
          <aside
            className="hidden shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 sm:block"
            style={{ width: SHARED_PANEL_W, height: CHART_HEIGHT }}
            aria-label="Shared aquifer labels"
          >
            <div className="relative" style={{ minHeight: sharedPanelInnerH }}>
              <div className="border-b border-zinc-200 px-1.5 py-1 text-[8px] font-semibold leading-tight text-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
                Shared aquifers
                {drillReferenceElevFt != null ? (
                  <span className="block font-normal text-zinc-600 dark:text-zinc-400">
                    at your site · {drillReferenceElevFt} ft ground
                  </span>
                ) : null}
              </div>
              {sharedBandRows.map((row) => (
                <div
                  key={`aside-${row.key}`}
                  className="absolute left-0 right-0 px-1"
                  style={{ top: desktopBandTops.get(row.key) ?? row.y - 28 }}
                >
                  <div
                    className={`rounded-sm px-1 py-0.5 text-[8px] leading-snug text-emerald-950 shadow-sm dark:text-emerald-100 ${
                      wellsListMode === row.key
                        ? "bg-red-50/95 ring-1 ring-red-400 dark:bg-red-950/50"
                        : "bg-zinc-50/95 dark:bg-zinc-900/95"
                    }`}
                  >
                    <SharedBandLabelContent
                      band={row.band}
                      drillWindow={row.drillWindow}
                      wellsOnChart={row.wellsOnChart}
                      onViewWells={() => toggleBandWells(row.key)}
                      isActive={wellsListMode === row.key}
                    />
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
            <svg
              width={chartW}
              height={CHART_HEIGHT}
              viewBox={`0 0 ${chartW} ${CHART_HEIGHT}`}
              className="min-h-[360px] min-w-0 sm:min-h-[440px]"
              aria-label="Well lithology by elevation above sea level"
            >
              {sharedBandRows.map((row) => {
                const y = aslToChartY(
                  row.band.centerAslFt,
                  layout.domain,
                  CHART_HEIGHT,
                  PADDING_TOP,
                  PADDING_BOTTOM,
                );
                const active = wellsListMode === row.key;
                return (
                  <g key={`line-${row.key}`}>
                    <line
                      x1={0}
                      x2={chartW - 2}
                      y1={y}
                      y2={y}
                      stroke={SHARED_LINE_STROKE}
                      strokeWidth={active ? 3 : 2}
                      strokeDasharray={SHARED_LINE_DASH}
                      opacity={0.95}
                    />
                    {/* Invisible hit target — does not change default look */}
                    <line
                      x1={0}
                      x2={chartW - 2}
                      y1={y}
                      y2={y}
                      stroke="transparent"
                      strokeWidth={14}
                      className="cursor-pointer"
                      onClick={() => toggleBandWells(row.key)}
                    >
                      <title>
                        View {row.band.wellCount} wells sharing this aquifer
                      </title>
                    </line>
                  </g>
                );
              })}

              {ticks.map((tick) => {
              const y = aslToChartY(
                tick.aslFt,
                layout.domain,
                CHART_HEIGHT,
                PADDING_TOP,
                PADDING_BOTTOM,
              );
              return (
                <g key={`tick-${tick.aslFt}`}>
                  <line
                    x1={Y_AXIS_W}
                    x2={chartW - 4}
                    y1={y}
                    y2={y}
                    stroke="#e7e5e4"
                    strokeWidth={1}
                  />
                  <text
                    x={Y_AXIS_W - 4}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-zinc-500 text-[9px] font-mono sm:text-[10px] dark:fill-zinc-400"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}
            <text
              x={2}
              y={14}
              className="fill-zinc-600 text-[8px] font-semibold dark:fill-zinc-300"
            >
              ASL
            </text>

            {layout.columns.map((col, i) => {
              const x = Y_AXIS_W + i * (BAR_W + BAR_GAP);
              const selected = selectedWellKey === col.key;
              const groundY = aslToChartY(
                col.groundAslFt,
                layout.domain,
                CHART_HEIGHT,
                PADDING_TOP,
                PADDING_BOTTOM,
              );

              return (
                <g key={col.key}>
                  <rect
                    x={x}
                    y={groundY}
                    width={BAR_W}
                    height={CHART_HEIGHT - PADDING_BOTTOM - groundY}
                    rx={2}
                    fill="#fafaf9"
                    stroke="#d6d3d1"
                    strokeWidth={1}
                    opacity={0.35}
                  />
                  <line
                    x1={x}
                    x2={x + BAR_W}
                    y1={groundY}
                    y2={groundY}
                    stroke="#65a30d"
                    strokeWidth={2}
                  />
                  <text
                    x={x + BAR_W / 2}
                    y={groundY - 3}
                    textAnchor="middle"
                    className="fill-lime-800 text-[7px] font-semibold sm:text-[8px] dark:fill-lime-300"
                  >
                    {col.groundAslFt}
                  </text>

                  {col.strata.map((s, si) => {
                    const yTop = aslToChartY(
                      s.topAslFt,
                      layout.domain,
                      CHART_HEIGHT,
                      PADDING_TOP,
                      PADDING_BOTTOM,
                    );
                    const yBottom = aslToChartY(
                      s.bottomAslFt,
                      layout.domain,
                      CHART_HEIGHT,
                      PADDING_TOP,
                      PADDING_BOTTOM,
                    );
                    const h = Math.max(yBottom - yTop, 2);
                    const colors = lithologyClassColors(s.lithClass);
                    const showLabel = h >= 16;
                    const labelStyle = stratumLabelStyle(s.lithClass);
                    const aquiferMatch = sharedBands.some((b) =>
                      stratumContributesToBand(s, col.key, b),
                    );

                    return (
                      <g key={`${col.key}-${si}`}>
                        <rect
                          x={x + 2}
                          y={yTop}
                          width={BAR_W - 4}
                          height={h}
                          fill={colors.fill}
                          stroke={aquiferMatch ? SHARED_LINE_STROKE : colors.stroke}
                          strokeWidth={
                            aquiferMatch ? 2.5 : selected ? 2 : 1
                          }
                          rx={1}
                          className="cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onMouseEnter={() =>
                            setHover({
                              key: col.key,
                              well: col.well,
                              label: col.label,
                              formation: s.formation,
                              topAsl: s.topAslFt,
                              bottomAsl: s.bottomAslFt,
                              topDepth: s.topDepthFt,
                              bottomDepth: s.bottomDepthFt,
                              aquiferMatch,
                            })
                          }
                          onMouseLeave={() =>
                            setHover((hov) =>
                              hov?.key === col.key ? null : hov,
                            )
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectWell(col.well);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectWell(col.well);
                            }
                          }}
                        >
                          <title>
                            {`${col.label}: ${s.formation} (${s.topDepthFt}–${s.bottomDepthFt} ft) — click for well detail`}
                          </title>
                        </rect>
                        {showLabel ? (
                          <text
                            x={x + BAR_W / 2}
                            y={yTop + h / 2 + 3}
                            textAnchor="middle"
                            className="pointer-events-none text-[8px] font-semibold sm:text-[9px]"
                            style={{
                              paintOrder: "stroke fill",
                              fill: labelStyle.fill,
                              stroke: labelStyle.stroke,
                              strokeWidth: labelStyle.strokeWidth,
                            }}
                          >
                            {abbrevFormation(s.formation, h >= 32 ? 14 : 8)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}

                  {/* Clickable well name under column */}
                  <rect
                    x={x}
                    y={CHART_HEIGHT - 22}
                    width={BAR_W}
                    height={20}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => onSelectWell(col.well)}
                  >
                    <title>{`Open well ${col.label}`}</title>
                  </rect>
                  <text
                    x={x + BAR_W / 2}
                    y={CHART_HEIGHT - 8}
                    textAnchor="middle"
                    className={`cursor-pointer text-[8px] font-semibold sm:text-[9px] ${
                      columnInAnyBand(col.key, sharedBands)
                        ? "fill-red-700 dark:fill-red-300"
                        : "fill-zinc-700 dark:fill-zinc-200"
                    } ${selected ? "underline" : ""}`}
                    onClick={() => onSelectWell(col.well)}
                  >
                    {abbrevFormation(col.label, 7)}
                  </text>
                </g>
              );
            })}
            </svg>
          </div>
        </div>

        {sharedBandRows.length ? (
          <div className="space-y-2 border-t border-zinc-200 p-2 sm:hidden dark:border-zinc-700">
            <p className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-100">
              Shared aquifers
              {drillReferenceElevFt != null ? (
                <span className="font-normal text-zinc-600 dark:text-zinc-400">
                  {" "}
                  · your site {drillReferenceElevFt} ft ground
                </span>
              ) : null}
            </p>
            {sharedBandRows.map((row) => (
              <div
                key={`mobile-${row.key}`}
                className={`rounded-md border px-2 py-1.5 text-[10px] leading-snug text-emerald-950 dark:text-emerald-100 ${
                  wellsListMode === row.key
                    ? "border-red-500 bg-red-50/70 dark:border-red-600 dark:bg-red-950/40"
                    : "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20"
                }`}
              >
                <SharedBandLabelContent
                  band={row.band}
                  drillWindow={row.drillWindow}
                  wellsOnChart={row.wellsOnChart}
                  onViewWells={() => toggleBandWells(row.key)}
                  isActive={wellsListMode === row.key}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {hover ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-zinc-100 px-2.5 py-2 text-[11px] text-zinc-800 sm:px-3 sm:text-xs dark:bg-zinc-800 dark:text-zinc-100">
          <p>
            <strong>{hover.label}</strong>
            {hover.aquiferMatch ? (
              <span className="ml-1 font-semibold text-red-700 dark:text-red-300">
                · shared aquifer
              </span>
            ) : null}
            <br />
            <strong>{hover.formation}</strong> · {hover.topDepth}–{hover.bottomDepth}{" "}
            ft in hole · {hover.topAsl}–{hover.bottomAsl} ft ASL
            {center ? (
              <span className="text-zinc-500 dark:text-zinc-400">
                {" "}
                · {formatDistMi(distanceMilesToCenter(hover.well, center))} away
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => onSelectWell(hover.well)}
            className="shrink-0 rounded-md bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
          >
            Open well detail
          </button>
        </div>
      ) : null}

      {wellsListMode && sharedWellsList.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200/80 px-3 py-2 dark:border-red-900/40">
            <div>
              <p className="text-xs font-semibold text-red-950 dark:text-red-100">
                {wellsListMode === "all"
                  ? `Shared aquifer wells (${sharedWellsList.length})`
                  : `Wells in this aquifer band (${sharedWellsList.length})`}
              </p>
              <p className="text-[10px] text-red-900/80 dark:text-red-200/80">
                Sorted by distance from your site
                {center ? "" : " (set map center for distances)"}. Click a row for
                full well text detail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWellsListMode(null)}
              className="rounded border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-900 hover:bg-red-100 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-950/50"
            >
              Close
            </button>
          </div>
          <ul className="max-h-56 divide-y divide-red-100 overflow-y-auto dark:divide-red-900/30">
            {sharedWellsList.map((row) => {
              const selected = selectedWellKey === row.key;
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => onSelectWell(row.well)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-white/80 dark:hover:bg-zinc-900/50 sm:text-xs ${
                      selected
                        ? "bg-emerald-50 dark:bg-emerald-950/30"
                        : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {row.label}
                      </span>
                      {row.bandLabel ? (
                        <span className="block truncate text-[10px] text-red-800 dark:text-red-200">
                          {row.bandLabel}
                          {row.groundAslFt != null
                            ? ` · ground ${row.groundAslFt} ft ASL`
                            : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
                      {formatDistMi(row.distanceMiles)}
                      <span className="block text-[9px] font-normal text-emerald-700 dark:text-emerald-300">
                        Open →
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!demElevFtByKey?.size && onRequestElevations ? (
        <button
          type="button"
          onClick={onRequestElevations}
          disabled={elevLoading}
          className="text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-50 sm:text-xs dark:text-emerald-400"
        >
          {elevLoading ? "Refreshing elevations…" : "Refresh ground elevations"}
        </button>
      ) : null}
    </div>
  );
}
