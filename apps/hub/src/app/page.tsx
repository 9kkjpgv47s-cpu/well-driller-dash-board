import type { Metadata } from "next";
import { Suspense } from "react";
import { DrillingHubClient } from "@/components/drilling/DrillingHubClient";

export const metadata: Metadata = {
  title: "Field — Driller Dashboard",
  description:
    "Plan a site with address or coordinates, DNR wells map, job queue, weather, and area drilling analysis.",
};

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      }
    >
      <DrillingHubClient />
    </Suspense>
  );
}
