"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  computeAreaInsights,
  type AreaInsightsReport,
} from "@/lib/area-well-analytics";
import { getDnrWellsCached } from "@/lib/dnr-wells-cache";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import {
  SITE_PREP_CHECKLIST_ITEMS,
  type OptimizationResult,
} from "@/lib/optimization";

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
  const [insight, setInsight] = useState<AreaInsightsReport | null>(null);
  const [insightErr, setInsightErr] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [opt, setOpt] = useState<OptimizationResult | null>(null);
  const [optErr, setOptErr] = useState<string | null>(null);
  const [optLoading, setOptLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const q = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      radiusMiles: String(radiusMiles),
      priority: "balanced",
    });

    setInsightLoading(true);
    setInsightErr(null);
    setInsight(null);
    void getDnrWellsCached()
      .then((wells) => {
        if (ctrl.signal.aborted) return;
        setInsight(computeAreaInsights(wells, lat, lon, radiusMiles));
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setInsightErr(e instanceof Error ? e.message : "Failed to load wells");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setInsightLoading(false);
      });

    setOptLoading(true);
    setOptErr(null);
    setOpt(null);
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
      .then((data) => {
        if (!ctrl.signal.aborted) setOpt(data);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError" || ctrl.signal.aborted) return;
        setOptErr(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setOptLoading(false);
      });

    return () => ctrl.abort();
  }, [lat, lon, radiusMiles]);

  const fp = insight?.fieldPrepNeighborhood;
  const checklist = opt?.checklist ?? [...SITE_PREP_CHECKLIST_ITEMS];
  const plannerNotes = opt?.neighborhood.notes ?? [];
  const scores = opt?.scores;

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
            Neighborhood counts and depths come from the same DNR gz chunks as
            the map. Planner scores and the amber notes below are simple
            heuristics until a full analytics service is wired.
          </p>
        </div>
        {headerActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {headerActions}
          </div>
        ) : null}
      </div>

      {(insightLoading || optLoading) && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {insightLoading ? "Loading registry slice…" : null}
          {insightLoading && optLoading ? " · " : null}
          {optLoading ? "Loading planner scores…" : null}
        </p>
      )}
      {insightErr && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {insightErr}
        </p>
      )}
      {optErr && (
        <p className="text-sm text-amber-800 dark:text-amber-200" role="status">
          Planner API: {optErr} (checklist below uses defaults.)
        </p>
      )}

      {insight && fp && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="w-fit max-w-full rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Wells in radius (registry)
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {insight.totalWellsInRadius.toLocaleString()}
              </p>
            </div>
            <div className="w-fit max-w-full rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Median completed depth (registry)
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {fp.medianCompletedDepthFt != null
                  ? `${fp.medianCompletedDepthFt} ft`
                  : "—"}
              </p>
            </div>
            <div className="w-fit max-w-full rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Static water (chunk columns)
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {fp.staticWaterBandLabel}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Checklist
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {scores && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-200">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Planner scores (illustrative)
              </p>
              <p className="mt-1 tabular-nums">
                Setup {scores.setupReadiness} · Logistics {scores.logisticsFit} ·
                Data confidence {scores.dataConfidence}
              </p>
            </div>
          )}
          {plannerNotes.length > 0 && (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Planner notes</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {plannerNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {opt?.generatedAt && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Planner response {new Date(opt.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
