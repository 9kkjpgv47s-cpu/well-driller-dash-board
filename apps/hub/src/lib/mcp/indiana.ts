/** Bounding box covering Indiana (the DNR registry is Indiana-only). */
export const INDIANA_BBOX = {
  minLat: 37.7,
  maxLat: 41.8,
  minLon: -88.1,
  maxLon: -84.78,
} as const;

export function isInIndiana(lat: number, lon: number): boolean {
  return (
    lat >= INDIANA_BBOX.minLat &&
    lat <= INDIANA_BBOX.maxLat &&
    lon >= INDIANA_BBOX.minLon &&
    lon <= INDIANA_BBOX.maxLon
  );
}

export function outsideIndianaMessage(lat: number, lon: number): string {
  return `Coordinates (${lat}, ${lon}) are outside Indiana. This registry covers Indiana water wells only.`;
}
