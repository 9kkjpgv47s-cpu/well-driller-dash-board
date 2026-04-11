"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WellRecord } from "@/lib/area-well-analytics";
import { AreaInsightsPanel } from "@/components/AreaInsightsPanel";
import { DrillerFieldPrepPanel } from "@/components/DrillerFieldPrepPanel";
import { SectionMoveControls } from "@/components/SectionMoveControls";
import { JobWeatherPanel } from "@/components/scheduling/JobWeatherPanel";
import {
  appendDrillerJobEntry,
  type CjDrillerJobEntry,
  loadDrillerJob,
  saveDrillerJob,
} from "@/lib/cj-driller-job";
import { wellRecordToDrillerEntry } from "@/lib/drilling-well-entry";
import { HubNativeWellMapWorkspace } from "@/components/drilling/HubNativeWellMapWorkspace";
import { DEFAULT_AREA_RADIUS_MILES } from "@/lib/hub-area-defaults";
import { countiesLabel, deriveDrillerSite } from "@/lib/driller-job-site";
import { syntheticDrillJobForWeather } from "@/lib/synthetic-drill-job";

type DrillerWorkspaceSectionId =
  | "prep"
  | "weather"
  | "insights"
  | "viewer";

const DEFAULT_DRILLER_WORKSPACE_ORDER: DrillerWorkspaceSectionId[] = [
  "prep",
  "weather",
  "insights",
  "viewer",
];

const LS_DRILLER_WORKSPACE_ORDER = "driller-job-workspace-section-order-v1";

function readStoredDrillerWorkspaceOrder(): DrillerWorkspaceSectionId[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_DRILLER_WORKSPACE_ORDER);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!Array.isArray(o) || o.length !== 4) return null;
    const allowed: DrillerWorkspaceSectionId[] = [
      "prep",
      "weather",
      "insights",
      "viewer",
    ];
    const next = o.filter((x): x is DrillerWorkspaceSectionId =>
      allowed.includes(x),
    );
    if (next.length !== 4 || new Set(next).size !== 4) return null;
    return next;
  } catch {
    return null;
  }
}

function snapSummary(s: CjDrillerJobEntry["snap"]): string {
  const parts: string[] = [];
  if (s.county) parts.push(String(s.county));
  if (s.depth != null) parts.push(`${s.depth} ft`);
  if (s.owner) parts.push(String(s.owner).slice(0, 48));
  return parts.length ? parts.join(" · ") : "Registry snapshot";
}

export function DrillerJobClient() {
  const [entries, setEntries] = useState<CjDrillerJobEntry[]>([]);
  const [workspaceSectionOrder, setWorkspaceSectionOrder] = useState<
    DrillerWorkspaceSectionId[]
  >([...DEFAULT_DRILLER_WORKSPACE_ORDER]);

  const reload = useCallback(() => {
    setEntries(loadDrillerJob());
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  useEffect(() => {
    const o = readStoredDrillerWorkspaceOrder();
    if (o) setWorkspaceSectionOrder(o);
  }, []);

  const moveWorkspaceSection = useCallback(
    (id: DrillerWorkspaceSectionId, delta: -1 | 1) => {
      setWorkspaceSectionOrder((prev) => {
        const i = prev.indexOf(id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        const a = next[i]!;
        const b = next[j]!;
        next[i] = b;
        next[j] = a;
        localStorage.setItem(LS_DRILLER_WORKSPACE_ORDER, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const site = useMemo(() => deriveDrillerSite(entries), [entries]);

  const weatherJob = useMemo(() => {
    if (!site) return null;
    return syntheticDrillJobForWeather({
      lat: site.lat,
      lon: site.lon,
      title: `Driller job — ${entries.length} well(s)`,
      county: countiesLabel(entries),
    });
  }, [site, entries]);

  const jobStats = useMemo(() => {
    const withDepth = entries.filter(
      (e) => e.snap.depth != null && Number(e.snap.depth) > 0,
    ).length;
    const withAquifer = entries.filter(
      (e) => String(e.snap.aquifer ?? "").trim().length > 0,
    ).length;
    const withLithSnap = entries.filter((e) => {
      const j = String(e.snap.lithology_json ?? "").trim();
      return j.length > 10;
    }).length;
    const withCoords = entries.filter((e) => {
      const la = Number(e.snap.lat);
      const lo = Number(e.snap.lon);
      return (
        Number.isFinite(la) &&
        Number.isFinite(lo) &&
        !(la === 0 && lo === 0)
      );
    }).length;
    return {
      withDepth,
      withAquifer,
      withLithSnap,
      withCoords,
      total: entries.length,
    };
  }, [entries]);

  const updateNotes = (wellId: string, notes: string) => {
    const next = loadDrillerJob().map((e) =>
      e.wellId === wellId ? { ...e, notes } : e,
    );
    saveDrillerJob(next);
    setEntries(next);
  };

  const removeOne = (wellId: string) => {
    const next = loadDrillerJob().filter((e) => e.wellId !== wellId);
    saveDrillerJob(next);
    setEntries(next);
  };

  const tryAppendWellFromMap = useCallback((w: WellRecord) => {
    const entry = wellRecordToDrillerEntry(w);
    if (!entry) return false;
    return appendDrillerJobEntry(entry);
  }, []);

  const clearAll = () => {
    if (!entries.length) return;
    if (!confirm("Remove every well and note from this job?")) return;
    saveDrillerJob([]);
    setEntries([]);
  };

  const exportJson = () => {
    if (!entries.length) {
      alert("Job is empty.");
      return;
    }
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cj-driller-job.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Driller job sheet
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
          Same queue as the Field hub <strong>Add to job queue</strong> flow.
          When your wells include coordinates, this page mirrors{" "}
          <Link href="/scheduling" className="text-sky-700 underline dark:text-sky-400">
            Office
          </Link>
          : weather, registry area analysis, mock preparation checklist, and the
          native registry map (same code as Field — no static viewer iframe). Area
          stats default to <strong>{DEFAULT_AREA_RADIUS_MILES} mi</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Open Field hub
        </Link>
        <Link
          href="/driller-job"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Driller job (this page)
        </Link>
        <Link
          href="/scheduling"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Office board
        </Link>
        <button
          type="button"
          onClick={exportJson}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Clear job
        </button>
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Refresh list
        </button>
      </div>

      {!entries.length ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">
          No wells yet. In{" "}
          <Link href="/scheduling" className="text-sky-700 underline dark:text-sky-400">
            Office
          </Link>{" "}
          or the{" "}
          <Link href="/" className="text-sky-700 underline dark:text-sky-400">
            Field hub
          </Link>
          , open a job on the map and use <strong>Add to job queue</strong>.
        </p>
      ) : (
        <>
          <section
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
            aria-labelledby="driller-job-info-h"
          >
            <h2
              id="driller-job-info-h"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Job information
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Wells on sheet
                </dt>
                <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">
                  {entries.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Counties (from snapshots)
                </dt>
                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                  {countiesLabel(entries)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Registry IDs
                </dt>
                <dd className="mt-0.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {entries.map((e) => e.wellId).join(", ")}
                </dd>
              </div>
            </dl>
          </section>

          <section
            className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/50"
            aria-labelledby="driller-stats-h"
          >
            <h2
              id="driller-stats-h"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Well statistics (snapshot data)
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Counts from the registry fields captured when each well was added to
              the job — not the full statewide chunk join.
            </p>
            <ul className="grid gap-2 text-sm text-zinc-800 dark:text-zinc-200 sm:grid-cols-2">
              <li className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950">
                <span className="text-zinc-500 dark:text-zinc-400">
                  With coordinates
                </span>{" "}
                <span className="font-semibold">{jobStats.withCoords}</span> /{" "}
                {jobStats.total}
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950">
                <span className="text-zinc-500 dark:text-zinc-400">
                  With depth on snap
                </span>{" "}
                <span className="font-semibold">{jobStats.withDepth}</span> /{" "}
                {jobStats.total}
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950">
                <span className="text-zinc-500 dark:text-zinc-400">
                  With aquifer text
                </span>{" "}
                <span className="font-semibold">{jobStats.withAquifer}</span> /{" "}
                {jobStats.total}
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Lithology JSON on snap
                </span>{" "}
                <span className="font-semibold">{jobStats.withLithSnap}</span> /{" "}
                {jobStats.total}
              </li>
            </ul>
          </section>

          {!site ? (
            <div
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              <p className="font-medium">No map center yet</p>
              <p className="mt-1">
                Add wells from the viewer map so each entry includes{" "}
                <strong>latitude and longitude</strong>. Weather, area drilling
                analysis, preparation checklist, and the embedded map need a site
                center (we use the average of all wells that have coordinates).
              </p>
            </div>
          ) : (
            <>
              {site.source === "centroid" && site.wellsWithCoords < entries.length ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Site center is the centroid of{" "}
                  <strong>{site.wellsWithCoords}</strong> well(s) with coordinates;
                  other queued wells are not geocoded in the snapshot.
                </p>
              ) : null}

              {workspaceSectionOrder.map((sid) => {
                switch (sid) {
                  case "prep":
                    return (
                      <DrillerFieldPrepPanel
                        key="prep"
                        lat={site.lat}
                        lon={site.lon}
                        radiusMiles={DEFAULT_AREA_RADIUS_MILES}
                        headerActions={
                          <SectionMoveControls
                            id="prep"
                            order={workspaceSectionOrder}
                            onMove={moveWorkspaceSection}
                          />
                        }
                      />
                    );
                  case "weather":
                    return weatherJob ? (
                      <JobWeatherPanel
                        key="weather"
                        job={weatherJob}
                        headerActions={
                          <SectionMoveControls
                            id="weather"
                            order={workspaceSectionOrder}
                            onMove={moveWorkspaceSection}
                          />
                        }
                      />
                    ) : null;
                  case "insights":
                    return (
                      <AreaInsightsPanel
                        key="insights"
                        lat={site.lat}
                        lon={site.lon}
                        radiusMiles={DEFAULT_AREA_RADIUS_MILES}
                        autoRun
                        title={`Lithology potential & neighborhood wells (${DEFAULT_AREA_RADIUS_MILES} mi)`}
                        detailNote="Vein-style counts are normalized in this hub only (merged contiguous identical intervals). The well viewer still shows raw DNR intervals from chunks."
                        headerActions={
                          <SectionMoveControls
                            id="insights"
                            order={workspaceSectionOrder}
                            onMove={moveWorkspaceSection}
                          />
                        }
                      />
                    );
                  case "viewer":
                    return (
                      <section
                        key="viewer"
                        aria-labelledby="driller-viewer-h"
                        className="space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2
                            id="driller-viewer-h"
                            className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                          >
                            Registry map (hub — same code as Field)
                          </h2>
                          <SectionMoveControls
                            id="viewer"
                            order={workspaceSectionOrder}
                            onMove={moveWorkspaceSection}
                          />
                        </div>
                        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
                          Leaflet map, viewer-style filters, markers, and detail
                          modal live in this Next app (not the static{" "}
                          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                            index.html
                          </code>
                          ). Chunk files remain under{" "}
                          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                            public/well-viewer/
                          </code>{" "}
                          as static data only.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/?lat=${encodeURIComponent(String(site.lat))}&lon=${encodeURIComponent(String(site.lon))}`}
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                          >
                            Open Field hub at this site
                          </Link>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                          <HubNativeWellMapWorkspace
                            centerLat={site.lat}
                            centerLon={site.lon}
                            tryAppendWell={tryAppendWellFromMap}
                            onAfterAppend={reload}
                          />
                        </div>
                      </section>
                    );
                  default:
                    return null;
                }
              })}
            </>
          )}

          <section aria-labelledby="driller-notes-h">
            <h2
              id="driller-notes-h"
              className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Per-well notes
            </h2>
            <ul className="mt-3 space-y-4">
              {entries.map((e) => (
                <li
                  key={e.wellId}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                        {e.wellId}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {snapSummary(e.snap)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {e.snap.lat != null &&
                        e.snap.lon != null &&
                        !Number.isNaN(Number(e.snap.lat)) &&
                        !Number.isNaN(Number(e.snap.lon)) && (
                          <Link
                            href={`/?lat=${encodeURIComponent(String(e.snap.lat))}&lon=${encodeURIComponent(String(e.snap.lon))}`}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                          >
                            Open Field hub here
                          </Link>
                        )}
                      <button
                        type="button"
                        onClick={() => removeOne(e.wellId)}
                        className="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <label className="mt-3 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Notes (this well only)
                  </label>
                  <textarea
                    className="mt-1 w-full min-h-[5rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    value={e.notes}
                    onChange={(ev) => updateNotes(e.wellId, ev.target.value)}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
