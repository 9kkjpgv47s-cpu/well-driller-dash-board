"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fetchJson, isAbortError } from "@/lib/http/fetch-json";
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
    fetchJson<OptimizationResult>(`/api/optimization?${q}`, {
      signal: ctrl.signal,
    })
      .then(setResult)
      .catch((e: Error) => {
        if (isAbortError(e)) return;
        setError(e.message);
        setResult(null);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [lat, lon, radiusMiles]);

  return (
    <section
      className="card space-y-4"
      aria-labelledby="driller-prep-h"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Field prep</p>
          <h2 id="driller-prep-h">
            Site optimization (auto)
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            Checklist and neighborhood hints load automatically for the active
            jobsite coordinates from registry chunk data.
          </p>
        </div>
        {headerActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {headerActions}
          </div>
        ) : null}
      </div>

      {loading && (
        <div className="skel h-4 w-48" role="status">
          <span className="sr-only">Loading optimization…</span>
        </div>
      )}
      {error && (
        <div className="callout is-bad p-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-bg-2 p-3">
              <p className="text-xs text-ink-3">
                Wells in radius
              </p>
              <p className="num text-2xl font-semibold text-ink">
                {result.neighborhood.sampleWellsInRadius}
              </p>
            </div>
            <div className="rounded-lg bg-bg-2 p-3">
              <p className="text-xs text-ink-3">
                Median depth
              </p>
              <p className="num text-2xl font-semibold text-ink">
                {result.neighborhood.medianDepthFt} ft
              </p>
            </div>
            <div className="rounded-lg bg-bg-2 p-3">
              <p className="text-xs text-ink-3">
                Static band
              </p>
              <p className="num text-lg font-semibold text-ink">
                {result.neighborhood.typicalStaticBandFt}
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow plain">
              Checklist
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-2">
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="callout is-warn p-3 text-xs">
            <p className="font-semibold">
              {result.dataSource === "registry"
                ? "Registry notes"
                : "Fallback notes (chunk load failed)"}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {result.neighborhood.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-ink-4">
            Generated {new Date(result.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}
