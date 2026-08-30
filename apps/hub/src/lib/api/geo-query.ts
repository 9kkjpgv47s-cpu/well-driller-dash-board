/**
 * Shared parsing/validation for the `lat` / `lon` / `radius` query params used
 * by the jobsite-scoped API routes. Pure (no next/server) so client code can
 * reuse it.
 */

export const INVALID_LAT_LON_ERROR =
  "Invalid or missing `lat` / `lon` query parameters.";

export type LatLon = { lat: number; lon: number };

/**
 * Numeric query param, `NaN` unless the whole value is a number — unlike
 * `parseFloat`, which would read `40junk` as `40`.
 */
export function parseNumericParam(raw: string | null): number {
  const trimmed = raw?.trim();
  return trimmed ? Number(trimmed) : Number.NaN;
}

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
  const lat = parseNumericParam(sp.get("lat"));
  const lon = parseNumericParam(sp.get("lon"));
  let radiusMiles = parseNumericParam(
    sp.get("radius") ?? sp.get("radiusMiles"),
  );

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
