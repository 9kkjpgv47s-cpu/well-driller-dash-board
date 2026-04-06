"use client";

import dynamic from "next/dynamic";
import type { DispatchParseResult } from "@/lib/dispatch-parse";
import {
  mapsUrlAddressOnly,
  mapsUrlForDispatch,
} from "@/lib/dispatch-parse";
import { mockAreaStats, mockNearbyWells } from "@/lib/nearby-wells-mock";
import { wellsWithMapPositions } from "@/lib/nearby-wells-map";

const JobsiteMap = dynamic(
  () =>
    import("@/components/JobsiteMap").then((m) => ({ default: m.JobsiteMap })),
  { ssr: false, loading: () => <MapLoading /> },
);

function MapLoading() {
  return (
    <div className="card flex min-h-[320px] items-center justify-center p-8">
      <p className="text-sm text-[var(--muted)]">Loading map…</p>
    </div>
  );
}

type Props = {
  parsed: DispatchParseResult;
};

export function JobBriefView({ parsed }: Props) {
  if (!parsed.notes.trim()) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[var(--muted)]">
          Paste a dispatch email above and generate a brief.
        </p>
      </div>
    );
  }

  const lat = parsed.lat;
  const lon = parsed.lon;
  const wells =
    lat !== null && lon !== null ? mockNearbyWells(lat, lon, 6) : [];
  const wellsOnMap =
    lat !== null && lon !== null ? wellsWithMapPositions(lat, lon, wells) : [];
  const stats = mockAreaStats(wells);
  const mapsUrl = mapsUrlForDispatch(parsed);
  const mapsAddressUrl =
    parsed.locationSource === "coordinates" && parsed.address
      ? mapsUrlAddressOnly(parsed.address)
      : null;

  const heading =
    parsed.title ?? "Job brief";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Driller brief
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-2 text-xs text-[var(--muted)]">
            From pasted dispatch ·{" "}
            {parsed.locationSource === "coordinates"
              ? "GPS from text"
              : parsed.locationSource === "address_only"
                ? "Address only (stub coords for mock wells)"
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

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Job details
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            {parsed.scheduleLine ? (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">
                  Schedule
                </dt>
                <dd className="mt-1 text-[var(--foreground)]">
                  {parsed.scheduleLine}
                </dd>
              </div>
            ) : null}
            {parsed.contactName ? (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">
                  Contact
                </dt>
                <dd className="mt-1 text-[var(--foreground)]">
                  {parsed.contactName}
                </dd>
              </div>
            ) : null}
            {parsed.phone ? (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">
                  Phone
                </dt>
                <dd className="mt-1">
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
                <dd className="mt-1 text-[var(--foreground)]">
                  {parsed.pumpHp}
                </dd>
              </div>
            ) : null}
            {parsed.distanceOffDrive ? (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">
                  Rig path
                </dt>
                <dd className="mt-1 text-[var(--foreground)]">
                  {parsed.distanceOffDrive}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Location
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">Address</dt>
              <dd className="mt-1 text-[var(--foreground)]">
                {parsed.address ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">
                Coordinates
              </dt>
              <dd className="mt-1 font-mono text-[var(--foreground)]">
                {lat !== null && lon !== null
                  ? `${lat.toFixed(5)}, ${lon.toFixed(5)}`
                  : "—"}
              </dd>
            </div>
            {parsed.locationSource === "coordinates" && parsed.address ? (
              <p className="text-xs text-[var(--muted)]">
                Dispatch says to use GPS for the jobsite pin; address is shown
                for context and mail-style navigation if needed.
              </p>
            ) : null}
          </dl>
        </section>
        </div>

        <section className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Dispatch text
          </h3>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--foreground)] ring-1 ring-[var(--border)]">
            {parsed.notes}
          </pre>
        </section>
      </div>

      <JobsiteMap parsed={parsed} wellsOnMap={wellsOnMap} />

      <section className="card p-6 sm:p-8">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Nearby wells (mock)
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Illustrative registry-style neighbors. Replace with canonical export
            + analytics. Community tips stay a separate layer when you add
            them.
          </p>
        </div>

        {wells.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">
            No coordinates available for mock placement.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="stat-tile">
                <p className="stat-label">Avg depth</p>
                <p className="stat-value">{stats.avgDepthFt} ft</p>
              </div>
              <div className="stat-tile">
                <p className="stat-label">Median depth</p>
                <p className="stat-value">{stats.medianDepthFt} ft</p>
              </div>
              <div className="stat-tile">
                <p className="stat-label">Avg gravel vein</p>
                <p className="stat-value">{stats.avgGravelIn}&Prime; thick</p>
              </div>
              <div className="stat-tile">
                <p className="stat-label">Vein depth band</p>
                <p className="stat-value text-lg">{stats.veinDepthBandFt}</p>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">
                      Ref #
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">
                      County
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">
                      Distance
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">
                      Depth
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">
                      Gravel vein
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">
                      Vein @ depth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wells.map((w) => (
                    <tr
                      key={w.refno}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                        {w.refno}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {w.county}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {w.distanceMi} mi {w.bearing}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {w.depthFt} ft
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {w.gravelVeinIn}&Prime; interval
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        ~{w.veinDepthFt} ft
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="text-center text-xs text-[var(--muted)]">
        Gmail / Google Geocoding automation can plug in later — this MVP only
        parses what you paste.
      </p>
    </div>
  );
}
