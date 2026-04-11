"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaInsightsPanel } from "@/components/AreaInsightsPanel";
import { SectionMoveControls } from "@/components/SectionMoveControls";
import { JobWeatherPanel } from "@/components/scheduling/JobWeatherPanel";
import {
  haversineMiles,
  wellsWithinRadius,
  type WellRecord,
} from "@/lib/area-well-analytics";
import {
  appendDrillerJobEntry,
  loadDrillerJob,
  saveDrillerJob,
  type CjDrillerJobEntry,
} from "@/lib/cj-driller-job";
import {
  DEMO_DRILLER_SESSION_LEAD,
  findDemoJobById,
  getDemoDrillerUpcomingJobs,
} from "@/lib/driller-demo-session";
import { getDnrWellsCached } from "@/lib/dnr-wells-cache";
import { wellRecordToDrillerEntry } from "@/lib/drilling-well-entry";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import { countiesLabel, deriveDrillerSite } from "@/lib/driller-job-site";
import { formatShortDate, type DrillJob } from "@/lib/scheduling-data";
import { syntheticDrillJobForWeather } from "@/lib/synthetic-drill-job";
import {
  DEFAULT_VIEWER_MAP_FILTERS,
  type ViewerMapFilters,
  wellPassesHubViewerFilters,
} from "@/lib/viewer-well-map";
import { FieldDispatchPanel } from "./FieldDispatchPanel";
import { DrillingViewerMapFilters } from "./DrillingViewerMapFilters";
import { NearestWellsStrip } from "./NearestWellsStrip";
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

function snapSummary(s: CjDrillerJobEntry["snap"]): string {
  const parts: string[] = [];
  if (s.county) parts.push(String(s.county));
  if (s.depth != null) parts.push(`${s.depth} ft`);
  if (s.owner) parts.push(String(s.owner).slice(0, 48));
  return parts.length ? parts.join(" · ") : "Registry snapshot";
}

function statusLabel(s: DrillJob["status"]): string {
  switch (s) {
    case "planned":
      return "Planned";
    case "en_route":
      return "En route";
    case "on_site":
      return "On site";
    case "complete":
      return "Complete";
    default:
      return s;
  }
}

function wellDemKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}

const RADIUS_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5] as const;
type RadiusMilesChoice = (typeof RADIUS_OPTIONS)[number];
const LS_RADIUS_MILES = "driller-hub-radius-miles-v1";
const LS_FIELD_SECTION_ORDER = "driller-field-section-order-v1";
type FieldSectionId = "map" | "weather" | "insights" | "queue";
const DEFAULT_FIELD_ORDER: FieldSectionId[] = [
  "map",
  "weather",
  "insights",
  "queue",
];

function isRadiusChoice(n: number): n is RadiusMilesChoice {
  return (RADIUS_OPTIONS as readonly number[]).includes(n);
}

function readStoredRadiusMiles(): RadiusMilesChoice | null {
  if (typeof window === "undefined") return null;
  const v = parseFloat(localStorage.getItem(LS_RADIUS_MILES) ?? "");
  return isRadiusChoice(v) ? v : null;
}

function readStoredFieldOrder(): FieldSectionId[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_FIELD_SECTION_ORDER);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!Array.isArray(o) || o.length !== 4) return null;
    const allowed: FieldSectionId[] = [
      "map",
      "weather",
      "insights",
      "queue",
    ];
    const next = o.filter((x): x is FieldSectionId =>
      allowed.includes(x),
    );
    if (next.length !== 4 || new Set(next).size !== 4) return null;
    return next;
  } catch {
    return null;
  }
}

/** Short label for the map heading (uppercase mi). */
function formatRadiusHeading(mi: number): string {
  if (mi === 0.25) return "¼ MI";
  if (mi === 0.5) return "½ MI";
  if (mi === 1.5) return "1½ MI";
  return `${mi} MI`;
}

function formatRadiusSelectLabel(mi: number): string {
  if (mi === 0.25) return "¼ mile";
  if (mi === 0.5) return "½ mile";
  if (mi === 1.5) return "1½ miles";
  return `${mi} miles`;
}

/** Title / sentence text (e.g. "2 mi", "¼ mi"). */
function formatRadiusMiShort(mi: number): string {
  if (mi === 0.25) return "¼ mi";
  if (mi === 0.5) return "½ mi";
  if (mi === 1.5) return "1½ mi";
  return `${mi} mi`;
}

function isValidJobsiteCoord(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat === 0 && lon === 0) return false;
  return true;
}

/** Used only when no usable lat/lon — Nominatim query (Indiana bias in API). */
function buildJobsiteGeocodeQuery(
  job: DrillJob | null,
  entries: CjDrillerJobEntry[],
): string | null {
  if (job) {
    const title = String(job.title ?? "").trim();
    const county = String(job.county ?? "").trim();
    const parts = [title || null, county ? `${county} County` : null].filter(
      Boolean,
    ) as string[];
    if (parts.length) return parts.join(", ");
  }
  if (entries.length > 0) {
    const e0 = entries[0]!;
    const county = String(e0.snap.county ?? "").trim();
    const owner = String(e0.snap.owner ?? "").trim();
    const parts = [owner || null, county ? `${county} County` : null].filter(
      Boolean,
    ) as string[];
    if (parts.length) return parts.join(", ");
  }
  return null;
}

export function DrillingHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const myUpcomingJobs = useMemo(() => getDemoDrillerUpcomingJobs(), []);

  const [selectedScheduleJob, setSelectedScheduleJob] =
    useState<DrillJob | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [radiusMiles, setRadiusMiles] = useState<RadiusMilesChoice>(
    DEFAULT_AREA_RADIUS_MILES as RadiusMilesChoice,
  );
  const [sectionOrder, setSectionOrder] = useState<FieldSectionId[]>([
    ...DEFAULT_FIELD_ORDER,
  ]);

  const [mapFilters, setMapFilters] = useState<ViewerMapFilters>(
    DEFAULT_VIEWER_MAP_FILTERS,
  );
  const [detailWell, setDetailWell] = useState<WellRecord | null>(null);

  const [allWells, setAllWells] = useState<WellRecord[]>([]);
  const [wellsStatus, setWellsStatus] = useState<string | null>(null);
  const [wellsError, setWellsError] = useState<string | null>(null);

  const [entries, setEntries] = useState<CjDrillerJobEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [demRefGroundElevFt, setDemRefGroundElevFt] = useState<number | null>(
    null,
  );
  const [demGroundElevFtByKey, setDemGroundElevFtByKey] = useState<
    Map<string, number> | null
  >(null);
  const [elevLoading, setElevLoading] = useState(false);
  const [elevError, setElevError] = useState<string | null>(null);

  const [jobsiteLocation, setJobsiteLocation] = useState<{
    lat: number;
    lon: number;
    accuracyM: number | null;
    sourceLabel?: string;
  } | null>(null);
  const [jobsiteLoading, setJobsiteLoading] = useState(false);
  const [jobsiteErr, setJobsiteErr] = useState<string | null>(null);

  const defaultingRef = useRef(false);

  const reloadJob = useCallback(() => {
    setEntries(loadDrillerJob());
  }, []);

  useEffect(() => {
    reloadJob();
    window.addEventListener("focus", reloadJob);
    return () => window.removeEventListener("focus", reloadJob);
  }, [reloadJob]);

  useEffect(() => {
    const r = readStoredRadiusMiles();
    if (r != null) setRadiusMiles(r);
    const ord = readStoredFieldOrder();
    if (ord) setSectionOrder(ord);
  }, []);

  const onRadiusSelect = useCallback((value: string) => {
    const n = parseFloat(value);
    if (!isRadiusChoice(n)) return;
    setRadiusMiles(n);
    localStorage.setItem(LS_RADIUS_MILES, String(n));
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

  const replaceDrillingUrl = useCallback(
    (lat: number, lon: number, jobId: string | null) => {
      const q = new URLSearchParams();
      q.set("lat", String(lat));
      q.set("lon", String(lon));
      if (jobId) q.set("job", jobId);
      router.replace(`/?${q}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const la = searchParams.get("lat");
    const lo = searchParams.get("lon");
    const jobId = searchParams.get("job");

    if (la != null && lo != null && la !== "" && lo !== "") {
      const lat = parseFloat(la);
      const lon = parseFloat(lo);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setCenter({ lat, lon });
        setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
        if (jobId) {
          const j = findDemoJobById(jobId);
          setSelectedScheduleJob(j ?? null);
        } else {
          const match = myUpcomingJobs.find(
            (j) =>
              Math.abs(j.lat - lat) < 1e-5 && Math.abs(j.lon - lon) < 1e-5,
          );
          setSelectedScheduleJob(match ?? null);
        }
      }
      return;
    }

    if (jobId) {
      const j = findDemoJobById(jobId);
      if (j) {
        setSelectedScheduleJob(j);
        setCenter({ lat: j.lat, lon: j.lon });
        setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
        replaceDrillingUrl(j.lat, j.lon, j.id);
      }
      return;
    }

    if (!defaultingRef.current && myUpcomingJobs.length > 0) {
      defaultingRef.current = true;
      const first = myUpcomingJobs[0]!;
      setSelectedScheduleJob(first);
      setCenter({ lat: first.lat, lon: first.lon });
      setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
      replaceDrillingUrl(first.lat, first.lon, first.id);
    }
  }, [searchParams, myUpcomingJobs, replaceDrillingUrl]);

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
    if (!center) return [];
    return wellsWithinRadius(allWells, center.lat, center.lon, radiusMiles);
  }, [allWells, center, radiusMiles]);

  const wellsMatchingMapFilters = useMemo(
    () => wellsInRadius.filter((w) => wellPassesHubViewerFilters(w, mapFilters)),
    [wellsInRadius, mapFilters],
  );

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

  useEffect(() => {
    setDemRefGroundElevFt(null);
    setDemGroundElevFtByKey(null);
    setElevError(null);
  }, [center?.lat, center?.lon]);

  const fetchGroundElevations = useCallback(async () => {
    if (!center) return;
    setElevLoading(true);
    setElevError(null);
    const locations = [
      { lat: center.lat, lon: center.lon },
      ...nearestWellsForElev.map((w) => ({
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
      const next = new Map<string, number>();
      nearestWellsForElev.forEach((w, i) => {
        const ft = arr[i + 1];
        if (ft != null) next.set(wellDemKey(w), ft);
      });
      setDemRefGroundElevFt(refFt);
      setDemGroundElevFtByKey(next.size ? next : null);
    } catch (e) {
      setElevError(
        e instanceof Error ? e.message : "Elevation lookup failed",
      );
      setDemRefGroundElevFt(null);
      setDemGroundElevFtByKey(null);
    } finally {
      setElevLoading(false);
    }
  }, [center, nearestWellsForElev]);

  const siteFromQueue = useMemo(() => deriveDrillerSite(entries), [entries]);

  const requestJobsiteLocation = useCallback(async () => {
    setJobsiteLoading(true);
    setJobsiteErr(null);
    try {
      if (
        selectedScheduleJob &&
        isValidJobsiteCoord(
          selectedScheduleJob.lat,
          selectedScheduleJob.lon,
        )
      ) {
        setJobsiteLocation({
          lat: selectedScheduleJob.lat,
          lon: selectedScheduleJob.lon,
          accuracyM: null,
          sourceLabel: "Scheduled job (lat / lon)",
        });
        return;
      }

      if (
        siteFromQueue &&
        isValidJobsiteCoord(siteFromQueue.lat, siteFromQueue.lon)
      ) {
        setJobsiteLocation({
          lat: siteFromQueue.lat,
          lon: siteFromQueue.lon,
          accuracyM: null,
          sourceLabel:
            siteFromQueue.source === "centroid"
              ? "Job queue — centroid of well coordinates"
              : "Job queue — well coordinates",
        });
        return;
      }

      if (center && isValidJobsiteCoord(center.lat, center.lon)) {
        setJobsiteLocation({
          lat: center.lat,
          lon: center.lon,
          accuracyM: null,
          sourceLabel: "Map center (reference coordinates)",
        });
        return;
      }

      const geoQ = buildJobsiteGeocodeQuery(selectedScheduleJob, entries);
      if (!geoQ || geoQ.length < 3) {
        setJobsiteErr(
          "No jobsite coordinates or address to look up — pick a scheduled job, add wells to the queue, or set the map center.",
        );
        setJobsiteLocation(null);
        return;
      }

      const res = await fetch(
        `/api/geocode?${new URLSearchParams({ q: geoQ })}`,
      );
      const data = (await res.json()) as {
        results?: { lat: number; lon: number }[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : res.statusText,
        );
      }
      const first = data.results?.[0];
      if (
        !first ||
        !isValidJobsiteCoord(first.lat, first.lon)
      ) {
        setJobsiteErr(
          "Address search returned no coordinates — try a more specific jobsite (job title + county, or queue with county).",
        );
        setJobsiteLocation(null);
        return;
      }

      const shortQ =
        geoQ.length > 90 ? `${geoQ.slice(0, 90)}…` : geoQ;
      setJobsiteLocation({
        lat: first.lat,
        lon: first.lon,
        accuracyM: null,
        sourceLabel: `Geocoded from: ${shortQ}`,
      });
    } catch (e) {
      setJobsiteErr(
        e instanceof Error ? e.message : "Jobsite lookup failed",
      );
      setJobsiteLocation(null);
    } finally {
      setJobsiteLoading(false);
    }
  }, [selectedScheduleJob, siteFromQueue, center, entries]);

  const clearJobsiteLocation = useCallback(() => {
    setJobsiteLocation(null);
    setJobsiteErr(null);
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

  const weatherJob = useMemo((): DrillJob | null => {
    if (selectedScheduleJob) return selectedScheduleJob;
    const c = center ?? siteFromQueue;
    if (!c) return null;
    return syntheticDrillJobForWeather({
      lat: c.lat,
      lon: c.lon,
      title: center
        ? `Ad hoc site (${center.lat.toFixed(4)}, ${center.lon.toFixed(4)})`
        : `Well queue — ${entries.length} well(s)`,
      county: center ? "" : countiesLabel(entries),
    });
  }, [selectedScheduleJob, center, siteFromQueue, entries]);

  const selectScheduleJob = (job: DrillJob) => {
    setSelectedScheduleJob(job);
    setCenter({ lat: job.lat, lon: job.lon });
    setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
    replaceDrillingUrl(job.lat, job.lon, job.id);
  };

  const applyAdHocCenter = useCallback(
    (lat: number, lon: number) => {
      setSelectedScheduleJob(null);
      setCenter({ lat, lon });
      setMapFilters({ ...DEFAULT_VIEWER_MAP_FILTERS });
      replaceDrillingUrl(lat, lon, null);
    },
    [replaceDrillingUrl],
  );

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
    reloadJob();
    setToast(`Added ${entry.wellId}`);
    setTimeout(() => setToast(null), 2500);
  };

  const updateNotes = useCallback((wellId: string, notes: string) => {
    const next = loadDrillerJob().map((e) =>
      e.wellId === wellId ? { ...e, notes } : e,
    );
    saveDrillerJob(next);
    setEntries(next);
  }, []);

  const removeOne = useCallback((wellId: string) => {
    const next = loadDrillerJob().filter((e) => e.wellId !== wellId);
    saveDrillerJob(next);
    setEntries(next);
  }, []);

  const queueListBody = useMemo(() => {
    if (!entries.length) {
      return (
        <p className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
          No wells in the queue yet. Click map markers to add registry wells
          for note-taking.
        </p>
      );
    }
    return (
      <ul className="mt-3 space-y-4">
        {entries.map((e) => (
          <li
            key={e.wellId}
            className="card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--accent)]">
                  {e.wellId}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {snapSummary(e.snap)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {e.snap.lat != null &&
                  e.snap.lon != null &&
                  Number.isFinite(Number(e.snap.lat)) &&
                  Number.isFinite(Number(e.snap.lon)) && (
                    <button
                      type="button"
                      onClick={() =>
                        applyAdHocCenter(
                          Number(e.snap.lat),
                          Number(e.snap.lon),
                        )
                      }
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
                    >
                      Center map
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => removeOne(e.wellId)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
            <label className="mt-3 block text-xs font-medium text-[var(--muted)]">
              Notes (this well only)
            </label>
            <textarea
              className="input-field mt-1 min-h-[5rem] resize-y text-sm"
              value={e.notes}
              onChange={(ev) => updateNotes(e.wellId, ev.target.value)}
            />
          </li>
        ))}
      </ul>
    );
  }, [entries, applyAdHocCenter, updateNotes, removeOne]);

  return (
    <div className="field-hub-scope space-y-8">
      <FieldDispatchPanel onApplyToFieldMap={applyAdHocCenter} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Field workspace
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Demo session: you&apos;re signed in as{" "}
          <strong className="text-[var(--foreground)]">
            {DEMO_DRILLER_SESSION_LEAD}
          </strong>
          . Open a scheduled job to load the map, weather, registry-backed area
          analysis (with mock prep hints), and your well queue—same flow we&apos;ll
          tie to accounts later. Use <strong>Up</strong> / <strong>Down</strong> on
          each panel to reorder; your radius and layout persist on this device.
        </p>
      </div>

      <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="jobs-drill-h">
        <h2
          id="jobs-drill-h"
          className="text-lg font-semibold text-[var(--foreground)]"
        >
          Jobs to be drilled
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Upcoming and in-progress work assigned to you (from the same demo
          schedule as{" "}
          <Link href="/scheduling" className="text-[var(--accent)] underline">
            Office
          </Link>
          ). Select one to open the full workspace.
        </p>
        {myUpcomingJobs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No upcoming demo jobs for this lead. Add jobs from{" "}
            <Link href="/scheduling" className="text-[var(--accent)] underline">
              Office
            </Link>{" "}
            demo seeds, or use <strong>Center map</strong> on a queued well when
            you have coordinates saved.
          </p>
        ) : (
          <ul className="space-y-2">
            {myUpcomingJobs.map((job) => {
              const active = selectedScheduleJob?.id === job.id;
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => selectScheduleJob(job)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? "border-[var(--accent)] bg-[var(--surface-solid)] shadow-sm"
                        : "border-[var(--border)] bg-[var(--surface-muted)]/80 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-solid)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--foreground)]">
                        {job.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          job.status === "en_route"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100"
                            : job.status === "on_site"
                              ? "bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100"
                              : "bg-[var(--surface-muted)] text-[var(--foreground)]"
                        }`}
                      >
                        {statusLabel(job.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatShortDate(job.date)} · {job.county} · {job.rig} ·{" "}
                      {job.lead}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {wellsStatus ? (
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
                        Map ({formatRadiusHeading(radiusMiles)})
                        {selectedScheduleJob ? (
                          <span className="ml-2 font-normal normal-case text-[var(--foreground)]">
                            · {selectedScheduleJob.title}
                          </span>
                        ) : null}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <span>Radius</span>
                          <select
                            value={String(radiusMiles)}
                            onChange={(e) => onRadiusSelect(e.target.value)}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-1 text-xs font-medium text-[var(--foreground)] shadow-sm"
                            aria-label="Registry search radius"
                          >
                            {RADIUS_OPTIONS.map((r) => (
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
                    <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                      <div className="card w-full max-w-md justify-self-start p-3 lg:col-span-4">
                        <DrillingViewerMapFilters
                          value={mapFilters}
                          onChange={setMapFilters}
                        />
                      </div>
                      <div className="min-w-0 space-y-2 lg:col-span-8">
                        <p className="text-xs text-[var(--muted)]">
                          {wellsInRadius.length.toLocaleString()} wells in radius ·{" "}
                          {wellsMatchingMapFilters.length.toLocaleString()} match
                          current filters
                          {wellsMatchingMapFilters.length > 800
                            ? " · showing up to 800 markers on the map"
                            : ""}
                          . Markers and chips match the standalone well viewer
                          (depth, g/r tags, combo rows for ASL/GPM when those
                          toggles are on). Click a marker for the full detail
                          panel; use <strong>Add to job queue</strong> there or
                          from the popup.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void fetchGroundElevations()}
                            disabled={elevLoading}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600"
                          >
                            {elevLoading
                              ? "Fetching elevations…"
                              : "Get ground elevations (DEM)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestJobsiteLocation()}
                            disabled={jobsiteLoading}
                            className="rounded-lg border border-amber-600 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/80 dark:bg-amber-950/40 dark:text-amber-100"
                          >
                            {jobsiteLoading
                              ? "Resolving jobsite…"
                              : "Use jobsite location"}
                          </button>
                          {jobsiteLocation ? (
                            <button
                              type="button"
                              onClick={clearJobsiteLocation}
                              className="btn-secondary px-2.5 py-1.5 text-xs"
                            >
                              Clear location
                            </button>
                          ) : null}
                          <span className="max-w-xl text-xs text-[var(--muted)]">
                            OpenTopoData SRTM90m, then Open-Elevation fallback.
                            Uses map center plus up to 25 nearest wells; DEM
                            surface is merged into wells missing registry ground
                            elevation for ASL filters.{" "}
                            <strong>Use jobsite location</strong> plots the
                            jobsite using <strong>scheduled job lat/lon</strong>{" "}
                            first, then <strong>well-queue coordinates</strong>,
                            then <strong>map center</strong>, and only if those
                            are missing it <strong>geocodes</strong> the job
                            title + county (or queue owner + county). It does{" "}
                            <strong>not</strong> use your phone GPS.
                          </span>
                        </div>
                        {jobsiteErr ? (
                          <p
                            className="text-sm text-red-600 dark:text-red-400"
                            role="alert"
                          >
                            {jobsiteErr}
                          </p>
                        ) : null}
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
                                <strong>Reference ground (map center):</strong>{" "}
                                {demRefGroundElevFt} ft (DEM)
                              </p>
                            ) : (
                              <p>
                                Center DEM missing; well rows below still show
                                surface where returned.
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
                                        <td className="py-1 pr-2">{r.wellFt}</td>
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
                                  Δ is well minus reference (positive = well
                                  higher than center).
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
                          jobsiteLocation={jobsiteLocation}
                          jobPinLabel={
                            selectedScheduleJob?.title ??
                            (entries.length
                              ? "Well queue / map center"
                              : "Map center")
                          }
                        />
                        <div className="mt-3">
                          <NearestWellsStrip
                            wells={nearestWellsForElev}
                            onSelectWell={setDetailWell}
                            demElevFtByKey={demGroundElevFtByKey}
                            refElevFt={demRefGroundElevFt}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                );
              case "weather":
                return weatherJob ? (
                  <JobWeatherPanel
                    key="weather"
                    job={weatherJob}
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
              case "queue":
                return (
                  <section key="queue" aria-labelledby="drill-queue-h">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2
                        id="drill-queue-h"
                        className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
                      >
                        Well queue (local)
                      </h2>
                      <SectionMoveControls
                        id="queue"
                        order={sectionOrder}
                        onMove={moveFieldSection}
                      />
                    </div>
                    {queueListBody}
                  </section>
                );
              default:
                return null;
            }
          })}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
          Pick a job above to load the map, weather, and area analysis.
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

      {!center ? (
        <section aria-labelledby="drill-queue-h">
          <h2
            id="drill-queue-h"
            className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            Well queue (local)
          </h2>
          {queueListBody}
        </section>
      ) : null}

      <p className="text-xs text-[var(--muted)]">
        <Link href="/scheduling" className="text-[var(--accent)] underline">
          ← Office
        </Link>
      </p>
    </div>
  );
}
