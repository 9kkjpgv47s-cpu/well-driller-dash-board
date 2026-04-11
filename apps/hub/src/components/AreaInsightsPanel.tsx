"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  computeAreaInsights,
  formatNarrativeHtml,
  type AreaInsightsReport,
} from "@/lib/area-well-analytics";
import { getDnrWellsCached } from "@/lib/dnr-wells-cache";
import type { OptimizationResult } from "@/lib/optimization";

type Props = {
  lat: number;
  lon: number;
  radiusMiles: number;
  /** When true, auto-load on mount / when coords change */
  autoRun?: boolean;
  title?: string;
  /** Extra line under the title (e.g. hub-only lithology note for drillers). */
  detailNote?: string;
  showViewerLinks?: boolean;
  /** Move up / down controls (field workspace section ordering). */
  headerActions?: ReactNode;
};

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; pct: string }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
      <p className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {title}
      </p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.label}
              className="border-t border-zinc-100 dark:border-zinc-800"
            >
              <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                {r.label}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                {r.count}
              </td>
              <td className="w-16 px-3 py-2 text-right text-zinc-500 dark:text-zinc-400">
                {r.pct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AreaInsightsPanel({
  lat,
  lon,
  radiusMiles,
  autoRun = true,
  title = "Area drilling insights",
  detailNote,
  showViewerLinks = true,
  headerActions,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AreaInsightsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<OptimizationResult | null>(null);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const wells = await getDnrWellsCached();
      setStatus(`Analyzing ${wells.length.toLocaleString()} loaded wells…`);
      const r = computeAreaInsights(wells, lat, lon, radiusMiles);
      setReport(r);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load well data");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusMiles]);

  useEffect(() => {
    if (!autoRun || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    void run();
  }, [autoRun, lat, lon, radiusMiles, run]);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      radiusMiles: String(radiusMiles),
      priority: "balanced",
    });
    setPrepLoading(true);
    setPrepErr(null);
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
      .then(setPrep)
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setPrepErr(e.message);
        setPrep(null);
      })
      .finally(() => setPrepLoading(false));
    return () => ctrl.abort();
  }, [lat, lon, radiusMiles]);

  const breakdowns = useMemo(() => {
    if (!report) return null;
    const n = report.totalWellsInRadius;
    const lith = report.wellsWithLithology;
    const gWith = report.wellsWithGpm;
    const p = (c: number, d: number) => (d <= 0 ? "0" : ((100 * c) / d).toFixed(0));

    return {
      aquifer: [
        {
          label: "Unconsolidated / sand / gravel",
          count: report.aquiferMix.unconsolidated,
          pct: p(report.aquiferMix.unconsolidated, n),
        },
        {
          label: "Bedrock / limestone / dolomite",
          count: report.aquiferMix.bedrock,
          pct: p(report.aquiferMix.bedrock, n),
        },
        {
          label: "Estimated location",
          count: report.aquiferMix.estimated,
          pct: p(report.aquiferMix.estimated, n),
        },
        {
          label: "Other / mixed wording",
          count: report.aquiferMix.other,
          pct: p(report.aquiferMix.other, n),
        },
        {
          label: "Blank / not in export",
          count: report.aquiferMix.blank,
          pct: p(report.aquiferMix.blank, n),
        },
      ],
      veins: [
        {
          label: "3+ sand/gravel intervals (≥1′)",
          count: report.gravelVeinDistribution.threePlus,
          pct: p(report.gravelVeinDistribution.threePlus, lith),
        },
        {
          label: "Exactly 2",
          count: report.gravelVeinDistribution.two,
          pct: p(report.gravelVeinDistribution.two, lith),
        },
        {
          label: "Exactly 1",
          count: report.gravelVeinDistribution.one,
          pct: p(report.gravelVeinDistribution.one, lith),
        },
        {
          label: "None parsed",
          count: report.gravelVeinDistribution.zero,
          pct: p(report.gravelVeinDistribution.zero, lith),
        },
        {
          label: "No lithology or vein columns",
          count: report.gravelVeinDistribution.unknown,
          pct: p(report.gravelVeinDistribution.unknown, n),
        },
      ],
      yield: [
        {
          label: "Under 10 GPM",
          count: report.yieldBuckets.under10,
          pct: p(report.yieldBuckets.under10, gWith),
        },
        {
          label: "10 – 25 GPM",
          count: report.yieldBuckets.tenTo25,
          pct: p(report.yieldBuckets.tenTo25, gWith),
        },
        {
          label: "Over 25 GPM",
          count: report.yieldBuckets.over25,
          pct: p(report.yieldBuckets.over25, gWith),
        },
        {
          label: "No GPM in export",
          count: report.yieldBuckets.unknown,
          pct: p(report.yieldBuckets.unknown, n),
        },
      ],
    };
  }, [report]);

  /** Field prep merged into the narrative (shorter page; same information). */
  const narrativeLines = useMemo(() => {
    const lines: string[] = [];
    if (prepLoading) {
      lines.push(
        "**Field prep (mock):** loading checklist and neighborhood hints…",
      );
    }
    if (prepErr) {
      lines.push(`**Field prep (mock):** could not load — ${prepErr}`);
    }
    if (prep) {
      lines.push(
        `**Field prep (mock):** illustrative neighborhood — **~${prep.neighborhood.sampleWellsInRadius}** wells in radius, **median depth ${prep.neighborhood.medianDepthFt} ft**, **static water band ${prep.neighborhood.typicalStaticBandFt}**.`,
      );
      for (const item of prep.checklist) {
        lines.push(`Prep checklist: ${item}`);
      }
      for (const n of prep.neighborhood.notes) {
        lines.push(`Prep note: ${n}`);
      }
    }
    if (report?.narratives.length) lines.push(...report.narratives);
    return lines;
  }, [prep, prepLoading, prepErr, report]);

  return (
    <section
      className="space-y-4 rounded-xl border border-emerald-900/20 bg-emerald-50/40 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30"
      aria-labelledby="area-insights-h"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="area-insights-h"
            className="text-sm font-semibold text-emerald-950 dark:text-emerald-100"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200/80">
            Registry-backed counts from gz chunks in{" "}
            <code className="rounded bg-white/60 px-1 dark:bg-black/30">
              /well-viewer/
            </code>
            . Radius <strong>{radiusMiles} mi</strong> · center{" "}
            <strong>
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </strong>
          </p>
          {detailNote ? (
            <p className="mt-2 text-xs text-emerald-950/90 dark:text-emerald-100/90">
              {detailNote}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {loading ? "Loading…" : "Refresh analysis"}
          </button>
          {showViewerLinks ? (
            <Link
              href={`/?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`}
              className="rounded-lg border border-emerald-800/40 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-white/50 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
            >
              Open field map
            </Link>
          ) : null}
        </div>
      </div>

      {status ? (
        <p className="text-xs text-emerald-900 dark:text-emerald-200">{status}</p>
      ) : null}
      {error ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
          role="alert"
        >
          <p className="font-medium">Well data not available</p>
          <p className="mt-1 text-xs">{error}</p>
          {showViewerLinks ? (
            <p className="mt-2 text-xs">
              After running{" "}
              <code className="rounded bg-white/80 px-1 dark:bg-black/40">
                ./scripts/sync-well-viewer-into-hub.sh
              </code>{" "}
              from the monorepo root, restart <code>npm run dev</code>.
            </p>
          ) : null}
        </div>
      ) : null}

      {(report && breakdowns) || prepLoading || prepErr || prep ? (
        <div className="space-y-6">
          {report ? (
            <div className="rounded-lg border border-emerald-800/25 bg-white/80 p-4 dark:border-emerald-700/40 dark:bg-zinc-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                Chunk data coverage (this radius)
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                These counts show how many wells in your circle actually carry
                each field from the synced{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  dnr_wells_chunk_*.csv.gz
                </code>{" "}
                export. Area tables use registry aquifer text when present, then
                infer from lithology + vein/rock columns when aquifer is blank.
              </p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/40">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    Lithology intervals
                  </dt>
                  <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {report.dataCoverage.lithologyIntervals} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/40">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    Vein / gravel thickness col
                  </dt>
                  <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {report.dataCoverage.veinThicknessCol} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/40">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    Rock top col
                  </dt>
                  <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {report.dataCoverage.rockTopCol} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/40">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    Registry aquifer text
                  </dt>
                  <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {report.dataCoverage.registryAquiferNonBlank} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/40">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    Parseable GPM
                  </dt>
                  <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {report.wellsWithGpm} / {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/40">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    Used for sand/gravel stats
                  </dt>
                  <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {report.wellsWithLithology} / {report.totalWellsInRadius}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
          {narrativeLines.length > 0 ? (
            <div className="space-y-3 rounded-lg bg-white/70 p-4 dark:bg-zinc-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Narrative summary
              </p>
              <ul className="space-y-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {narrativeLines.map((t, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-emerald-600 pl-3 dark:border-emerald-500"
                    dangerouslySetInnerHTML={{ __html: formatNarrativeHtml(t) }}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {report && breakdowns ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <BreakdownTable
                  title="Aquifer mix (registry + inferred)"
                  rows={breakdowns.aquifer}
                />
                <BreakdownTable
                  title="Sand/gravel (logs + vein columns)"
                  rows={breakdowns.veins}
                />
                <BreakdownTable
                  title="Yield (parsed GPM)"
                  rows={breakdowns.yield}
                />
              </div>

              <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">Methodology & limits</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {report.disclaimers.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
