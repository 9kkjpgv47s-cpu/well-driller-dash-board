"use client";

/**
 * In-app DNR neighborhood map: same behavior as the Field hub map (viewer-well-map,
 * DrillingMap, filters, detail modal) — no iframe and no dependency on /well-viewer/index.html.
 * Chunk data still loads from /well-viewer/dnr_wells_chunk_*.csv.gz (static files in public/).
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { wellsWithinRadius, type WellRecord } from "@/lib/area-well-analytics";
import { getDnrWellsCached } from "@/lib/dnr-wells-cache";
import { initLithologyV2 } from "@/lib/lithology-v2";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import {
  DEFAULT_VIEWER_MAP_FILTERS,
  type ViewerMapFilters,
  wellPassesHubViewerFilters,
} from "@/lib/viewer-well-map";
import { DrillingViewerMapFilters } from "./DrillingViewerMapFilters";
import { WellDetailModal } from "./WellDetailModal";

const DrillingMap = dynamic(
  () => import("./DrillingMap").then((m) => m.DrillingMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(55vh,520px)] w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        Loading map…
      </div>
    ),
  },
);

type Props = {
  centerLat: number;
  centerLon: number;
  /** Return true if the well was added to the job sheet. */
  tryAppendWell: (w: WellRecord) => boolean;
  /** Optional refresh after a successful append (e.g. reload queue). */
  onAfterAppend?: () => void;
};

export function HubNativeWellMapWorkspace({
  centerLat,
  centerLon,
  tryAppendWell,
  onAfterAppend,
}: Props) {
  const [allWells, setAllWells] = useState<WellRecord[]>([]);
  const [wellsStatus, setWellsStatus] = useState<string | null>(null);
  const [wellsError, setWellsError] = useState<string | null>(null);
  const [mapFilters, setMapFilters] = useState<ViewerMapFilters>({
    ...DEFAULT_VIEWER_MAP_FILTERS,
  });
  const [detailWell, setDetailWell] = useState<WellRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const radiusMiles = DEFAULT_AREA_RADIUS_MILES;
  const center = useMemo(
    () => ({ lat: centerLat, lon: centerLon }),
    [centerLat, centerLon],
  );

  useEffect(() => {
    void initLithologyV2();
  }, []);

  useEffect(() => {
    setWellsStatus("Loading registry chunks…");
    void getDnrWellsCached((msg) => setWellsStatus(msg))
      .then((w) => {
        setAllWells(w);
        setWellsStatus(null);
        setWellsError(null);
      })
      .catch((e: Error) => {
        setWellsError(e.message);
        setWellsStatus(null);
      });
  }, []);

  const wellsInRadius = useMemo(() => {
    return wellsWithinRadius(allWells, center.lat, center.lon, radiusMiles);
  }, [allWells, center.lat, center.lon, radiusMiles]);

  const wellsMatchingMapFilters = useMemo(
    () => wellsInRadius.filter((w) => wellPassesHubViewerFilters(w, mapFilters)),
    [wellsInRadius, mapFilters],
  );

  const jobsiteLocation = useMemo(
    () => ({
      lat: centerLat,
      lon: centerLon,
      accuracyM: null as number | null,
      sourceLabel: "Job centroid (queue)",
    }),
    [centerLat, centerLon],
  );

  const addFromModal = useCallback(
    (w: WellRecord) => {
      const ok = tryAppendWell(w);
      if (!ok) {
        setToast("Already on the job list.");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      setDetailWell(null);
      onAfterAppend?.();
    },
    [tryAppendWell, onAfterAppend],
  );

  return (
    <div className="space-y-4">
      {wellsStatus ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{wellsStatus}</p>
      ) : null}
      {wellsError ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {wellsError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 lg:col-span-4">
          <DrillingViewerMapFilters
            value={mapFilters}
            onChange={setMapFilters}
          />
        </div>
        <div className="space-y-2 lg:col-span-8">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {wellsInRadius.length.toLocaleString()} wells in {radiusMiles} mi ·{" "}
            {wellsMatchingMapFilters.length.toLocaleString()} match filters
            {wellsMatchingMapFilters.length > 800
              ? " · showing up to 800 markers"
              : ""}
            . Same marker rules as the Field hub (g/r tags, combo rows). Click a
            marker for details and <strong>Add to job queue</strong>.
          </p>
          <DrillingMap
            center={center}
            radiusMiles={radiusMiles}
            wells={wellsMatchingMapFilters}
            filters={mapFilters}
            onWellOpen={setDetailWell}
            jobsiteLocation={jobsiteLocation}
          />
        </div>
      </div>

      <WellDetailModal
        well={detailWell}
        onClose={() => setDetailWell(null)}
        onAddToJob={addFromModal}
      />

      {toast ? (
        <p
          className="fixed bottom-6 right-6 z-[1000] rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
          role="status"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
