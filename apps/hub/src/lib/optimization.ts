import {
  computeAreaInsights,
  type WellRecord,
} from "@/lib/area-well-analytics";
import { wellsWithinRadiusIndexed } from "@/lib/well-spatial-index";

export type OptimizationPriority = "depth" | "yield" | "balanced";

export type OptimizationInput = {
  lat: number;
  lon: number;
  radiusMiles: number;
  priority: OptimizationPriority;
};

export type OptimizationResult = {
  input: OptimizationInput;
  generatedAt: string;
  neighborhood: {
    sampleWellsInRadius: number;
    medianDepthFt: number;
    typicalStaticBandFt: string;
    notes: string[];
  };
  /** Heuristic scores 0–100 for UI only. */
  scores: {
    setupReadiness: number;
    logisticsFit: number;
    dataConfidence: number;
  };
  checklist: string[];
  /** True when stats come from live chunk data; false for deterministic fallback. */
  dataSource: "registry" | "mock";
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

function parseStaticFt(w: WellRecord): number | null {
  const raw = w.static_water ?? w.static_water_level;
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function staticBandFt(values: number[]): string {
  if (!values.length) return "unknown";
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length >= 4) {
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    return `${Math.round(q1)}–${Math.round(q3)} ft`;
  }
  return `${Math.round(sorted[0])}–${Math.round(sorted[sorted.length - 1])} ft`;
}

function priorityNotes(priority: OptimizationPriority): string {
  if (priority === "depth") {
    return "Priority favors depth expectations; compare median depth to your target footage.";
  }
  if (priority === "yield") {
    return "Priority favors yield-style signals; pump fields may be sparse in registry.";
  }
  return "Balanced view blends depth and yield heuristics.";
}

function buildChecklist(
  insights: ReturnType<typeof computeAreaInsights>,
  priority: OptimizationPriority,
): string[] {
  const items = [
    "Confirm loc_type and ground elevation from site walk or survey.",
    "Pull DNR report links for the closest 3–5 registry wells before spud.",
  ];
  if (insights.insightQuality.grade === "low") {
    items.push(
      "Sparse registry coverage in this radius — widen search or verify coordinates.",
    );
  }
  if (insights.gravelVeinDistribution.one + insights.gravelVeinDistribution.two > 0) {
    items.push(
      "Multiple gravel intervals appear nearby — plan screen options for stacked zones.",
    );
  }
  if (priority === "yield" && insights.yieldBuckets.unknown > insights.wellsWithGpm) {
    items.push(
      "Many nearby wells lack pump-rate fields — treat yield expectations cautiously.",
    );
  }
  items.push(
    "If static or gravel signals look unusual, plan extra screen options.",
  );
  return items;
}

/**
 * Deterministic mock optimization when chunk data is unavailable.
 */
export function computeOptimizationMock(
  input: OptimizationInput,
): OptimizationResult {
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
    "Chunk data unavailable — showing illustrative figures until registry load succeeds.",
    priorityNotes(priority),
  ];

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
    checklist: [
      "Confirm loc_type and ground elevation from site walk or survey.",
      "Pull DNR report links for the closest 3–5 registry wells before spud.",
      "If static or gravel signals look unusual, plan extra screen options.",
    ],
    dataSource: "mock",
  };
}

/** Registry-backed optimization from gz chunk wells. */
export function computeOptimizationFromWells(
  input: OptimizationInput,
  wells: WellRecord[],
): OptimizationResult {
  const { priority } = input;
  const inR = wellsWithinRadiusIndexed(
    wells,
    input.lat,
    input.lon,
    input.radiusMiles,
  );
  const insights = computeAreaInsights(
    wells,
    input.lat,
    input.lon,
    input.radiusMiles,
    { wellsInRadius: inR },
  );
  const statics: number[] = [];
  for (const w of inR) {
    const s = parseStaticFt(w);
    if (s != null) statics.push(s);
  }

  const n = insights.totalWellsInRadius;
  const gpmCoverage = n > 0 ? insights.wellsWithGpm / n : 0;
  const lithCoverage = n > 0 ? insights.wellsWithLithology / n : 0;
  const depthBias = priority === "depth" ? 8 : priority === "yield" ? -4 : 0;
  const yieldBias = priority === "yield" ? 10 : priority === "depth" ? -3 : 0;

  const dataConfidence = insights.insightQuality.score;
  const setupReadiness = clamp(
    Math.round(45 + gpmCoverage * 40 + yieldBias),
    35,
    95,
  );
  const logisticsFit = clamp(
    Math.round(45 + lithCoverage * 35 + depthBias),
    35,
    95,
  );

  const notes = [
    `Based on ${n.toLocaleString()} registry wells within ${input.radiusMiles} mi (live chunk data).`,
    priorityNotes(priority),
  ];
  if (insights.insightQuality.grade !== "high") {
    notes.push(insights.insightQuality.reasons[0] ?? "Limited signal coverage in this radius.");
  }

  const medianDepthFt =
    priority === "yield" && insights.depthMedianHighYieldFt != null
      ? Math.round(insights.depthMedianHighYieldFt)
      : priority === "depth" && insights.depthMedianLowYieldFt != null
        ? Math.round(insights.depthMedianLowYieldFt)
        : insights.depthMedianFt != null
          ? Math.round(insights.depthMedianFt)
          : 0;

  return {
    input,
    generatedAt: new Date().toISOString(),
    neighborhood: {
      sampleWellsInRadius: n,
      medianDepthFt,
      typicalStaticBandFt: staticBandFt(statics),
      notes,
    },
    scores: {
      setupReadiness,
      logisticsFit,
      dataConfidence,
    },
    checklist: buildChecklist(insights, priority),
    dataSource: "registry",
  };
}

/** @deprecated Use computeOptimizationFromWells or computeOptimizationMock. */
export function computeOptimization(input: OptimizationInput): OptimizationResult {
  return computeOptimizationMock(input);
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
