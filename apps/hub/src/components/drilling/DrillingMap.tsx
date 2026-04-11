"use client";

import type { WellRecord } from "@/lib/area-well-analytics";
import {
  buildViewerWellMarker,
  type ViewerMapFilters,
  wellPassesHubViewerFilters,
} from "@/lib/viewer-well-map";
import type { Circle, LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
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

function escapePopupHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  const markersRef = useRef<LayerGroup | null>(null);
  const jobsiteGroupRef = useRef<LayerGroup | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const onWellOpenRef = useRef(onWellOpen);
  onWellOpenRef.current = onWellOpen;
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
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
      const onZoom = () => setMapZoom(map.getZoom());
      map.on("zoomend", onZoom);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
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

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group || !mapReady) return;

    if (filters.hideWellLabels) {
      group.clearLayers();
      return;
    }

    void import("leaflet").then((L) => {
      group.clearLayers();
      let filtered = wells.filter((w) => wellPassesHubViewerFilters(w, filters));
      if (filtered.length > MAX_MARKERS) {
        filtered = [...filtered].sort(() => 0.5 - Math.random());
        filtered = filtered.slice(0, MAX_MARKERS);
      }

      for (const w of filtered) {
        const lat = Number(w.lat);
        const lon = Number(w.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const built = buildViewerWellMarker(w, filters, mapZoom);
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
      }
    });
  }, [wells, filters, mapReady, mapZoom]);

  return (
    <div
      ref={containerRef}
      className="z-0 h-[min(55vh,520px)] w-full rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900"
    />
  );
}
