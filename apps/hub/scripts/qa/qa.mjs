#!/usr/bin/env node
/**
 * Pre-deploy QA runner — Driller Hub + C&J Well Viewer.
 *
 * Usage (from apps/hub):
 *   node scripts/qa/qa.mjs matrix  --round 1            # devices × engines × themes load checks
 *   node scripts/qa/qa.mjs flows   --round 1            # deep hub interaction flows
 *   node scripts/qa/qa.mjs viewer  --round 1            # in-hub + standalone viewer flows
 *   node scripts/qa/qa.mjs parity  --round 1            # API path vs forced-fallback comparison
 *   node scripts/qa/qa.mjs gate    --round 1            # /design must be unreachable in prod
 *
 * Flags: --base http://localhost:3006  --standalone http://localhost:8791
 *        --out docs/design/qa         --engines chromium,webkit,firefox
 *        --only <substr>              # filter matrix rows by key substring
 *
 * Playwright is resolved from the cj-os checkout (not a hub dep).
 * Every subcommand writes <out>/round-<N>/<cmd>-*.json + screenshots.
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium, webkit, firefox, devices } = require("playwright");

const ARGS = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) ARGS[k] = process.argv[++i];
    else ARGS[k] = true;
  }
}
const CMD = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : (ARGS._ = null, process.argv.slice(3).find(a => !a.startsWith("--"))) || ARGS.cmd || null;
const CMDS = ["matrix", "flows", "viewer", "parity", "gate"];
const cmd = CMDS.includes(process.argv[2]) ? process.argv[2] : CMDS.find(c => ARGS[c]);
const BASE = (ARGS.base || "http://localhost:3006").replace(/\/$/, "");
const STANDALONE = (ARGS.standalone || "http://localhost:8791").replace(/\/$/, "");
const ROUND = ARGS.round || "1";
const OUT = path.resolve(ARGS.out || "docs/design/qa", `round-${ROUND}`);
// firefox is in ENGINES_ALL but excluded by default: the playwright-patched
// Nightly build (firefox-1543) fails to init a profile dir on this machine
// ("Could not find profile folder") even after reinstall — launchable but
// unusable. Pass --engines chromium,webkit,firefox to retry it.
const ENGINES = (ARGS.engines || "chromium,webkit").split(",");
const ONLY = ARGS.only || null;
fs.mkdirSync(OUT, { recursive: true });

const JOB_URL = fs.readFileSync("/tmp/cj-demo/url.txt", "utf8").trim().replace(/https?:\/\/[^/]+/, BASE);
const DISPATCH = fs.readFileSync("/tmp/cj-demo/dispatch.txt", "utf8");

const VIEWPORTS = [
  { key: "iphone-se", ...devices["iPhone SE (3rd gen)"] },
  { key: "iphone-se-1g", ...devices["iPhone SE"] },
  { key: "iphone-14pro", ...devices["iPhone 14 Pro"] },
  { key: "pixel-7", ...devices["Pixel 7"] },
  { key: "ipad-mini", ...devices["iPad Mini"] },
  { key: "ipad-pro11-land", ...devices["iPad Pro 11"], landscape: true },
  { key: "laptop-1280", viewport: { width: 1280, height: 800 } },
  { key: "desk-1440", viewport: { width: 1440, height: 900 } },
  { key: "desk-1920", viewport: { width: 1920, height: 1080 } },
  { key: "desk-2560", viewport: { width: 2560, height: 1440 } },
];

const BROWSERS = { chromium, webkit, firefox };
const TILE_RE = /(tile|arcgis|openstreetmap|basemap|tilecdn|wttr|nominatim|api\.weather|noaa)/i;

function issues(rec, sev, msg, extra) {
  rec.issues.push({ severity: sev, msg, ...(extra || {}) });
}

/** Attach console/pageerror/request-failed collectors to a page. */
function watch(page, rec) {
  page.on("console", (m) => {
    if (m.type() === "error") rec.consoleErrors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => rec.pageErrors.push(String(e).slice(0, 300)));
  page.on("requestfailed", (r) => {
    if (TILE_RE.test(r.url())) rec.tileFailures.push(r.url().slice(0, 140));
    else rec.failedRequests.push(`${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500 && !TILE_RE.test(r.url()))
      rec.failedRequests.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`);
  });
}

const SUM = `(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.right > vw + 1 && r.left < vw) {
      bad.push(el.tagName + "." + String(el.className).split(" ").slice(0,3).join("."));
      if (bad.length > 8) break;
    }
  }
  return { overflowX: document.documentElement.scrollWidth - vw, overflowers: bad };
})()`;

const TAP = `(() => {
  const bad = [];
  for (const el of document.querySelectorAll("button, a, input, select, [role=button]")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.display === "none" || cs.visibility === "hidden") continue;
    if (el.closest(".leaflet-container")) continue;
    const lab = el.closest("label");
    if (lab && lab !== el) {
      const lr = lab.getBoundingClientRect();
      if (lr.height >= 40 && lr.width >= 40) continue;
    }
    if (r.height < 40 && r.width < 40) bad.push((el.innerText || el.getAttribute("aria-label") || String(el.className)).trim().slice(0, 60) + " " + Math.round(r.width) + "x" + Math.round(r.height));
    if (bad.length > 12) break;
  }
  return bad;
})()`;

async function newPage(browser, vp, theme, extra = {}) {
  const opts = {
    viewport: vp.viewport,
    deviceScaleFactor: vp.deviceScaleFactor || 1,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.hasTouch,
    ...extra,
  };
  if (vp.landscape) opts.viewport = { width: vp.viewport.height, height: vp.viewport.width };
  const ctx = await browser.newContext(opts);
  if (theme && theme !== "system") await ctx.addInitScript((t) => localStorage.setItem("cj-theme", t), theme);
  if (theme === "field-legacy") await ctx.addInitScript(() => localStorage.setItem("cj-theme", "field"));
  const page = await ctx.newPage();
  return { ctx, page };
}

/* ------------------------------ matrix ------------------------------ */

async function matrix() {
  const results = [];
  await Promise.all(ENGINES.map(async (eng) => {
    const browser = await BROWSERS[eng].launch();
    for (const vp of VIEWPORTS) {
      for (const theme of ["light", "dark"]) {
        const key = `${eng}/${vp.key}/${theme}`;
        if (ONLY && !key.includes(ONLY)) continue;
        const rec = { key, engine: eng, device: vp.key, theme, issues: [], consoleErrors: [], pageErrors: [], failedRequests: [], tileFailures: [] };
        try {
          const { ctx, page } = await newPage(browser, vp, theme === "dark" ? "dark" : null);
          watch(page, rec);
          await page.goto(JOB_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
          // theme on <html> before first paint (FOUC check)
          rec.htmlTheme = await page.evaluate(() => document.documentElement.dataset.theme || null);
          try {
            await page.waitForSelector(".leaflet-marker-icon", { timeout: 120000 });
            rec.markers = await page.locator(".leaflet-marker-icon").count();
          } catch { issues(rec, "high", "map markers never appeared (120s)"); }
          try {
            await page.waitForSelector("button.well-card", { timeout: 60000 });
            rec.cards = await page.locator("button.well-card").count();
          } catch { issues(rec, "high", "nearest-well cards never rendered"); }
          await page.waitForTimeout(1500);
          const sum = await page.evaluate(SUM);
          rec.overflowX = sum.overflowX;
          if (sum.overflowX > 0) issues(rec, "high", `horizontal overflow ${sum.overflowX}px`, { els: sum.overflowers });
          rec.smallTargets = await page.evaluate(TAP);
          const shot = `${OUT}/matrix-${eng}-${vp.key}-${theme}.png`;
          await page.screenshot({ path: shot, fullPage: false });
          rec.shot = path.basename(shot);
          await ctx.close();
        } catch (e) {
          issues(rec, "critical", String(e).slice(0, 300));
        }
        results.push(rec);
        console.log(key, `markers=${rec.markers ?? "-"} cards=${rec.cards ?? "-"} ow=${rec.overflowX ?? "-"} issues=${rec.issues.length} cerr=${rec.consoleErrors.length} perr=${rec.pageErrors.length} freq=${rec.failedRequests.length}`);
      }
    }
    await browser.close();
  }));
  // stored 'field' legacy fallback check (chromium, desktop)
  {
    const browser = await chromium.launch();
    const rec = { key: "field-legacy", issues: [], consoleErrors: [], pageErrors: [], failedRequests: [], tileFailures: [] };
    const { ctx, page } = await newPage(browser, { viewport: { width: 1440, height: 900 } }, "field-legacy");
    watch(page, rec);
    await page.goto(JOB_URL, { waitUntil: "domcontentloaded" });
    rec.resolvedTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    if (rec.resolvedTheme === "field") issues(rec, "high", "stored field theme did not fall back");
    await ctx.close();
    await browser.close();
    results.push(rec);
    console.log("field-legacy →", rec.resolvedTheme);
  }
  fs.writeFileSync(`${OUT}/matrix.json`, JSON.stringify(results, null, 1));
}

/* ------------------------------ flows ------------------------------- */

async function flowHub(browser, vp, theme, tag) {
  const rec = { tag, issues: [], consoleErrors: [], pageErrors: [], failedRequests: [], tileFailures: [], steps: {} };
  const { ctx, page } = await newPage(browser, vp, theme === "dark" ? "dark" : null);
  watch(page, rec);
  const shot = async (name) => page.screenshot({ path: `${OUT}/flow-${tag}-${name}.png` });

  // 1. Empty state + paste dispatch + Generate
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  rec.steps.emptyH1 = await page.locator("body").innerText().then((t) => /dispatch|paste/i.test(t));
  const ta = page.locator("textarea").first();
  await ta.fill(DISPATCH);
  const genBtn = page.locator("button", { hasText: /generate|brief/i }).first();
  await genBtn.click();
  try {
    await page.waitForSelector(".leaflet-marker-icon", { timeout: 120000 });
    rec.steps.markersAfterGenerate = await page.locator(".leaflet-marker-icon").count();
  } catch { issues(rec, "high", "no markers after Generate"); }
  await page.waitForTimeout(2500);
  await shot("generated");

  // 2. Sections present
  const bodyTxt = await page.locator("body").innerText();
  for (const [k, re] of Object.entries({
    brief: /well|dispatch|job/i, weather: /forecast|GFS|ECMWF|NWS/i,
    wells: /registry wells/i, mapFilters: /well type|yield/i, areaInsights: /area|lithology/i,
  })) rec.steps[`section_${k}`] = re.test(bodyTxt);
  rec.steps.directionsLinks = await page.locator(`a[href*="maps.google"], a[href*="maps.apple"], a[href*="google.com/maps"], a[href*="maps:"]`).count();

  // 3. Filters toggle: marker count changes
  const before = rec.steps.markersAfterGenerate || 0;
  const tog = page.locator("button", { hasText: /dry hole/i }).first();
  if (await tog.count()) {
    await tog.click(); await page.waitForTimeout(1500);
    const after = await page.locator(".leaflet-marker-icon").count();
    rec.steps.filterToggle = { before, after };
    if (after === before) issues(rec, "med", "dry-hole filter toggle did not change marker count");
    await tog.click(); await page.waitForTimeout(1200);
  }

  // 4. Radius select (native <select aria-label="Registry search radius">)
  const radSel = page.locator('select[aria-label*="radius" i]').first();
  if (await radSel.count()) {
    await radSel.selectOption("5");
    await page.waitForTimeout(2500);
    rec.steps.radius5 = await page.locator(".leaflet-marker-icon").count();
    rec.steps.lithoAt5 = (await page.locator("body").innerText()).match(/Lithology intervals\s*([\d,]+)\s*\/\s*([\d,]+)/)?.[0] ?? null;
    await radSel.selectOption("2");
    await page.waitForTimeout(1500);
    rec.steps.radius2 = await page.locator(".leaflet-marker-icon").count();
    rec.steps.lithoAt2 = (await page.locator("body").innerText()).match(/Lithology intervals\s*([\d,]+)\s*\/\s*([\d,]+)/)?.[0] ?? null;
    if (rec.steps.lithoAt5 && rec.steps.lithoAt5 === rec.steps.lithoAt2)
      issues(rec, "high", "radius select had no effect on area-insights counts");
  } else rec.steps.radiusCtl = "not found";

  // 5. Tabs: Depth + ASL
  for (const tab of ["Depth", "ASL"]) {
    const b = page.locator("button", { hasText: new RegExp(`^${tab}|${tab}`) }).first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(1500); await shot(`tab-${tab}`); }
    else issues(rec, "med", `${tab} tab button not found`);
  }
  const aslBtn = page.locator("button", { hasText: /ground elevation|load ground/i }).first();
  if (await aslBtn.count()) { await aslBtn.click(); await page.waitForTimeout(4000); await shot("asl-loaded"); }
  // back to map tab
  const mapTab = page.locator("button", { hasText: /^Map|map/i }).first();
  if (await mapTab.count()) await mapTab.click();

  // 6. Nearest wells: mode toggle + click + keyboard + modal
  const seg = page.locator("button", { hasText: /^By depth$/ }).first();
  if (await seg.count()) { await seg.click(); await page.waitForTimeout(1500); await page.locator("button", { hasText: /^Closest$/ }).first().click(); await page.waitForTimeout(1000); }
  const card = page.locator("button.well-card").first();
  await card.click(); await page.waitForTimeout(1200);
  rec.steps.modalOpens = await page.locator("[role=dialog], .sheet, .cj-modal").count() > 0
    || /DNR-\d+/.test(await page.locator("body").innerText());
  rec.steps.modalDNRLink = await page.locator("[role=dialog] a[href*='in.gov'], [role=dialog] a[href*='dnr']").first().getAttribute("href").catch(() => null);
  await shot("modal");
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  rec.steps.modalEscCloses = await page.locator("[role=dialog]").count() === 0;
  // keyboard: focus card + Enter
  await card.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(900);
  rec.steps.enterOpens = /DNR-/.test(await page.locator("body").innerText());
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);

  // 7. Share link → fresh context → same state
  const shareBtn = page.locator("button, a", { hasText: /share|copy link/i }).first();
  if (await shareBtn.count()) { await shareBtn.click(); await page.waitForTimeout(800); }
  // reload persistence
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  rec.steps.reloadPersists = await page.locator(".leaflet-marker-icon").count() > 0;

  // 8. Theme toggle + FOUC + dark white-box probe
  await page.locator("button.theme-toggle").first().click();
  await page.waitForTimeout(400);
  rec.steps.themeAfterToggle = await page.evaluate(() => document.documentElement.dataset.theme);
  const whites = rec.steps.themeAfterToggle === "dark" ? await page.evaluate(`(() => {
    const out=[];
    for (const el of document.querySelectorAll("body *")) {
      const cs=getComputedStyle(el);
      const m=cs.backgroundColor.match(/rgba?\\(([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)/);
      if(!m) continue;
      const r=el.getBoundingClientRect();
      if (r.right < 0 || r.bottom < 0) continue; // offscreen (e.g. skip-link)
      if (+m[1]+ +m[2]+ +m[3] >= 600 && r.width>=40 && r.height>=16
          && !el.closest(".leaflet-container") && !el.closest(".btn-primary") && !el.classList.contains("well-tag")) {
        out.push(el.tagName+"."+String(el.className).split(" ")[0]);
        if(out.length>8) break;
      }
    }
    return out;
  })()`) : [];
  if (whites.length) issues(rec, "med", `near-white boxes in dark theme`, { els: whites });
  await shot("dark");
  const sum = await page.evaluate(SUM);
  if (sum.overflowX > 0) issues(rec, "high", `horizontal overflow ${sum.overflowX}px`, { els: sum.overflowers });
  rec.smallTargets = await page.evaluate(TAP);
  await ctx.close();
  return rec;
}

async function flows() {
  const results = [];
  const combos = [
    ["chromium", VIEWPORTS.find(v => v.key === "desk-1440"), "light"],
    ["chromium", VIEWPORTS.find(v => v.key === "iphone-14pro"), "light"],
    ["chromium", VIEWPORTS.find(v => v.key === "ipad-mini"), "dark"],
    ["webkit", VIEWPORTS.find(v => v.key === "iphone-14pro"), "light"],
    ["webkit", VIEWPORTS.find(v => v.key === "desk-1440"), "dark"],
  ];
  for (const [eng, vp, theme] of combos) {
    const browser = await BROWSERS[eng].launch();
    const tag = `${eng}-${vp.key}-${theme}`;
    try {
      const rec = await flowHub(browser, vp, theme, tag);
      results.push(rec);
      console.log(tag, "issues:", rec.issues.length, JSON.stringify(rec.steps).slice(0, 400));
    } catch (e) {
      results.push({ tag, issues: [{ severity: "critical", msg: String(e).slice(0, 300) }] });
      console.log(tag, "CRASH", String(e).slice(0, 200));
    }
    await browser.close();
  }
  fs.writeFileSync(`${OUT}/flows.json`, JSON.stringify(results, null, 1));
}

/* ------------------------------ viewer ------------------------------ */

async function viewerOne(browser, baseUrl, vp, theme, label) {
  const rec = { label, issues: [], consoleErrors: [], pageErrors: [], failedRequests: [], tileFailures: [], steps: {} };
  const { ctx, page } = await newPage(browser, vp, theme === "dark" ? "dark" : null,
    { permissions: ["geolocation"], geolocation: { latitude: 39.763, longitude: -86.399 } });
  watch(page, rec);
  const shot = async (n) => page.screenshot({ path: `${OUT}/viewer-${label}-${n}.png` });
  await page.goto(`${baseUrl}/well-viewer/index.html?lat=39.763&lon=-86.399`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (label.startsWith("standalone")) {
    // standalone root serves index.html directly
    await page.goto(`${baseUrl}/?lat=39.763&lon=-86.399`, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
  try {
    await page.waitForSelector("#map .leaflet-marker-icon", { timeout: 180000 });
    rec.steps.markers = await page.locator("#map .leaflet-marker-icon").count();
  } catch { issues(rec, "high", "viewer markers never appeared"); }
  await page.waitForTimeout(2000);
  await shot("load");

  // toggles count
  rec.steps.toggles = await page.locator(".toggle-wrap button, .filter-row button, button.tgl, .cj-filter-card button").count();
  // search
  const search = page.locator("input[type=search], input[placeholder*='ddress'], input[placeholder*='earch'], #q").first();
  if (await search.count()) {
    await search.fill("46123"); await page.waitForTimeout(1500);
    rec.steps.searchWorked = true;
  }
  // list click → modal
  const row = page.locator("#wellsList .card, #wellsList button, .wells-list .card").first();
  if (await row.count()) {
    await row.click(); await page.waitForTimeout(1200);
    rec.steps.modal = await page.locator("#wellModal:not(.hidden), #modalBody, [role=dialog]").count() > 0;
    rec.steps.dnrLink = await page.locator("#modalBody a[href*='in.gov'], #wellModal a[href*='in.gov'], a[href*='dnr']").first().getAttribute("href").catch(() => null);
    // log viewer
    const logBtn = page.locator("#btnViewLog").first();
    if (await logBtn.count()) {
      await logBtn.click(); await page.waitForTimeout(800);
      rec.steps.logViewer = await page.locator("#logViewerSection").isVisible().catch(() => false);
    }
    await shot("modal");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    rec.steps.escCloses = await page.locator("#wellModal.hidden").count() > 0
      || await page.locator("#wellModal").count() === 0;
    if (rec.steps.escCloses === false) {
      issues(rec, "med", "viewer modal did not close on Escape");
      await page.locator("#btnCloseModal").first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
  } else issues(rec, "med", "viewer list rows not found");
  // geolocation → Use My Location
  try {
    await ctx.grantPermissions(["geolocation"]);
    await ctx.setGeolocation({ latitude: 39.78, longitude: -86.15 });
    const locBtn = page.locator("button", { hasText: /Use My Location/i }).first();
    if (await locBtn.count()) {
      await locBtn.click(); await page.waitForTimeout(2500);
      rec.steps.geoOk = true;
    } else rec.steps.geoOk = "button not found";
  } catch (e) { rec.steps.geoOk = "err:" + String(e).slice(0, 80); }
  // theme toggle
  const tt = page.locator("button.theme-toggle").first();
  if (await tt.count()) {
    try {
      await tt.click({ timeout: 8000 });
      await page.waitForTimeout(400);
      rec.steps.theme = await page.evaluate(() => document.documentElement.dataset.theme);
    } catch (e) { issues(rec, "med", "theme-toggle not clickable", { err: String(e).slice(0, 120) }); }
  }
  // app-switch href
  rec.steps.appSwitch = await page.locator(".cj-app-switch").first().getAttribute("href").catch(() => null);
  const sum = await page.evaluate(SUM);
  if (sum.overflowX > 0) issues(rec, "high", `viewer horizontal overflow ${sum.overflowX}px`, { els: sum.overflowers });
  await ctx.close();
  return rec;
}

async function viewer() {
  const results = [];
  const targets = [
    ["inhub", `${BASE}`],
    ["standalone", STANDALONE],
  ];
  const combos = [
    ["chromium", VIEWPORTS.find(v => v.key === "desk-1440"), "light"],
    ["chromium", VIEWPORTS.find(v => v.key === "iphone-14pro"), "dark"],
    ["webkit", VIEWPORTS.find(v => v.key === "ipad-mini"), "light"],
    ["webkit", VIEWPORTS.find(v => v.key === "desk-1440"), "light"],
  ];
  for (const [label, baseUrl] of targets) {
    for (const [eng, vp, theme] of combos) {
      const browser = await BROWSERS[eng].launch();
      const tag = `${label}-${eng}-${vp.key}-${theme}`;
      try {
        const rec = await viewerOne(browser, baseUrl, vp, theme, tag);
        results.push(rec);
        console.log(tag, `markers=${rec.steps.markers ?? "-"}`, "issues:", rec.issues.length, `switch=${rec.steps.appSwitch}`);
      } catch (e) {
        results.push({ tag, issues: [{ severity: "critical", msg: String(e).slice(0, 300) }] });
        console.log(tag, "CRASH", String(e).slice(0, 200));
      }
      await browser.close();
    }
  }
  fs.writeFileSync(`${OUT}/viewer.json`, JSON.stringify(results, null, 1));
}

/* ------------------------------ parity ------------------------------ */

async function collectStrip(page) {
  return page.evaluate(`(() => {
    const strip=[...document.querySelectorAll(".well-list")].find(s=>s.querySelectorAll("button.well-card").length>=5);
    return {
      markers: document.querySelectorAll(".leaflet-marker-icon").length,
      cards: strip ? [...strip.querySelectorAll("button.well-card")].map(c=>c.innerText.replace(/\\s+/g," ").trim()) : [],
    };
  })()`);
}

async function parity() {
  const browser = await chromium.launch();
  // API path
  const { ctx: c1, page: p1 } = await newPage(browser, { viewport: { width: 1440, height: 900 } }, null);
  const rec = { api: { issues: [], consoleErrors: [], pageErrors: [], failedRequests: [], tileFailures: [] }, fallback: { issues: [], consoleErrors: [], pageErrors: [], failedRequests: [], tileFailures: [] } };
  watch(p1, rec.api);
  await p1.goto(JOB_URL, { waitUntil: "domcontentloaded" });
  await p1.waitForSelector("button.well-card", { timeout: 180000 });
  await p1.waitForTimeout(2500);
  const apiData = await collectStrip(p1);
  const apiPaths = await p1.evaluate(`performance.getEntriesByType("resource").filter(e=>/wells-nearby|chunk/.test(e.name)).map(e=>e.name.slice(0,120))`);
  await c1.close();

  // Forced-fallback path: 503 the API
  const { ctx: c2, page: p2 } = await newPage(browser, { viewport: { width: 1440, height: 900 } }, null);
  watch(p2, rec.fallback);
  await p2.route(/\/api\/wells-nearby/, (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"forced fallback"}' }));
  await p2.goto(JOB_URL, { waitUntil: "domcontentloaded" });
  try {
    await p2.waitForSelector("button.well-card", { timeout: 240000 });
    await p2.waitForTimeout(3000);
  } catch { rec.fallback.issues.push({ severity: "high", msg: "fallback produced no well cards in 240s" }); }
  const fbData = await collectStrip(p2);
  const fbPaths = await p2.evaluate(`performance.getEntriesByType("resource").filter(e=>/wells-nearby|chunk/.test(e.name)).map(e=>e.name.slice(0,120))`);
  await c2.close();
  await browser.close();

  const first25 = (c) => c.slice(0, 25).map((t) => ({ id: (t.match(/DNR-\d+/) || [t.split(" ")[1]])[0], toks: t.match(/[GSR]\d* ?\d*/g) || [] }));
  const a25 = first25(apiData.cards), f25 = first25(fbData.cards);
  const diffs = [];
  for (let i = 0; i < Math.max(a25.length, f25.length); i++) {
    const a = a25[i], f = f25[i];
    if (!a || !f || a.id !== f.id) { diffs.push({ i, api: a?.id, fb: f?.id }); continue; }
    if (a.toks.join("|") !== f.toks.join("|")) diffs.push({ i, id: a.id, apiToks: a.toks, fbToks: f.toks });
  }
  const out = {
    apiMarkers: apiData.markers, fbMarkers: fbData.markers,
    apiCards: a25.length, fbCards: f25.length,
    apiPaths, fbPaths, diffs,
    apiCardTexts: apiData.cards.slice(0, 25), fbCardTexts: fbData.cards.slice(0, 25),
    apiErrors: rec.api, fbErrors: rec.fallback,
  };
  fs.writeFileSync(`${OUT}/parity.json`, JSON.stringify(out, null, 1));
  console.log("api markers", apiData.markers, "| fb markers", fbData.markers, "| card diffs", diffs.length);
  for (const d of diffs.slice(0, 15)) console.log("  diff", JSON.stringify(d));
}

/* ------------------------------ gate -------------------------------- */

async function gate() {
  const res = {};
  for (const pth of ["/design", "/design/palettes"]) {
    const r = await fetch(`${BASE}${pth}`);
    res[pth] = r.status;
  }
  console.log(JSON.stringify(res));
  fs.writeFileSync(`${OUT}/gate.json`, JSON.stringify(res, null, 1));
}

const FNS = { matrix, flows, viewer, parity, gate };
if (!cmd || !FNS[cmd]) {
  console.error(`usage: qa.mjs <${CMDS.join("|")}> [--round N] [--base URL] [--standalone URL] [--out DIR] [--engines a,b] [--only str]`);
  process.exit(2);
}
await FNS[cmd]();
console.log("DONE", OUT);
