"use client";

import { useCallback, useMemo, useState } from "react";
import { AreaInsightsPanel } from "@/components/AreaInsightsPanel";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import type { OptimizationResult } from "@/lib/optimization";

const defaultLat = 39.7684;
const defaultLon = -86.1581;

type FormState = {
  lat: string;
  lon: string;
  radiusMiles: string;
  priority: "depth" | "yield" | "balanced";
};

export function OptimizationPanel() {
  const [form, setForm] = useState<FormState>({
    lat: String(defaultLat),
    lon: String(defaultLon),
    radiusMiles: String(DEFAULT_AREA_RADIUS_MILES),
    priority: "balanced",
  });
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams({
      lat: form.lat,
      lon: form.lon,
      radiusMiles: form.radiusMiles,
      priority: form.priority,
    });
    return p.toString();
  }, [form]);

  const latN = Number(form.lat);
  const lonN = Number(form.lon);
  const radiusN = Number(form.radiusMiles);
  const coordsOk =
    Number.isFinite(latN) &&
    Number.isFinite(lonN) &&
    Number.isFinite(radiusN) &&
    radiusN > 0;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/optimization?${queryString}`);
      const data = await res.json();
      if (!res.ok) {
        setResult(null);
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      setResult(data as OptimizationResult);
    } catch {
      setResult(null);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <section
          className="lg:col-span-2 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
          aria-labelledby="opt-form-heading"
        >
          <h2
            id="opt-form-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Jobsite parameters
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Coordinates drive the{" "}
            <strong>registry area analysis</strong> below (same gz chunks as the
            embedded well viewer). The checklist API is still a lightweight mock
            for crew reminders.
          </p>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Latitude
              <input
                type="number"
                step="0.0001"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-[var(--background)] px-3 py-2 text-sm dark:border-zinc-600"
                value={form.lat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lat: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Longitude
              <input
                type="number"
                step="0.0001"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-[var(--background)] px-3 py-2 text-sm dark:border-zinc-600"
                value={form.lon}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lon: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Search radius (miles)
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="25"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-[var(--background)] px-3 py-2 text-sm dark:border-zinc-600"
                value={form.radiusMiles}
                onChange={(e) =>
                  setForm((f) => ({ ...f, radiusMiles: e.target.value }))
                }
              />
            </label>
            <fieldset>
              <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Checklist priority (mock API)
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["balanced", "Balanced"],
                    ["depth", "Depth"],
                    ["yield", "Yield"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600"
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={value}
                      checked={form.priority === value}
                      onChange={() =>
                        setForm((f) => ({ ...f, priority: value }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            {loading ? "Running…" : "Refresh field checklist"}
          </button>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <section
          className="lg:col-span-3 space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
          aria-labelledby="opt-results-heading"
        >
          <h2
            id="opt-results-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Field checklist (mock)
          </h2>
          {!result ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Tap “Refresh field checklist” for planner-style reminders. Full{" "}
              <strong>area drilling intelligence</strong> is in the green panel
              below (live chunk data).
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/80">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Wells in radius (mock count)
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
      </div>

      {coordsOk ? (
        <AreaInsightsPanel
          lat={latN}
          lon={lonN}
          radiusMiles={Math.min(25, Math.max(0.5, radiusN))}
          autoRun
          title="Full area drilling analysis (registry chunks)"
        />
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400">
          Enter valid latitude, longitude, and radius to load area insights.
        </p>
      )}
    </div>
  );
}
