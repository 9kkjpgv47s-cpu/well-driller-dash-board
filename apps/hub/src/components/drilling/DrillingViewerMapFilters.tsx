"use client";

import type { ViewerMapFilters } from "@/lib/viewer-well-map";

type Props = {
  value: ViewerMapFilters;
  onChange: (next: ViewerMapFilters) => void;
};

function Row({
  checked,
  onChange: oc,
  label,
  labelClass,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  labelClass: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => oc(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-400 text-blue-600"
      />
      <span className={`text-xs font-semibold ${labelClass}`}>{label}</span>
    </label>
  );
}

export function DrillingViewerMapFilters({ value, onChange }: Props) {
  const patch = (p: Partial<ViewerMapFilters>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Same rules as the C&amp;J well viewer map: well type filters, optional
        bottom elevation (ASL) and GPM bands, depth range, and text search.
        Turn on ASL and/or GPM to stack those rows on each marker chip.
      </p>

      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-600">
        <p className="mb-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          Well Bottom Elevation (ft ASL)
        </p>
        <Row
          checked={value.elevBlue}
          onChange={(elevBlue) => patch({ elevBlue })}
          label="● 700+ ft"
          labelClass="text-blue-800 dark:text-blue-300"
        />
        <Row
          checked={value.elevGreen}
          onChange={(elevGreen) => patch({ elevGreen })}
          label="● 600–699 ft"
          labelClass="text-emerald-800 dark:text-emerald-300"
        />
        <Row
          checked={value.elevOrange}
          onChange={(elevOrange) => patch({ elevOrange })}
          label="● 500–599 ft"
          labelClass="text-amber-800 dark:text-amber-300"
        />
        <Row
          checked={value.elevRed}
          onChange={(elevRed) => patch({ elevRed })}
          label="● Below 500 ft"
          labelClass="text-red-800 dark:text-red-300"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-600">
        <p className="mb-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          Well Yield / GPM
        </p>
        <Row
          checked={value.yieldBlue}
          onChange={(yieldBlue) => patch({ yieldBlue })}
          label="● 0.01–10 GPM"
          labelClass="text-blue-800 dark:text-blue-300"
        />
        <Row
          checked={value.yieldGreen}
          onChange={(yieldGreen) => patch({ yieldGreen })}
          label="● 10.01–25 GPM"
          labelClass="text-emerald-800 dark:text-emerald-300"
        />
        <Row
          checked={value.yieldOrange}
          onChange={(yieldOrange) => patch({ yieldOrange })}
          label="● 25.01–50 GPM"
          labelClass="text-amber-800 dark:text-amber-300"
        />
        <Row
          checked={value.yieldRed}
          onChange={(yieldRed) => patch({ yieldRed })}
          label="● 50.01+ GPM"
          labelClass="text-red-800 dark:text-red-300"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-600">
        <p className="mb-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          Well Type Filter
        </p>
        <Row
          checked={value.typeUncon}
          onChange={(typeUncon) => patch({ typeUncon })}
          label="● Unconsolidated / Gravel"
          labelClass="text-blue-700 dark:text-blue-400"
        />
        <Row
          checked={value.typeRock}
          onChange={(typeRock) => patch({ typeRock })}
          label="● Bedrock / Rock"
          labelClass="text-red-700 dark:text-red-400"
        />
        <Row
          checked={value.typeBucket}
          onChange={(typeBucket) => patch({ typeBucket })}
          label="● Bucket / Hand Dug"
          labelClass="text-orange-600 dark:text-orange-400"
        />
        <Row
          checked={value.typeDry}
          onChange={(typeDry) => patch({ typeDry })}
          label="● Dry Hole"
          labelClass="text-zinc-900 dark:text-zinc-100"
        />
        <Row
          checked={value.typeEstimated}
          onChange={(typeEstimated) => patch({ typeEstimated })}
          label="● Estimated / Unverified Location"
          labelClass="text-green-700 dark:text-green-400"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Min depth (ft)
          </label>
          <input
            type="number"
            value={value.minDepth || ""}
            onChange={(e) =>
              patch({
                minDepth: parseFloat(e.target.value) || 0,
              })
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Max depth (ft)
          </label>
          <input
            type="number"
            value={value.maxDepth >= 9999 ? "" : value.maxDepth}
            placeholder="9999"
            onChange={(e) =>
              patch({
                maxDepth: parseFloat(e.target.value) || 9999,
              })
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Filter list / map by text (id, aquifer, owner, depth…)
        </label>
        <input
          type="search"
          value={value.textSearch}
          onChange={(e) => patch({ textSearch: e.target.value })}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Search…"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-600">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.hideWellLabels}
            onChange={(e) => patch({ hideWellLabels: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-400"
          />
          <span className="text-xs font-bold text-red-700 dark:text-red-400">
            Hide well labels
          </span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Label size</span>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm font-bold dark:border-zinc-600"
            onClick={() =>
              patch({
                markerLabelScale: Math.min(
                  1.22,
                  Math.round((value.markerLabelScale + 0.1) * 100) / 100,
                ),
              })
            }
          >
            +
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm font-bold dark:border-zinc-600"
            onClick={() =>
              patch({
                markerLabelScale: Math.max(
                  0.42,
                  Math.round((value.markerLabelScale - 0.1) * 100) / 100,
                ),
              })
            }
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
