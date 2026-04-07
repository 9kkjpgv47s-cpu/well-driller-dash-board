/**
 * Heuristic parsing of pasted dispatch text (email body).
 * No external APIs — add Google Geocoding / Gmail later with keys.
 */

export type DispatchParseResult = {
  /** Human-readable title */
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
  /** e.g. "4/6 8:00 AM" */
  scheduleLine: string | null;
  /** e.g. "Megan Despain" */
  contactName: string | null;
  phone: string | null;
  /** e.g. "1/2 HP" */
  pumpHp: string | null;
  /** e.g. "180 ft off drive" */
  distanceOffDrive: string | null;
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

/** Try labeled lat/lon, comma-tight pairs, then looser decimal pairs. */
export function extractCoordinates(text: string): { lat: number; lon: number } | null {
  const normalized = text.replace(/\u00a0/g, " ").replace(/\u202f/g, " ");

  const labeled =
    /(?:lat|latitude|coord)[:\s]+(-?\d+\.?\d*)[^\d.\-]{0,24}(?:lon|lng|long|longitude)[:\s]+(-?\d+\.?\d*)/i.exec(
      normalized,
    );
  if (labeled) {
    const lat = parseFloat(labeled[1]!);
    const lon = parseFloat(labeled[2]!);
    if (isValidLatLon(lat, lon)) return { lat, lon };
  }

  // Tight comma: 39.407951,-85.862947 (no space after comma — common in dispatches)
  const tight = /(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/g;
  let tm: RegExpExecArray | null;
  while ((tm = tight.exec(normalized)) !== null) {
    let lat = parseFloat(tm[1]!);
    let lon = parseFloat(tm[2]!);
    if (Math.abs(lat) > 90) {
      const t = lat;
      lat = lon;
      lon = t;
    }
    if (isValidLatLon(lat, lon)) return { lat, lon };
  }

  const pairRe =
    /\b(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(normalized)) !== null) {
    let lat = parseFloat(m[1]!);
    let lon = parseFloat(m[2]!);
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
  /\d.+\b(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|hwy|highway|ct|court|blvd|boulevard|way|cir|circle|pkwy|parkway|route|private\s+road)\b/i;

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

  const nearRe = /^near\s+(.+)$/i;
  for (const line of lines) {
    const nm = nearRe.exec(line);
    if (nm?.[1]) {
      const v = nm[1].trim();
      if (v.length > 8) return v;
    }
  }

  const candidates = lines.filter(
    (l) => STREET_HINT.test(l) && l.length > 8 && l.length < 220,
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ?? null;
}

const LIKELY_NAME = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;

export function extractScheduleLine(lines: string[]): string | null {
  for (const line of lines) {
    if (/^\d{1,2}\/\d{1,2}/.test(line) && line.length < 80) return line;
  }
  return null;
}

export function extractContactName(lines: string[]): string | null {
  const scheduleIdx = lines.findIndex(
    (l) => /^\d{1,2}\/\d{1,2}/.test(l) && l.length < 80,
  );
  const start = scheduleIdx >= 0 ? scheduleIdx + 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.length < 3 || line.length > 60) continue;
    if (/^dispatch$/i.test(line)) continue;
    if (/^near\s+/i.test(line)) continue;
    if (extractCoordinates(line)) continue;
    if (/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(line)) continue;
    if (/\d{1,2}\/\d{1,2}/.test(line)) continue;
    if (/\bHP\b/i.test(line)) continue;
    if (/\bft\b.*\bdrive\b/i.test(line)) continue;
    if (LIKELY_NAME.test(line)) return line;
  }
  return null;
}

export function extractPhone(text: string): string | null {
  const m =
    /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/.exec(
      text.replace(/\u00a0/g, " ").replace(/\u202f/g, " "),
    );
  return m ? m[0]!.replace(/\s+/g, " ").trim() : null;
}

export function extractPumpHp(text: string): string | null {
  const m =
    /\b(\d+\s*\/\s*\d+\s*HP|\d+\s*\/\s*\d+\s*hp|\d+\s*HP|\d+\s*hp)\b/i.exec(
      text,
    );
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim();
}

export function extractDistanceOffDrive(text: string): string | null {
  const normalized = text.replace(/\u00a0/g, " ").replace(/\u202f/g, " ");
  const m =
    /\b(\d+)\s*(?:ft|')\s*(?:off\s*(?:the\s*)?drive|from\s*(?:the\s*)?drive)\b/i.exec(
      normalized,
    );
  if (m?.[1]) return `${m[1]} ft off drive`;
  const m0 =
    /\b(\d+)(?:ft|')\s*(?:off\s*(?:the\s*)?drive|from\s*(?:the\s*)?drive)\b/i.exec(
      normalized,
    );
  if (m0?.[1]) return `${m0[1]} ft off drive`;
  const m2 =
    /\boff\s*(?:the\s*)?drive\s*[:\s]*(\d+)\s*(?:ft|')\b/i.exec(normalized);
  if (m2?.[1]) return `${m2[1]} ft off drive`;
  return null;
}

export function extractTitle(
  lines: string[],
  contactName: string | null,
  scheduleLine: string | null,
): string | null {
  if (contactName) return contactName;
  if (scheduleLine) return scheduleLine;
  for (const line of lines) {
    if (line.length < 4 || line.length > 100) continue;
    if (/^dispatch$/i.test(line)) continue;
    if (/^\d{1,2}\/\d{1,2}/.test(line)) continue;
    if (LIKELY_NAME.test(line)) return line;
  }
  return lines[0] ?? null;
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
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const coords = text ? extractCoordinates(text) : null;
  let address = text ? extractAddress(text) : null;
  if (address?.toLowerCase().startsWith("near ")) {
    address = address.slice(5).trim();
  }

  const scheduleLine = lines.length ? extractScheduleLine(lines) : null;
  const contactName = lines.length ? extractContactName(lines) : null;
  const title = lines.length
    ? extractTitle(lines, contactName, scheduleLine)
    : null;
  const phone = text ? extractPhone(text) : null;
  const pumpHp = text ? extractPumpHp(text) : null;
  const distanceOffDrive = text ? extractDistanceOffDrive(text) : null;

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
    scheduleLine,
    contactName,
    phone,
    pumpHp,
    distanceOffDrive,
  };
}

export function mapsUrlForDispatch(parsed: DispatchParseResult): string | null {
  if (
    parsed.lat !== null &&
    parsed.lon !== null &&
    parsed.locationSource === "coordinates"
  ) {
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

/** Secondary link when both GPS and mailing-style address exist */
export function mapsUrlAddressOnly(address: string | null): string | null {
  if (!address?.trim()) return null;
  return `https://www.google.com/maps/search/?api=0&query=${encodeURIComponent(address.trim())}`;
}
