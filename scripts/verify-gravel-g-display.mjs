#!/usr/bin/env node
/**
 * Verification-only: documents expected "g" (gravel thickness) behavior from the
 * standalone DNR viewer (index.html with gThicknessIsPlausibleVsCompletedDepth + drift path)
 * vs the current Driller Hub pipeline (viewer-well-map.ts / public/well-viewer/index.html).
 *
 * Does not import app code — logic is copied from DNR_Well_Viewer_Full_Demo/index.html
 * so we can prove invariants before syncing hub.
 *
 * Run: node scripts/verify-gravel-g-display.mjs
 */

function getWellDisplayDepthFt(w) {
  const d = parseFloat(String(w.depth ?? ""));
  if (!Number.isNaN(d) && d > 0) return d;
  return null;
}

/** Mirrors index.html gThicknessIsPlausibleVsCompletedDepth */
function gThicknessIsPlausibleVsCompletedDepth(gVal, w) {
  if (gVal == null || gVal <= 0) return false;
  const dep = getWellDisplayDepthFt(w);
  if (dep == null || Number.isNaN(dep) || dep <= 0) return true;
  const depN = Number(dep);
  if (gVal > depN + 0.5) return false;
  if (gVal >= depN - 1.5) return false;
  if (depN >= 15 && gVal / depN >= 0.92) return false;
  return true;
}

function capGravelColFt(n, w) {
  const d =
    w.depth != null && w.depth !== "" ? parseFloat(String(w.depth)) : NaN;
  if (!Number.isNaN(d) && d > 0 && n > d) return Math.round(d);
  return Math.round(n);
}

/** Drift from registry depth_bedrock only (typical chunk field). */
function driftFromDepthBedrock(w) {
  const db = parseFloat(String(w.depth_bedrock ?? ""));
  if (Number.isNaN(db) || db <= 0) return null;
  return capGravelColFt(db, w);
}

/**
 * Hub-style resolution (simplified): vein column, else single "litho max" synthetic.
 * Matches viewer-well-map.ts getGravelVeinDisplayFt structure (no plausibility, no drift).
 */
function hubStyleGravelG(w) {
  const vein = parseFloat(String(w.vein_size_ft ?? ""));
  if (!Number.isNaN(vein) && vein > 0) return Math.round(vein);
  const lithoMax = w.__syntheticLithoMax;
  if (lithoMax != null && lithoMax > 0) return Math.round(lithoMax);
  return null;
}

/**
 * Demo-style resolution (simplified): vein; else litho max if plausible; else drift if no lithology.
 */
function demoStyleGravelG(w) {
  const vein = parseFloat(String(w.vein_size_ft ?? ""));
  if (!Number.isNaN(vein) && vein > 0) return Math.round(vein);
  const lithoMax = w.__syntheticLithoMax;
  if (lithoMax != null && lithoMax > 0) {
    const mx = Math.round(lithoMax);
    if (gThicknessIsPlausibleVsCompletedDepth(mx, w)) return mx;
  }
  const hasLith = w.__hasLithLayers === true;
  if (!hasLith) {
    const drift = driftFromDepthBedrock(w);
    if (drift != null && drift > 0 && gThicknessIsPlausibleVsCompletedDepth(drift, w))
      return drift;
  }
  return null;
}

let failures = 0;
function assertEq(name, actual, expected) {
  if (actual !== expected) {
    console.error(`FAIL: ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
    failures++;
  } else {
    console.log(`ok: ${name}`);
  }
}

// --- Plausibility unit cases (gVal vs completed depth) ---
const w100 = { depth: "100" };
assertEq("plausibility rejects g === depth", gThicknessIsPlausibleVsCompletedDepth(100, w100), false);
assertEq("plausibility rejects g within 1.5 ft of depth", gThicknessIsPlausibleVsCompletedDepth(99, w100), false);
assertEq("plausibility rejects 93% of depth when dep>=15", gThicknessIsPlausibleVsCompletedDepth(93, w100), false);
assertEq("plausibility accepts 90 ft vs 100 ft completed", gThicknessIsPlausibleVsCompletedDepth(90, w100), true);
assertEq("plausibility accepts 40 ft drift vs 120 ft", gThicknessIsPlausibleVsCompletedDepth(40, { depth: "120" }), true);

// --- Integration: misleading "litho max = full column" ---
const wFullColumn = {
  depth: "80",
  __syntheticLithoMax: 80,
  __hasLithLayers: true,
};
assertEq("hub shows g=80 when litho max equals depth (bug)", hubStyleGravelG(wFullColumn), 80);
assertEq("demo hides g when litho max equals depth", demoStyleGravelG(wFullColumn), null);

// --- Integration: vein always wins (both agree) ---
const wVein = { depth: "200", vein_size_ft: "22", __syntheticLithoMax: 200 };
assertEq("hub respects vein column", hubStyleGravelG(wVein), 22);
assertEq("demo respects vein column over bad litho max", demoStyleGravelG(wVein), 22);

// --- Integration: no lithology, reasonable drift ---
const wDrift = {
  depth: "150",
  depth_bedrock: "55",
  __hasLithLayers: false,
};
assertEq("hub has no drift path → null", hubStyleGravelG(wDrift), null);
assertEq("demo uses drift when plausible", demoStyleGravelG(wDrift), 55);

// --- Integration: drift ~ full depth (registry noise) ---
const wBadDrift = {
  depth: "100",
  depth_bedrock: "100",
  __hasLithLayers: false,
};
assertEq("demo rejects drift equal to completed depth", demoStyleGravelG(wBadDrift), null);

// --- Shallow well: ratio rule uses dep>=15 ---
const wShallow = {
  depth: "12",
  __syntheticLithoMax: 11,
  __hasLithLayers: true,
};
assertEq("shallow: 11 vs 12 rejected (within 1.5 ft)", gThicknessIsPlausibleVsCompletedDepth(11, wShallow), false);
const wShallowOk = {
  depth: "12",
  __syntheticLithoMax: 8,
  __hasLithLayers: true,
};
assertEq("shallow: 8 vs 12 accepted", demoStyleGravelG(wShallowOk), 8);

console.log("\n--- Summary ---");
console.log(
  "Verified: demo pipeline rejects g≈completed depth and can use depth_bedrock drift when no lithology;",
);
console.log("hub pipeline omits plausibility and drift → more false g=depth, and null when only drift exists.");
if (failures) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
