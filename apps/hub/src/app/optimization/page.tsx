import type { Metadata } from "next";
import { OptimizationPanel } from "@/components/OptimizationPanel";

export const metadata: Metadata = {
  title: "Optimization — Driller Dashboard",
  description: "Jobsite optimization hints (mock API).",
};

export default function OptimizationPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Analytics preview
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Driller optimization
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Quick read on a jobsite before you roll. The API uses deterministic
          mock logic for testing; pair with a real analytics service when you
          outgrow light traffic.
        </p>
      </div>
      <OptimizationPanel />
    </div>
  );
}
