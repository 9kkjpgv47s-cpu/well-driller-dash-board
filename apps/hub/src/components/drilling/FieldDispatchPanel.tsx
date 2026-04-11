"use client";

import { useCallback, useState } from "react";
import {
  mapsUrlAddressOnly,
  mapsUrlForDispatch,
  parseDispatchEmail,
  type DispatchParseResult,
} from "@/lib/dispatch-parse";
import { directionsLinksForDispatch } from "@/lib/navigation-links";

const EXAMPLE = `Dispatch
4/6 8:00 AM
Megan Despain
Near 7935 Private Road 435 West, Edinburgh, IN 46124 USA
Foundation phase as of 3/30

39.407951,-85.862947

1/2 HP
180ft off drive
Back fill is around the flag but we can access it

Use coordinates address for getting to job site

(812) 350-0851`;

type Props = {
  /** Called with parsed lat/lon (including stub when no GPS in paste). */
  onApplyToFieldMap: (lat: number, lon: number) => void;
};

export function FieldDispatchPanel({ onApplyToFieldMap }: Props) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<DispatchParseResult | null>(null);

  const generate = useCallback(() => {
    setParsed(parseDispatchEmail(raw));
  }, [raw]);

  const fillExample = useCallback(() => {
    setRaw(EXAMPLE);
    setParsed(parseDispatchEmail(EXAMPLE));
  }, []);

  const applyToMap = useCallback(() => {
    const p = parsed ?? parseDispatchEmail(raw);
    if (p.lat != null && p.lon != null) {
      onApplyToFieldMap(p.lat, p.lon);
    }
  }, [parsed, raw, onApplyToFieldMap]);

  const mapsUrl = parsed ? mapsUrlForDispatch(parsed) : null;
  const mapsAddressUrl =
    parsed &&
    parsed.locationSource === "coordinates" &&
    parsed.address
      ? mapsUrlAddressOnly(parsed.address)
      : null;
  const directions = parsed ? directionsLinksForDispatch(parsed) : null;

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Dispatch input
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              Paste the body of your dispatch email (or any text that includes
              an address and/or latitude and longitude). We extract location
              heuristically — no API keys required for this MVP.
            </p>
          </div>
          <button type="button" onClick={fillExample} className="btn-ghost text-sm">
            Load example
          </button>
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
          <button
            type="button"
            onClick={applyToMap}
            className="btn-secondary"
            disabled={
              !raw.trim() && !(parsed != null && parsed.lat != null && parsed.lon != null)
            }
          >
            Use for field map
          </button>
        </div>

        <details className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-[var(--foreground)]">
            Tips for reliable parsing
          </summary>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--muted)]">
            <li>
              Coordinates can be tight on the comma:{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                39.407951,-85.862947
              </code>
            </li>
            <li>
              Addresses can start with{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Near …
              </code>{" "}
              or include{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Private Road
              </code>
              .
            </li>
            <li>
              Or label them:{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Lat: 39.97 Lon: -86.12
              </code>
            </li>
          </ul>
        </details>
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
              <p className="mt-2 text-xs text-[var(--muted)]">
                {parsed.locationSource === "coordinates"
                  ? "GPS from text"
                  : parsed.locationSource === "address_only"
                    ? "Address only (stub coords for map)"
                    : parsed.locationSource === "stub"
                      ? "Stub location"
                      : "No location"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
              {mapsAddressUrl ? (
                <a
                  href={mapsAddressUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary shrink-0 self-start"
                >
                  Open address in Maps
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

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Job details
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                {parsed.scheduleLine ? (
                  <div>
                    <dt className="text-xs font-medium text-[var(--muted)]">
                      Schedule
                    </dt>
                    <dd className="mt-0.5 text-[var(--foreground)]">
                      {parsed.scheduleLine}
                    </dd>
                  </div>
                ) : null}
                {parsed.contactName ? (
                  <div>
                    <dt className="text-xs font-medium text-[var(--muted)]">
                      Contact
                    </dt>
                    <dd className="mt-0.5 text-[var(--foreground)]">
                      {parsed.contactName}
                    </dd>
                  </div>
                ) : null}
                {parsed.phone ? (
                  <div>
                    <dt className="text-xs font-medium text-[var(--muted)]">
                      Phone
                    </dt>
                    <dd className="mt-0.5">
                      <a
                        href={`tel:${parsed.phone.replace(/\D/g, "")}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {parsed.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {parsed.pumpHp ? (
                  <div>
                    <dt className="text-xs font-medium text-[var(--muted)]">Pump</dt>
                    <dd className="mt-0.5 text-[var(--foreground)]">
                      {parsed.pumpHp}
                    </dd>
                  </div>
                ) : null}
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
            <section className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Location
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">
                    Address
                  </dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">
                    {parsed.address ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">
                    Coordinates
                  </dt>
                  <dd className="mt-0.5 font-mono text-[var(--foreground)]">
                    {parsed.lat != null && parsed.lon != null
                      ? `${parsed.lat.toFixed(5)}, ${parsed.lon.toFixed(5)}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Dispatch text
            </h3>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--foreground)] ring-1 ring-[var(--border)]">
              {parsed.notes}
            </pre>
          </section>
        </div>
      ) : null}
    </div>
  );
}
