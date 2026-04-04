import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs-store";
import { mockAreaStats, mockNearbyWells } from "@/lib/nearby-wells-mock";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return { title: "Job — Driller Dashboard" };
  return {
    title: `${job.title} — Driller brief`,
    description: "Jobsite details and nearby well mock intelligence.",
  };
}

export default async function JobBriefPage({ params }: Props) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) notFound();

  const wells = mockNearbyWells(job.lat, job.lon, 6);
  const stats = mockAreaStats(wells);

  const mapsUrl = `https://www.google.com/maps?q=${job.lat},${job.lon}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Driller brief
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {job.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Created {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Open in Maps
          </a>
          <Link href="/build-job" className="btn-primary">
            Build another job
          </Link>
          <Link href="/scheduling" className="btn-ghost">
            Schedule
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Jobsite details
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">Drive address</dt>
              <dd className="mt-1 text-sm text-[var(--foreground)]">
                {job.driveAddress}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">
                Off the drive
              </dt>
              <dd className="mt-1 text-sm text-[var(--foreground)]">
                {job.distanceOffDrive || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">Coordinates</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--foreground)]">
                {job.lat.toFixed(5)}, {job.lon.toFixed(5)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-[var(--muted)]">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                {job.notes || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Site photo
            </h2>
          </div>
          <div className="relative aspect-[4/3] bg-[var(--surface-muted)]">
            {job.sitePhotoUrl ? (
              <Image
                src={job.sitePhotoUrl}
                alt="Jobsite"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 400px"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
                No photo on file
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Nearby wells (mock)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Illustrative registry-style neighbors for briefing. Replace with
              canonical export + analytics; community tips stay a separate layer
              later.
            </p>
          </div>
        </div>

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
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Ref #</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">County</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Distance</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Depth</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Gravel vein</th>
                <th className="px-4 py-3 font-medium text-[var(--muted)]">Vein @ depth</th>
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
                  <td className="px-4 py-3 text-[var(--foreground)]">{w.county}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {w.distanceMi} mi {w.bearing}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{w.depthFt} ft</td>
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
      </section>
    </div>
  );
}
