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
    <label className="flex cursor-pointer items-center gap-1.5 py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => oc(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-zinc-400 text-blue-600"
      />
      <span className={`text-[11px] font-semibold leading-tight ${labelClass}`}>
        {label}
      </span>
    </label>
  );
}

function FilterBand({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-600">
      <p className="mb-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
        {title}
      </p>
      {children}
    </div>
  );
}

export function MapLabelToolbarControls({ value, onChange }: Props) {
  const patch = (p: Partial<ViewerMapFilters>) => onChange({ ...value, ...p });

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-zinc-200 bg-zinc-100/90 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900/60">
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.hideWellLabels}
          onChange={(e) => patch({ hideWellLabels: e.target.checked })}
          className="h-3.5 w-3.5 shrink-0 rounded border-zinc-400"
        />
        <span className="whitespace-nowrap text-xs font-semibold text-red-700 dark:text-red-400">
          Hide labels
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="whitespace-nowrap text-xs text-zinc-500">Size</span>
        <button
          type="button"
          className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs font-bold dark:border-zinc-600"
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
          className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs font-bold dark:border-zinc-600"
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
  );
}

export function DrillingViewerMapFilters({ value, onChange }: Props) {
  const patch = (p: Partial<ViewerMapFilters>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <FilterBand title="Well Type Filter">
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
        </FilterBand>

        <FilterBand title="Well Yield / GPM">
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
        </FilterBand>
      </div>
    </div>
  );
}
