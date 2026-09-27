import type { Metadata } from "next";
import { Suspense } from "react";
import { DrillingHubClient } from "@/components/drilling/DrillingHubClient";
import { BoreLoader } from "@/components/ui/BoreLoader";

export const metadata: Metadata = {
  title: "Field — Driller Hub · C&J Well Co",
  description:
    "Plan a site with address or coordinates, DNR wells map, job queue, weather, and area drilling analysis.",
};

export default function HomePage() {
  return (
    <Suspense fallback={<BoreLoader status="Loading field hub" />}>
      <DrillingHubClient />
    </Suspense>
  );
}
