"use client";

import { useCallback, useMemo, useState } from "react";
import type { OptimizationResult } from "@/lib/optimization";

const defaultLat = 39.7684;
const defaultLon = -86.1581;

type FormState = {
  lat: string;
  lon: string;
  radiusMiles: string;
  priority: "depth" | "yield" | "balanced";
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[var(--muted)]">
        <span>{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)] ring-1 ring-[var(--border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function OptimizationPanel() {
  const [form, setForm] = useState<FormState>({
    lat: String(defaultLat),
    lon: String(defaultLon),
    radiusMiles: "5",
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
    <div className="grid gap-8 lg:grid-cols-5">
      <section
        className="card space-y-4 p-6 lg:col-span-2"
        aria-labelledby="opt-form-heading"
      >
        <h2
          id="opt-form-heading"
          className="text-sm font-semibold text-[var(--foreground)]"
        >
          Jobsite parameters
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Defaults center on Indianapolis for demos. Results are deterministic
          mock data for UI testing only.
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Latitude
            </span>
            <input
              type="number"
              step="0.0001"
              className="input-field font-mono text-sm"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Longitude
            </span>
            <input
              type="number"
              step="0.0001"
              className="input-field font-mono text-sm"
              value={form.lon}
              onChange={(e) => setForm((f) => ({ ...f, lon: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Search radius (miles)
            </span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="25"
              className="input-field text-sm"
              value={form.radiusMiles}
              onChange={(e) =>
                setForm((f) => ({ ...f, radiusMiles: e.target.value }))
              }
            />
          </label>
          <fieldset>
            <legend className="text-xs font-medium text-[var(--muted)]">
              Priority
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={value}
                    checked={form.priority === value}
                    onChange={() => setForm((f) => ({ ...f, priority: value }))}
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
          className="btn-primary w-full"
        >
          {loading ? "Running…" : "Run optimization"}
        </button>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section
        className="card space-y-5 p-6 lg:col-span-3"
        aria-labelledby="opt-results-heading"
      >
        <h2
          id="opt-results-heading"
          className="text-sm font-semibold text-[var(--foreground)]"
        >
          Results
        </h2>
        {!result ? (
          <p className="text-sm text-[var(--muted)]">
            Run the optimizer to see mock neighborhood stats and checklist
            items.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="stat-tile">
                <p className="stat-label">Wells in radius</p>
                <p className="stat-value">
                  {result.neighborhood.sampleWellsInRadius}
                </p>
              </div>
              <div className="stat-tile">
                <p className="stat-label">Median depth</p>
                <p className="stat-value">
                  {result.neighborhood.medianDepthFt} ft
                </p>
              </div>
              <div className="stat-tile">
                <p className="stat-label">Static band</p>
                <p className="stat-value text-lg">
                  {result.neighborhood.typicalStaticBandFt}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Readiness scores (UI only)
              </p>
              <ScoreBar
                label="Setup readiness"
                value={result.scores.setupReadiness}
              />
              <ScoreBar
                label="Logistics fit"
                value={result.scores.logisticsFit}
              />
              <ScoreBar
                label="Data confidence"
                value={result.scores.dataConfidence}
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Field checklist
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--foreground)]">
                {result.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-100">
              <p className="font-semibold">Official vs community</p>
              <p className="mt-1 opacity-90">
                Numbers above are placeholders. Registry-backed analytics and
                driller notes will use separate APIs and labels when integrated.
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 opacity-90">
                {result.neighborhood.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-[var(--muted)]">
              Generated {new Date(result.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
