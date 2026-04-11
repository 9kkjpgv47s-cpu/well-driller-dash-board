"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import { primaryAquiferText } from "@/lib/area-well-analytics";
import {
  getWellDisplayDepthFtViewer,
  getYieldGpmForWellViewer,
  wellMapGrTagViewer,
  wellTypeLabelViewer,
} from "@/lib/viewer-well-map";

type Props = {
  wells: WellRecord[];
  onSelectWell: (w: WellRecord) => void;
  demElevFtByKey?: Map<string, number> | null;
  refElevFt?: number | null;
};

function rowKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}

export function NearestWellsStrip({
  wells,
  onSelectWell,
  demElevFtByKey,
  refElevFt,
}: Props) {
  if (!wells.length) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-600">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Nearest registry wells (up to 25)
        </h3>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Scroll · tap for detail
        </span>
      </div>
      <div className="max-h-[13rem] overflow-y-auto overflow-x-hidden p-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {wells.map((w, idx) => {
            const id = String(w.id ?? w.refno ?? "?");
            const depth = getWellDisplayDepthFtViewer(w);
            const gpm = getYieldGpmForWellViewer(w);
            const gr = wellMapGrTagViewer(w);
            const typeLb = wellTypeLabelViewer(w);
            const aq = primaryAquiferText(w);
            const k = rowKey(w);
            const demFt = demElevFtByKey?.get(k);
            const diff =
              demFt != null && refElevFt != null ? demFt - refElevFt : null;

            return (
              <button
                key={`${k}-${idx}`}
                type="button"
                onClick={() => onSelectWell(w)}
                className="rounded-lg border border-zinc-200 bg-white p-2.5 text-left text-xs shadow-sm transition hover:border-sky-400 hover:bg-sky-50/50 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:border-sky-600 dark:hover:bg-sky-950/20"
              >
                <p className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                  {id}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                  {typeLb}
                  {gr ? (
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      {gr}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                  {depth != null ? `${depth} ft` : "— depth"}
                  {gpm != null ? ` · ${gpm} gpm` : ""}
                </p>
                {aq ? (
                  <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500 dark:text-zinc-400">
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
    </div>
  );
}
