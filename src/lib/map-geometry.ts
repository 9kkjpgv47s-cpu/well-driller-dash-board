/** Earth radius in meters (WGS84) */
const R = 6371000;

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

const BEARING_DEG: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

/**
 * Destination point given start (deg), distance (m), bearing from north clockwise (deg).
 */
export function destinationLatLon(
  latDeg: number,
  lonDeg: number,
  distanceM: number,
  bearingFromNorthDeg: number,
): { lat: number; lon: number } {
  const φ1 = toRad(latDeg);
  const λ1 = toRad(lonDeg);
  const θ = toRad(bearingFromNorthDeg);
  const δ = distanceM / R;

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: toDeg(φ2),
    lon: ((toDeg(λ2) + 540) % 360) - 180,
  };
}

export function wellLatLonFromMock(
  jobLat: number,
  jobLon: number,
  distanceMi: number,
  bearingLabel: string,
): { lat: number; lon: number } {
  const bearing = BEARING_DEG[bearingLabel] ?? 0;
  const m = distanceMi * 1609.34;
  return destinationLatLon(jobLat, jobLon, m, bearing);
}
