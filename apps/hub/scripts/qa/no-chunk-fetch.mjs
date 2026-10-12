#!/usr/bin/env node
/**
 * Mobile first-load API-only check (build 2026-10-12-mobile-dark-chips).
 *
 * The N6 done-criteria: when /api/wells-nearby + /api/area-insights succeed,
 * the hub page must NOT download the multi-MB registry chunks
 * (dnr_wells_base_chunk_*, dnr_wells_litho_chunk_*, dnr_wells_chunk_*).
 *
 * Loads https://driller-hub.vercel.app/?lat=39.6009&lon=-86.5265 (Mooresville)
 * on iPhone 14 Pro (webkit) + Pixel 7 (chromium), fresh contexts, SW blocked;
 * waits for network idle + 10 s and records every request.
 *
 * PASS iff per device:
 *   - /api/wells-nearby responded 200 with x-wells-source: tiles
 *   - /api/area-insights responded 200
 *   - zero request URLs contain dnr_wells_(base|litho)_chunk_ or dnr_wells_chunk_
 *
 * Run from apps/hub:  node scripts/qa/no-chunk-fetch.mjs [--base URL]
 */
import { createRequire } from "module";
import fs from "node:fs";
import path from "path";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium, webkit, devices } = require("playwright");

const A = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) A[a.slice(2)] = process.argv[i + 1]?.startsWith("--") ? true : process.argv[++i];
}
const OUT = path.resolve(A.out || "../../docs/design/qa/mobile-no-chunk-fetch");
const ORIGIN = (A.base || "https://driller-hub.vercel.app").replace(/\/$/, "");
const URL_UNDER_TEST = `${ORIGIN}/?lat=39.6009&lon=-86.5265`;
const CHUNK_RE = /dnr_wells_(?:base|litho)_chunk_|dnr_wells_chunk_/;
fs.mkdirSync(`${OUT}/shots`, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = [];
const rec = (dev, name, expected, actual, pass) => {
  R.push({ dev, check: name, expected, actual: String(actual ?? "").replace(/\s+/g, " ").trim().slice(0, 400), pass: !!pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${dev} | ${name} | expected ${expected} | actual ${String(actual ?? "").slice(0, 200)}`);
};

async function runDevice(label, browser, devName) {
  const reqs = [];
  const d = devices[devName];
  const ctx = await browser.newContext({ ...d, serviceWorkers: "block" });
  const pg = await ctx.newPage();
  pg.on("response", (res) => {
    reqs.push({
      url: res.url(),
      status: res.status(),
      source: res.headers()["x-wells-source"] || "",
      tiles: res.headers()["x-wells-tiles"] || "",
    });
  });
  const consoleErrs = [];
  pg.on("pageerror", (e) => consoleErrs.push(String(e && e.message || e).slice(0, 200)));

  await pg.goto(URL_UNDER_TEST, { waitUntil: "domcontentloaded", timeout: 90000 });
  await pg.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await sleep(10000);

  const api = reqs.filter((r) => r.url.includes("/api/"));
  const wn = api.filter((r) => r.url.includes("/api/wells-nearby"));
  const ai = api.filter((r) => r.url.includes("/api/area-insights"));
  const chunks = reqs.filter((r) => CHUNK_RE.test(r.url));

  const wnOk = wn.some((r) => r.status === 200 && r.source === "tiles");
  rec(label, "/api/wells-nearby 200 + x-wells-source:tiles", "200 tiles", wn.map((r) => `${r.status}/${r.source || "-"}`).join(", ") || "no request", wnOk);
  const aiOk = ai.some((r) => r.status === 200);
  rec(label, "/api/area-insights 200", "200", ai.map((r) => `${r.status}`).join(", ") || "no request", aiOk);
  rec(label, "no registry chunk fetches", "0", chunks.length ? chunks.map((r) => r.url.split("/").pop()).join(", ") : 0, chunks.length === 0);

  // Map actually rendered wells (canvas tiles + markers present).
  const mapInfo = await pg.evaluate(() => ({
    markers: document.querySelectorAll(".leaflet-marker-icon").length,
    panes: document.querySelectorAll(".leaflet-pane").length,
    wellCount: (document.body.innerText.match(/wells?/i) || [""])[0],
  }));
  rec(label, "map markers rendered", ">0", `markers=${mapInfo.markers} panes=${mapInfo.panes}`, mapInfo.markers > 0);
  await pg.screenshot({ path: `${OUT}/shots/${label}.png`, fullPage: true });
  console.log(`  ${label}: ${reqs.length} requests, ${api.length} api, ${chunks.length} chunk, ${mapInfo.markers} markers, errs=${consoleErrs.length}`);
  for (const r of api) console.log(`    api ${r.status} ${r.source || "-"} ${r.url.replace(ORIGIN, "")}`);
  await ctx.close();
  return { label, reqs, chunks, consoleErrs };
}

const all = [];
let fail = false;
const wb = await webkit.launch();
all.push(await runDevice("iphone14p", wb, "iPhone 14 Pro"));
await wb.close();
const cb = await chromium.launch();
all.push(await runDevice("pixel7", cb, "Pixel 7"));
await cb.close();

fail = R.some((r) => !r.pass);
fs.writeFileSync(
  `${OUT}/RESULTS.json`,
  JSON.stringify({ url: URL_UNDER_TEST, at: new Date().toISOString(), fail, checks: R, runs: all.map((r) => ({ label: r.label, requests: r.reqs, consoleErrs: r.consoleErrs })) }, null, 2),
);
let md = `# mobile no-chunk-fetch — RAW\n\n- url: ${URL_UNDER_TEST}\n- run at: ${new Date().toISOString()}\n\n| dev | check | expected | actual | result |\n|---|---|---|---|---|\n`;
for (const r of R) md += `| ${r.dev} | ${r.check} | ${r.expected} | ${r.actual.replace(/\|/g, "/")} | ${r.pass ? "PASS" : "FAIL"} |\n`;
md += `\n## request log\n`;
for (const run of all) {
  md += `\n### ${run.label}\n`;
  for (const r of run.reqs) md += `- ${r.status} ${r.source || "-"} ${r.url}\n`;
}
fs.writeFileSync(`${OUT}/RAW.md`, md);
console.log(`DONE ${R.length} checks, ${R.filter((r) => !r.pass).length} FAIL → ${OUT}`);
process.exit(fail ? 1 : 0);
