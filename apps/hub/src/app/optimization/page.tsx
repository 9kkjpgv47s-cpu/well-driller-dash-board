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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Driller optimization
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Quick read on a jobsite before you roll. The API uses deterministic
          mock logic so a few testers can hammer it without side effects; add
          caching and a real analytics service when you scale past light
          traffic.
        </p>
      </div>
      <OptimizationPanel />
    </div>
  );
}
