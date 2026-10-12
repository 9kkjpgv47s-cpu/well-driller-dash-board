#!/usr/bin/env node
/**
 * API cold-start sweep for /api/wells-nearby + /api/area-insights.
 *
 * Sequential fetches (cache: "no-store") across 20 Indiana centers:
 *   pass 1 (cold) + pass 2 (warm): wells-nearby r=2 litho, area-insights r=2, r=0.3
 *   worst-case block (not gated): 3 centers r=5 + Indianapolis r=25, both routes
 *
 * Records status/ms/X-Wells-* headers/body size per request, prints p50/p95/max
 * per route per pass plus 5xx counts, and FAILs when the gate block shows any
 * 5xx or any X-Wells-Source other than "tiles".
 *
 * Usage:
 *   node scripts/qa/api-cold-sweep.mjs --base http://localhost:3005 --label local
 *   node scripts/qa/api-cold-sweep.mjs --base https://driller-hub.vercel.app --label prod-before --centers 5 --skip-worst
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_BASE = path.resolve(__dirname, "../../../../docs/design/qa/api-cold-start");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, []),
);
const BASE = (args.base || "http://localhost:3005").replace(/\/$/, "");
const LABEL = args.label || "run";
const CENTER_LIMIT = Number(args.centers) || 20;
const SKIP_WORST = Boolean(args["skip-worst"]);

const CENTERS = [
  ["Indianapolis", 39.7684, -86.1581],
  ["Fort Wayne", 41.0793, -85.1394],
  ["Evansville", 37.9716, -87.5711],
  ["South Bend", 41.6764, -86.252],
  ["Bloomington", 39.1653, -86.5264],
  ["Lafayette", 40.4167, -86.8753],
  ["Muncie", 40.1934, -85.3864],
  ["Terre Haute", 39.4667, -87.4139],
  ["Columbus", 39.2014, -85.9214],
  ["Metamora", 39.4453, -85.1297],
  ["Mooresville", 39.6009, -86.5265],
  ["Kokomo", 40.4864, -86.1336],
  ["Elkhart", 41.682, -85.9767],
  ["Richmond", 39.8289, -84.8902],
  ["New Albany", 38.2856, -85.8241],
  ["Vincennes", 38.6773, -87.5286],
  ["Michigan City", 41.7075, -86.895],
  ["Valparaiso", 41.4731, -87.0611],
  ["Anderson", 40.1053, -85.6803],
  ["Jasper", 38.3914, -86.9311],
].slice(0, CENTER_LIMIT);

const WORST = [
  ["Indianapolis", 39.7684, -86.1581, 25],
  ["Indianapolis", 39.7684, -86.1581, 5],
  ["Fort Wayne", 41.0793, -85.1394, 5],
  ["Evansville", 37.9716, -87.5711, 5],
];

const R = [];
const row = (r) => R.push(r);

async function hit(city, lat, lon, route, radius, pass, gate) {
  const url =
    route === "wells-nearby"
      ? `${BASE}/api/wells-nearby?lat=${lat}&lon=${lon}&radius=${radius}&limit=800&lithology=1`
      : `${BASE}/api/area-insights?lat=${lat}&lon=${lon}&radius=${radius}`;
  const t0 = performance.now();
  let rec = {
    pass, gate, city, route, radius, url,
    status: 0, ms: 0, source: "", tiles: "", inRadius: "", bytes: 0, fallback: "", error: "",
  };
  try {
    const res = await fetch(url, { cache: "no-store" });
    const buf = await res.arrayBuffer();
    rec.ms = Math.round(performance.now() - t0);
    rec.status = res.status;
    rec.source = res.headers.get("x-wells-source") || "";
    rec.tiles = res.headers.get("x-wells-tiles") || "";
    rec.inRadius = res.headers.get("x-wells-in-radius") || "";
    rec.bytes = buf.byteLength;
    try {
      const j = JSON.parse(Buffer.from(buf).toString("utf-8"));
      if (j && j.fallback) rec.fallback = String(j.fallback);
      if (j && j.error) rec.error = String(j.error).slice(0, 160);
    } catch { /* non-JSON body (e.g. Next _error HTML) */ }
  } catch (e) {
    rec.ms = Math.round(performance.now() - t0);
    rec.error = `fetch failed: ${String(e).slice(0, 160)}`;
  }
  row(rec);
  const flag = rec.status >= 500 ? " <-- 5xx" : rec.status !== 200 ? " <-- !200" : "";
  console.log(
    `  ${pass} ${route} r=${radius} ${city.padEnd(14)} ${String(rec.status)} ${rec.ms}ms src=${rec.source || "-"} tiles=${rec.tiles || "-"} inR=${rec.inRadius || "-"} ${rec.bytes}B${flag}`,
  );
  return rec;
}

function stats(rows) {
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  if (!ms.length) return null;
  const pick = (q) => ms[Math.min(ms.length - 1, Math.ceil(q * ms.length) - 1)];
  return {
    n: ms.length,
    p50: pick(0.5),
    p95: pick(0.95),
    max: ms[ms.length - 1],
    s5xx: rows.filter((r) => r.status >= 500).length,
    non200: rows.filter((r) => r.status !== 200).length,
  };
}

console.log(`base=${BASE} label=${LABEL} centers=${CENTERS.length} worst=${SKIP_WORST ? "skip" : "run"}`);

for (const pass of ["cold", "warm"]) {
  console.log(`== ${pass} pass ==`);
  for (const [city, lat, lon] of CENTERS) {
    await hit(city, lat, lon, "wells-nearby", 2, pass, true);
    await hit(city, lat, lon, "area-insights", 2, pass, true);
    await hit(city, lat, lon, "area-insights", 0.3, pass, true);
  }
}

if (!SKIP_WORST) {
  console.log("== worst-case block (not gated) ==");
  for (const [city, lat, lon, radius] of WORST) {
    await hit(city, lat, lon, "wells-nearby", radius, "worst", false);
    await hit(city, lat, lon, "area-insights", radius, "worst", false);
  }
}

console.log("\n== summary ==");
let fail = false;
for (const pass of ["cold", "warm", "worst"]) {
  for (const route of ["wells-nearby", "area-insights"]) {
    for (const radius of [...new Set(R.filter((r) => r.pass === pass && r.route === route).map((r) => r.radius))]) {
      const rows = R.filter((r) => r.pass === pass && r.route === route && r.radius === radius);
      const s = stats(rows);
      if (!s) continue;
      console.log(
        `  ${pass} ${route} r=${radius}: n=${s.n} p50=${s.p50}ms p95=${s.p95}ms max=${s.max}ms 5xx=${s.s5xx} non200=${s.non200}`,
      );
    }
  }
}
const gate = R.filter((r) => r.gate);
const gate5xx = gate.filter((r) => r.status >= 500);
const gateBadSource = gate.filter((r) => r.status === 200 && r.source !== "tiles");
console.log(
  `gate: ${gate.length} requests, 5xx=${gate5xx.length}, non-tiles-source-on-200=${gateBadSource.length}`,
);
if (gate5xx.length || gateBadSource.length) {
  fail = true;
  for (const r of [...gate5xx, ...gateBadSource]) {
    console.log(`  FAIL ${r.pass} ${r.route} r=${r.radius} ${r.city}: status=${r.status} src=${r.source || "-"} err=${r.error}`);
  }
  console.log("FAIL: gate block had 5xx or non-tiles source");
} else {
  console.log("PASS: gate block clean (all 200, X-Wells-Source=tiles)");
}

const outDir = path.join(OUT_BASE, LABEL);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "RESULTS.json"),
  JSON.stringify({ base: BASE, label: LABEL, ranAt: new Date().toISOString(), fail, rows: R }, null, 2),
);
let md = `| pass | city | route | radius | status | ms | source | tiles | inRadius | bytes | fallback | error |\n`;
md += "|---|---|---|---|---|---|---|---|---|---|---|---|\n";
for (const r of R) {
  md += `| ${r.pass} | ${r.city} | ${r.route} | ${r.radius} | ${r.status} | ${r.ms} | ${r.source} | ${r.tiles} | ${r.inRadius} | ${r.bytes} | ${r.fallback} | ${String(r.error).replace(/\|/g, "\\|")} |\n`;
}
fs.writeFileSync(path.join(outDir, "RAW.md"), md);
console.log(`wrote ${outDir}/{RESULTS.json,RAW.md}`);
process.exit(fail ? 1 : 0);
