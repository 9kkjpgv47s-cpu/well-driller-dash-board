import type { Metadata } from "next";
import Link from "next/link";
import { BuildJobForm } from "@/components/BuildJobForm";

export const metadata: Metadata = {
  title: "Build job — Driller Dashboard",
  description: "Create a jobsite record with map coords, notes, and photo.",
};

export default function BuildJobPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Scheduling
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Build job
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Capture drive-up context, exact coordinates, crew notes, and a site
            photo. Drillers get a dedicated brief with mock nearby-well intel
            until registry analytics is wired.
          </p>
        </div>
        <Link href="/scheduling" className="btn-ghost shrink-0 self-start sm:self-auto">
          ← Back to schedule
        </Link>
      </div>

      <section className="card p-6 sm:p-8">
        <BuildJobForm />
      </section>
    </div>
  );
}
