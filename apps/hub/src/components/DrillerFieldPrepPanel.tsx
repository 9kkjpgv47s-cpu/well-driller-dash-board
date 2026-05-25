"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import type { OptimizationResult } from "@/lib/optimization";

type Props = {
  lat: number;
  lon: number;
  radiusMiles?: number;
  /** Move up / down controls (workspace section ordering). */
  headerActions?: ReactNode;
};

export function DrillerFieldPrepPanel({
  lat,
  lon,
  radiusMiles = DEFAULT_AREA_RADIUS_MILES,
  headerActions,
}: Props) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const q = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      radiusMiles: String(radiusMiles),
      priority: "balanced",
    });
    setLoading(true);
    setError(null);
    fetch(`/api/optimization?${q}`, { signal: ctrl.signal })
      .then(async (r) => {
        const data = (await r.json()) as { error?: string };
        if (!r.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : r.statusText,
          );
        }
        return data as OptimizationResult;
      })
      .then(setResult)
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setResult(null);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [lat, lon, radiusMiles]);

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
      aria-labelledby="driller-prep-h"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id="driller-prep-h"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Site optimization (auto)
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Checklist and neighborhood hints load automatically for the active
            jobsite coordinates (mock API for now). When you add accounts, this
            will attach to the job your driller opens—no separate run step.
          </p>
        </div>
        {headerActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {headerActions}
          </div>
        ) : null}
      </div>

      {loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading optimization…
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Wells in radius (mock)
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {result.neighborhood.sampleWellsInRadius}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Median depth (illustrative)
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {result.neighborhood.medianDepthFt} ft
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Static band (illustrative)
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {result.neighborhood.typicalStaticBandFt}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Checklist
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Mock API notes</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {result.neighborhood.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Generated {new Date(result.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}
