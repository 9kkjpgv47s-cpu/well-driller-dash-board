import type { WellRecord } from "@/lib/area-well-analytics";

type IdentityCandidate = string | number | undefined;
type RefSource =
  | "refno"
  | "ref_no"
  | "wellid"
  | "well_id"
  | "permit"
  | "id_dnr"
  | "report_refno";
type IdentityConfidence = "high" | "medium" | "low";

export const WELL_IDENTITY_RESOLVER_VERSION = "well-identity-v2";

function normalizeToken(v: IdentityCandidate): string {
  if (v == null) return "";
  return String(v).trim();
}

function normalizeAlias(v: IdentityCandidate): string {
  const token = normalizeToken(v).toUpperCase();
  if (!token) return "";
  return token.replace(/[^A-Z0-9]+/g, "");
}

function normalizeDigits(v: IdentityCandidate): string {
  const token = normalizeToken(v).replace(/[^\d]/g, "");
  if (!token) return "";
  const noLeading = token.replace(/^0+/, "");
  return noLeading || "0";
}

function parseRefNoFromReport(report: IdentityCandidate): string {
  const text = normalizeToken(report);
  if (!text) return "";
  const m = text.match(/[?&]refNo=(\d+)/i);
  if (!m) return "";
  return normalizeDigits(m[1]);
}

function stableHashHex(parts: string[]): string {
  let hash = 0x811c9dc5;
  const joined = parts.filter(Boolean).join("|");
  for (let i = 0; i < joined.length; i++) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function resolveWellRefNoWithSource(w: WellRecord): {
  refno?: number;
  source?: RefSource;
  sourceFieldsUsed: string[];
} {
  const reportRef = parseRefNoFromReport(w.report);
  const dnrIdCandidate = /^dnr[-_\s]?\d+/i.test(normalizeToken(w.id))
    ? w.id
    : undefined;
  const candidates: Array<{
    value: IdentityCandidate;
    allowShort: boolean;
    source: RefSource;
    fieldName: string;
  }> = [
    { value: w.refno, allowShort: false, source: "refno", fieldName: "refno" },
    { value: w.ref_no, allowShort: false, source: "ref_no", fieldName: "ref_no" },
    { value: w.wellid, allowShort: false, source: "wellid", fieldName: "wellid" },
    { value: w.well_id, allowShort: false, source: "well_id", fieldName: "well_id" },
    { value: w.permit, allowShort: false, source: "permit", fieldName: "permit" },
    { value: dnrIdCandidate, allowShort: true, source: "id_dnr", fieldName: "id" },
    { value: reportRef, allowShort: false, source: "report_refno", fieldName: "report" },
  ];
  for (const c of candidates) {
    const digits = normalizeDigits(c.value);
    if (!digits) continue;
    if (!c.allowShort && digits.length < 4) continue;
    const n = Number.parseInt(digits, 10);
    if (Number.isFinite(n)) {
      return { refno: n, source: c.source, sourceFieldsUsed: [c.fieldName] };
    }
  }
  return { sourceFieldsUsed: [] };
}

export function resolveWellRefNo(w: WellRecord): number | undefined {
  return resolveWellRefNoWithSource(w).refno;
}

export function resolveCanonicalWellIdentity(w: WellRecord): {
  canonicalId: string;
  refno?: number;
  aliases: string[];
  confidence: IdentityConfidence;
  provenance: string[];
  sourceFieldsUsed: string[];
  resolverVersion: string;
} {
  const refResolution = resolveWellRefNoWithSource(w);
  const refno = refResolution.refno;
  const aliasSet = new Set<string>();
  const sourceFieldsUsed = new Set<string>(refResolution.sourceFieldsUsed);
  const provenance = new Set<string>();

  const reportRef = parseRefNoFromReport(w.report);
  const aliasCandidates: IdentityCandidate[] = [
    w.id,
    w.wellid,
    w.well_id,
    w.permit,
    w.refno,
    w.ref_no,
    reportRef,
  ];
  for (const c of aliasCandidates) {
    const alias = normalizeAlias(c);
    if (alias) aliasSet.add(alias);
    const digits = normalizeDigits(c);
    if (digits) {
      aliasSet.add(digits);
      aliasSet.add(`DNR${digits}`);
    }
  }

  if (typeof refno === "number") {
    const canonical = `DNR-${refno}`;
    aliasSet.add(canonical.replace(/[^A-Z0-9]+/g, ""));
    provenance.add("numeric_ref");
    if (refResolution.source === "report_refno") provenance.add("report_url_ref");
    return {
      canonicalId: canonical,
      refno,
      aliases: Array.from(aliasSet),
      confidence: "high",
      provenance: Array.from(provenance),
      sourceFieldsUsed: Array.from(sourceFieldsUsed),
      resolverVersion: WELL_IDENTITY_RESOLVER_VERSION,
    };
  }

  const plainId = normalizeAlias(w.id || w.wellid || w.well_id || w.permit);
  if (normalizeToken(w.id)) sourceFieldsUsed.add("id");
  if (normalizeToken(w.wellid)) sourceFieldsUsed.add("wellid");
  if (normalizeToken(w.well_id)) sourceFieldsUsed.add("well_id");
  if (normalizeToken(w.permit)) sourceFieldsUsed.add("permit");
  if (plainId) {
    provenance.add("text_identifier");
    return {
      canonicalId: `WELL-${plainId}`,
      aliases: Array.from(aliasSet),
      confidence: "medium",
      provenance: Array.from(provenance),
      sourceFieldsUsed: Array.from(sourceFieldsUsed),
      resolverVersion: WELL_IDENTITY_RESOLVER_VERSION,
    };
  }

  const lat = normalizeToken(w.lat);
  const lon = normalizeToken(w.lon);
  const owner = normalizeAlias(w.owner);
  const county = normalizeAlias(w.county);
  const depth = normalizeToken(w.depth);
  const report = normalizeToken(w.report);
  if (lat) sourceFieldsUsed.add("lat");
  if (lon) sourceFieldsUsed.add("lon");
  if (owner) sourceFieldsUsed.add("owner");
  if (county) sourceFieldsUsed.add("county");
  if (depth) sourceFieldsUsed.add("depth");
  if (report) sourceFieldsUsed.add("report");
  const fallbackHash = stableHashHex([lat, lon, owner, county, depth, report]);
  provenance.add("stable_hash_fallback");
  return {
    canonicalId: `WELL-${fallbackHash}`,
    aliases: Array.from(aliasSet),
    confidence: "low",
    provenance: Array.from(provenance),
    sourceFieldsUsed: Array.from(sourceFieldsUsed),
    resolverVersion: WELL_IDENTITY_RESOLVER_VERSION,
  };
}
