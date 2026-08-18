"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mapsUrlForDispatch,
  parseDispatchEmail,
  parseDistanceOffDriveFt,
  type DispatchJobsiteApply,
  type DispatchParseResult,
} from "@/lib/dispatch-parse";
import {
  clearDispatchSession,
  loadDispatchSession,
  saveDispatchSession,
} from "@/lib/dispatch-session-cache";
import {
  buildJobSharePayload,
  buildJobShareUrl,
} from "@/lib/job-share";
import { directionsLinksForDispatch } from "@/lib/navigation-links";

type Props = {
  /** Called when dispatch paste includes GPS coordinates (not address stubs). */
  onApplyToFieldMap: (site: DispatchJobsiteApply) => void;
  /** Called with every parse result (including address-only pastes) so the owner can offer geocoding. */
  onParsed?: (parsed: DispatchParseResult) => void;
  jobsiteCoords?: { lat: number; lon: number } | null;
  feetOffDrive?: number;
  initialRaw?: string;
  initialParsed?: DispatchParseResult | null;
  /** Notify parent when user clears the saved dispatch. */
  onClearSaved?: () => void;
};

export function FieldDispatchPanel({
  onApplyToFieldMap,
  onParsed,
  jobsiteCoords,
  feetOffDrive,
  initialRaw = "",
  initialParsed = null,
  onClearSaved,
}: Props) {
  const [raw, setRaw] = useState(initialRaw);
  const [parsed, setParsed] = useState<DispatchParseResult | null>(initialParsed);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<
    "address" | "coords" | "share" | null
  >(null);
  const persistTimerRef = useRef<number | null>(null);
  const hydratedFromCacheRef = useRef(false);

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

  const persistRaw = useCallback(
    (text: string) => {
      if (!text.trim()) {
        clearDispatchSession();
        setSavedHint(null);
        return;
      }
      const session = saveDispatchSession({
        raw: text,
        lat: jobsiteCoords?.lat,
        lon: jobsiteCoords?.lon,
        title: parsed?.title,
        feetOffDrive,
      });
      if (session) {
        setSavedHint("Saved on this phone/browser — survives refresh until you paste a new dispatch.");
      }
    },
    [feetOffDrive, jobsiteCoords?.lat, jobsiteCoords?.lon, parsed?.title],
  );

  const schedulePersistRaw = useCallback(
    (text: string) => {
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = window.setTimeout(() => {
        persistRaw(text);
        persistTimerRef.current = null;
      }, 400);
    },
    [persistRaw],
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  // Hydrate paste once. Do NOT re-run when jobsite coords update after Generate —
  // that re-set state and jumped the page scroll back to the top on iPhone.
  useEffect(() => {
    if (initialRaw) {
      setRaw(initialRaw);
      if (initialParsed) setParsed(initialParsed);
      // Shared-link / parent hydrate also becomes the local “last job”.
      saveDispatchSession({
        raw: initialRaw,
        lat: jobsiteCoords?.lat,
        lon: jobsiteCoords?.lon,
        title: initialParsed?.title,
        feetOffDrive,
      });
      setSavedHint("Saved on this phone/browser — survives refresh until you paste a new dispatch.");
      hydratedFromCacheRef.current = true;
      return;
    }
    if (hydratedFromCacheRef.current) return;
    hydratedFromCacheRef.current = true;
    const cached = loadDispatchSession();
    if (!cached?.raw) return;
    setRaw(cached.raw);
    const result = parseDispatchEmail(cached.raw);
    setParsed(result);
    onParsed?.(result);
    setSavedHint("Restored last dispatch from this phone/browser.");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot hydrate only
  }, [initialRaw, initialParsed]);

  // Keep session lat/lon in sync when parent applies a jobsite (no text re-set).
  useEffect(() => {
    if (!raw.trim() || !jobsiteCoords) return;
    saveDispatchSession({
      raw,
      lat: jobsiteCoords.lat,
      lon: jobsiteCoords.lon,
      title: parsed?.title,
      feetOffDrive,
    });
  }, [jobsiteCoords?.lat, jobsiteCoords?.lon, feetOffDrive]); // eslint-disable-line react-hooks/exhaustive-deps

  const canShareJob = Boolean(parsed && jobsiteCoords && raw.trim());

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
    // iPhone: native share sheet so Dom can text/email the loaded job page.
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    const shareData: ShareData = {
      title: parsed.title ?? "Driller Hub job",
      text: "Open this Driller Hub job (same dispatch + map)",
      url,
    };
    try {
      if (typeof nav.share === "function") {
        const ok =
          typeof nav.canShare !== "function" || nav.canShare(shareData);
        if (ok) {
          await nav.share(shareData);
          setCopiedField("share");
          window.setTimeout(
            () => setCopiedField((prev) => (prev === "share" ? null : prev)),
            2500,
          );
          return;
        }
      }
    } catch (err) {
      // User cancelled share sheet — do not fall through to clipboard noise.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
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

  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateHint, setGenerateHint] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerateBusy(true);
    setGenerateHint(null);
    try {
      let result = parseDispatchEmail(raw);
      setParsed(result);
      onParsed?.(result);

      // Prefer real GPS from the paste when present.
      if (
        result.lat != null &&
        result.lon != null &&
        result.locationSource === "coordinates"
      ) {
        const feet = parseDistanceOffDriveFt(result.distanceOffDrive);
        onApplyToFieldMap({
          lat: result.lat,
          lon: result.lon,
          title: result.title,
          distanceOffDriveFt: feet,
        });
        saveDispatchSession({
          raw,
          lat: result.lat,
          lon: result.lon,
          title: result.title,
          feetOffDrive: feet,
        });
        setSavedHint("Saved on this phone/browser — survives refresh until you paste a new dispatch.");
        setGenerateHint("Jobsite set from latitude / longitude in the dispatch.");
        return;
      }

      // Address without GPS: geocode so wells still load around the real street.
      if (result.address && result.address.trim().length >= 5) {
        setGenerateHint("Looking up address on the map…");
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(result.address.trim())}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          results?: { lat: number; lon: number; label?: string }[];
          error?: string;
        };
        if (!res.ok) {
          saveDispatchSession({ raw, title: result.title });
          setGenerateHint(
            data.error ||
              "Could not geocode that address — paste GPS coordinates if you have them.",
          );
          return;
        }
        const hit = data.results?.find(
          (r) => Number.isFinite(r.lat) && Number.isFinite(r.lon),
        );
        if (!hit) {
          saveDispatchSession({ raw, title: result.title });
          setGenerateHint(
            "No map match for that address — try a simpler street line or paste lat/lon.",
          );
          return;
        }
        result = {
          ...result,
          lat: hit.lat,
          lon: hit.lon,
          locationSource: "coordinates",
          warnings: result.warnings.filter(
            (w) => !/stub|latitude|longitude/i.test(w),
          ),
        };
        setParsed(result);
        onParsed?.(result);
        const feet = parseDistanceOffDriveFt(result.distanceOffDrive);
        onApplyToFieldMap({
          lat: hit.lat,
          lon: hit.lon,
          title: result.title ?? result.address,
          distanceOffDriveFt: feet,
        });
        saveDispatchSession({
          raw,
          lat: hit.lat,
          lon: hit.lon,
          title: result.title ?? result.address,
          feetOffDrive: feet,
        });
        setSavedHint("Saved on this phone/browser — survives refresh until you paste a new dispatch.");
        setGenerateHint("Jobsite set from geocoded street address.");
        return;
      }

      saveDispatchSession({ raw, title: result.title });
      setGenerateHint(
        "Need a street address and/or latitude/longitude in the paste to load nearby wells.",
      );
    } finally {
      setGenerateBusy(false);
    }
  }, [raw, onApplyToFieldMap, onParsed]);

  const clearSaved = useCallback(() => {
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    clearDispatchSession();
    setRaw("");
    setParsed(null);
    setSavedHint(null);
    setGenerateHint(null);
    onClearSaved?.();
  }, [onClearSaved]);

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
            heuristically. Your last paste is saved on this phone/browser so
            a refresh (or accidental reload) does not wipe it — paste a new
            dispatch when you get the next job.
          </p>
        </div>

        <label className="mt-6 block">
          <span className="sr-only">Dispatch text</span>
          <textarea
            value={raw}
            onChange={(e) => {
              const next = e.target.value;
              setRaw(next);
              schedulePersistRaw(next);
            }}
            placeholder="Paste dispatch email here…"
            rows={12}
            className="input-field min-h-[200px] resize-y font-mono text-sm leading-relaxed"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            className="btn-primary"
            disabled={generateBusy || !raw.trim()}
          >
            {generateBusy ? "Working…" : "Generate job brief"}
          </button>
          <button
            type="button"
            onClick={() => void shareJobLink()}
            disabled={!canShareJob}
            className="btn-secondary disabled:opacity-50"
            title={
              canShareJob
                ? "Send a link so someone else opens this same job (dispatch + map)"
                : "Generate a job brief with a map location first"
            }
          >
            {copiedField === "share" ? "Link ready" : "Share job link"}
          </button>
          {raw.trim() ? (
            <button
              type="button"
              onClick={clearSaved}
              className="btn-secondary"
            >
              Clear saved dispatch
            </button>
          ) : null}
          {generateHint ? (
            <p className="text-sm text-[var(--muted)]" role="status">
              {generateHint}
            </p>
          ) : null}
        </div>
        {canShareJob ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Share job link opens the same dispatch text and map pin on their phone
            (hard refresh once if they still see an old page).
          </p>
        ) : null}
        {savedHint ? (
          <p className="mt-2 text-xs text-[var(--muted)]" role="status">
            {savedHint}
          </p>
        ) : null}

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
                disabled={!canShareJob}
                className="btn-secondary shrink-0 self-start disabled:opacity-50"
              >
                {copiedField === "share" ? "Link ready" : "Share job link"}
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
