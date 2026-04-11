"use client";

import type { CircleMarker, Map as LeafletMap, TileLayer } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type RainViewerFrame = { time: number; path: string };

type RainViewerMaps = {
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast?: RainViewerFrame[];
  };
};

function mergeFrames(maps: RainViewerMaps): RainViewerFrame[] {
  const past = maps.radar.past ?? [];
  const nowcast = maps.radar.nowcast ?? [];
  return [...past, ...nowcast];
}

function frameTileUrl(host: string, frame: RainViewerFrame): string {
  const base = host.replace(/\/$/, "");
  const path = frame.path.startsWith("/") ? frame.path : `/${frame.path}`;
  return `${base}${path}/512/{z}/{x}/{y}/2/1_1.png`;
}

type Props = {
  lat: number;
  lon: number;
  /** Tailwind height class for the map pane */
  className?: string;
};

export function LiveRadarMap({ lat, lon, className = "h-72" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const radarLayerRef = useRef<TileLayer | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const hostRef = useRef<string>("");

  const [maps, setMaps] = useState<RainViewerMaps | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const frames = useMemo(() => (maps ? mergeFrames(maps) : []), [maps]);

  useEffect(() => {
    const ctrl = new AbortController();
    setMetaErr(null);
    setMaps(null);
    fetch("/api/radar/rainviewer", { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? r.statusText);
        }
        return r.json() as Promise<RainViewerMaps>;
      })
      .then((m) => {
        const merged = mergeFrames(m);
        if (!m.host || !merged.length) {
          throw new Error("RainViewer returned no radar frames");
        }
        setMaps(m);
        setFrameIndex(merged.length - 1);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setMetaErr(e.message);
        setMaps(null);
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!maps || !containerRef.current) return;
    const merged = mergeFrames(maps);
    if (!merged.length) return;

    let cancelled = false;
    hostRef.current = maps.host.replace(/\/$/, "");

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        maxZoom: 12,
      }).setView([lat, lon], 8);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const frame = merged[merged.length - 1]!;
      const radar = L.tileLayer(frameTileUrl(hostRef.current, frame), {
        tileSize: 512,
        zoomOffset: -1,
        opacity: 0.78,
        maxNativeZoom: 7,
        attribution:
          'Radar © <a href="https://www.rainviewer.com/api.html" rel="noreferrer">RainViewer</a>',
      }).addTo(map);
      radarLayerRef.current = radar;

      markerRef.current = L.circleMarker([lat, lon], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#0ea5e9",
        fillOpacity: 1,
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      radarLayerRef.current = null;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Recreate only if map index payload changes (e.g. refetch). Pan/zoom follow lat/lon and frame elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: initial center uses lat/lon at first maps load
  }, [maps]);

  useEffect(() => {
    const layer = radarLayerRef.current;
    const h = hostRef.current;
    if (!layer || !h || !frames.length || !mapReady) return;
    const i = Math.max(0, Math.min(frameIndex, frames.length - 1));
    layer.setUrl(frameTileUrl(h, frames[i]!));
  }, [frameIndex, frames, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const m = markerRef.current;
    if (!map || !m || !mapReady) return;
    m.setLatLng([lat, lon]);
    map.panTo([lat, lon], { animate: true });
  }, [lat, lon, mapReady]);

  useEffect(() => {
    if (!playing || !mapReady || frames.length < 2) return;
    const n = frames.length;
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % n);
    }, 900);
    return () => window.clearInterval(id);
  }, [playing, mapReady, frames.length]);

  const n = frames.length;
  const label =
    n && frameIndex < n
      ? new Date(frames[frameIndex]!.time * 1000).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  if (metaErr) {
    return (
      <p className="text-xs text-red-700 dark:text-red-300">{metaErr}</p>
    );
  }

  if (!maps && !metaErr) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400 ${className}`}
      >
        Loading radar…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 ${className}`}
      />
      {n > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <button
            type="button"
            className="rounded border border-zinc-300 px-2 py-1 font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setFrameIndex((i) => (i - 1 + n) % n)}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-2 py-1 font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-2 py-1 font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setFrameIndex((i) => (i + 1) % n)}
          >
            Next
          </button>
          {label ? (
            <span className="text-zinc-500 dark:text-zinc-500">{label}</span>
          ) : null}
        </div>
      ) : null}
      <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
        Composite radar tiles update as providers publish frames (not a forecast model
        strip). Max zoom on radar imagery is limited by the tile source.
      </p>
    </div>
  );
}
