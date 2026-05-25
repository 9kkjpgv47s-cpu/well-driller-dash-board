"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaInsightsPanel } from "@/components/AreaInsightsPanel";
import { SectionMoveControls } from "@/components/SectionMoveControls";
import { JobWeatherPanel } from "@/components/scheduling/JobWeatherPanel";
import {
  computeAreaInsights,
  getLithLayers,
  haversineMiles,
  wellsWithinRadius,
  type WellRecord,
} from "@/lib/area-well-analytics";
import { appendDrillerJobEntry } from "@/lib/cj-driller-job";
import { getDnrWellsCached } from "@/lib/dnr-wells-cache";
import { wellRecordToDrillerEntry } from "@/lib/drilling-well-entry";
import {
  DEFAULT_AREA_RADIUS_MILES,
  DEFAULT_DEPTH_VIEW_RADIUS_MILES,
} from "@/lib/hub-area-defaults";
import type { DispatchJobsiteApply } from "@/lib/dispatch-parse";
import { parseDispatchEmail } from "@/lib/dispatch-parse";
import { decodeJobShareParam } from "@/lib/job-share";
import { type DrillJob } from "@/lib/scheduling-data";
import { syntheticDrillJobForWeather } from "@/lib/synthetic-drill-job";
import {
  DEFAULT_VIEWER_MAP_FILTERS,
  getWellDisplayDepthFtViewer,
  type ViewerMapFilters,
  wellPassesHubViewerFilters,
} from "@/lib/viewer-well-map";
import { FieldDispatchPanel } from "./FieldDispatchPanel";
import { DrillingViewerMapFilters, MapLabelToolbarControls } from "./DrillingViewerMapFilters";
import { FieldSegmentedToggle, FIELD_TOOLBAR_BTN } from "./FieldSegmentedToggle";
import { NearestWellsStrip } from "./NearestWellsStrip";
import { WellAslStratigraphyChart } from "./WellAslStratigraphyChart";
import { WellDepthThermometer } from "./WellDepthThermometer";
import { WellDetailModal } from "./WellDetailModal";

const DrillingMap = dynamic(
  () => import("./DrillingMap").then((m) => m.DrillingMap),
  {
    ssr: false,
    loading: () => (
      <div className="card flex h-[min(55vh,520px)] w-full items-center justify-center text-sm text-[var(--muted)]">
        Loading map…
      </div>
    ),
  },
);

function wellDemKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}

const RADIUS_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5] as const;
type RadiusMilesChoice = (typeof RADIUS_OPTIONS)[number];
const DEPTH_RADIUS_OPTIONS = [0.3, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5] as const;
type DepthRadiusMilesChoice = (typeof DEPTH_RADIUS_OPTIONS)[number];
const LS_RADIUS_MILES = "driller-hub-radius-miles-v1";
const LS_DEPTH_RADIUS_MILES = "driller-hub-depth-radius-miles-v1";
const LS_FIELD_SECTION_ORDER = "driller-field-section-order-v1";
const LS_FIELD_WORKSPACE_VIEW = "driller-hub-field-workspace-view-v1";
type FieldSectionId = "map" | "weather" | "insights";
type FieldWorkspaceView = "map" | "depth" | "asl";
type WellsListMode = "nearest" | "byDepth";
const ALL_FIELD_SECTIONS: FieldSectionId[] = [
  "map",
  "weather",
  "insights",
];
const DEFAULT_FIELD_ORDER: FieldSectionId[] = [...ALL_FIELD_SECTIONS];

function isRadiusChoice(n: number): n is RadiusMilesChoice {
  return (RADIUS_OPTIONS as readonly number[]).includes(n);
}

function isDepthRadiusChoice(n: number): n is DepthRadiusMilesChoice {
  return (DEPTH_RADIUS_OPTIONS as readonly number[]).includes(n);
}

function readStoredRadiusMiles(): RadiusMilesChoice | null {
  if (typeof window === "undefined") return null;
  const v = parseFloat(localStorage.getItem(LS_RADIUS_MILES) ?? "");
  return isRadiusChoice(v) ? v : null;
}

function readStoredDepthRadiusMiles(): DepthRadiusMilesChoice | null {
  if (typeof window === "undefined") return null;
  const v = parseFloat(localStorage.getItem(LS_DEPTH_RADIUS_MILES) ?? "");
  return isDepthRadiusChoice(v) ? v : null;
}

function normalizeFieldSectionOrder(
  raw: unknown,
): FieldSectionId[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<FieldSectionId>(ALL_FIELD_SECTIONS);
  const next = raw
    .filter((x): x is string => typeof x === "string")
    .filter((x) => x !== "depth" && x !== "queue")
    .filter((x): x is FieldSectionId => allowed.has(x as FieldSectionId));
  if (next.length !== ALL_FIELD_SECTIONS.length) return null;
  if (new Set(next).size !== ALL_FIELD_SECTIONS.length) return null;
  return next;
}

function readStoredFieldWorkspaceView(): FieldWorkspaceView {
  if (typeof window === "undefined") return "map";
  const v = localStorage.getItem(LS_FIELD_WORKSPACE_VIEW);
  if (v === "depth") return "depth";
  if (v === "asl") return "asl";
  return "map";
}

function readStoredFieldOrder(): FieldSectionId[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_FIELD_SECTION_ORDER);
    if (!raw) return null;
    return normalizeFieldSectionOrder(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Short label for the map heading (uppercase mi). */
function formatRadiusHeading(mi: number): string {
  if (mi === 0.25) return "¼ MI";
  if (mi === 0.3) return "0.3 MI";
  if (mi === 0.5) return "½ MI";
  if (mi === 1.5) return "1½ MI";
  return `${mi} MI`;
}

function formatRadiusSelectLabel(mi: number): string {
  if (mi === 0.25) return "¼ mile";
  if (mi === 0.3) return "0.3 mile";
  if (mi === 0.5) return "½ mile";
  if (mi === 1.5) return "1½ miles";
  return `${mi} miles`;
}

/** Title / sentence text (e.g. "2 mi", "¼ mi"). */
function formatRadiusMiShort(mi: number): string {
  if (mi === 0.25) return "¼ mi";
  if (mi === 0.3) return "0.3 mi";
  if (mi === 0.5) return "½ mi";
  if (mi === 1.5) return "1½ mi";
  return `${mi} mi`;
}

type DispatchContext = {
  title?: string | null;
  feetOffDrive?: number;
};

export function DrillingHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [dispatchContext, setDispatchContext] =
    useState<DispatchContext | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<RadiusMilesChoice>(
    DEFAULT_AREA_RADIUS_MILES as RadiusMilesChoice,
  );
  const [depthRadiusMiles, setDepthRadiusMiles] =
    useState<DepthRadiusMilesChoice>(
      DEFAULT_DEPTH_VIEW_RADIUS_MILES as DepthRadiusMilesChoice,
    );
  const [sectionOrder, setSectionOrder] = useState<FieldSectionId[]>([
    ...DEFAULT_FIELD_ORDER,
  ]);
  const [workspaceView, setWorkspaceView] =
    useState<FieldWorkspaceView>("map");
  const [wellsListMode, setWellsListMode] =
    useState<WellsListMode>("nearest");

  const [mapFilters, setMapFilters] = useState<ViewerMapFilters>(
    DEFAULT_VIEWER_MAP_FILTERS,
  );
  const [detailWell, setDetailWell] = useState<WellRecord | null>(null);

  const [allWells, setAllWells] = useState<WellRecord[]>([]);
  const [wellsStatus, setWellsStatus] = useState<string | null>(null);
  const [wellsError, setWellsError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const [demRefGroundElevFt, setDemRefGroundElevFt] = useState<number | null>(
    null,
  );
  const [demGroundElevFtByKey, setDemGroundElevFtByKey] = useState<
    Map<string, number> | null
  >(null);
  const [elevLoading, setElevLoading] = useState(false);
  const [elevError, setElevError] = useState<string | null>(null);
  const aslElevAutoKeyRef = useRef<string | null>(null);
  const [dispatchHydrate, setDispatchHydrate] = useState<{
    raw: string;
    parsed: ReturnType<typeof parseDispatchEmail>;
  } | null>(null);
  const sharedJobLoadedRef = useRef(false);

  useEffect(() => {
    const r = readStoredRadiusMiles();
    if (r != null) setRadiusMiles(r);
    const dr = readStoredDepthRadiusMiles();
    if (dr != null) setDepthRadiusMiles(dr);
    const ord = readStoredFieldOrder();
    if (ord) setSectionOrder(ord);
    setWorkspaceView(readStoredFieldWorkspaceView());
    setWellsListMode(
      readStoredFieldWorkspaceView() === "map" ? "nearest" : "byDepth",
    );
  }, []);

  const onRadiusSelect = useCallback((value: string) => {
    const n = parseFloat(value);
    if (!isRadiusChoice(n)) return;
    setRadiusMiles(n);
    localStorage.setItem(LS_RADIUS_MILES, String(n));
  }, []);

  const onDepthRadiusSelect = useCallback((value: string) => {
    const n = parseFloat(value);
    if (!isDepthRadiusChoice(n)) return;
    setDepthRadiusMiles(n);
    localStorage.setItem(LS_DEPTH_RADIUS_MILES, String(n));
  }, []);

  const setFieldWorkspaceView = useCallback((view: FieldWorkspaceView) => {
    setWorkspaceView(view);
    localStorage.setItem(LS_FIELD_WORKSPACE_VIEW, view);
    setWellsListMode(view === "map" ? "nearest" : "byDepth");
  }, []);

  const moveFieldSection = useCallback(
    (id: FieldSectionId, delta: -1 | 1) => {
      setSectionOrder((prev) => {
        const i = prev.indexOf(id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        const a = next[i]!;
        const b = next[j]!;
        next[i] = b;
        next[j] = a;
        localStorage.setItem(LS_FIELD_SECTION_ORDER, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  /** Load shared job links; strip legacy bare ?lat=&lon= bookmarks. */
  useEffect(() => {
    if (sharedJobLoadedRef.current) return;

    const jobParam = searchParams.get("job");
    if (jobParam) {
      const payload = decodeJobShareParam(jobParam);
      if (payload) {
        sharedJobLoadedRef.current = true;
        const parsed = parseDispatchEmail(payload.raw);
        setCenter({ lat: payload.lat, lon: payload.lon });
        setDispatchContext({
          title: payload.title ?? parsed.title,
          feetOffDrive: payload.feetOffDrive,
        });
        setDispatchHydrate({ raw: payload.raw, parsed });
        setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
        return;
      }
    }

    const la = searchParams.get("lat");
    const lo = searchParams.get("lon");
    if (la || lo) {
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!center) return;
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
  }, [center]);

  const wellsInRadius = useMemo(() => {
    if (!center) return [];
    return wellsWithinRadius(allWells, center.lat, center.lon, radiusMiles);
  }, [allWells, center, radiusMiles]);

  const wellsMatchingMapFilters = useMemo(
    () => wellsInRadius.filter((w) => wellPassesHubViewerFilters(w, mapFilters)),
    [wellsInRadius, mapFilters],
  );

  const wellsInDepthRadius = useMemo(() => {
    if (!center) return [];
    return wellsWithinRadius(
      allWells,
      center.lat,
      center.lon,
      depthRadiusMiles,
    );
  }, [allWells, center, depthRadiusMiles]);

  const wellsMatchingDepthFilters = useMemo(
    () =>
      wellsInDepthRadius.filter((w) => wellPassesHubViewerFilters(w, mapFilters)),
    [wellsInDepthRadius, mapFilters],
  );

  const areaInsightsForDepth = useMemo(() => {
    if (!center) return null;
    return computeAreaInsights(
      allWells,
      center.lat,
      center.lon,
      depthRadiusMiles,
    );
  }, [allWells, center, depthRadiusMiles]);

  const nearestWellsForElev = useMemo(() => {
    if (!center) return [];
    const withD = wellsInRadius
      .filter(
        (w) =>
          w.lat != null &&
          w.lon != null &&
          Number.isFinite(Number(w.lat)) &&
          Number.isFinite(Number(w.lon)),
      )
      .map((w) => ({
        w,
        d: haversineMiles(
          center.lat,
          center.lon,
          Number(w.lat),
          Number(w.lon),
        ),
      }))
      .sort((a, b) => a.d - b.d);
    return withD.slice(0, 25).map((x) => x.w);
  }, [wellsInRadius, center]);

  const selectedWellKey = detailWell ? wellDemKey(detailWell) : null;

  const mapWellsByDepth = useMemo(() => {
    return wellsMatchingMapFilters
      .map((w) => ({ w, depthFt: getWellDisplayDepthFtViewer(w) }))
      .filter(
        (x): x is { w: WellRecord; depthFt: number } =>
          x.depthFt != null && Number.isFinite(x.depthFt),
      )
      .sort(
        (a, b) =>
          a.depthFt - b.depthFt ||
          String(a.w.id ?? a.w.refno).localeCompare(
            String(b.w.id ?? b.w.refno),
          ),
      )
      .slice(0, 25)
      .map((x) => x.w);
  }, [wellsMatchingMapFilters]);

  const depthViewWellsByDepth = useMemo(() => {
    return wellsMatchingDepthFilters
      .map((w) => ({ w, depthFt: getWellDisplayDepthFtViewer(w) }))
      .filter(
        (x): x is { w: WellRecord; depthFt: number } =>
          x.depthFt != null && Number.isFinite(x.depthFt),
      )
      .sort(
        (a, b) =>
          a.depthFt - b.depthFt ||
          String(a.w.id ?? a.w.refno).localeCompare(
            String(b.w.id ?? b.w.refno),
          ),
      )
      .slice(0, 25)
      .map((x) => x.w);
  }, [wellsMatchingDepthFilters]);

  const workspaceWells = useMemo(() => {
    if (wellsListMode === "nearest") return nearestWellsForElev;
    if (workspaceView === "map") return mapWellsByDepth;
    return depthViewWellsByDepth;
  }, [
    wellsListMode,
    workspaceView,
    nearestWellsForElev,
    mapWellsByDepth,
    depthViewWellsByDepth,
  ]);

  useEffect(() => {
    setDemRefGroundElevFt(null);
    setDemGroundElevFtByKey(null);
    setElevError(null);
    aslElevAutoKeyRef.current = null;
  }, [center?.lat, center?.lon]);

  const fetchGroundElevations = useCallback(
    async (targetWells?: WellRecord[]) => {
      if (!center) return;
      setElevLoading(true);
      setElevError(null);
      const wellsForElev = targetWells ?? nearestWellsForElev;
      const locations = [
        { lat: center.lat, lon: center.lon },
        ...wellsForElev.map((w) => ({
          lat: Number(w.lat),
          lon: Number(w.lon),
        })),
      ];
      try {
        const res = await fetch("/api/elevation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations }),
        });
        const data = (await res.json()) as {
          elevationsFt?: (number | null)[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : res.statusText,
          );
        }
        const arr = data.elevationsFt;
        if (!Array.isArray(arr) || arr.length !== locations.length) {
          throw new Error("Unexpected elevation response");
        }
        const refFt = arr[0] ?? null;
        setDemGroundElevFtByKey((prev) => {
          const next = new Map(prev ?? []);
          wellsForElev.forEach((w, i) => {
            const ft = arr[i + 1];
            if (ft != null) next.set(wellDemKey(w), ft);
          });
          return next.size ? next : null;
        });
        setDemRefGroundElevFt(refFt);
      } catch (e) {
        setElevError(
          e instanceof Error ? e.message : "Elevation lookup failed",
        );
        if (!targetWells) {
          setDemRefGroundElevFt(null);
          setDemGroundElevFtByKey(null);
        }
      } finally {
        setElevLoading(false);
      }
    },
    [center, nearestWellsForElev],
  );

  const aslElevTargetWells = useMemo(() => {
    return wellsMatchingDepthFilters.filter((w) => getLithLayers(w).length > 0);
  }, [wellsMatchingDepthFilters]);

  useEffect(() => {
    if (workspaceView !== "asl" || !center || elevLoading) return;
    if (!aslElevTargetWells.length) return;
    const autoKey = `${center.lat},${center.lon}`;
    if (aslElevAutoKeyRef.current === autoKey) return;
    const missing = aslElevTargetWells.some(
      (w) => !demGroundElevFtByKey?.has(wellDemKey(w)),
    );
    if (!missing && demGroundElevFtByKey?.size) return;
    aslElevAutoKeyRef.current = autoKey;
    void fetchGroundElevations(aslElevTargetWells);
  }, [
    workspaceView,
    center,
    aslElevTargetWells,
    demGroundElevFtByKey,
    elevLoading,
    fetchGroundElevations,
  ]);

  const weatherJob = useMemo((): DrillJob | null => {
    if (!center) return null;
    const title =
      dispatchContext?.title?.trim() ||
      `Jobsite (${center.lat.toFixed(4)}, ${center.lon.toFixed(4)})`;
    return syntheticDrillJobForWeather({
      lat: center.lat,
      lon: center.lon,
      title,
      county: "",
      feetOffDrive: dispatchContext?.feetOffDrive ?? 0,
      driveMinutesFromYard: 0,
    });
  }, [center, dispatchContext]);

  const applyDispatchJobsite = useCallback((site: DispatchJobsiteApply) => {
    setCenter({ lat: site.lat, lon: site.lon });
    setDispatchContext({
      title: site.title,
      feetOffDrive: site.distanceOffDriveFt,
    });
    setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
  }, []);

  const wellsForMap = useMemo(() => {
    if (!demGroundElevFtByKey?.size) return wellsInRadius;
    return wellsInRadius.map((w) => {
      const k = wellDemKey(w);
      const ft = demGroundElevFtByKey.get(k);
      if (ft == null) return w;
      return { ...w, ground_elev: String(Math.round(ft)) };
    });
  }, [wellsInRadius, demGroundElevFtByKey]);

  const demWellElevRows = useMemo(() => {
    if (!demGroundElevFtByKey?.size) return [];
    const rows: { label: string; wellFt: number; diffFt: number | null }[] =
      [];
    for (const w of nearestWellsForElev) {
      const ft = demGroundElevFtByKey.get(wellDemKey(w));
      if (ft == null) continue;
      rows.push({
        label: String(w.well_id ?? w.id ?? w.refno ?? "?"),
        wellFt: ft,
        diffFt:
          demRefGroundElevFt != null ? ft - demRefGroundElevFt : null,
      });
    }
    return rows.slice(0, 20);
  }, [demGroundElevFtByKey, nearestWellsForElev, demRefGroundElevFt]);

  const addWellToJob = (w: WellRecord) => {
    const entry = wellRecordToDrillerEntry(w);
    if (!entry) {
      setToast("That well has no coordinates.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const ok = appendDrillerJobEntry(entry);
    if (!ok) {
      setToast("Already on the job list.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast(`Added ${entry.wellId}`);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="field-hub-scope space-y-8">
      <FieldDispatchPanel
        onApplyToFieldMap={applyDispatchJobsite}
        jobsiteCoords={center}
        feetOffDrive={dispatchContext?.feetOffDrive}
        initialRaw={dispatchHydrate?.raw}
        initialParsed={dispatchHydrate?.parsed ?? null}
      />

      {center && wellsStatus ? (
        <p className="text-sm text-[var(--muted)]">{wellsStatus}</p>
      ) : null}
      {wellsError ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {wellsError}
        </div>
      ) : null}

      {center ? (
        <>
          {sectionOrder.map((sid) => {
            switch (sid) {
              case "map":
                return (
                  <section
                    key="map"
                    className="space-y-4"
                    aria-labelledby="drill-map-h"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2
                        id="drill-map-h"
                        className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
                      >
                        Map &amp; views (
                        {formatRadiusHeading(
                          workspaceView === "map"
                            ? radiusMiles
                            : depthRadiusMiles,
                        )}
                        )
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <span>Radius</span>
                          <select
                            value={String(
                              workspaceView === "map"
                                ? radiusMiles
                                : depthRadiusMiles,
                            )}
                            onChange={(e) =>
                              workspaceView === "map"
                                ? onRadiusSelect(e.target.value)
                                : onDepthRadiusSelect(e.target.value)
                            }
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-1 text-xs font-medium text-[var(--foreground)] shadow-sm"
                            aria-label={
                              workspaceView === "map"
                                ? "Registry search radius"
                                : "Depth and ASL view search radius"
                            }
                          >
                            {(workspaceView === "map"
                              ? RADIUS_OPTIONS
                              : DEPTH_RADIUS_OPTIONS
                            ).map((r) => (
                              <option key={r} value={String(r)}>
                                {formatRadiusSelectLabel(r)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <SectionMoveControls
                          id="map"
                          order={sectionOrder}
                          onMove={moveFieldSection}
                        />
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-4 lg:grid-cols-12 lg:gap-6">
                      <div className="card min-w-0 p-4 lg:col-span-4">
                        <DrillingViewerMapFilters
                          value={mapFilters}
                          onChange={setMapFilters}
                        />
                      </div>
                      <div className="card min-w-0 space-y-4 p-4 lg:col-span-8">
                        <div className="flex min-w-0 flex-col gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <FieldSegmentedToggle
                              ariaLabel="Map, depth, or ASL lithology view"
                              value={workspaceView}
                              onChange={setFieldWorkspaceView}
                              size="sm"
                              options={[
                                { value: "map", label: "Map" },
                                { value: "depth", label: "Depth" },
                                { value: "asl", label: "ASL" },
                              ]}
                            />
                            {workspaceView === "map" ? (
                              <button
                                type="button"
                                onClick={() => void fetchGroundElevations()}
                                disabled={elevLoading}
                                className={`${FIELD_TOOLBAR_BTN} shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600`}
                              >
                                {elevLoading
                                  ? "Fetching…"
                                  : "Ground elevation"}
                              </button>
                            ) : null}
                          </div>
                          {workspaceView === "map" ? (
                            <MapLabelToolbarControls
                              value={mapFilters}
                              onChange={setMapFilters}
                            />
                          ) : null}
                        </div>
                        {workspaceView === "map" ? (
                          <>
                            {elevError ? (
                              <p
                                className="text-sm text-red-600 dark:text-red-400"
                                role="alert"
                              >
                                {elevError}
                              </p>
                            ) : null}
                            {demRefGroundElevFt != null ||
                            demWellElevRows.length > 0 ? (
                              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                                {demRefGroundElevFt != null ? (
                                  <p>
                                    <strong>
                                      Reference ground (map center):
                                    </strong>{" "}
                                    {demRefGroundElevFt} ft (DEM)
                                  </p>
                                ) : (
                                  <p>
                                    Center DEM missing; well rows below still
                                    show surface where returned.
                                  </p>
                                )}
                                {demWellElevRows.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
                                      <thead>
                                        <tr className="border-b border-emerald-300/80 dark:border-emerald-700">
                                          <th className="py-1 pr-2 font-semibold">
                                            Well
                                          </th>
                                          <th className="py-1 pr-2 font-semibold">
                                            Ground (ft)
                                          </th>
                                          <th className="py-1 font-semibold">
                                            Δ vs ref (ft)
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {demWellElevRows.map((r) => (
                                          <tr
                                            key={r.label}
                                            className="border-b border-emerald-200/60 dark:border-emerald-800/60"
                                          >
                                            <td className="py-1 pr-2 font-mono">
                                              {r.label}
                                            </td>
                                            <td className="py-1 pr-2">
                                              {r.wellFt}
                                            </td>
                                            <td className="py-1">
                                              {r.diffFt != null
                                                ? r.diffFt > 0
                                                  ? `+${r.diffFt}`
                                                  : String(r.diffFt)
                                                : "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <p className="mt-1 text-[10px] text-emerald-800/90 dark:text-emerald-200/90">
                                      Δ is well minus reference (positive =
                                      well higher than center).
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            <DrillingMap
                              center={center}
                              radiusMiles={radiusMiles}
                              wells={wellsForMap}
                              filters={mapFilters}
                              onWellOpen={setDetailWell}
                            />
                          </>
                        ) : workspaceView === "depth" ? (
                          <WellDepthThermometer
                            embedded
                            hideRadiusControl
                            wells={wellsMatchingDepthFilters}
                            radiusMiles={depthRadiusMiles}
                            radiusOptions={DEPTH_RADIUS_OPTIONS}
                            onRadiusChange={onDepthRadiusSelect}
                            medianDepthFt={areaInsightsForDepth?.depthMedianFt}
                            selectedWellKey={selectedWellKey}
                            onSelectWell={setDetailWell}
                          />
                        ) : (
                          <WellAslStratigraphyChart
                            wells={wellsMatchingDepthFilters}
                            demElevFtByKey={demGroundElevFtByKey}
                            selectedWellKey={selectedWellKey}
                            referenceGroundElevFt={demRefGroundElevFt}
                            onSelectWell={setDetailWell}
                            onRequestElevations={() =>
                              void fetchGroundElevations(aslElevTargetWells)
                            }
                            elevLoading={elevLoading}
                            radiusMiles={depthRadiusMiles}
                          />
                        )}
                      </div>

                      <NearestWellsStrip
                        wells={workspaceWells}
                        onSelectWell={setDetailWell}
                        demElevFtByKey={
                          wellsListMode === "nearest"
                            ? demGroundElevFtByKey
                            : undefined
                        }
                        refElevFt={
                          wellsListMode === "nearest"
                            ? demRefGroundElevFt
                            : undefined
                        }
                        selectedKey={selectedWellKey}
                        listMode={wellsListMode}
                        onListModeChange={setWellsListMode}
                        title={
                          wellsListMode === "nearest"
                            ? "Nearest registry wells (up to 25)"
                          : workspaceView === "map"
                            ? `Wells by depth · map ${formatRadiusMiShort(radiusMiles)}`
                            : workspaceView === "asl"
                              ? `Wells with logs · ASL ${formatRadiusMiShort(depthRadiusMiles)}`
                              : `Wells by depth · ${formatRadiusMiShort(depthRadiusMiles)}`
                        }
                        hint={
                          workspaceWells.length
                            ? `${workspaceWells.length} shown · scroll · tap for detail`
                            : undefined
                        }
                        emptyMessage={
                          wellsListMode === "nearest"
                            ? "No wells to show."
                            : workspaceView === "map"
                              ? "No wells with depth in map radius matching current filters."
                              : workspaceView === "asl"
                                ? "No wells with lithology logs in radius matching current filters."
                                : "No wells with depth in radius matching current filters."
                        }
                        maxHeightClass="max-h-[13rem] md:max-h-[15rem]"
                      />
                    </div>
                  </section>
                );
              case "weather":
                return weatherJob ? (
                  <JobWeatherPanel
                    key="weather"
                    job={weatherJob}
                    layout="field"
                    headerActions={
                      <SectionMoveControls
                        id="weather"
                        order={sectionOrder}
                        onMove={moveFieldSection}
                      />
                    }
                  />
                ) : null;
              case "insights":
                return (
                  <AreaInsightsPanel
                    key="insights"
                    lat={center.lat}
                    lon={center.lon}
                    radiusMiles={radiusMiles}
                    autoRun
                    title={`Area drilling analysis (${formatRadiusMiShort(radiusMiles)})`}
                    showViewerLinks
                    headerActions={
                      <SectionMoveControls
                        id="insights"
                        order={sectionOrder}
                        onMove={moveFieldSection}
                      />
                    }
                  />
                );
              default:
                return null;
            }
          })}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
          Paste dispatch email text and generate a job brief to open the map,
          weather, and area analysis.
        </p>
      )}

      <WellDetailModal
        well={detailWell}
        onClose={() => setDetailWell(null)}
        onAddToJob={(w) => {
          addWellToJob(w);
          setDetailWell(null);
        }}
      />

      {toast ? (
        <p
          className="fixed bottom-6 right-6 z-[1000] rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm text-[var(--background)] shadow-lg"
          role="status"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
