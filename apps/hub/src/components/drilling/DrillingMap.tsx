"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import { nearestWells, wellOrderKey } from "@/lib/well-ordering";
import {
  buildViewerWellMarker,
  type ViewerMapFilters,
  wellPassesHubViewerFilters,
} from "@/lib/viewer-well-map";
import {
  buildWellSpatialIndex,
  type WellSpatialIndex,
} from "@/lib/well-spatial-index";
import type {
  Circle,
  LayerGroup,
  Map as LeafletMap,
  Marker,
} from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./drilling-map-viewer.css";

/** Runtime style injection — guarantees type rings even if CSS bundling drops map rules. */
const MAP_MARKER_STYLE_ID = "vj-map-marker-styles-g-before-r";
const MAP_MARKER_CSS = `
.leaflet-marker-icon.vj-well-dot.leaflet-div-icon,
.leaflet-marker-icon.vj-job-pin.leaflet-div-icon{
  background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;
}
.vj-combo-marker{display:block;border-radius:4px;font-weight:700;text-align:center;color:#fff;line-height:1.28;white-space:nowrap;border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.35);overflow:visible;box-sizing:border-box;max-width:none}
.vj-combo-marker.vj-est-rock{border:1px solid #dc2626!important;box-shadow:0 1px 2px rgba(0,0,0,.35)!important}
.vj-combo-marker.vj-est-gravel{border:1px solid #2563eb!important;box-shadow:0 1px 2px rgba(0,0,0,.35)!important}
.vj-combo-marker.vj-est-sand{border:1px solid #eab308!important;box-shadow:0 1px 2px rgba(0,0,0,.35)!important}
.vj-combo-marker .cm-row{padding:1px 4px;color:#fff}
.vj-well-marker{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.3)}
.vj-well-marker.vj-est-rock{border:1px solid #dc2626!important;box-shadow:0 1px 2px rgba(0,0,0,.35)!important}
.vj-well-marker.vj-est-gravel{border:1px solid #2563eb!important;box-shadow:0 1px 2px rgba(0,0,0,.35)!important}
.vj-well-marker.vj-est-sand{border:1px solid #eab308!important;box-shadow:0 1px 2px rgba(0,0,0,.35)!important}
`;

function ensureMapMarkerStyles(): void {
  if (typeof document === "undefined") return;
  // Replace any prior inject (v3/v4/parity etc.) so thin borders + sand ring + g-before-r win after deploy
  const prev = document.getElementById(MAP_MARKER_STYLE_ID)
    || document.getElementById("vj-map-marker-styles-viewer-parity")
    || document.getElementById("vj-map-marker-styles-est-outline-v4")
    || document.getElementById("vj-map-marker-styles-est-outline-v3")
    || document.getElementById("vj-map-marker-styles-est-outline-v2");
  if (prev?.id === MAP_MARKER_STYLE_ID) return;
  if (prev) prev.remove();
  const style = document.createElement("style");
  style.id = MAP_MARKER_STYLE_ID;
  style.setAttribute("data-stamp", "2026-07-23-g-before-r");
  style.textContent = MAP_MARKER_CSS;
  document.head.appendChild(style);
  // Cluster CSS via link (avoids broken absolute @import in Next CSS pipeline)
  for (const href of [
    "/well-viewer/vendor/MarkerCluster.css",
    "/well-viewer/vendor/MarkerCluster.Default.css",
  ]) {
    const id = `vj-link-${href.replace(/\W+/g, "-")}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

export type JobsiteLocationFix = {
  lat: number;
  lon: number;
  /** Horizontal accuracy in meters (e.g. device GPS); omitted for registry/geocoded fixes. */
  accuracyM: number | null;
  /** Shown in the marker popup (scheduled job, queue, geocode, …). */
  sourceLabel?: string;
};

type Props = {
  center: { lat: number; lon: number };
  radiusMiles: number;
  wells: WellRecord[];
  filters: ViewerMapFilters;
  onWellOpen: (w: WellRecord) => void;
  /** Jobsite position vs map center and registry wells (coords or geocoded address). */
  jobsiteLocation?: JobsiteLocationFix | null;
};

const MAX_MARKERS = 800;
/** Padding factor applied to viewport bounds so panning has pre-rendered margin. */
const VIEWPORT_PAD = 0.2;
/** Above this zoom, divIcon markers render individually (not clustered). */
const CLUSTER_DISABLE_ZOOM = 15;

type LeafletModule = typeof import("leaflet");

type MarkerClusterGroup = LayerGroup & {
  clearLayers: () => void;
  removeLayer: (layer: Marker) => void;
  addLayer: (layer: Marker) => void;
};

let markerClusterLoadPromise: Promise<void> | null = null;

function loadMarkerCluster(L: LeafletModule): Promise<void> {
  if ((L as LeafletModule & { MarkerClusterGroup?: unknown }).MarkerClusterGroup) {
    return Promise.resolve();
  }
  if (markerClusterLoadPromise) return markerClusterLoadPromise;
  markerClusterLoadPromise = new Promise<void>((resolve, reject) => {
    (window as Window & { L?: LeafletModule }).L = L;
    const script = document.createElement("script");
    script.src = "/well-viewer/vendor/leaflet.markercluster.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      markerClusterLoadPromise = null;
      reject(new Error("Failed to load leaflet.markercluster"));
    };
    document.head.appendChild(script);
  });
  return markerClusterLoadPromise;
}

function createMarkerClusterGroup(L: LeafletModule): MarkerClusterGroup {
  const MCG = (
    L as LeafletModule & {
      markerClusterGroup?: (opts?: object) => MarkerClusterGroup;
    }
  ).markerClusterGroup;
  if (!MCG) {
    return L.layerGroup() as MarkerClusterGroup;
  }
  return MCG({
    disableClusteringAtZoom: CLUSTER_DISABLE_ZOOM,
    maxClusterRadius: 60,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
  });
}

function escapePopupHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const wellMarkerKey = wellOrderKey;

export function DrillingMap({
  center,
  radiusMiles,
  wells,
  filters,
  onWellOpen,
  jobsiteLocation = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const markersRef = useRef<MarkerClusterGroup | null>(null);
  const markersByKeyRef = useRef<Map<string, Marker>>(new Map());
  const jobsiteGroupRef = useRef<LayerGroup | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const onWellOpenRef = useRef(onWellOpen);
  onWellOpenRef.current = onWellOpen;
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(13);
  const [capNote, setCapNote] = useState<string | null>(null);

  /** Wells matching the hub filter set (radius-limited upstream). */
  const filteredWells = useMemo(
    () => wells.filter((w) => wellPassesHubViewerFilters(w, filters)),
    [wells, filters],
  );

  /** Grid index over the filtered set for fast viewport (bounds) queries. */
  const wellIndex = useMemo(
    () => buildWellSpatialIndex(filteredWells),
    [filteredWells],
  );

  // Refs so map event handlers (moveend) always see the latest data.
  const wellIndexRef = useRef<WellSpatialIndex>(wellIndex);
  wellIndexRef.current = wellIndex;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const centerRef = useRef(center);
  centerRef.current = center;
  const totalMatchingRef = useRef(0);
  totalMatchingRef.current = filteredWells.length;

  /**
   * Render markers for the current viewport.
   *
   * - Viewport culling: only wells inside the (padded) map bounds are queried
   *   from the spatial index.
   * - Deterministic cap: when more than MAX_MARKERS match, the nearest
   *   MAX_MARKERS to the search center are kept (no random subsampling).
   * - `mode: "diff"` (pan/zoom-end) adds/removes markers by well key instead
   *   of clearing the layer group; `mode: "rebuild"` recreates everything
   *   (needed when filters or zoom-dependent icon HTML change).
   */
  const renderMarkersRef = useRef<(mode: "rebuild" | "diff") => void>(() => {});
  renderMarkersRef.current = (mode) => {
    const map = mapRef.current;
    const group = markersRef.current;
    const L = leafletRef.current;
    if (!map || !group || !L) return;
    const byKey = markersByKeyRef.current;

    if (filtersRef.current.hideWellLabels) {
      group.clearLayers();
      byKey.clear();
      setCapNote(null);
      return;
    }

    if (mode === "rebuild") {
      group.clearLayers();
      byKey.clear();
    }

    const b = map.getBounds().pad(VIEWPORT_PAD);
    const candidates = wellIndexRef.current.queryBounds({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });

    let visible = candidates;
    if (candidates.length > MAX_MARKERS) {
      const c = centerRef.current;
      visible = nearestWells(candidates, c.lat, c.lon, MAX_MARKERS);
      setCapNote(
        `Showing ${MAX_MARKERS.toLocaleString()} nearest of ${candidates.length.toLocaleString()} matching wells in view — zoom in or tighten filters to see the rest.`,
      );
    } else {
      setCapNote(null);
    }

    const desired = new Map<string, WellRecord>();
    for (const w of visible) desired.set(wellMarkerKey(w), w);

    for (const [key, marker] of byKey) {
      if (!desired.has(key)) {
        group.removeLayer(marker);
        byKey.delete(key);
      }
    }

    const zoom = map.getZoom();
    for (const [key, w] of desired) {
      if (byKey.has(key)) continue;
      const lat = Number(w.lat);
      const lon = Number(w.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const built = buildViewerWellMarker(w, filtersRef.current, zoom);
      const marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: "vj-well-dot",
          html: built.html,
          iconSize: [built.iconW, built.iconH],
          iconAnchor: built.iconAnchor,
        }),
      });
      marker.bindPopup(built.popupHtml);
      marker.on("click", () => {
        onWellOpenRef.current(w);
      });
      marker.addTo(group);
      byKey.set(key, marker);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    ensureMapMarkerStyles();

    void import("leaflet")
      .then((L) => loadMarkerCluster(L).then(() => L))
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        ensureMapMarkerStyles();
        leafletRef.current = L;
        // Prefer not to steal keyboard focus — on iOS Safari map focus was
        // yanking the document scroll back to the top after dispatch load.
        const map = L.map(containerRef.current, {
          // Keep default interaction; we only avoid auto-focus scroll.
        }).setView([center.lat, center.lon], 13, { animate: false });
        const mapEl = map.getContainer();
        mapEl.setAttribute("tabindex", "-1");
        // Leaflet sometimes focuses the map container on create/setView.
        mapEl.blur();
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        markersRef.current = createMarkerClusterGroup(L).addTo(map);
        jobsiteGroupRef.current = L.layerGroup().addTo(map);
        circleRef.current = L.circle([center.lat, center.lon], {
          radius: radiusMiles * 1609.34,
          color: "#0284c7",
          weight: 2,
          fillOpacity: 0.07,
        }).addTo(map);
        mapRef.current = map;
        setMapZoom(map.getZoom());
        map.on("zoomend", () => setMapZoom(map.getZoom()));
        // Re-cull markers for the new viewport after pans (zoom changes
        // trigger a full rebuild via the mapZoom effect below).
        map.on("moveend", () => renderMarkersRef.current("diff"));
        setMapReady(true);
      });

    const markersByKey = markersByKeyRef.current;
    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current = null;
      markersByKey.clear();
      jobsiteGroupRef.current = null;
      circleRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- init once

  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle || !mapReady) return;
    // animate:false avoids Leaflet focusing/scrolling the page on center change
    map.setView([center.lat, center.lon], Math.max(map.getZoom(), 12), {
      animate: false,
    });
    circle.setLatLng([center.lat, center.lon]);
    circle.setRadius(radiusMiles * 1609.34);
    map.getContainer().blur();
  }, [center.lat, center.lon, radiusMiles, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const g = jobsiteGroupRef.current;
    if (!map || !g || !mapReady) return;

    void import("leaflet").then((L) => {
      g.clearLayers();
      if (!jobsiteLocation) return;

      const { lat, lon, accuracyM, sourceLabel } = jobsiteLocation;
      const accOk =
        accuracyM != null &&
        Number.isFinite(accuracyM) &&
        accuracyM >= 5 &&
        accuracyM <= 8000;
      const accRounded = accOk ? Math.round(accuracyM as number) : 0;

      if (accOk) {
        L.circle([lat, lon], {
          radius: accuracyM as number,
          color: "#b45309",
          weight: 1,
          fillColor: "#f59e0b",
          fillOpacity: 0.1,
        })
          .bindPopup(`Reported accuracy ~${accRounded} m`)
          .addTo(g);
      }

      // Amber pin = job GPS/coords from dispatch (not phone geolocation).
      // Dead center of the search radius circle (same lat/lon as map center).
      const src = escapePopupHtml(
        sourceLabel && sourceLabel.trim()
          ? sourceLabel.trim()
          : "Dispatch GPS / coordinates",
      );
      const popupHtml = `<strong>Job location</strong><br>${src}<br>${lat.toFixed(5)}, ${lon.toFixed(5)}${
        accOk ? `<br>~${accRounded} m accuracy` : ""
      }`;

      // Crosshair ring so the center of the 2 mi circle is obvious among wells.
      L.circleMarker([lat, lon], {
        radius: 18,
        color: "#9a3412",
        fillColor: "#f59e0b",
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.95,
        interactive: false,
      }).addTo(g);

      // Solid amber center pin — always above well markers.
      L.circleMarker([lat, lon], {
        radius: 12,
        color: "#7c2d12",
        fillColor: "#f59e0b",
        fillOpacity: 1,
        weight: 3,
        opacity: 1,
      })
        .bindPopup(popupHtml)
        .addTo(g);

      // DivIcon label so "JOB" reads at a glance (circleMarker alone was easy to miss).
      L.marker([lat, lon], {
        interactive: true,
        zIndexOffset: 2000,
        icon: L.divIcon({
          className: "vj-job-pin",
          html: `<div class="vj-job-pin-inner" title="Job location"><span class="vj-job-pin-dot"></span><span class="vj-job-pin-label">JOB</span></div>`,
          iconSize: [44, 36],
          iconAnchor: [22, 18],
        }),
      })
        .bindPopup(popupHtml)
        .addTo(g);

      // Keep pin dead-center with the radius circle (same coords as center).
      // Only fitBounds when jobsite is offset from the search center.
      const dLat = Math.abs(lat - center.lat);
      const dLon = Math.abs(lon - center.lon);
      if (dLat < 1e-6 && dLon < 1e-6) {
        map.setView([lat, lon], Math.max(map.getZoom(), 13), {
          animate: false,
        });
      } else {
        const b = L.latLngBounds([center.lat, center.lon], [lat, lon]);
        map.fitBounds(b, { padding: [48, 48], maxZoom: 16, animate: false });
      }
      map.getContainer().blur();
    });
  }, [jobsiteLocation, center.lat, center.lon, mapReady]);

  // Full rebuild when the well set, filters, or zoom-dependent icon HTML change.
  useEffect(() => {
    if (!mapReady) return;
    renderMarkersRef.current("rebuild");
  }, [filteredWells, wellIndex, filters, mapReady, mapZoom]);

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="relative min-w-0 w-full max-w-full">
        <div
          ref={containerRef}
          className="z-0 h-[min(55vh,520px)] min-w-0 w-full max-w-full rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      {jobsiteLocation ? (
        <p className="text-xs text-[var(--muted)]" role="status">
          Amber JOB pin = dead center of the search circle · job GPS{" "}
          {jobsiteLocation.lat.toFixed(6)}, {jobsiteLocation.lon.toFixed(6)}. No
          phone location permission required.
        </p>
      ) : null}
      {capNote ? (
        <p className="text-xs text-[var(--muted)]" role="status">
          {capNote}
        </p>
      ) : null}
    </div>
  );
}
