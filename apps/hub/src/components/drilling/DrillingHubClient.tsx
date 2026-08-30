"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaInsightsPanel } from "@/components/AreaInsightsPanel";
import { SectionMoveControls } from "@/components/SectionMoveControls";
import { JobWeatherPanel } from "@/components/scheduling/JobWeatherPanel";
import {
  computeAreaInsights,
  getLithLayers,
  type AreaInsightsReport,
  type WellRecord,
} from "@/lib/area-well-analytics";
import {
  readStoredJson,
  readStoredNumber,
  readStoredString,
  writeStoredJson,
  writeStoredString,
} from "@/lib/browser-storage";
import { appendDrillerJobEntry } from "@/lib/cj-driller-job";
import { fetchJson } from "@/lib/http/fetch-json";
import {
  nearestWells,
  shallowestWellsByDepth,
  wellOrderKey,
} from "@/lib/well-ordering";
import {
  MAX_WELLS_NEARBY_LITHOLOGY_LIMIT,
  mergeLithologyIntoWells,
} from "@/lib/wells-nearby";
import type { ChunkLoadProgress } from "@/lib/dnr-chunk-browser";
import { getDnrWellsBaseCached, getDnrWellsFullCached } from "@/lib/dnr-wells-cache";
import { wellRecordToDrillerEntry } from "@/lib/drilling-well-entry";
import {
  DEFAULT_AREA_RADIUS_MILES,
  DEFAULT_DEPTH_VIEW_RADIUS_MILES,
} from "@/lib/hub-area-defaults";
import type {
  DispatchJobsiteApply,
  DispatchParseResult,
} from "@/lib/dispatch-parse";
import { parseDispatchEmail } from "@/lib/dispatch-parse";
import {
  clearDispatchSession,
  loadDispatchSession,
  saveDispatchSession,
} from "@/lib/dispatch-session-cache";
import { wellsWithinRadiusIndexed } from "@/lib/well-spatial-index";
import { decodeJobShareParam } from "@/lib/job-share";
import { type DrillJob } from "@/lib/scheduling-data";
import { syntheticDrillJobForWeather } from "@/lib/synthetic-drill-job";
import {
  DEFAULT_VIEWER_MAP_FILTERS,
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

const wellDemKey = wellOrderKey;

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
  const v = readStoredNumber(LS_RADIUS_MILES);
  return v != null && isRadiusChoice(v) ? v : null;
}

function readStoredDepthRadiusMiles(): DepthRadiusMilesChoice | null {
  const v = readStoredNumber(LS_DEPTH_RADIUS_MILES);
  return v != null && isDepthRadiusChoice(v) ? v : null;
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
  const v = readStoredString(LS_FIELD_WORKSPACE_VIEW);
  if (v === "depth") return "depth";
  if (v === "asl") return "asl";
  return "map";
}

function readStoredFieldOrder(): FieldSectionId[] | null {
  return normalizeFieldSectionOrder(
    readStoredJson<unknown>(LS_FIELD_SECTION_ORDER),
  );
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

/** Wells shown in the depth / nearest workspace lists (and DEM lookups). */
const WORKSPACE_WELL_LIMIT = 25;

type DispatchContext = {
  title?: string | null;
  feetOffDrive?: number;
};

export function DrillingHubClient() {
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

  const [areaWells, setAreaWells] = useState<WellRecord[]>([]);
  /** Lithology rows hydrated for the ASL view (see effect below). */
  const [lithoRows, setLithoRows] = useState<WellRecord[]>([]);
  const lithoHydrateKeyRef = useRef<string | null>(null);
  const [areaInsights, setAreaInsights] = useState<AreaInsightsReport | null>(
    null,
  );
  const [areaInsightsForDepth, setAreaInsightsForDepth] =
    useState<AreaInsightsReport | null>(null);
  const [wellsStatus, setWellsStatus] = useState<string | null>(null);
  const [wellsProgress, setWellsProgress] =
    useState<ChunkLoadProgress | null>(null);
  const [wellsError, setWellsError] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const fallbackAttemptedRef = useRef(false);

  const [lastParsedDispatch, setLastParsedDispatch] =
    useState<DispatchParseResult | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

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
    writeStoredString(LS_RADIUS_MILES, String(n));
  }, []);

  const onDepthRadiusSelect = useCallback((value: string) => {
    const n = parseFloat(value);
    if (!isDepthRadiusChoice(n)) return;
    setDepthRadiusMiles(n);
    writeStoredString(LS_DEPTH_RADIUS_MILES, String(n));
  }, []);

  const setFieldWorkspaceView = useCallback((view: FieldWorkspaceView) => {
    setWorkspaceView(view);
    writeStoredString(LS_FIELD_WORKSPACE_VIEW, view);
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
        writeStoredJson(LS_FIELD_SECTION_ORDER, next);
        return next;
      });
    },
    [],
  );

  /** Load shared job links (?job=), plain ?lat=&lon=, or last local dispatch. */
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
        saveDispatchSession({
          raw: payload.raw,
          lat: payload.lat,
          lon: payload.lon,
          title: payload.title ?? parsed.title,
          feetOffDrive: payload.feetOffDrive,
        });
        return;
      }
    }

    const la = parseFloat(searchParams.get("lat") ?? "");
    const lo = parseFloat(searchParams.get("lon") ?? "");
    if (
      Number.isFinite(la) &&
      Number.isFinite(lo) &&
      la >= -90 &&
      la <= 90 &&
      lo >= -180 &&
      lo <= 180
    ) {
      sharedJobLoadedRef.current = true;
      setCenter({ lat: la, lon: lo });
      setDispatchContext({
        title: `Map link (${la.toFixed(4)}, ${lo.toFixed(4)})`,
      });
      setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
      return;
    }

    // No URL job — restore last pasted dispatch from this browser/phone.
    const cached = loadDispatchSession();
    if (!cached?.raw) return;
    sharedJobLoadedRef.current = true;
    const parsed = parseDispatchEmail(cached.raw);
    setDispatchHydrate({ raw: cached.raw, parsed });
    setLastParsedDispatch(parsed);
    if (
      cached.lat != null &&
      cached.lon != null &&
      Number.isFinite(cached.lat) &&
      Number.isFinite(cached.lon)
    ) {
      setCenter({ lat: cached.lat, lon: cached.lon });
      setDispatchContext({
        title: cached.title ?? parsed.title,
        feetOffDrive: cached.feetOffDrive,
      });
      setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
    }
  }, [searchParams]);

  const loadWellsFallback = useCallback(
    (site: { lat: number; lon: number }) => {
      if (fallbackAttemptedRef.current) return;
      fallbackAttemptedRef.current = true;
      setWellsStatus("Server unavailable — loading registry chunks locally…");

      // Phase 1: Load base chunks (no lithology_json) → render map immediately
      void getDnrWellsBaseCached((p) => {
        setWellsProgress(p);
        setWellsStatus(p.message);
      })
        .then((baseWells) => {
          // Map renders with base wells right away
          setAreaWells(baseWells);
          setWellsStatus(null);
          setWellsProgress(null);
          setWellsError(null);

          // Phase 2: Load litho sidecars in background → compute area insights
          setInsightsLoading(true);
          void getDnrWellsFullCached(undefined, (p) => {
            setWellsProgress(p);
          })
            .then((fullWells) => {
              const inRadius = wellsWithinRadiusIndexed(
                fullWells,
                site.lat,
                site.lon,
                radiusMiles,
              );
              const inDepthRadius = wellsWithinRadiusIndexed(
                fullWells,
                site.lat,
                site.lon,
                depthRadiusMiles,
              );
              setAreaInsights(
                computeAreaInsights(fullWells, site.lat, site.lon, radiusMiles, {
                  wellsInRadius: inRadius,
                }),
              );
              setAreaInsightsForDepth(
                computeAreaInsights(fullWells, site.lat, site.lon, depthRadiusMiles, {
                  wellsInRadius: inDepthRadius,
                }),
              );
              setInsightsLoading(false);
              setWellsProgress(null);
            })
            .catch((e: Error) => {
              setWellsError(e.message);
              setInsightsLoading(false);
              setWellsProgress(null);
            });
        })
        .catch((e: Error) => {
          setWellsError(e.message);
          setWellsStatus(null);
          setWellsProgress(null);
          setInsightsLoading(false);
        });
    },
    [radiusMiles, depthRadiusMiles],
  );

  /** API-first: nearby wells + area insights; full registry only on 503 fallback. */
  useEffect(() => {
    if (!center) return;
    const ac = new AbortController();
    const fetchRadius = Math.max(radiusMiles, depthRadiusMiles);
    setWellsStatus("Loading nearby wells…");
    setInsightsLoading(true);
    setWellsError(null);
    setWellsProgress(null);
    fallbackAttemptedRef.current = false;

    const wellsUrl = `/api/wells-nearby?lat=${encodeURIComponent(String(center.lat))}&lon=${encodeURIComponent(String(center.lon))}&radius=${encodeURIComponent(String(fetchRadius))}&limit=800`;
    const insightsUrl = `/api/area-insights?lat=${encodeURIComponent(String(center.lat))}&lon=${encodeURIComponent(String(center.lon))}&radius=${encodeURIComponent(String(radiusMiles))}`;
    const depthInsightsUrl = `/api/area-insights?lat=${encodeURIComponent(String(center.lat))}&lon=${encodeURIComponent(String(center.lon))}&radius=${encodeURIComponent(String(depthRadiusMiles))}`;

    void (async () => {
      try {
        const fetches: Promise<Response>[] = [
          fetch(wellsUrl, { signal: ac.signal }),
          fetch(insightsUrl, { signal: ac.signal }),
        ];
        if (depthRadiusMiles !== radiusMiles) {
          fetches.push(fetch(depthInsightsUrl, { signal: ac.signal }));
        }

        const [wellsRes, insightsRes, depthInsightsRes] = await Promise.all(
          fetches,
        );

        const isServerDown = (r: Response) =>
          r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504;

        // If wells-nearby is down, full fallback to client chunk loading.
        if (isServerDown(wellsRes)) {
          const errBody = (await wellsRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setWellsError(
            typeof errBody.error === "string"
              ? errBody.error
              : "Server well data unavailable — loading registry on device…",
          );
          setInsightsLoading(false);
          loadWellsFallback(center);
          return;
        }

        if (!wellsRes.ok) {
          throw new Error(
            `Wells request failed (${wellsRes.status} ${wellsRes.statusText})`,
          );
        }

        // Wells API succeeded — render map immediately with API wells.
        const wells = (await wellsRes.json()) as WellRecord[];
        if (ac.signal.aborted) return;
        setAreaWells(Array.isArray(wells) ? wells : []);
        setWellsStatus(null);
        setWellsError(null);

        // If area-insights is down (common on cold start — needs full chunks),
        // compute insights client-side from base + litho chunks.
        if (isServerDown(insightsRes)) {
          setInsightsLoading(true);
          void getDnrWellsFullCached(undefined, (p) => {
            setWellsProgress(p);
          })
            .then((fullWells) => {
              if (ac.signal.aborted) return;
              const inRadius = wellsWithinRadiusIndexed(
                fullWells,
                center.lat,
                center.lon,
                radiusMiles,
              );
              const inDepthRadius = wellsWithinRadiusIndexed(
                fullWells,
                center.lat,
                center.lon,
                depthRadiusMiles,
              );
              setAreaInsights(
                computeAreaInsights(fullWells, center.lat, center.lon, radiusMiles, {
                  wellsInRadius: inRadius,
                }),
              );
              setAreaInsightsForDepth(
                computeAreaInsights(fullWells, center.lat, center.lon, depthRadiusMiles, {
                  wellsInRadius: inDepthRadius,
                }),
              );
              setInsightsLoading(false);
              setWellsProgress(null);
            })
            .catch((e: Error) => {
              if (ac.signal.aborted) return;
              setWellsError(e.message);
              setInsightsLoading(false);
              setWellsProgress(null);
            });
          return;
        }

        if (!insightsRes.ok) {
          throw new Error(
            `Insights request failed (${insightsRes.status} ${insightsRes.statusText})`,
          );
        }

        const insights = (await insightsRes.json()) as AreaInsightsReport;
        let depthInsights: AreaInsightsReport | null = insights;
        if (depthRadiusMiles !== radiusMiles && depthInsightsRes) {
          if (!depthInsightsRes.ok) {
            // Depth insights are secondary — keep primary wells if we have them.
            depthInsights = insights;
          } else {
            depthInsights = (await depthInsightsRes.json()) as AreaInsightsReport;
          }
        }

        if (ac.signal.aborted) return;
        setAreaInsights(insights);
        setAreaInsightsForDepth(depthInsights);
        setWellsStatus(null);
        setWellsError(null);
      } catch (e) {
        if (ac.signal.aborted) return;
        setWellsError(
          e instanceof Error
            ? e.message
            : "Failed to load nearby wells — trying local registry…",
        );
        // Network hang/abort path: still try client chunk load for any jobsite.
        loadWellsFallback(center);
        setWellsStatus(null);
      } finally {
        if (!ac.signal.aborted) setInsightsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [center, radiusMiles, depthRadiusMiles, loadWellsFallback]);

  const wellsWithLithology = useMemo(
    () => mergeLithologyIntoWells(areaWells, lithoRows),
    [areaWells, lithoRows],
  );

  const wellsInRadius = useMemo(() => {
    if (!center) return [];
    return wellsWithinRadiusIndexed(
      wellsWithLithology,
      center.lat,
      center.lon,
      radiusMiles,
    );
  }, [wellsWithLithology, center, radiusMiles]);

  const wellsMatchingMapFilters = useMemo(
    () => wellsInRadius.filter((w) => wellPassesHubViewerFilters(w, mapFilters)),
    [wellsInRadius, mapFilters],
  );

  const wellsInDepthRadius = useMemo(() => {
    if (!center) return [];
    return wellsWithinRadiusIndexed(
      wellsWithLithology,
      center.lat,
      center.lon,
      depthRadiusMiles,
    );
  }, [wellsWithLithology, center, depthRadiusMiles]);

  const wellsMatchingDepthFilters = useMemo(
    () =>
      wellsInDepthRadius.filter((w) => wellPassesHubViewerFilters(w, mapFilters)),
    [wellsInDepthRadius, mapFilters],
  );

  const nearestWellsForElev = useMemo(
    () =>
      center
        ? nearestWells(wellsInRadius, center.lat, center.lon, WORKSPACE_WELL_LIMIT)
        : [],
    [wellsInRadius, center],
  );

  const selectedWellKey = detailWell ? wellDemKey(detailWell) : null;

  const mapWellsByDepth = useMemo(
    () => shallowestWellsByDepth(wellsMatchingMapFilters, WORKSPACE_WELL_LIMIT),
    [wellsMatchingMapFilters],
  );

  const depthViewWellsByDepth = useMemo(
    () =>
      shallowestWellsByDepth(wellsMatchingDepthFilters, WORKSPACE_WELL_LIMIT),
    [wellsMatchingDepthFilters],
  );

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
    setLithoRows([]);
    lithoHydrateKeyRef.current = null;
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
        const data = await fetchJson<{ elevationsFt?: (number | null)[] }>(
          "/api/elevation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locations }),
          },
        );
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

  /**
   * `/api/wells-nearby` serves base chunks without lithology, so the ASL view
   * hydrates logs for the depth radius from the lithology-bearing endpoint.
   */
  useEffect(() => {
    if (workspaceView !== "asl" || !center) return;
    const hydrateKey = `${center.lat},${center.lon},${depthRadiusMiles}`;
    if (lithoHydrateKeyRef.current === hydrateKey) return;
    lithoHydrateKeyRef.current = hydrateKey;

    const ac = new AbortController();
    const url = `/api/wells-nearby?lat=${encodeURIComponent(String(center.lat))}&lon=${encodeURIComponent(String(center.lon))}&radius=${encodeURIComponent(String(depthRadiusMiles))}&limit=${MAX_WELLS_NEARBY_LITHOLOGY_LIMIT}&lithology=1`;

    void (async () => {
      try {
        const rows = await fetchJson<WellRecord[]>(url, { signal: ac.signal });
        if (ac.signal.aborted || !Array.isArray(rows)) return;
        setLithoRows(rows);
      } catch {
        // Lithology stays unavailable; the ASL panel shows its own empty state.
        if (!ac.signal.aborted) lithoHydrateKeyRef.current = null;
      }
    })();

    return () => ac.abort();
  }, [workspaceView, center, depthRadiusMiles]);

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
    // Preserve scroll while the map section mounts — iOS was jumping to top.
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    setCenter({ lat: site.lat, lon: site.lon });
    setDispatchContext({
      title: site.title,
      feetOffDrive: site.distanceOffDriveFt,
    });
    setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
    const cached = loadDispatchSession();
    if (cached?.raw) {
      saveDispatchSession({
        raw: cached.raw,
        lat: site.lat,
        lon: site.lon,
        title: site.title,
        feetOffDrive: site.distanceOffDriveFt,
      });
    }
    // After React paints the map block, restore scroll (or nudge to map if at top).
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const mapHeading = document.getElementById("drill-map-h");
          if (y > 80) {
            window.scrollTo(0, y);
          } else if (mapHeading) {
            mapHeading.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });
    }
  }, []);

  const handleDispatchParsed = useCallback((parsed: DispatchParseResult) => {
    setLastParsedDispatch(parsed);
    setGeocodeError(null);
  }, []);

  const handleClearSavedDispatch = useCallback(() => {
    clearDispatchSession();
    setCenter(null);
    setDispatchContext(null);
    setDispatchHydrate(null);
    setLastParsedDispatch(null);
    setAreaWells([]);
    setAreaInsights(null);
    setAreaInsightsForDepth(null);
    setGeocodeError(null);
    sharedJobLoadedRef.current = false;
  }, []);

  /** Address parsed but no GPS in the paste — offer server-side geocoding. */
  const geocodableAddress =
    !center &&
    lastParsedDispatch?.locationSource === "address_only" &&
    lastParsedDispatch.address
      ? lastParsedDispatch.address
      : null;

  const geocodeDispatchAddress = useCallback(async () => {
    if (!geocodableAddress) return;
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const data = await fetchJson<{
        results?: { lat: number; lon: number; label: string }[];
      }>(`/api/geocode?q=${encodeURIComponent(geocodableAddress)}`);
      const hit = data.results?.find(
        (r) => Number.isFinite(r.lat) && Number.isFinite(r.lon),
      );
      if (!hit) {
        throw new Error(
          "No geocoder match for that address. Try simplifying it or paste GPS coordinates.",
        );
      }
      setCenter({ lat: hit.lat, lon: hit.lon });
      const title =
        lastParsedDispatch?.title ?? lastParsedDispatch?.address ?? hit.label;
      setDispatchContext({
        title,
        feetOffDrive: undefined,
      });
      setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
      const cached = loadDispatchSession();
      if (cached?.raw) {
        saveDispatchSession({
          raw: cached.raw,
          lat: hit.lat,
          lon: hit.lon,
          title,
        });
      }
    } catch (e) {
      setGeocodeError(
        e instanceof Error ? e.message : "Geocoding failed — try again.",
      );
    } finally {
      setGeocoding(false);
    }
  }, [geocodableAddress, lastParsedDispatch]);

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
        onParsed={handleDispatchParsed}
        jobsiteCoords={center}
        feetOffDrive={dispatchContext?.feetOffDrive}
        initialRaw={dispatchHydrate?.raw}
        initialParsed={dispatchHydrate?.parsed ?? null}
        onClearSaved={handleClearSavedDispatch}
      />

      {center && wellsProgress && wellsProgress.total > 0 ? (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-[var(--muted)]">
            <span>
              Loading registry chunks — {wellsProgress.done} /{" "}
              {wellsProgress.total}
            </span>
            <span className="tabular-nums">
              {wellsProgress.wellsLoaded.toLocaleString()} wells so far
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]"
            role="progressbar"
            aria-label="Registry chunk loading progress"
            aria-valuemin={0}
            aria-valuemax={wellsProgress.total}
            aria-valuenow={wellsProgress.done}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-500"
              style={{
                width: `${Math.round((100 * wellsProgress.done) / wellsProgress.total)}%`,
              }}
            />
          </div>
        </div>
      ) : center && wellsStatus ? (
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
                              // Dead center of the 2 mi radius circle = dispatch GPS.
                              // (Was never wired before — pin + lat/lon line never showed.)
                              jobsiteLocation={{
                                lat: center.lat,
                                lon: center.lon,
                                accuracyM: null,
                                sourceLabel:
                                  dispatchContext?.title?.trim() ||
                                  "Dispatch GPS / coordinates",
                              }}
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
                            center={center}
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
                    report={areaInsights}
                    loading={insightsLoading && !areaInsights}
                    error={wellsError}
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
        <section
          className="card space-y-4 rounded-xl border border-dashed border-[var(--border)] p-6"
          aria-labelledby="field-onboarding-h"
        >
          <h2
            id="field-onboarding-h"
            className="text-base font-semibold text-[var(--foreground)]"
          >
            Get the field map started
          </h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--muted)]">
            <li>
              <strong className="text-[var(--foreground)]">
                Paste dispatch text
              </strong>{" "}
              (email body with an address and/or GPS coordinates) into the box
              above.
            </li>
            <li>
              <strong className="text-[var(--foreground)]">
                Tap “Generate job brief”
              </strong>{" "}
              — we pull out the location, contact, and rig-path details.
            </li>
            <li>
              <strong className="text-[var(--foreground)]">
                Map unlocks automatically
              </strong>{" "}
              with nearby DNR registry wells, weather, and area drilling
              analysis once a jobsite location is known.
            </li>
          </ol>
          {geocodableAddress ? (
            <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="text-sm text-emerald-950 dark:text-emerald-100">
                We found an address but no GPS coordinates in the paste:
                <br />
                <strong>{geocodableAddress}</strong>
              </p>
              <button
                type="button"
                onClick={() => void geocodeDispatchAddress()}
                disabled={geocoding}
                className="btn-primary disabled:opacity-50"
              >
                {geocoding ? "Geocoding…" : "Geocode address"}
              </button>
              {geocodeError ? (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {geocodeError}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
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
