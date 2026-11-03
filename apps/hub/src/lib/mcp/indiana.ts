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

/**
 * Trailing `, <state>` / `, <ST>` that names a US state other than Indiana —
 * "Chicago, Illinois", "Portland, OR". Two-word state names are covered; the
 * (?!in|indiana|us) lookahead keeps "Marion, IN" and "Kokomo, USA" usable.
 * Comma-required so "Michigan City" (a city IN Indiana) still geocodes.
 */
const OUT_OF_STATE_TAIL =
  /,\s*(?:(?:al|ak|az|ar|ca|co|ct|de|dc|fl|ga|hi|id|il|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\.?|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|district of columbia|florida|georgia|hawaii|idaho|illinois|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b\.?\s*$/i;

/** True when the query explicitly scopes to another US state — no Indiana match exists. */
export function queryScopesOutOfIndiana(query: string): boolean {
  return OUT_OF_STATE_TAIL.test(query.trim());
}
