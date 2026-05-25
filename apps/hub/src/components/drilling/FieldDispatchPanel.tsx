"use client";

import { useCallback, useEffect, useState } from "react";
import {
  mapsUrlForDispatch,
  parseDispatchEmail,
  parseDistanceOffDriveFt,
  type DispatchJobsiteApply,
  type DispatchParseResult,
} from "@/lib/dispatch-parse";
import {
  buildJobSharePayload,
  buildJobShareUrl,
} from "@/lib/job-share";
import { directionsLinksForDispatch } from "@/lib/navigation-links";

type Props = {
  /** Called when dispatch paste includes GPS coordinates (not address stubs). */
  onApplyToFieldMap: (site: DispatchJobsiteApply) => void;
  jobsiteCoords?: { lat: number; lon: number } | null;
  feetOffDrive?: number;
  initialRaw?: string;
  initialParsed?: DispatchParseResult | null;
};

export function FieldDispatchPanel({
  onApplyToFieldMap,
  jobsiteCoords,
  feetOffDrive,
  initialRaw = "",
  initialParsed = null,
}: Props) {
  const [raw, setRaw] = useState(initialRaw);
  const [parsed, setParsed] = useState<DispatchParseResult | null>(initialParsed);
  const [copiedField, setCopiedField] = useState<
    "address" | "coords" | "share" | null
  >(null);

  const copyToClipboard = useCallback(async (text: string, field: "address" | "coords") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  useEffect(() => {
    if (initialRaw) setRaw(initialRaw);
    if (initialParsed) setParsed(initialParsed);
  }, [initialRaw, initialParsed]);

  const shareJobLink = useCallback(async () => {
    if (!parsed || !jobsiteCoords || !raw.trim()) return;
    const url = buildJobShareUrl(
      window.location.origin,
      buildJobSharePayload(
        jobsiteCoords.lat,
        jobsiteCoords.lon,
        raw,
        parsed,
        feetOffDrive,
      ),
    );
    try {
      await navigator.clipboard.writeText(url);
      setCopiedField("share");
      window.setTimeout(
        () => setCopiedField((prev) => (prev === "share" ? null : prev)),
        2500,
      );
    } catch {
      window.prompt("Copy this job link:", url);
    }
  }, [parsed, jobsiteCoords, raw, feetOffDrive]);

  const generate = useCallback(() => {
    const result = parseDispatchEmail(raw);
    setParsed(result);
    if (
      result.lat != null &&
      result.lon != null &&
      result.locationSource === "coordinates"
    ) {
      onApplyToFieldMap({
        lat: result.lat,
        lon: result.lon,
        title: result.title,
        distanceOffDriveFt: parseDistanceOffDriveFt(result.distanceOffDrive),
      });
    }
  }, [raw, onApplyToFieldMap]);

  const mapsUrl = parsed ? mapsUrlForDispatch(parsed) : null;
  const directions = parsed ? directionsLinksForDispatch(parsed) : null;
  const coordText =
    parsed?.lat != null && parsed?.lon != null
      ? `${parsed.lat.toFixed(5)}, ${parsed.lon.toFixed(5)}`
      : null;

  return (
    <div className="space-y-6">
      <section className="card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Dispatch input
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Paste the body of your dispatch email (or any text that includes
            an address and/or latitude and longitude). We extract location
            heuristically.
          </p>
        </div>

        <label className="mt-6 block">
          <span className="sr-only">Dispatch text</span>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste dispatch email here…"
            rows={12}
            className="input-field min-h-[200px] resize-y font-mono text-sm leading-relaxed"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={generate} className="btn-primary">
            Generate job brief
          </button>
        </div>

      </section>

      {parsed && parsed.notes.trim() ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Parsed brief
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                {parsed.title ?? "Job brief"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void shareJobLink()}
                disabled={!parsed || !jobsiteCoords || !raw.trim()}
                className="btn-secondary shrink-0 self-start disabled:opacity-50"
              >
                {copiedField === "share" ? "Link copied" : "Share job"}
              </button>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary shrink-0 self-start"
                >
                  {parsed.locationSource === "coordinates"
                    ? "Open GPS in Maps"
                    : "Open in Maps"}
                </a>
              ) : null}
            </div>
          </div>

          {directions ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Directions (opens app or browser)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={directions.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Google Maps
                </a>
                <a
                  href={directions.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Apple Maps
                </a>
                <a
                  href={directions.waze}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Waze
                </a>
              </div>
            </div>
          ) : null}

          {parsed.warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
              <p className="font-semibold">Heads up</p>
              <ul className="mt-2 list-inside list-disc space-y-1 opacity-90">
                {parsed.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <section className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Location
            </h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">
                    Address
                  </dt>
                  {parsed.address ? (
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(parsed.address!, "address")}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    >
                      {copiedField === "address" ? "Copied" : "Copy address"}
                    </button>
                  ) : null}
                </div>
                <dd className="mt-0.5 text-[var(--foreground)]">
                  {parsed.address ?? "—"}
                </dd>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">
                    Coordinates
                  </dt>
                  {coordText ? (
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(coordText, "coords")}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    >
                      {copiedField === "coords" ? "Copied" : "Copy lat/long"}
                    </button>
                  ) : null}
                </div>
                <dd className="mt-0.5 font-mono text-[var(--foreground)]">
                  {coordText ?? "—"}
                </dd>
              </div>
              {parsed.distanceOffDrive ? (
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">
                    Rig path
                  </dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">
                    {parsed.distanceOffDrive}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  );
}
