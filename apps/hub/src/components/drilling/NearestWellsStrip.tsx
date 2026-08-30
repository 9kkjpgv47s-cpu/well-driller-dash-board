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
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-900/50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-600">
        <h3 className="min-w-0 break-words text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          {title}
        </h3>
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
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
      {!wells.length ? (
        <p className="px-3 py-4 text-xs text-[var(--muted)]">{emptyMessage}</p>
      ) : (
        <div
          className={`${maxHeightClass} overflow-y-auto overflow-x-hidden p-2`}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                className={`min-w-0 rounded-lg border bg-white p-2.5 text-left text-xs shadow-sm transition dark:bg-zinc-950 ${
                  selectedKey === k
                    ? "border-sky-500 bg-sky-50/70 ring-1 ring-sky-400 dark:border-sky-500 dark:bg-sky-950/40"
                    : "border-zinc-200 hover:border-sky-400 hover:bg-sky-50/50 dark:border-zinc-600 dark:hover:border-sky-600 dark:hover:bg-sky-950/20"
                }`}
              >
                <p className="break-words font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                  {id}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
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
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                R
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-red-700 dark:text-red-300">
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
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                G{mg[1]}
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-blue-700 dark:text-blue-300">
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
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300">
                                S{ms[1]}
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-amber-700 dark:text-amber-200">
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
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                G
                              </span>
                              <span className="text-[15px] font-extrabold leading-none text-blue-700 dark:text-blue-300">
                                {mf[1]}
                              </span>
                            </span>
                          );
                        }
                        return (
                          <span
                            key={`${tok}-${ti}`}
                            className="inline-flex items-end text-zinc-700 dark:text-zinc-300"
                          >
                            {tok}
                          </span>
                        );
                      })}
                    </span>
                  ) : showPlainFallback ? (
                    <span>{typeLb}</span>
                  ) : typeLb === "Well" ? (
                    <span className="text-zinc-500">Well</span>
                  ) : null}
                </p>
                <p className="mt-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                  {depth != null ? `${depth} ft` : "— depth"}
                  {gpm != null ? ` · ${gpm} gpm` : ""}
                </p>
                {aq ? (
                  <p className="mt-1 line-clamp-2 break-words text-[10px] text-zinc-500 dark:text-zinc-400">
                    {aq}
                  </p>
                ) : null}
                {demFt != null ? (
                  <p className="mt-1 text-[10px] text-emerald-800 dark:text-emerald-200">
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
