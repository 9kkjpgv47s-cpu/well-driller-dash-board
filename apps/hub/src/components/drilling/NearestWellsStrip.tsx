"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import { primaryAquiferText } from "@/lib/area-well-analytics";
import {
  getOrderedTagTokensViewer,
  getWellDisplayDepthFtViewer,
  getYieldGpmForWellViewer,
  wellTypeLabelViewer,
} from "@/lib/viewer-well-map";
import { FieldSegmentedToggle } from "./FieldSegmentedToggle";

type Props = {
  wells: WellRecord[];
  onSelectWell: (w: WellRecord) => void;
  demElevFtByKey?: Map<string, number> | null;
  refElevFt?: number | null;
  title?: string;
  hint?: string;
  selectedKey?: string | null;
  emptyMessage?: string;
  maxHeightClass?: string;
  listMode?: "nearest" | "byDepth";
  onListModeChange?: (mode: "nearest" | "byDepth") => void;
};

export function NearestWellsStrip({
  wells,
  onSelectWell,
  demElevFtByKey,
  refElevFt,
  title = "Nearest registry wells (up to 25)",
  hint = "Scroll · tap for detail",
  selectedKey = null,
  emptyMessage = "No wells to show.",
  maxHeightClass = "max-h-[13rem]",
  listMode = "nearest",
  onListModeChange,
}: Props) {
  return (
    <div className="rounded-lg border border-line bg-bg-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <p className="eyebrow plain">
            {listMode === "nearest"
              ? "Nearest registry wells"
              : "Registry wells · by depth"}
          </p>
          <h3 className="font-serif text-base font-normal leading-tight text-ink">
            {title}
          </h3>
          <p className="mono mt-0.5 text-[10px] uppercase tracking-wide text-ink-3">
            {wells.length} wells
          </p>
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
            <span className="text-[10px] text-ink-4">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
      {!wells.length ? (
        <p className="px-3 py-4 text-xs text-ink-3">{emptyMessage}</p>
      ) : (
        <div
          className={`${maxHeightClass} overflow-y-auto overflow-x-hidden p-2`}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {wells.map((w, idx) => {
            const id = String(w.id ?? w.refno ?? "?");
            const depth = getWellDisplayDepthFtViewer(w);
            const gpm = getYieldGpmForWellViewer(w);
            // Single label standard: styled chips from setLabel only.
            // Do NOT also print plain typeLb (that was dual R/G for the same facts).
            const tagTokens = getOrderedTagTokensViewer(w);
            const typeLb = wellTypeLabelViewer(w);
            const aq = primaryAquiferText(w);
            const k = rowKey(w);
            const demFt = demElevFtByKey?.get(k);
            const diff =
              demFt != null && refElevFt != null ? demFt - refElevFt : null;
            const showPlainFallback =
              !tagTokens.length &&
              typeLb &&
              !/^(Well)$/i.test(typeLb);

            return (
              <button
                key={`${k}-${idx}`}
                type="button"
                onClick={() => onSelectWell(w)}
                className={`cj-plate rounded-lg border p-2.5 text-left text-xs shadow-sm transition ${
                  selectedKey === k
                    ? "border-accent bg-accent-soft ring-1 ring-accent"
                    : "border-line hover:border-accent hover:bg-accent-soft"
                }`}
              >
                <p className="font-mono font-semibold text-ink">
                  {id}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {tagTokens.length ? (
                    <span className="inline-flex flex-wrap items-end gap-x-2">
                      {tagTokens.map((tok, ti) => {
                        // Dom 2026-07-22: color code chips like sand yellow —
                        // R red, G blue, S yellow so they read at a glance.
                        const mr = /^r(\d+)$/i.exec(tok);
                        if (mr) {
                          return (
                            <span
                              key={`${tok}-${ti}`}
                              className="inline-flex items-end rounded px-0.5"
                              title={`Rock top ${mr[1]} ft`}
                            >
                              <span className="text-[10px] font-bold text-red-600">
                                R
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-red-700">
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
                              className="inline-flex items-end rounded px-0.5"
                              title={`Aquifer G${mg[1]} · ${mg[2]} ft thick`}
                            >
                              <span className="text-[10px] font-bold text-blue-600">
                                G{mg[1]}
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-blue-700">
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
                              className="inline-flex items-end rounded px-0.5"
                              title={`Dry sand S${ms[1]} · ${ms[2]} ft thick`}
                            >
                              <span className="text-[10px] font-bold text-amber-600">
                                S{ms[1]}
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-amber-700">
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
                              className="inline-flex items-end rounded px-0.5"
                              title={`G ${mf[1]}`}
                            >
                              <span className="text-[10px] font-bold text-blue-600">
                                G
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-blue-700">
                                {mf[1]}
                              </span>
                            </span>
                          );
                        }
                        return (
                          <span
                            key={`${tok}-${ti}`}
                            className="inline-flex items-end text-ink-2"
                          >
                            {tok}
                          </span>
                        );
                      })}
                    </span>
                  ) : showPlainFallback ? (
                    <span>{typeLb}</span>
                  ) : typeLb === "Well" ? (
                    <span className="text-ink-3">Well</span>
                  ) : null}
                </p>
                <p className="mt-1 text-[11px] text-ink-2">
                  {depth != null ? `${depth} ft` : "— depth"}
                  {gpm != null ? ` · ${gpm} gpm` : ""}
                </p>
                {aq ? (
                  <p className="mt-1 line-clamp-2 text-[10px] text-ink-3">
                    {aq}
                  </p>
                ) : null}
                {demFt != null ? (
                  <p className="mt-1 text-[10px] text-ok">
                    DEM {demFt} ft
                    {diff != null
                      ? ` (${diff > 0 ? "+" : ""}${diff} vs ref)`
                      : ""}
                  </p>
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
