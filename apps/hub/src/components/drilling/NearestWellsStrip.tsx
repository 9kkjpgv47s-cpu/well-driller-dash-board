"use client";

import { useEffect, useRef, useState } from "react";
import type { WellRecord } from "@/lib/area-well-analytics";
import { haversineMiles, primaryAquiferText } from "@/lib/area-well-analytics";
import {
  getOrderedTagTokensViewer,
  getWellDisplayDepthFtViewer,
  getYieldGpmForWellViewer,
  wellTypeColorViewer,
  wellTypeLabelViewer,
} from "@/lib/viewer-well-map";
import { FieldSegmentedToggle } from "./FieldSegmentedToggle";

type Props = {
  wells: WellRecord[];
  onSelectWell: (w: WellRecord) => void;
  demElevFtByKey?: Map<string, number> | null;
  refElevFt?: number | null;
  center?: { lat: number; lon: number } | null;
  title?: string;
  hint?: string;
  selectedKey?: string | null;
  emptyMessage?: string;
  maxHeightClass?: string;
  listMode?: "nearest" | "byDepth";
  onListModeChange?: (mode: "nearest" | "byDepth") => void;
};

/** Locked chip colors — solid map-marker fills; text white (R/G) or dark
 *  amber-brown on yellow (S). Token text must not change. */
const CHIP = {
  r: { prefix: "text-white", value: "text-white" },
  g: { prefix: "text-white", value: "text-white" },
  s: { prefix: "text-[#422006]", value: "text-[#422006]" },
} as const;

function TagChip({ tok, ti }: { tok: string; ti: number }) {
  const mr = /^r(\d+)$/i.exec(tok);
  if (mr) {
    return (
      <span
        key={`${tok}-${ti}`}
        className="well-tag well-tag-r"
        title={`Rock top ${mr[1]} ft`}
      >
        <span className={`text-[10px] font-bold ${CHIP.r.prefix}`}>R</span>
        <span className={`text-[15px] font-extrabold leading-none ${CHIP.r.value}`}>
          {mr[1]}
        </span>
      </span>
    );
  }
  const mg = /^g(\d+)\s+(\d+)$/i.exec(tok);
  if (mg) {
    return (
      <span
        key={`${tok}-${ti}`}
        className="well-tag well-tag-g"
        title={`Aquifer G${mg[1]} · ${mg[2]} ft thick`}
      >
        <span className={`text-[10px] font-bold ${CHIP.g.prefix}`}>
          G{mg[1]}
        </span>
        <span className={`text-[15px] font-extrabold leading-none ${CHIP.g.value}`}>
          {" "}
          {mg[2]}
        </span>
      </span>
    );
  }
  const ms = /^s(\d+)\s+(\d+)$/i.exec(tok);
  if (ms) {
    return (
      <span
        key={`${tok}-${ti}`}
        className="well-tag well-tag-s"
        title={`Dry sand S${ms[1]} · ${ms[2]} ft thick`}
      >
        <span className={`text-[10px] font-bold ${CHIP.s.prefix}`}>
          S{ms[1]}
        </span>
        <span className={`text-[15px] font-extrabold leading-none ${CHIP.s.value}`}>
          {" "}
          {ms[2]}
        </span>
      </span>
    );
  }
  const mf = /^g(\d+)$/i.exec(tok);
  if (mf) {
    return (
      <span
        key={`${tok}-${ti}`}
        className="well-tag well-tag-g"
        title={`G ${mf[1]}`}
      >
        <span className={`text-[10px] font-bold ${CHIP.g.prefix}`}>G</span>
        <span className={`text-[15px] font-extrabold leading-none ${CHIP.g.value}`}>
          {mf[1]}
        </span>
      </span>
    );
  }
  return (
    <span key={`${tok}-${ti}`} className="inline-flex items-end text-ink-2">
      {tok}
    </span>
  );
}

export function NearestWellsStrip({
  wells,
  onSelectWell,
  demElevFtByKey,
  refElevFt,
  center = null,
  title = "Nearest registry wells (up to 25)",
  hint = "Scroll · tap for detail",
  selectedKey = null,
  emptyMessage = "No wells to show.",
  maxHeightClass = "max-h-[18.5rem] sm:max-h-[24rem]",
  listMode = "nearest",
  onListModeChange,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canFade, setCanFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setCanFade(el.scrollHeight - el.clientHeight > 4 &&
        el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [wells.length, maxHeightClass]);

  const maxDepth = Math.max(
    0,
    ...wells.map((w) => getWellDisplayDepthFtViewer(w) ?? 0),
  );

  return (
    <div className="well-list rounded-lg border border-line bg-bg-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <p className="eyebrow plain">
            {listMode === "nearest" ? "Registry wells" : "Registry · by depth"}
          </p>
          <h3 className="font-serif text-base font-normal leading-tight text-ink">
            {title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onListModeChange ? (
            <FieldSegmentedToggle
              size="sm"
              ariaLabel="Well list sort"
              value={listMode}
              onChange={onListModeChange}
              options={[
                { value: "nearest", label: "Closest" },
                { value: "byDepth", label: "By depth" },
              ]}
            />
          ) : null}
          {hint ? (
            <span className="min-w-0 max-w-full truncate text-[10px] text-ink-4">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-x-3 gap-y-1 overflow-hidden border-b border-line px-3 py-1.5 text-[10px] text-ink-4">
        <span className="inline-flex items-center gap-1">
          <span className="well-tag well-tag-g">
            <span className={`text-[10px] font-bold ${CHIP.g.prefix}`}>G</span>
          </span>
          <span>gravel/aquifer</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="well-tag well-tag-s">
            <span className={`text-[10px] font-bold ${CHIP.s.prefix}`}>S</span>
          </span>
          <span>dry sand</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="well-tag well-tag-r">
            <span className={`text-[10px] font-bold ${CHIP.r.prefix}`}>R</span>
          </span>
          <span>rock top</span>
        </span>
        <span className="ml-auto hidden whitespace-nowrap sm:inline">
          numbers in ft
        </span>
      </div>
      {!wells.length ? (
        <p className="px-3 py-4 text-xs text-ink-3">{emptyMessage}</p>
      ) : (
        <div
          ref={scrollRef}
          className={`well-list-scroll ${maxHeightClass} overflow-y-auto overflow-x-hidden p-2 ${
            canFade ? "well-list-fade" : ""
          }`}
        >
          <div className="well-list-grid">
            {wells.map((w, idx) => {
              const id = String(w.id ?? w.refno ?? "?");
              const depth = getWellDisplayDepthFtViewer(w);
              const gpm = getYieldGpmForWellViewer(w);
              const tagTokens = getOrderedTagTokensViewer(w);
              const typeLb = wellTypeLabelViewer(w);
              const aq = primaryAquiferText(w);
              const k = rowKey(w);
              const typeColor = wellTypeColorViewer(w);
              const demFt = demElevFtByKey?.get(k);
              const diff =
                demFt != null && refElevFt != null ? demFt - refElevFt : null;
              const showPlainFallback =
                !tagTokens.length &&
                typeLb &&
                !/^(Well)$/i.test(typeLb);
              const dist =
                center && w.lat != null && w.lon != null
                  ? haversineMiles(
                      center.lat,
                      center.lon,
                      Number(w.lat),
                      Number(w.lon),
                    )
                  : null;
              const distText =
                dist != null
                  ? `${dist < 1 ? dist.toFixed(2) : dist.toFixed(1)} mi`
                  : null;
              const depthPct =
                depth != null && maxDepth > 0
                  ? Math.max(2, Math.round((depth / maxDepth) * 100))
                  : null;

              return (
                <button
                  key={`${k}-${idx}`}
                  type="button"
                  onClick={() => onSelectWell(w)}
                  className={`well-card ${
                    selectedKey === k ? "is-selected" : ""
                  }`}
                  style={{
                    borderLeftColor: typeColor,
                    borderLeftWidth: 4,
                  }}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-ink-4">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-mono text-xs font-semibold text-ink">
                      {id}
                    </span>
                    {distText ? (
                      <span className="ml-auto whitespace-nowrap font-mono text-[10px] tabular-nums text-ink-3">
                        {distText}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex min-h-[22px] flex-wrap items-end gap-x-1.5 gap-y-0.5">
                    {tagTokens.length ? (
                      tagTokens.map((tok, ti) => (
                        <TagChip key={`${tok}-${ti}`} tok={tok} ti={ti} />
                      ))
                    ) : showPlainFallback ? (
                      <span className="text-[11px] text-ink-3">{typeLb}</span>
                    ) : typeLb === "Well" ? (
                      <span className="text-[11px] text-ink-3">Well</span>
                    ) : null}
                    <span className="well-card-stats-sm ml-auto hidden whitespace-nowrap font-mono text-[10px] tabular-nums text-ink-3">
                      {depth != null ? `${depth} ft` : "—"}
                      {gpm != null ? ` · ${gpm} gpm` : ""}
                    </span>
                  </span>
                  <span className="well-card-stats flex items-end gap-4">
                    {depth != null ? (
                      <span className="flex flex-col">
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {depth}
                          <span className="text-[10px] font-normal text-ink-3">
                            {" "}
                            ft
                          </span>
                        </span>
                        <span className="well-card-microlabel">Depth</span>
                      </span>
                    ) : (
                      <span className="flex flex-col">
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-ink-3">
                          — depth
                        </span>
                        <span className="well-card-microlabel">Depth</span>
                      </span>
                    )}
                    {gpm != null ? (
                      <span className="flex flex-col">
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {gpm}
                          <span className="text-[10px] font-normal text-ink-3">
                            {" "}
                            gpm
                          </span>
                        </span>
                        <span className="well-card-microlabel">Yield</span>
                      </span>
                    ) : null}
                  </span>
                  {depthPct != null ? (
                    <span className="well-depthbar" aria-hidden="true">
                      <span
                        className="well-depthbar-fill"
                        style={{
                          width: `${depthPct}%`,
                          background: typeColor,
                        }}
                      />
                    </span>
                  ) : null}
                  {aq || demFt != null ? (
                    <span className="well-card-meta flex min-w-0 flex-col gap-0.5">
                      {aq ? (
                        <span className="truncate text-[10px] text-ink-3">
                          {aq}
                        </span>
                      ) : null}
                      {demFt != null ? (
                        <span className="text-[10px] text-ok">
                          DEM {demFt} ft
                          {diff != null
                            ? ` (${diff > 0 ? "+" : ""}${diff} vs ref)`
                            : ""}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function rowKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}
