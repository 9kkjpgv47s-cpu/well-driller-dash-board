export type OptimizationPriority = "depth" | "yield" | "balanced";

export type OptimizationInput = {
  lat: number;
  lon: number;
  radiusMiles: number;
  priority: OptimizationPriority;
};

/** Shared crew checklist (also used when the optimization API is offline). */
export const SITE_PREP_CHECKLIST_ITEMS = [
  "Confirm loc_type and ground elevation from site walk or survey.",
  "Pull DNR report links for the closest 3–5 registry wells before spud.",
  "If static or gravel signals look unusual, plan extra screen options.",
] as const;

export type OptimizationResult = {
  input: OptimizationInput;
  generatedAt: string;
  /** Mocked “neighborhood” stats for MVP — replace with analytics service later. */
  neighborhood: {
    sampleWellsInRadius: number;
    medianDepthFt: number;
    typicalStaticBandFt: string;
    notes: string[];
  };
  /** Simple heuristic scores 0–100 for UI only. */
  scores: {
    setupReadiness: number;
    logisticsFit: number;
    dataConfidence: number;
  };
  checklist: string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hash01(lat: number, lon: number, salt: string) {
  const s = `${lat.toFixed(4)},${lon.toFixed(4)},${salt}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/**
 * Deterministic mock optimization for MVP demos.
 * Safe for caching: no I/O, no randomness.
 */
export function computeOptimization(input: OptimizationInput): OptimizationResult {
  const { lat, lon, radiusMiles, priority } = input;
  const r = clamp(radiusMiles, 0.5, 25);
  const baseCount = Math.round(12 + r * 4 + hash01(lat, lon, "n") * 8);
  const medianDepth = Math.round(110 + hash01(lat, lon, "d") * 90);
  const staticLow = Math.round(8 + hash01(lat, lon, "s") * 25);
  const staticHigh = staticLow + Math.round(15 + hash01(lat, lon, "s2") * 20);

  const depthBias = priority === "depth" ? 8 : priority === "yield" ? -4 : 0;
  const yieldBias = priority === "yield" ? 10 : priority === "depth" ? -3 : 0;

  const setupReadiness = clamp(
    Math.round(62 + hash01(lat, lon, "setup") * 28 + yieldBias),
    40,
    98,
  );
  const logisticsFit = clamp(
    Math.round(55 + hash01(lat, lon, "log") * 35 + depthBias * 0.5),
    40,
    96,
  );
  const dataConfidence = clamp(
    Math.round(50 + Math.min(r * 2, 20) + hash01(lat, lon, "conf") * 22),
    45,
    95,
  );

  const notes = [
    "Figures are illustrative until wired to canonical well export and analytics.",
    priority === "depth"
      ? "Priority favors depth expectations; verify with recent logs in county."
      : priority === "yield"
        ? "Priority favors yield-style signals; pump fields may be sparse in registry."
        : "Balanced view blends depth and yield heuristics.",
  ];

  const checklist = [...SITE_PREP_CHECKLIST_ITEMS];

  return {
    input,
    generatedAt: new Date().toISOString(),
    neighborhood: {
      sampleWellsInRadius: baseCount,
      medianDepthFt: medianDepth,
      typicalStaticBandFt: `${staticLow}–${staticHigh} ft`,
      notes,
    },
    scores: {
      setupReadiness,
      logisticsFit,
      dataConfidence,
    },
    checklist,
  };
}

export function parseOptimizationSearchParams(
  params: Record<string, string | string[] | undefined>,
): OptimizationInput | null {
  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const radiusMiles = Number(params.radiusMiles ?? params.radius);
  const priorityRaw = params.priority;
  const priority =
    typeof priorityRaw === "string" &&
    (priorityRaw === "depth" ||
      priorityRaw === "yield" ||
      priorityRaw === "balanced")
      ? priorityRaw
      : "balanced";

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusMiles)) {
    return null;
  }

  return {
    lat,
    lon,
    radiusMiles,
    priority,
  };
}
