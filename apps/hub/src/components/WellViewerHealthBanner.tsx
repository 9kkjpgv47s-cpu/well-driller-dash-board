"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "bad";

/** Probes the first gz chunk used by the hub map and area insights. */
export function WellViewerHealthBanner() {
  const [st, setSt] = useState<Status>("checking");

  useEffect(() => {
    fetch("/well-viewer/dnr_wells_chunk_0.csv.gz", { method: "HEAD" })
      .then((r) => setSt(r.ok ? "ok" : "bad"))
      .catch(() => setSt("bad"));
  }, []);

  if (st === "checking") return null;

  if (st === "ok") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
        <strong>Registry chunk data is available</strong> for maps and area
        analysis. Open{" "}
        <Link href="/" className="font-semibold underline">
          Field hub
        </Link>{" "}
        to plan a site from dispatch.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <strong>Registry gz chunks were not found</strong> (expected{" "}
      <code className="rounded bg-white/70 px-1 dark:bg-black/30">
        public/well-viewer/dnr_wells_chunk_*.csv.gz
      </code>
      ). From the hub repo root run{" "}
      <code className="rounded bg-white/70 px-1 dark:bg-black/30">
        ./scripts/sync-well-viewer-into-hub.sh
      </code>{" "}
      with <code className="rounded bg-white/70 px-1">WELL_VIEWER_ROOT</code>{" "}
      set, then restart <code className="rounded bg-white/70 px-1">npm run dev</code>.
    </div>
  );
}
