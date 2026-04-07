"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { DispatchParseResult } from "@/lib/dispatch-parse";
import type { WellOnMap } from "@/lib/nearby-wells-map";

const JOB_ZOOM = 16;
const OVERVIEW_ZOOM = 12;

function Recenter({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const lat = center[0];
  const lon = center[1];
  useEffect(() => {
    map.setView([lat, lon], zoom, { animate: true });
  }, [map, lat, lon, zoom]);
  return null;
}

const jobIcon = L.divIcon({
  className: "jobsite-pin",
  html: `<div class="jobsite-pin-inner" aria-hidden="true"></div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -34],
});

type Props = {
  parsed: DispatchParseResult;
  wellsOnMap: WellOnMap[];
};

export function JobsiteMap({ parsed, wellsOnMap }: Props) {
  const jobLat = parsed.lat;
  const jobLon = parsed.lon;

  const [mapCenter, setMapCenter] = useState<[number, number]>(() =>
    jobLat !== null && jobLon !== null ? [jobLat, jobLon] : [39.8, -86.15],
  );
  const [mapZoom, setMapZoom] = useState(OVERVIEW_ZOOM);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (jobLat !== null && jobLon !== null) {
      setMapCenter([jobLat, jobLon]);
      setMapZoom(OVERVIEW_ZOOM);
      setSearchLabel(null);
      setSearchError(null);
    }
  }, [jobLat, jobLon]);

  const canSearch = jobLat !== null && jobLon !== null;

  const resolveSearchTarget = useCallback(async (): Promise<{
    lat: number;
    lon: number;
    label: string;
  }> => {
    if (jobLat === null || jobLon === null) {
      throw new Error("No location to show");
    }
    if (parsed.locationSource === "coordinates") {
      return {
        lat: jobLat,
        lon: jobLon,
        label: "GPS from dispatch",
      };
    }
    const addr = parsed.address?.trim();
    if (addr) {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(addr)}`,
      );
      const data = (await res.json()) as {
        lat?: number;
        lon?: number;
        error?: string;
      };
      if (res.ok && typeof data.lat === "number" && typeof data.lon === "number") {
        return {
          lat: data.lat,
          lon: data.lon,
          label: "Address (geocoded)",
        };
      }
    }
    return {
      lat: jobLat,
      lon: jobLon,
      label:
        parsed.locationSource === "address_only"
          ? "Approximate center (no GPS in dispatch; geocoding failed or missing)"
          : "Approximate center",
    };
  }, [jobLat, jobLon, parsed.address, parsed.locationSource]);

  const searchJobSite = useCallback(async () => {
    setSearchError(null);
    setSearching(true);
    try {
      const t = await resolveSearchTarget();
      setMapCenter([t.lat, t.lon]);
      setMapZoom(JOB_ZOOM);
      setSearchLabel(t.label);
    } catch (e) {
      setSearchLabel(null);
      setSearchError(
        e instanceof Error ? e.message : "Could not find this job site",
      );
    } finally {
      setSearching(false);
    }
  }, [resolveSearchTarget]);

  const wellMarkers = useMemo(() => {
    if (jobLat === null || jobLon === null) return null;
    return wellsOnMap.map((w) => (
      <CircleMarker
        key={w.refno}
        center={[w.mapLat, w.mapLon]}
        radius={7}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#60a5fa",
          fillOpacity: 0.85,
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -4]} opacity={1}>
          <span className="text-xs font-medium">
            Ref {w.refno} · {w.depthFt} ft
          </span>
        </Tooltip>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">Well {w.refno}</p>
            <p>{w.county} County</p>
            <p>
              {w.distanceMi} mi {w.bearing} · {w.depthFt} ft
            </p>
            <p>
              Gravel ~{w.gravelVeinIn}&Prime; @ ~{w.veinDepthFt} ft
            </p>
            <p className="mt-1 text-xs text-zinc-500">Mock data for MVP</p>
          </div>
        </Popup>
      </CircleMarker>
    ));
  }, [wellsOnMap, jobLat, jobLon]);

  if (jobLat === null || jobLon === null) {
    return (
      <div className="card flex min-h-[280px] items-center justify-center p-6">
        <p className="text-center text-sm text-[var(--muted)]">
          Add an address or coordinates to the dispatch to enable the map.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Job site map
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            OpenStreetMap · mock wells as blue dots · job pin is the rig site
            used for the table above
          </p>
          {searchLabel ? (
            <p className="mt-1 text-xs font-medium text-[var(--accent)]">
              Showing: {searchLabel}
            </p>
          ) : null}
          {searchError ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {searchError}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void searchJobSite()}
          disabled={searching || !canSearch}
          className="btn-primary shrink-0"
        >
          {searching ? "Searching…" : "Search job site"}
        </button>
      </div>
      <div className="relative h-[min(420px,55vh)] w-full [&_.leaflet-container]:z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-[var(--surface-muted)]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom
          className="h-full w-full"
          zoomControl
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={mapCenter} zoom={mapZoom} />
          <ScaleControl position="bottomleft" />
          <Marker position={[jobLat, jobLon]} icon={jobIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Rig site (brief)</p>
                <p className="font-mono text-xs">
                  {jobLat.toFixed(5)}, {jobLon.toFixed(5)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Mock wells are placed relative to this point.
                </p>
              </div>
            </Popup>
          </Marker>
          {wellMarkers}
        </MapContainer>
      </div>
    </div>
  );
}
