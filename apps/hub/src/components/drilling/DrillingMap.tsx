"use client";

import {
  haversineMiles,
  type WellRecord,
} from "@/lib/area-well-analytics";
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

type LeafletModule = typeof import("leaflet");

function escapePopupHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wellMarkerKey(w: WellRecord): string {
  return String(w.id ?? w.refno ?? `${w.lat},${w.lon}`);
}

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
  const markersRef = useRef<LayerGroup | null>(null);
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
      visible = candidates
        .map((w) => ({
          w,
          d: haversineMiles(c.lat, c.lon, Number(w.lat), Number(w.lon)),
        }))
        .sort((a, b2) => a.d - b2.d || wellMarkerKey(a.w).localeCompare(wellMarkerKey(b2.w)))
        .slice(0, MAX_MARKERS)
        .map((x) => x.w);
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

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current).setView(
        [center.lat, center.lon],
        13,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
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

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current = null;
      markersByKeyRef.current.clear();
      jobsiteGroupRef.current = null;
      circleRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- init once

  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle || !mapReady) return;
    map.setView([center.lat, center.lon], Math.max(map.getZoom(), 12));
    circle.setLatLng([center.lat, center.lon]);
    circle.setRadius(radiusMiles * 1609.34);
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

      const src = escapePopupHtml(
        sourceLabel && sourceLabel.trim()
          ? sourceLabel.trim()
          : "Jobsite position",
      );
      L.circleMarker([lat, lon], {
        radius: 9,
        color: "#9a3412",
        fillColor: "#fbbf24",
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(
          `<strong>Jobsite</strong><br>${src}<br>${lat.toFixed(5)}, ${lon.toFixed(5)}${
            accOk ? `<br>~${accRounded} m accuracy` : ""
          }`,
        )
        .addTo(g);

      const b = L.latLngBounds([center.lat, center.lon], [lat, lon]);
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      const span = Math.max(
        Math.abs(ne.lat - sw.lat),
        Math.abs(ne.lng - sw.lng),
      );
      if (span < 0.002) {
        map.setView([lat, lon], Math.max(map.getZoom(), 15));
      } else {
        map.fitBounds(b, { padding: [48, 48], maxZoom: 16, animate: true });
      }
    });
  }, [jobsiteLocation, center.lat, center.lon, mapReady]);

  // Full rebuild when the well set, filters, or zoom-dependent icon HTML change.
  useEffect(() => {
    if (!mapReady) return;
    renderMarkersRef.current("rebuild");
  }, [filteredWells, wellIndex, filters, mapReady, mapZoom]);

  return (
    <div className="min-w-0 space-y-1.5">
      <div
        ref={containerRef}
        className="z-0 h-[min(55vh,520px)] min-w-0 w-full max-w-full rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900"
      />
      {capNote ? (
        <p className="text-xs text-[var(--muted)]" role="status">
          {capNote}
        </p>
      ) : null}
    </div>
  );
}
