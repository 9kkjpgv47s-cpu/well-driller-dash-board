"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  formatNarrativeHtml,
  narrativeBorderClass,
  type AreaInsightsReport,
} from "@/lib/area-well-analytics";

type Props = {
  lat: number;
  lon: number;
  radiusMiles: number;
  /**
   * Computed report from the owner (DrillingHubClient computes insights once
   * for the whole page and passes them down — this panel no longer rescans
   * the well set itself).
   */
  report: AreaInsightsReport | null;
  /** True while the owner is still loading well data. */
  loading?: boolean;
  error?: string | null;
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
    <div className="rounded-lg border border-line">
      <p className="border-b border-line bg-bg-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {title}
      </p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.label}
              className="border-t border-line"
            >
              <td className="px-3 py-2 text-ink-2">
                {r.label}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-ink">
                {r.count}
              </td>
              <td className="w-16 px-3 py-2 text-right text-ink-3">
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
  report,
  loading = false,
  error = null,
  title = "Area drilling insights",
  detailNote,
  showViewerLinks = true,
  headerActions,
}: Props) {
  const status = loading && !report ? "Analyzing loaded wells…" : null;

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

  const qualityTone =
    report?.insightQuality.grade === "high"
      ? "text-ok"
      : report?.insightQuality.grade === "medium"
        ? "text-warn"
        : "text-bad";

  return (
    <section
      className="card space-y-4"
      aria-labelledby="area-insights-h"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="area-insights-h">
            {title}
          </h2>
          <p className="mt-1 text-xs text-ink-2">
            Registry-backed counts from gz chunks in{" "}
            <code className="rounded bg-bg-3 px-1">
              /well-viewer/
            </code>
            . Radius <strong>{radiusMiles} mi</strong> · center{" "}
            <strong>
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </strong>
          </p>
          {detailNote ? (
            <p className="mt-2 text-xs text-ink-2">
              {detailNote}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {showViewerLinks ? (
            <Link
              href={`/?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`}
              className="btn btn-ghost btn-sm"
            >
              Open field map
            </Link>
          ) : null}
        </div>
      </div>

      {status ? (
        <p className="mono text-xs text-ink-3">{status}</p>
      ) : null}
      {error ? (
        <div
          className="callout is-bad p-3 text-sm"
          role="alert"
        >
          <p className="font-medium">Well data not available</p>
          <p className="mt-1 text-xs">{error}</p>
          {showViewerLinks ? (
            <p className="mt-2 text-xs">
              After running{" "}
              <code className="rounded bg-surface px-1">
                ./scripts/sync-well-viewer-into-hub.sh
              </code>{" "}
              from the monorepo root, restart <code>npm run dev</code>.
            </p>
          ) : null}
        </div>
      ) : null}

      {(report && breakdowns) ? (
        <div className="space-y-6">
          {report ? (
            <div className="rounded-lg border border-line bg-bg-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow plain">
                  Chunk data coverage (this radius)
                </p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${qualityTone}`}>
                  Insight confidence {report.insightQuality.grade} · {report.insightQuality.score}/100
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-3">
                These counts show how many wells in your circle actually carry
                each field from the synced{" "}
                <code className="rounded bg-surface px-1">
                  dnr_wells_chunk_*.csv.gz
                </code>{" "}
                export. Area tables use registry aquifer text when present, then
                infer from lithology + vein/rock columns when aquifer is blank.
              </p>
              <ul className={`mt-2 list-inside list-disc text-xs ${qualityTone}`}>
                {report.insightQuality.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex justify-between gap-2 rounded-md bg-surface px-3 py-2">
                  <dt className="text-ink-3">
                    Lithology intervals
                  </dt>
                  <dd className="tabular-nums font-medium text-ink">
                    {report.dataCoverage.lithologyIntervals} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-surface px-3 py-2">
                  <dt className="text-ink-3">
                    Vein / gravel thickness col
                  </dt>
                  <dd className="tabular-nums font-medium text-ink">
                    {report.dataCoverage.veinThicknessCol} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-surface px-3 py-2">
                  <dt className="text-ink-3">
                    Rock top col
                  </dt>
                  <dd className="tabular-nums font-medium text-ink">
                    {report.dataCoverage.rockTopCol} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-surface px-3 py-2">
                  <dt className="text-ink-3">
                    Registry aquifer text
                  </dt>
                  <dd className="tabular-nums font-medium text-ink">
                    {report.dataCoverage.registryAquiferNonBlank} /{" "}
                    {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-surface px-3 py-2">
                  <dt className="text-ink-3">
                    Parseable GPM
                  </dt>
                  <dd className="tabular-nums font-medium text-ink">
                    {report.wellsWithGpm} / {report.totalWellsInRadius}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 rounded-md bg-surface px-3 py-2">
                  <dt className="text-ink-3">
                    Used for sand/gravel stats
                  </dt>
                  <dd className="tabular-nums font-medium text-ink">
                    {report.wellsWithLithology} / {report.totalWellsInRadius}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
          {report && report.narratives.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
              <p className="eyebrow plain">
                Narrative summary
              </p>
              <ul className="space-y-3 text-sm leading-relaxed text-ink-2">
                {report.narratives.map((entry, i) => (
                  <li
                    key={i}
                    className={narrativeBorderClass(entry.scope)}
                    dangerouslySetInnerHTML={{
                      __html: formatNarrativeHtml(entry.text),
                    }}
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

              <div className="callout is-warn p-3 text-xs">
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
