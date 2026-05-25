"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  boreholeLeaderPath,
  buildDepthTicks,
  buildThermometerLayout,
  clampCursorDepth,
  computeDynamicLabelMinGap,
  depthToY,
  layoutBoreholeWellLabels,
  parseDepthInput,
  computeBoreholeGeometry,
  type BoreholeGeometry,
} from "@/lib/well-depth-thermometer";
import {
  wellTypeColorViewer,
  wellTypeLabelViewer,
} from "@/lib/viewer-well-map";
import { NearestWellsStrip } from "./NearestWellsStrip";

const CHART_HEIGHT = 420;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 16;
const LABEL_FONT_CLASS = "fill-zinc-800 text-[11px] font-mono font-semibold dark:fill-zinc-100 md:text-[12px]";
const LABEL_HIT_W = 64;
const LABEL_HIT_H = 28;
const WHEEL_PIXELS_PER_FT = 52;
const WHEEL_STEP_FT = 2;
const KEY_STEP_FT = 1;
const KEY_PAGE_STEP_FT = 25;

type Props = {
  wells: WellRecord[];
  radiusMiles: number;
  radiusOptions?: readonly number[];
  onRadiusChange?: (value: string) => void;
  medianDepthFt?: number | null;
  selectedWellKey?: string | null;
  onSelectWell: (w: WellRecord) => void;
  onDepthChange?: (depthFt: number) => void;
  /** When true, omits side well strip (parent renders shared list). */
  embedded?: boolean;
  /** Hide radius dropdown (parent controls radius in section header). */
  hideRadiusControl?: boolean;
};

function formatRadiusLabel(mi: number): string {
  if (mi === 0.25) return "¼ mi";
  if (mi === 0.3) return "0.3 mi";
  if (mi === 0.5) return "½ mi";
  if (mi === 1.5) return "1½ mi";
  return `${mi} mi`;
}

function wellId(w: WellRecord, key: string): string {
  return String(w.id ?? w.refno ?? key);
}

export function WellDepthThermometer({
  wells,
  radiusMiles,
  radiusOptions = [0.3, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5],
  onRadiusChange,
  medianDepthFt,
  selectedWellKey,
  onSelectWell,
  onDepthChange,
  embedded = false,
  hideRadiusControl = false,
}: Props) {
  const svgId = useId();
  const boreWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wheelAccumRef = useRef(0);
  const [geom, setGeom] = useState<BoreholeGeometry>(() =>
    computeBoreholeGeometry(200, CHART_HEIGHT, PADDING_TOP, PADDING_BOTTOM),
  );
  const [cursorFt, setCursorFtState] = useState(150);
  const [inputText, setInputText] = useState("150");
  const [inputError, setInputError] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [spreadLabels, setSpreadLabels] = useState(false);

  const baseLayout = useMemo(
    () => buildThermometerLayout(wells, { medianDepthFt, cursorFt: null }),
    [wells, medianDepthFt],
  );
  const domain = baseLayout.domain;

  useEffect(() => {
    setCursorFtState((prev) => {
      if (!Number.isFinite(prev) || prev < domain.minFt || prev > domain.maxFt) {
        return baseLayout.defaultCursorFt;
      }
      return clampCursorDepth(prev, domain);
    });
  }, [baseLayout.defaultCursorFt, domain]);

  useEffect(() => {
    setInputText(String(cursorFt));
    setInputError(null);
    onDepthChange?.(cursorFt);
  }, [cursorFt, onDepthChange]);

  const setCursorFt = useCallback(
    (next: number) => setCursorFtState(clampCursorDepth(next, domain)),
    [domain],
  );

  const lines = baseLayout.lines;

  const ticks = useMemo(() => buildDepthTicks(domain), [domain]);
  const plottedWellRecords = useMemo(
    () => lines.map((line) => line.well),
    [lines],
  );

  useEffect(() => {
    const el = boreWrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      wheelAccumRef.current += e.deltaY;
      const steps = Math.trunc(wheelAccumRef.current / WHEEL_PIXELS_PER_FT);
      if (steps === 0) return;

      wheelAccumRef.current -= steps * WHEEL_PIXELS_PER_FT;
      setCursorFtState((prev) =>
        clampCursorDepth(prev + steps * WHEEL_STEP_FT, domain),
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [domain]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setSpreadLabels(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = boreWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) {
        setGeom(
          computeBoreholeGeometry(
            w,
            CHART_HEIGHT,
            PADDING_TOP,
            PADDING_BOTTOM,
            spreadLabels,
          ),
        );
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [spreadLabels]);

  const {
    svgW,
    boreLeft,
    boreRight,
    leftLabelX,
    rightLabelX,
    boreBottomY,
  } = geom;

  const surfaceY = depthToY(
    0,
    domain,
    CHART_HEIGHT,
    PADDING_TOP,
    PADDING_BOTTOM,
  );

  const labelLayout = useMemo(() => {
    const minGapPx = computeDynamicLabelMinGap(
      lines.length,
      surfaceY + 18,
      boreBottomY - 4,
      spreadLabels,
    );
    const inputs = lines.map((line) => ({
      key: line.key,
      depthFt: line.depthFt,
      anchorY: depthToY(
        line.depthFt,
        domain,
        CHART_HEIGHT,
        PADDING_TOP,
        PADDING_BOTTOM,
      ),
    }));
    return layoutBoreholeWellLabels(inputs, {
      minGapPx,
      minY: surfaceY + 18,
      maxY: boreBottomY - 4,
      maxVerticalOffsetPx: spreadLabels ? 72 : 56,
    });
  }, [lines, domain, surfaceY, boreBottomY, spreadLabels]);

  const labelByKey = useMemo(
    () => new Map(labelLayout.map((l) => [l.key, l])),
    [labelLayout],
  );

  const cursorY = depthToY(
    cursorFt,
    domain,
    CHART_HEIGHT,
    PADDING_TOP,
    PADDING_BOTTOM,
  );

  const handleInputCommit = useCallback(() => {
    const parsed = parseDepthInput(inputText);
    if (parsed == null) {
      setInputError("Enter a valid depth in feet.");
      setInputText(String(cursorFt));
      return;
    }
    setInputError(null);
    setCursorFt(parsed);
  }, [cursorFt, inputText, setCursorFt]);

  const handlePanelKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement) return;
      let delta = 0;
      switch (e.key) {
        case "ArrowUp":
          delta = -KEY_STEP_FT;
          break;
        case "ArrowDown":
          delta = KEY_STEP_FT;
          break;
        case "PageUp":
          delta = -KEY_PAGE_STEP_FT;
          break;
        case "PageDown":
          delta = KEY_PAGE_STEP_FT;
          break;
        default:
          return;
      }
      e.preventDefault();
      setCursorFt(cursorFt + delta);
    },
    [cursorFt, setCursorFt],
  );

  const bandWellRecords = plottedWellRecords;

  const borePath = [
    `M ${boreLeft} ${surfaceY + 14}`,
    `A ${geom.boreW / 2} 14 0 0 1 ${boreRight} ${surfaceY + 14}`,
    `L ${boreRight} ${boreBottomY}`,
    `L ${boreLeft} ${boreBottomY}`,
    "Z",
  ].join(" ");

  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "rounded-xl border border-zinc-200 bg-[var(--surface-solid)] p-4 shadow-sm dark:border-zinc-700"
      }
    >
      <div className="mb-3 flex flex-wrap items-end gap-3">
        {onRadiusChange && !hideRadiusControl ? (
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            <span className="font-semibold uppercase tracking-wide">Radius</span>
            <select
              value={String(radiusMiles)}
              onChange={(e) => onRadiusChange(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm"
              aria-label="Depth view search radius"
            >
              {radiusOptions.map((r) => (
                <option key={r} value={String(r)}>
                  {formatRadiusLabel(r)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          <span className="font-semibold uppercase tracking-wide">
            Your depth (ft)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={domain.minFt}
              max={domain.maxFt}
              step={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onBlur={handleInputCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleInputCommit();
                }
              }}
              className="w-24 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-1.5 font-mono text-sm text-[var(--foreground)] shadow-sm"
            />
            <span className="text-[var(--foreground)]">ft</span>
          </div>
          {inputError ? (
            <span className="text-amber-700 dark:text-amber-300">{inputError}</span>
          ) : null}
        </label>
      </div>

      <div
        className={
          embedded
            ? "flex flex-col gap-4"
            : "flex flex-col gap-4 lg:flex-row lg:items-stretch"
        }
      >
        <div
          ref={boreWrapRef}
          className={
            embedded
              ? "mx-auto flex w-full min-w-[200px] max-w-[420px] justify-center overscroll-contain touch-none"
              : "mx-auto flex w-full min-w-[200px] max-w-[420px] shrink-0 justify-center overscroll-contain touch-none"
          }
        >
          <div
            ref={panelRef}
            tabIndex={0}
            role="group"
            aria-label={`Borehole depth view within ${radiusMiles} miles`}
            onKeyDown={handlePanelKeyDown}
            className="outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <svg
              width={svgW}
              height={CHART_HEIGHT}
              viewBox={`0 0 ${svgW} ${CHART_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              className="block h-auto w-full"
              aria-label="Borehole cross-section"
            >
            <defs>
              <linearGradient id={`${svgId}-bore`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#78716c" />
                <stop offset="45%" stopColor="#a8a29e" />
                <stop offset="100%" stopColor="#57534e" />
              </linearGradient>
              <linearGradient id={`${svgId}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f5f5f4" />
                <stop offset="100%" stopColor="#e7e5e4" />
              </linearGradient>
              <clipPath id={`${svgId}-bore-clip`}>
                <path d={borePath} />
              </clipPath>
            </defs>

            {/* Ground surface — 0 ft */}
            <line
              x1={4}
              x2={svgW - 4}
              y1={surfaceY}
              y2={surfaceY}
              stroke="#65a30d"
              strokeWidth={3}
            />
            <text
              x={svgW / 2}
              y={surfaceY - 6}
              textAnchor="middle"
              className="fill-lime-800 text-[9px] font-semibold dark:fill-lime-300"
            >
              surface · 0 ft
            </text>

            {/* Borehole shell (half-pipe cross-section) */}
            <path
              d={borePath}
              fill={`url(#${svgId}-fill)`}
              stroke="#57534e"
              strokeWidth={2}
            />
            {/* Cut face highlight */}
            <line
              x1={boreLeft}
              y1={surfaceY + 14}
              x2={boreLeft}
              y2={boreBottomY}
              stroke="#44403c"
              strokeWidth={2.5}
            />

            {/* Depth scale — hatched guides inside the borehole */}
            <g clipPath={`url(#${svgId}-bore-clip)`}>
              {ticks.map((tick) => {
                const y = depthToY(
                  tick.depthFt,
                  domain,
                  CHART_HEIGHT,
                  PADDING_TOP,
                  PADDING_BOTTOM,
                );
                return (
                  <g key={`tick-${tick.depthFt}`}>
                    <line
                      x1={boreLeft + 8}
                      x2={boreRight - 8}
                      y1={y}
                      y2={y}
                      stroke="#a8a29e"
                      strokeWidth={1}
                      strokeDasharray="4 5"
                      opacity={0.85}
                    />
                    <text
                      x={boreLeft + 10}
                      y={y + 4}
                      textAnchor="start"
                      className="fill-zinc-500 text-[9px] font-mono dark:fill-zinc-400"
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Median / filter refs inside bore */}
            {medianDepthFt != null && Number.isFinite(medianDepthFt) ? (
              <line
                x1={boreLeft + 4}
                x2={boreRight - 4}
                y1={depthToY(
                  medianDepthFt,
                  domain,
                  CHART_HEIGHT,
                  PADDING_TOP,
                  PADDING_BOTTOM,
                )}
                y2={depthToY(
                  medianDepthFt,
                  domain,
                  CHART_HEIGHT,
                  PADDING_TOP,
                  PADDING_BOTTOM,
                )}
                stroke="#059669"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                clipPath={`url(#${svgId}-bore-clip)`}
              />
            ) : null}

            {/* Your depth — reference line only; all area wells stay plotted */}
            <g clipPath={`url(#${svgId}-bore-clip)`}>
              <line
                x1={boreLeft + 4}
                x2={boreRight - 4}
                y1={cursorY}
                y2={cursorY}
                stroke="#0ea5e9"
                strokeWidth={2}
              />
              <text
                x={(boreLeft + boreRight) / 2}
                y={cursorY + 11}
                textAnchor="middle"
                className="fill-sky-700 text-[8px] font-semibold dark:fill-sky-300"
              >
                {cursorFt} ft
              </text>
            </g>

            {/* Well markers + leaders */}
            {lines.map((line) => {
              const layout = labelByKey.get(line.key);
              if (!layout) return null;
              const { anchorY, labelY, side } = layout;
              const color = wellTypeColorViewer(line.well);
              const selected = selectedWellKey === line.key;
              const anchorX = side === "left" ? boreLeft : boreRight;
              const labelX = side === "left" ? leftLabelX : rightLabelX;
              const leader = boreholeLeaderPath(
                side,
                anchorX,
                anchorY,
                labelX,
                labelY,
              );

              return (
                <g key={`${line.key}-marker`}>
                  <circle
                    cx={anchorX}
                    cy={anchorY}
                    r={selected ? 4 : 3}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                  <path
                    d={leader}
                    fill="none"
                    stroke={color}
                    strokeWidth={selected ? 2.5 : 1.5}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Footage labels + touch targets always on top */}
            {lines.map((line) => {
              const layout = labelByKey.get(line.key);
              if (!layout) return null;
              const { labelY, side, label } = layout;
              const selected = selectedWellKey === line.key;
              const labelX = side === "left" ? leftLabelX : rightLabelX;
              const id = wellId(line.well, line.key);

              return (
                <g key={`${line.key}-label`}>
                  <rect
                    x={labelX - LABEL_HIT_W / 2}
                    y={labelY - LABEL_HIT_H / 2 + 2}
                    width={LABEL_HIT_W}
                    height={LABEL_HIT_H}
                    rx={4}
                    fill="transparent"
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Well ${id}, ${line.depthFt} feet, ${wellTypeLabelViewer(line.well)}`}
                    onMouseEnter={() => setHoveredKey(line.key)}
                    onMouseLeave={() =>
                      setHoveredKey((k) => (k === line.key ? null : k))
                    }
                    onFocus={() => setHoveredKey(line.key)}
                    onBlur={() =>
                      setHoveredKey((k) => (k === line.key ? null : k))
                    }
                    onClick={() => onSelectWell(line.well)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectWell(line.well);
                      }
                    }}
                  />
                  <text
                    x={labelX}
                    y={labelY + 4}
                    textAnchor="middle"
                    className={`${LABEL_FONT_CLASS} ${
                      selected ? "opacity-100" : ""
                    }`}
                    style={{ paintOrder: "stroke fill" }}
                    stroke="var(--surface-solid, #fff)"
                    strokeWidth={3}
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

          </svg>

          <input
            type="range"
            min={domain.minFt}
            max={domain.maxFt}
            step={1}
            value={cursorFt}
            onChange={(e) => setCursorFt(Number(e.target.value))}
            aria-label="Your depth in the hole (feet)"
            aria-valuemin={domain.minFt}
            aria-valuemax={domain.maxFt}
            aria-valuenow={cursorFt}
            className="sr-only"
          />
          </div>
        </div>

        {!embedded ? (
        <div className="min-w-0 flex-1 space-y-3">
          <NearestWellsStrip
            wells={bandWellRecords}
            onSelectWell={onSelectWell}
            selectedKey={selectedWellKey ?? hoveredKey}
            title={`Registry wells by depth · ${formatRadiusLabel(radiusMiles)}`}
            hint={
              bandWellRecords.length
                ? `${bandWellRecords.length} plotted · scroll · tap for detail`
                : undefined
            }
            emptyMessage={`No wells with depth in ${formatRadiusLabel(radiusMiles)} — widen radius or relax map filters.`}
            maxHeightClass="max-h-[22rem] md:max-h-[26rem]"
          />

          <footer className="flex flex-wrap gap-x-3 gap-y-1 border-t border-zinc-200 pt-3 text-[10px] text-zinc-500 dark:border-zinc-700">
            <span>
              {lines.length} plotted in {formatRadiusLabel(radiusMiles)} · scale
              0–{domain.maxFt} ft
            </span>
            {medianDepthFt != null ? <span>Median {medianDepthFt} ft</span> : null}
            {baseLayout.missingDepthCount > 0 ? (
              <span>{baseLayout.missingDepthCount} no depth</span>
            ) : null}
            {baseLayout.truncatedCount > 0 ? (
              <span>+{baseLayout.truncatedCount} truncated</span>
            ) : null}
          </footer>
        </div>
        ) : (
          <footer className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
            <span>
              {lines.length} plotted · scale 0–{domain.maxFt} ft
            </span>
            {medianDepthFt != null ? <span>Median {medianDepthFt} ft</span> : null}
          </footer>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="mt-3 text-center text-sm text-[var(--muted)]">
          No wells with depth in {formatRadiusLabel(radiusMiles)} — widen radius
          or relax map filters.
        </p>
      ) : null}
    </div>
  );
}
