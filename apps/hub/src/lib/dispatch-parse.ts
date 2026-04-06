/**
 * Heuristic parsing of pasted dispatch text (email body).
 * No external APIs — add Google Geocoding / Gmail later with keys.
 */

export type DispatchParseResult = {
  /** Human-readable title from subject line or first line */
  title: string | null;
  lat: number | null;
  lon: number | null;
  /** Best-effort street address */
  address: string | null;
  /** Freeform remainder / full paste for context */
  notes: string;
  /** How we resolved location for the brief */
  locationSource: "coordinates" | "address_only" | "stub" | "none";
  warnings: string[];
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function isValidLatLon(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/** Try labeled lat/lon, then decimal pairs (US-style: positive lat, negative lon common). */
export function extractCoordinates(text: string): { lat: number; lon: number } | null {
  const normalized = text.replace(/\u00a0/g, " ");

  const labeled =
    /(?:lat|latitude|coord)[:\s]+(-?\d+\.?\d*)[^\d.\-]{0,24}(?:lon|lng|long|longitude)[:\s]+(-?\d+\.?\d*)/i.exec(
      normalized,
    );
  if (labeled) {
    const lat = parseFloat(labeled[1]!);
    const lon = parseFloat(labeled[2]!);
    if (isValidLatLon(lat, lon)) return { lat, lon };
  }

  // Decimal degrees pair (require reasonable precision to avoid false positives)
  const pairRe =
    /\b(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(normalized)) !== null) {
    let lat = parseFloat(m[1]!);
    let lon = parseFloat(m[2]!);
    // If values look swapped (US: lat ~25–49, lon ~-125–-65)
    if (
      Math.abs(lat) > 90 ||
      (Math.abs(lat) < 49 && Math.abs(lon) < 49 && Math.abs(lat) < Math.abs(lon))
    ) {
      const t = lat;
      lat = lon;
      lon = t;
    }
    if (isValidLatLon(lat, lon)) return { lat, lon };
  }

  return null;
}

const STREET_HINT =
  /\d.+\b(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|hwy|highway|ct|court|blvd|boulevard|way|cir|circle|pkwy|parkway)\b/i;

export function extractAddress(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const labelRe =
    /^(?:address|location|job\s*site|site|jobsite|service\s*address)\s*[:#\-]?\s*(.+)$/i;
  for (const line of lines) {
    const lm = labelRe.exec(line);
    if (lm?.[1]) {
      const v = lm[1].trim();
      if (v.length > 5) return v;
    }
  }

  const candidates = lines.filter(
    (l) => STREET_HINT.test(l) && l.length > 8 && l.length < 200,
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ?? null;
}

export function extractTitle(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const first = lines[0]!;
  if (first.length > 3 && first.length < 120) return first;
  return null;
}

/**
 * Deterministic stub coordinates from address string when no GPS in paste.
 * Indiana-ish bounding box for plausible mock visuals only.
 */
export function stubCoordsFromString(seed: string): { lat: number; lon: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const u1 = (h % 10000) / 10000;
  const u2 = ((h >>> 8) % 10000) / 10000;
  const lat = 37.8 + u1 * (41.8 - 37.8);
  const lon = -88.1 - u2 * (84.8 - 88.1);
  return { lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5 };
}

export function parseDispatchEmail(raw: string): DispatchParseResult {
  const text = raw.trim();
  const warnings: string[] = [];
  const coords = text ? extractCoordinates(text) : null;
  const address = text ? extractAddress(text) : null;
  const title = text ? extractTitle(text) : null;

  let lat: number | null = coords?.lat ?? null;
  let lon: number | null = coords?.lon ?? null;
  let locationSource: DispatchParseResult["locationSource"] = "none";

  if (lat !== null && lon !== null) {
    locationSource = "coordinates";
  } else if (address) {
    const stub = stubCoordsFromString(address);
    lat = stub.lat;
    lon = stub.lon;
    locationSource = "address_only";
    warnings.push(
      "No latitude/longitude found in the paste. Mock nearby wells use a deterministic stub from the address — add coordinates to the dispatch for better alignment, or connect geocoding later.",
    );
  } else if (text.length > 0) {
    const stub = stubCoordsFromString(text);
    lat = stub.lat;
    lon = stub.lon;
    locationSource = "stub";
    warnings.push(
      "Could not find a clear address or coordinates. Mock stats use a stub derived from the full text. Paste an address line or lat, long.",
    );
  }

  if (lat !== null && lon !== null) {
    lat = clamp(lat, -90, 90);
    lon = clamp(lon, -180, 180);
  }

  return {
    title,
    lat,
    lon,
    address,
    notes: text,
    locationSource,
    warnings,
  };
}

export function mapsUrlForDispatch(parsed: DispatchParseResult): string | null {
  if (parsed.lat !== null && parsed.lon !== null && parsed.locationSource === "coordinates") {
    return `https://www.google.com/maps?q=${parsed.lat},${parsed.lon}`;
  }
  if (parsed.address) {
    return `https://www.google.com/maps/search/?api=0&query=${encodeURIComponent(parsed.address)}`;
  }
  if (parsed.lat !== null && parsed.lon !== null) {
    return `https://www.google.com/maps?q=${parsed.lat},${parsed.lon}`;
  }
  return null;
}
