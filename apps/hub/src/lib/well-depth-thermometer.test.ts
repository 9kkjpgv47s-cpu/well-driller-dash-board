import { describe, expect, it } from "vitest";
import {
  boreholeLeaderPath,
  buildDepthHistogram,
  buildDepthTicks,
  buildThermometerLayout,
  clampCursorDepth,
  computeDepthDomain,
  depthToY,
  isDepthInCursorBand,
  jitterFractionForKey,
  layoutBoreholeWellLabels,
  computeBoreholeGeometry,
  computeDynamicLabelMinGap,
  parseDepthInput,
  yToDepth,
} from "./well-depth-thermometer";

describe("well-depth-thermometer", () => {
  it("returns empty-state domain when no depths", () => {
    expect(computeDepthDomain([])).toEqual({ minFt: 0, maxFt: 300 });
  });

  it("pads depth domain around observed wells", () => {
    const domain = computeDepthDomain([100, 200, 280]);
    expect(domain.minFt).toBeLessThanOrEqual(100);
    expect(domain.maxFt).toBeGreaterThanOrEqual(280);
    expect(domain.minFt).toBeGreaterThanOrEqual(0);
  });

  it("anchors surface at zero for borehole domain", () => {
    const domain = computeDepthDomain([100, 200, 280], 0.05, {
      surfaceAtZero: true,
    });
    expect(domain.minFt).toBe(0);
    expect(domain.maxFt).toBeGreaterThanOrEqual(280);
  });

  it("maps depth to y with surface at top and depth increasing downward", () => {
    const domain = { minFt: 0, maxFt: 400 };
    const ySurface = depthToY(0, domain, 400);
    const yDeep = depthToY(400, domain, 400);
    expect(ySurface).toBeLessThan(yDeep);
  });

  it("round-trips y to depth within domain", () => {
    const domain = { minFt: 50, maxFt: 350 };
    const y = depthToY(200, domain, 500);
    const back = yToDepth(y, domain, 500);
    expect(back).toBe(200);
  });

  it("builds histogram bins across domain", () => {
    const domain = { minFt: 0, maxFt: 40 };
    const bins = buildDepthHistogram([5, 12, 13, 38], domain, 10);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(4);
    expect(bins.some((b) => b.startFt === 10 && b.count >= 2)).toBe(true);
  });

  it("applies deterministic jitter per well key", () => {
    const a = jitterFractionForKey("WI-12345");
    const b = jitterFractionForKey("WI-12345");
    const c = jitterFractionForKey("WI-99999");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(a).not.toBe(c);
  });

  it("marks wells in cursor band", () => {
    expect(isDepthInCursorBand(280, 285, 15)).toBe(true);
    expect(isDepthInCursorBand(250, 285, 15)).toBe(false);
  });

  it("builds layout with median default cursor", () => {
    const layout = buildThermometerLayout(
      [
        { id: "A", lat: 40, lon: -85, depth: "100" },
        { id: "B", lat: 40, lon: -85, depth: "200" },
        { id: "C", lat: 40, lon: -85, depth: "300" },
      ],
      { medianDepthFt: 200 },
    );
    expect(layout.lines).toHaveLength(3);
    expect(layout.defaultCursorFt).toBe(200);
    expect(layout.missingDepthCount).toBe(0);
    expect(layout.histogram.length).toBeGreaterThan(0);
  });

  it("counts wells missing depth", () => {
    const layout = buildThermometerLayout([
      { id: "A", lat: 40, lon: -85 },
      { id: "B", lat: 40, lon: -85, depth: "120" },
    ]);
    expect(layout.lines).toHaveLength(1);
    expect(layout.missingDepthCount).toBe(1);
  });

  it("truncates beyond max lines", () => {
    const wells = Array.from({ length: 850 }, (_, i) => ({
      id: `W-${i}`,
      lat: 40,
      lon: -85,
      depth: String(100 + (i % 50)),
    }));
    const layout = buildThermometerLayout(wells, { maxLines: 800 });
    expect(layout.lines).toHaveLength(800);
    expect(layout.truncatedCount).toBe(50);
  });

  it("generates sensible depth ticks", () => {
    const ticks = buildDepthTicks({ minFt: 0, maxFt: 300 });
    expect(ticks[0]?.depthFt).toBe(0);
    expect(ticks.some((t) => t.depthFt === 100 || t.depthFt === 125)).toBe(
      true,
    );
  });

  it("parses depth input", () => {
    expect(parseDepthInput("285")).toBe(285);
    expect(parseDepthInput("285.7")).toBe(286);
    expect(parseDepthInput("")).toBeNull();
    expect(parseDepthInput("-5")).toBeNull();
    expect(parseDepthInput("abc")).toBeNull();
  });

  it("clamps cursor to domain", () => {
    const domain = { minFt: 50, maxFt: 350 };
    expect(clampCursorDepth(10, domain)).toBe(50);
    expect(clampCursorDepth(400, domain)).toBe(350);
  });

  it("separates overlapping borehole labels on left and right", () => {
    const laid = layoutBoreholeWellLabels(
      [
        { key: "a", depthFt: 100, anchorY: 100 },
        { key: "b", depthFt: 102, anchorY: 105 },
        { key: "c", depthFt: 104, anchorY: 108 },
        { key: "d", depthFt: 200, anchorY: 250 },
      ],
      { minGapPx: 13, minY: 20, maxY: 400 },
    );
    expect(laid).toHaveLength(4);
    expect(laid.every((l) => l.label.endsWith(" ft"))).toBe(true);
    const left = laid.filter((l) => l.side === "left");
    const right = laid.filter((l) => l.side === "right");
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    for (const group of [left, right]) {
      const ys = group.map((g) => g.labelY).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) {
        expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(13);
      }
    }
  });

  it("builds elbow leader path when label Y differs from anchor", () => {
    const straight = boreholeLeaderPath("right", 80, 120, 140, 120);
    expect(straight).toBe("M 80 120 L 140 120");
    const elbow = boreholeLeaderPath("right", 80, 120, 140, 145);
    expect(elbow).toContain("L 113 120");
    expect(elbow).toContain("L 113 145");
  });

  it("uses symmetric formation wings and label reach", () => {
    const g = computeBoreholeGeometry(220);
    expect(g.boreLeft - g.leftLabelX).toBe(g.rightLabelX - g.boreRight);
    expect(g.boreLeft - g.leftLabelX).toBe(g.labelReach);
    expect(g.rightLabelX - g.boreRight).toBe(g.labelReach);
    expect(g.formationW).toBe(g.labelReach);
    expect(g.formationW).toBeGreaterThanOrEqual(36);
  });

  it("spreads labels farther on tablet/desktop layout", () => {
    const compact = computeBoreholeGeometry(220, 420, 28, 16, false);
    const spread = computeBoreholeGeometry(220, 420, 28, 16, true);
    expect(spread.labelReach).toBeGreaterThan(compact.labelReach);
    expect(spread.boreLeft - spread.leftLabelX).toBe(
      spread.rightLabelX - spread.boreRight,
    );
  });

  it("uses tighter label gaps when many wells share the plot", () => {
    const dense = computeDynamicLabelMinGap(24, 40, 360, false);
    const sparse = computeDynamicLabelMinGap(4, 40, 360, false);
    expect(dense).toBeLessThan(sparse);
    expect(dense).toBeGreaterThanOrEqual(16);
    expect(sparse).toBeLessThanOrEqual(24);
  });

  it("centers the borehole in the svg canvas", () => {
    const g = computeBoreholeGeometry(320);
    const boreCenter = (g.boreLeft + g.boreRight) / 2;
    expect(Math.abs(boreCenter - g.svgW / 2)).toBeLessThanOrEqual(1);
  });
});
