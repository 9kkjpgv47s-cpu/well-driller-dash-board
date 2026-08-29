/**
 * Shared parsing/validation for the `lat` / `lon` / `radius` query params used
 * by the jobsite-scoped API routes. Pure (no next/server) so client code can
 * reuse it.
 */

export const INVALID_LAT_LON_ERROR =
  "Invalid or missing `lat` / `lon` query parameters.";

export type LatLon = { lat: number; lon: number };

export function isValidLatLon(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function invalidRadiusError(maxRadiusMiles: number): string {
  return `Invalid \`radius\` — expected miles in (0, ${maxRadiusMiles}].`;
}

/**
 * Reads `lat`, `lon` and `radius` (or `radiusMiles`) and validates them,
 * returning `{ error }` with the shared messages when they are unusable.
 * With `defaultRadiusMiles`, a missing or non-positive radius falls back to it
 * instead of erroring, so lat/lon-only deep links still resolve.
 */
export function parseLatLonRadiusParams(
  sp: URLSearchParams,
  maxRadiusMiles: number,
  defaultRadiusMiles?: number,
): (LatLon & { radiusMiles: number }) | { error: string } {
  const lat = parseFloat(sp.get("lat") ?? "");
  const lon = parseFloat(sp.get("lon") ?? "");
  let radiusMiles = parseFloat(sp.get("radius") ?? sp.get("radiusMiles") ?? "");

  if (!isValidLatLon(lat, lon)) return { error: INVALID_LAT_LON_ERROR };
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) {
    if (defaultRadiusMiles == null) {
      return { error: invalidRadiusError(maxRadiusMiles) };
    }
    radiusMiles = defaultRadiusMiles;
  }
  if (radiusMiles > maxRadiusMiles) {
    return { error: invalidRadiusError(maxRadiusMiles) };
  }

  return { lat, lon, radiusMiles };
}
