"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type JobRecord = {
  id: string;
  title: string;
  driveAddress: string;
};

export function BuiltJobsSection() {
  const [jobs, setJobs] = useState<JobRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/jobs");
        const data = (await res.json()) as { jobs?: JobRecord[] };
        if (!cancelled && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      } catch {
        if (!cancelled) setJobs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (jobs === null) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">Loading built jobs…</p>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">
        No jobs built in this session yet. Use{" "}
        <Link href="/build-job" className="font-medium text-[var(--accent)] underline-offset-2 hover:underline">
          Build job
        </Link>{" "}
        to add one.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {jobs.map((j) => (
        <li key={j.id}>
          <Link
            href={`/jobs/${j.id}`}
            className="card block p-4 transition hover:border-[var(--accent)]/40"
          >
            <p className="font-medium text-[var(--foreground)]">{j.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
              {j.driveAddress}
            </p>
            <p className="mt-3 text-xs font-semibold text-[var(--accent)]">
              Open driller brief →
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
