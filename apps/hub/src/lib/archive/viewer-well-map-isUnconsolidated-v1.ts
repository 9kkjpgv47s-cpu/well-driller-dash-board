/**
 * FROZEN SNAPSHOT — viewer isUnconsolidatedWellViewer logic before dual-label + construction.
 * Do not edit. Revert reference only.
 * Live path: apps/hub/src/lib/viewer-well-map.ts (uses classifyWellDual / formation-class v3)
 * Snapshot date: 2026-07-21
 *
 * Behavioral notes of this v1 path:
 * - Estimated location handled separately for color (green) but isUnconsolidated still runs.
 * - Lithology water-bearing thickness OR aquifer text OR screen → uncon
 * - Rock top / depth vs bedrock residual → rock
 * - No casing+open-hole construction test
 * - "SAND ROCK" could count as sand via generic sand matching in lithology helpers
 */
export const VIEWER_UNCON_V1_ARCHIVED = true;
export const VIEWER_UNCON_V1_NOTES = `
FROZEN: original isUnconsolidatedWellViewer in viewer-well-map.ts used:
  overrides → lithology_v2 sidecar → lithology vein thickness → aquifer text →
  depth_bedrock vs depth → litho rock top → screen diam/length.
`;
