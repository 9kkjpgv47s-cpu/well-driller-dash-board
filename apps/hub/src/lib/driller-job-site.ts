import type { CjDrillerJobEntry } from "./cj-driller-job";

export type DrillerSite = {
  lat: number;
  lon: number;
  source: "centroid" | "single";
  wellsWithCoords: number;
};

export function deriveDrillerSite(
  entries: CjDrillerJobEntry[],
): DrillerSite | null {
  const coords = entries
    .map((e) => ({
      lat: Number(e.snap.lat),
      lon: Number(e.snap.lon),
    }))
    .filter(
      (c) =>
        Number.isFinite(c.lat) &&
        Number.isFinite(c.lon) &&
        !(c.lat === 0 && c.lon === 0),
    );
  if (!coords.length) return null;
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const lon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;
  return {
    lat,
    lon,
    source: coords.length === 1 ? "single" : "centroid",
    wellsWithCoords: coords.length,
  };
}

export function countiesLabel(entries: CjDrillerJobEntry[]): string {
  const s = new Set(
    entries.map((e) => String(e.snap.county ?? "").trim()).filter(Boolean),
  );
  if (s.size === 0) return "—";
  if (s.size === 1) return [...s][0]!;
  return `${s.size} counties`;
}
