/**
 * Hub-only lithology cleanup for area analytics (Scheduling, Driller job, Optimization).
 * Does not change what is stored in DNR chunks or shown in the standalone well viewer modal.
 */

const MAX_DEPTH_FT = 6000;
/** Same as Python lithology_normalize: merge touch/overlap/small gaps for identical formation text. */
const MERGE_GAP_FT = 0.49;

const JUNK_FORMATION =
  /^(n\/?a|n\.\s*a\.?|unknown|unk\.?|[-–—.]+|see\s+report|none|tbd)$/i;

export function firstDepthNumber(raw: string): string {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .trim();
  const m = s.match(/(\d+\.?\d*)/);
  return m?.[1] ?? "";
}

function fmtDepth(n: number): string {
  const r = Math.round(n * 1e4) / 1e4;
  if (Math.abs(r - Math.round(r)) < 1e-4) return String(Math.round(r));
  const t = r.toFixed(4).replace(/\.?0+$/, "");
  return t || "0";
}

function normalizeFormation(raw: unknown): string {
  let s = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (JUNK_FORMATION.test(s)) s = "—";
  return s || "—";
}

export function normalizeLithologyInterval(
  topRaw: unknown,
  bottomRaw: unknown,
  formationRaw: unknown,
): { top: string; bottom: string; formation: string } | null {
  const topS = firstDepthNumber(String(topRaw ?? ""));
  const bottomS = firstDepthNumber(String(bottomRaw ?? ""));
  if (!topS || !bottomS) return null;
  if (!/^\d+\.?\d*$/.test(topS) || !/^\d+\.?\d*$/.test(bottomS)) return null;
  const t = parseFloat(topS);
  const b = parseFloat(bottomS);
  if (!Number.isFinite(t) || !Number.isFinite(b)) return null;
  if (t < 0 || b <= t || b > MAX_DEPTH_FT || t > MAX_DEPTH_FT) return null;
  const formation = normalizeFormation(formationRaw);
  if (b - t < 0.01) return null;
  return { top: fmtDepth(t), bottom: fmtDepth(b), formation };
}

function sortByTop(layers: { top: string; bottom: string; formation: string }[]) {
  return [...layers].sort((a, b) => parseFloat(a.top) - parseFloat(b.top));
}

function dedupeLayers(
  layers: { top: string; bottom: string; formation: string }[],
) {
  const seen = new Set<string>();
  const out: { top: string; bottom: string; formation: string }[] = [];
  for (const row of layers) {
    const key = `${row.top}|${row.bottom}|${row.formation.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...row });
  }
  return out;
}

function mergeContiguousSameFormation(
  layers: { top: string; bottom: string; formation: string }[],
) {
  if (layers.length < 2) return layers;
  const out: { top: string; bottom: string; formation: string }[] = [];
  let cur = { ...layers[0]! };
  for (let i = 1; i < layers.length; i++) {
    const nxt = layers[i]!;
    const ct = parseFloat(cur.top);
    const cb = parseFloat(cur.bottom);
    const nt = parseFloat(nxt.top);
    const nb = parseFloat(nxt.bottom);
    if (
      !Number.isFinite(ct) ||
      !Number.isFinite(cb) ||
      !Number.isFinite(nt) ||
      !Number.isFinite(nb)
    ) {
      out.push(cur);
      cur = { ...nxt };
      continue;
    }
    const f0 = cur.formation.trim().toLowerCase();
    const f1 = nxt.formation.trim().toLowerCase();
    if (f0 === f1 && f0 && nt <= cb + MERGE_GAP_FT) {
      cur.top = fmtDepth(Math.min(ct, nt));
      cur.bottom = fmtDepth(Math.max(cb, nb));
      continue;
    }
    out.push(cur);
    cur = { ...nxt };
  }
  out.push(cur);
  return out;
}

/**
 * Normalize raw lithology_json layers for hub analytics only.
 */
export function finalizeLithologyLayersForHub(raw: unknown[]): unknown[] {
  const cleaned: { top: string; bottom: string; formation: string }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const formationRaw =
      o.formation ??
      o.Formation ??
      o.material ??
      o.Material ??
      o.description ??
      o.Description ??
      o.lithology ??
      o.Lithology ??
      o.layer_desc ??
      o.strata ??
      o.Strata;
    const norm = normalizeLithologyInterval(
      o.top ??
        o.Top ??
        o.from ??
        o.From ??
        o.depth_from ??
        o.DepthFrom ??
        o.depth_top ??
        o.DepthTop ??
        o.start_depth ??
        o.upper_depth ??
        o.upperDepth ??
        o.begin_depth ??
        o.BeginDepth ??
        o.start ??
        o.Start,
      o.bottom ??
        o.Bottom ??
        o.to ??
        o.To ??
        o.depth_to ??
        o.DepthTo ??
        o.depth_bottom ??
        o.DepthBottom ??
        o.end_depth ??
        o.lower_depth ??
        o.lowerDepth ??
        o.end ??
        o.End,
      formationRaw,
    );
    if (norm) cleaned.push(norm);
  }
  if (!cleaned.length) return [];
  let layers = sortByTop(cleaned);
  layers = dedupeLayers(layers);
  layers = sortByTop(layers);
  layers = mergeContiguousSameFormation(layers);
  return layers;
}
