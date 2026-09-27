#!/usr/bin/env node
/**
 * design-baseline accessibility + geometry audit (Phase 5).
 *
 *   node audit.mjs --out <dir> \
 *     --base http://localhost:3001 [--baseline http://localhost:3005] \
 *     [--viewer-path /well-viewer/index.html]
 *
 * Produces axe.json (serious/critical violations per page x theme, before vs
 * after), taps.json (min tap-target sizes for chrome controls) and
 * contrast.json (WCAG ratios for chrome text tokens per theme).
 * axe-core is injected from the C&J OS node_modules (CJ_AXE_PATH override).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const AXE_CANDIDATES = [
  process.env.CJ_AXE_PATH,
  "/Users/dominiceasterling/Projects/cj-os/node_modules/axe-core/axe.min.js",
].filter(Boolean);
const PWT = [
  process.env.CJ_PLAYWRIGHT_PATH,
  "/Users/dominiceasterling/Projects/cj-os/node_modules/playwright",
].filter(Boolean);

function load(p) {
  for (const c of p) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error("missing module: " + p.join(", "));
}

function resolvePath(p) {
  for (const c of p) {
    try {
      return require.resolve(c);
    } catch {}
  }
  throw new Error("missing file: " + p.join(", "));
}

const TARGET = { lat: 39.763, lon: -86.399 };
const THEMES = ["light", "dark", "field"];
// Tokens whose data/legend colors are locked — axe findings on nodes inside
// these containers are reported separately, not gated.
const LOCKED_SCOPE =
  "#map, .leaflet-container, .cj-plate, .cj-filter-card, #wellsList, #modalBody, .toggle-wrap";

// WCAG 2.x relative luminance + contrast ratio.
function lum(hex) {
  const c = hex.replace("#", "");
  const f = (i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
function ratio(fg, bg) {
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Theme token tables (must mirror design/cj/tokens.css — audited, not imported,
// so drift is visible in the report).
const TOKEN_TABLE = {
  light: {
    bg: "#F6F4EF", surface: "#FBFAF7",
    ink: "#0F1522", "ink-2": "#3A4150", "ink-3": "#565E6A", "ink-4": "#5F6672",
    accent: "#C60000", "accent-ink": "#8F0000",
  },
  dark: {
    bg: "#0A0F1A", surface: "#0E1420",
    ink: "#EDEBE6", "ink-2": "#B9BCC4", "ink-3": "#8B939F", "ink-4": "#828A96",
    accent: "#F2554D", "accent-ink": "#FF8A80",
  },
  field: {
    bg: "#FFFFFF", surface: "#FFFFFF",
    ink: "#000000", "ink-2": "#1E232C", "ink-3": "#3A4150", "ink-4": "#4A515C",
    accent: "#B00000", "accent-ink": "#7A0000",
  },
};

function contrastReport() {
  const out = {};
  for (const [theme, t] of Object.entries(TOKEN_TABLE)) {
    out[theme] = {};
    for (const bg of ["bg", "surface"]) {
      out[theme][bg] = {};
      for (const fg of ["ink", "ink-2", "ink-3", "ink-4", "accent", "accent-ink"]) {
        out[theme][bg][fg] = +ratio(t[fg], t[bg]).toFixed(2);
      }
    }
  }
  return out;
}

async function runAxe(page, axeSrc) {
  await page.evaluate(axeSrc);
  return page.evaluate(async (lockedScope) => {
     
    const res = await axe.run(document, {
      resultTypes: ["violations"],
    });
    const inside = (node) => {
      try {
        return node.element
          ? !!node.element.closest(lockedScope)
          : !!document
              .querySelector(node.target?.[0])
              ?.closest(lockedScope);
      } catch {
        return false;
      }
    };
    const rows = [];
    for (const v of res.violations) {
      for (const n of v.nodes) {
        rows.push({
          id: v.id,
          impact: v.impact,
          target: n.target?.join(" ") ?? "",
          summary: (n.failureSummary || "").slice(0, 160),
          locked: inside(n),
        });
      }
    }
    return rows;
  }, LOCKED_SCOPE);
}

async function measureTaps(page) {
  return page.evaluate((lockedScope) => {
    const seen = new Set();
    const rows = [];
    for (const el of document.querySelectorAll(
      "button, a[href], input, select, textarea, [role='button'], label.toggle-switch",
    )) {
      if (el.closest(lockedScope)) continue; // data/marker interior
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const key = `${el.tagName}|${el.id || el.className}|${Math.round(b.left)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Effective tap target: a control wrapped in a <label> clicks through
      // the label, so report the larger of the two boxes.
      const lab = el.closest("label");
      const lb = lab ? lab.getBoundingClientRect() : b;
      rows.push({
        sel:
          el.id ||
          el.getAttribute("aria-label") ||
          (el.textContent || "").trim().slice(0, 30) ||
          el.className.toString().slice(0, 30),
        w: +Math.max(b.width, lb.width).toFixed(1),
        h: +Math.max(b.height, lb.height).toFixed(1),
        ownH: +b.height.toFixed(1),
        viaLabel: !!(lab && lb.height > b.height),
      });
    }
    return rows;
  }, LOCKED_SCOPE);
}

async function auditPage({ browser, url, theme, waitSel, waitMs }) {
  const { chromium } = load(PWT);
  void chromium;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "America/Indiana/Indianapolis",
    serviceWorkers: "block",
  });
  if (theme) {
    await context.addInitScript((t) => {
      try {
        localStorage.setItem("cj-theme", t);
      } catch {}
    }, theme);
  }
  // Same stubbing as the capture harness: same-origin only.
  const origin = new URL(url).origin;
  await context.route(/.*/, (route) => {
    const u = new URL(route.request().url());
    if (
      ["data:", "blob:", "about:"].includes(u.protocol) ||
      u.origin === origin
    )
      return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (waitSel)
    await page.waitForSelector(waitSel, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(waitMs ?? 2500);
  const axeSrc = fs.readFileSync(resolvePath(AXE_CANDIDATES), "utf8");
  const violations = await runAxe(page, axeSrc);
  const taps = await measureTaps(page);
  await context.close();
  return { violations, taps };
}

function summarize(rows) {
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let locked = 0;
  for (const r of rows) {
    if (r.locked) {
      locked++;
      continue;
    }
    if (byImpact[r.impact] != null) byImpact[r.impact]++;
  }
  return { ...byImpact, lockedScoped: locked, total: rows.length };
}

async function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) args[a.slice(2)] = process.argv[++i];
  }
  if (!args.out) {
    console.error("usage: audit.mjs --out <dir> --base <url> [--baseline <url>]");
    process.exit(2);
  }
  const outDir = path.resolve(args.out);
  const base = (args.base ?? "http://localhost:3001").replace(/\/$/, "");
  const before = args.baseline?.replace(/\/$/, "") ?? null;
  const viewerPath = args["viewer-path"] ?? "/well-viewer/index.html";
  fs.mkdirSync(outDir, { recursive: true });
  const { chromium } = load(PWT);
  const browser = await chromium.launch({ headless: true });

  const axe = {};
  const taps = {};
  const jobs = [];
  if (before) {
    jobs.push({ key: `hub-before`, url: `${before}/?lat=${TARGET.lat}&lon=${TARGET.lon}`, theme: null, waitSel: ".leaflet-container" });
    jobs.push({ key: `viewer-before`, url: `${before}${viewerPath}?lat=${TARGET.lat}&lon=${TARGET.lon}`, theme: null, waitSel: "#map .leaflet-marker-icon" });
  }
  for (const theme of THEMES) {
    jobs.push({ key: `hub-${theme}`, url: `${base}/?lat=${TARGET.lat}&lon=${TARGET.lon}`, theme, waitSel: ".leaflet-container" });
    jobs.push({ key: `viewer-${theme}`, url: `${base}${viewerPath}?lat=${TARGET.lat}&lon=${TARGET.lon}`, theme, waitSel: "#map .leaflet-marker-icon" });
  }
  if (args.only) {
    const keep = args.only.split(",");
    jobs.splice(0, jobs.length, ...jobs.filter((j) => keep.some((k) => j.key.startsWith(k))));
  }
  for (const j of jobs) {
    try {
      const r = await auditPage({ browser, ...j });
      axe[j.key] = { url: j.url, theme: j.theme, ...summarize(r.violations), findings: r.violations };
      taps[j.key] = r.taps;
      console.log(`${j.key}:`, JSON.stringify(summarize(r.violations)), `taps:${r.taps.length}`);
    } catch (e) {
      axe[j.key] = { url: j.url, theme: j.theme, error: String(e.stack || e).slice(0, 800) };
      console.log(`${j.key}: ERROR ${String(e.stack || e).slice(0, 400)}`);
    }
  }
  await browser.close();

  const contrast = contrastReport();
  fs.writeFileSync(path.join(outDir, "axe.json"), JSON.stringify(axe, null, 2));
  fs.writeFileSync(path.join(outDir, "taps.json"), JSON.stringify(taps, null, 2));
  fs.writeFileSync(path.join(outDir, "contrast.json"), JSON.stringify(contrast, null, 2));

  // Console summary tables.
  console.log("\n=== contrast (fg on bg / surface) ===");
  for (const [theme, t] of Object.entries(contrast)) {
    for (const bg of Object.keys(t)) {
      console.log(
        `${theme.padEnd(6)} on ${bg.padEnd(8)} ` +
          Object.entries(t[bg]).map(([k, v]) => `${k}:${v}`).join("  "),
      );
    }
  }
  console.log("\n=== tap targets: min dims (chrome only) ===");
  for (const [k, list] of Object.entries(taps)) {
    if (!list?.length) continue;
    const minH = Math.min(...list.map((t) => t.h));
    const small = list.filter((t) => t.h < 40 || t.w < 40);
    console.log(`${k}: controls=${list.length} minH=${minH} under40=${small.length}`);
  }
  console.log("DONE", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
