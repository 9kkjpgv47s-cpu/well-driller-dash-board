import { upstreamJsonHeaders } from "@/lib/http/upstream";

/**
 * DEM ground elevation lookup (meters → feet), same sources as the standalone
 * viewer: OpenTopoData SRTM90m, then the Open-Elevation API as fallback.
 * Shared by `/api/elevation` and the MCP stratigraphy/brief tools.
 */

export type ElevationLocation = { lat: number; lon: number };

const M_TO_FT = 3.28084;

function parseOpenTopoData(text: string): number[] | null {
  try {
    const data = JSON.parse(text) as {
      results?: { elevation?: number | null }[];
      status?: string;
    };
    if (!data?.results || !Array.isArray(data.results)) return null;
    if (data.status && data.status !== "OK") return null;
    return data.results.map((r) =>
      r.elevation != null && Number.isFinite(Number(r.elevation))
        ? Number(r.elevation)
        : NaN,
    );
  } catch {
    return null;
  }
}

async function fetchOpenTopoDataM(
  locations: ElevationLocation[],
): Promise<number[] | null> {
  if (!locations.length) return [];
  const qs = locations.map((p) => `${p.lat},${p.lon}`).join("|");
  const url = `https://api.opentopodata.org/v1/srtm90m?locations=${encodeURIComponent(qs)}`;
  const res = await fetch(url, {
    headers: upstreamJsonHeaders(),
    next: { revalidate: 86400 },
  });
  const text = await res.text();
  const arr = parseOpenTopoData(text);
  if (!arr || arr.length !== locations.length) return null;
  if (arr.some((n) => Number.isNaN(n))) return null;
  return arr;
}

async function fetchOpenElevationM(
  locations: ElevationLocation[],
): Promise<(number | null)[]> {
  if (!locations.length) return [];
  const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: {
      ...upstreamJsonHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locations: locations.map((p) => ({
        latitude: p.lat,
        longitude: p.lon,
      })),
    }),
  });
  if (!res.ok) return locations.map(() => null);
  const data = (await res.json()) as {
    results?: { elevation?: number | null }[];
  };
  if (!data?.results || data.results.length !== locations.length) {
    return locations.map(() => null);
  }
  return data.results.map((r) =>
    r.elevation != null && Number.isFinite(Number(r.elevation))
      ? Number(r.elevation)
      : null,
  );
}

/**
 * Elevation in meters and feet for each location (aligned with input order).
 * Per-location `null` when both providers fail for that point.
 */
export async function lookupElevations(
  locations: ElevationLocation[],
): Promise<{ elevationsFt: (number | null)[]; elevationsM: (number | null)[] }> {
  let elevationsM: (number | null)[] | null = null;
  try {
    const ot = await fetchOpenTopoDataM(locations);
    if (ot) elevationsM = ot;
  } catch {
    elevationsM = null;
  }

  if (!elevationsM) {
    elevationsM = await fetchOpenElevationM(locations);
  }

  const elevationsFt = elevationsM.map((m) =>
    m != null && Number.isFinite(m) ? Math.round(m * M_TO_FT) : null,
  );
  return { elevationsFt, elevationsM };
}

/** Ground elevation (ft above sea level) at one point, or `null` on failure. */
export async function getGroundElevationFt(
  lat: number,
  lon: number,
): Promise<number | null> {
  try {
    const { elevationsFt } = await lookupElevations([{ lat, lon }]);
    return elevationsFt[0] ?? null;
  } catch {
    return null;
  }
}
