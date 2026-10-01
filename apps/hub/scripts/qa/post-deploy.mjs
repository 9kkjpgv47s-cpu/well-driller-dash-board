#!/usr/bin/env node
/**
 * Post-deploy verification: overflow fix live + OLD-in-hub-viewer vs LIVE comparison.
 * - ow=0 across iPhone14P/SE webkit, Pixel7 chromium, iPad Mini webkit (both live viewers)
 * - served CSS contains the fix rules
 * - iPhone functional checks via textContent (webkit innerText is "" under content-visibility)
 * - desktop 1440 layout sanity vs old-vs-new NEW-side shots
 * - :8793 = old in-hub viewer @ cd5e3ba vs live in-hub viewer (toggles, depth, Avon, elevations)
 */
import { createRequire } from "module";
import fs from "node:fs";
import path from "path";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium, webkit, devices } = require("playwright");

const OUT = path.resolve("../../docs/design/qa/post-deploy");
fs.mkdirSync(`${OUT}/shots`, { recursive: true });
const R = []; const row = (dev, side, feature, input, value) => R.push({ dev, side, feature, input, value: String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 400) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tc = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);

const LIVE_HUB = "https://driller-hub.vercel.app/well-viewer/index.html";
const LIVE_SA = "https://c-j-well-viewer.vercel.app/index.html";
const OLD_INHUB = "http://localhost:8793/index.html";

async function ctxFor(browser, devName) {
  const d = devices[devName] || { viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext({ ...d, serviceWorkers: "block", permissions: ["geolocation"], geolocation: { latitude: 39.763, longitude: -86.399 } });
  return ctx;
}
async function waitWells(pg, maxMs = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const tw = await tc(pg, "#totalWells");
    if (tw && /\d/.test(tw) && tw !== "0") return { ms: Date.now() - t0, tw };
    await sleep(3000);
  }
  return { ms: maxMs, tw: await tc(pg, "#totalWells") };
}
const ow = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const wcOf = (pg) => tc(pg, "#wellCount");
const ids10 = (pg) => pg.evaluate(() => [...document.querySelectorAll("#wellsList .card, #wellsList > div")].slice(0, 10).map(el => (el.textContent.match(/DNR-\d+/) || ["?"])[0]).join(","));

async function deviceOverflowPass() {
  console.log("== overflow matrix (live) ==");
  const wb = await webkit.launch(); const cb = await chromium.launch();
  for (const [devName, browser, side] of [
    ["iPhone 14 Pro", wb, "iphone14p"], ["iPhone SE", wb, "iphonese"], ["iPad Mini", wb, "ipadmini"],
    ["Pixel 7", cb, "pixel7"]]) {
    for (const [label, url] of [["inhub", LIVE_HUB], ["standalone", LIVE_SA]]) {
      const ctx = await ctxFor(browser, devName); const pg = await ctx.newPage();
      try {
        await pg.goto(`${url}?lat=39.763&lon=-86.399&cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 120000 });
        const w = await waitWells(pg, devName === "iPhone SE" || devName === "iPhone 14 Pro" ? 240000 : 180000);
        await sleep(3000);
        const o = await ow(pg); const wc = await wcOf(pg);
        row(devName, `live-${label}`, "overflow", "load+ow", `ow=${o} wc=${wc} loadMs=${w.ms} ${o === 0 ? "OK" : "OVERFLOW"}`);
        console.log(`  ${devName} ${label}: ow=${o} wc=${wc} ${(w.ms/1000).toFixed(0)}s`);
        if (o !== 0) await pg.screenshot({ path: `${OUT}/shots/overflow-${devName.replace(/\s/g, "")}-${label}.png` });
      } catch (e) { row(devName, `live-${label}`, "overflow", "load", `CRASH ${String(e).slice(0, 150)}`); }
      await ctx.close();
    }
  }
  await wb.close(); await cb.close();
}

async function servedCssCheck() {
  console.log("== served css ==");
  for (const [side, base] of [["inhub", "https://driller-hub.vercel.app/well-viewer/"], ["standalone", "https://c-j-well-viewer.vercel.app/"]]) {
    const [css, html] = await Promise.all([
      fetch(`${base}cj/viewer.css?cb=${Date.now()}`).then(r => r.text()),
      fetch(`${base}index.html?cb=${Date.now()}`).then(r => r.text()),
    ]);
    const mw = /\.order-1[^}]*min-width:\s*0|min-width:\s*0;[^}]*order-1/s.test(css) || css.includes("min-width: 0;");
    const mm = html.includes("minmax(0, 1fr)");
    row("desk", `live-${side}`, "served fix", "css+html", `min-width:0 in viewer.css=${mw} minmax in index.html=${mm} cssLen=${css.length}`);
    console.log(`  ${side}: cssFix=${mw} htmlFix=${mm}`);
  }
}

async function iphoneFunctional() {
  console.log("== iphone functional (live, textContent) ==");
  const wb = await webkit.launch();
  for (const [label, url] of [["inhub", LIVE_HUB], ["standalone", LIVE_SA]]) {
    const ctx = await ctxFor(wb, "iPhone 14 Pro"); const pg = await ctx.newPage();
    try {
      await pg.goto(`${url}?lat=39.763&lon=-86.399&cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await waitWells(pg); await sleep(3000);
      row("iphone", `live-${label}`, "wellCount", "load", `wc=${await wcOf(pg)} tw=${await tc(pg, "#totalWells")}`);
      // text search 185960
      await pg.fill("#textSearch", "185960"); await sleep(2000);
      const ids = await ids10(pg); const n = await pg.locator("#wellsList > *").count();
      row("iphone", `live-${label}`, "text search", "185960", `ids=${ids} rows=${n} ${ids.includes("DNR-185960") ? "OK" : "MISS"}`);
      await pg.fill("#textSearch", ""); await sleep(1000);
      // elev toggles
      const before = await wcOf(pg);
      await pg.evaluate(() => document.getElementById("elevBlue").click()); await sleep(1500);
      const after = await wcOf(pg);
      row("iphone", `live-${label}`, "elev toggle", "elevBlue", `wc ${before}→${after} ${before !== after ? "OK" : "NO-EFFECT"}`);
      await pg.evaluate(() => document.getElementById("elevBlue").click()); await sleep(800);
      // ground elevations
      await pg.evaluate(() => document.getElementById("btnGroundElev")?.click()); await sleep(15000);
      const banner = (await tc(pg, "#locationBanner")) || "";
      const m = banner.match(/(\d+)\s*ft/i);
      row("iphone", `live-${label}`, "ground elev", "click", `banner="${banner.slice(0, 120)}" elevFt=${m?.[1] || "?"} ${m?.[1] === "840" ? "OK" : "DIFF"}`);
    } catch (e) { row("iphone", `live-${label}`, "functional", "run", `CRASH ${String(e).slice(0, 150)}`); }
    await ctx.close();
  }
  await wb.close();
}

async function desktopLayoutSanity() {
  console.log("== desktop 1440 layout sanity ==");
  const cb = await chromium.launch();
  for (const [label, url] of [["inhub", LIVE_HUB], ["standalone", LIVE_SA]]) {
    const ctx = await ctxFor(cb, "desktop"); const pg = await ctx.newPage();
    await pg.goto(`${url}?lat=39.763&lon=-86.399&cb=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await waitWells(pg); await sleep(3000);
    const geo = await pg.evaluate(() => {
      const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}`; };
      return { ow: document.documentElement.scrollWidth - window.innerWidth, o1: g(".order-1"), o2: g(".order-2"), o3: g(".order-3"), o4: g(".order-4"), cols: getComputedStyle(document.querySelector(".grid")).gridTemplateColumns };
    });
    row("desk1440", `live-${label}`, "layout geometry", "grid", `ow=${geo.ow} cols=${geo.cols} o1=${geo.o1} o2=${geo.o2} o3=${geo.o3} o4=${geo.o4}`);
    await pg.screenshot({ path: `${OUT}/shots/desk-${label}.png`, fullPage: false });
    await ctx.close();
  }
  await cb.close();
}

async function oldInhubVsLive() {
  console.log("== OLD in-hub (:8793) vs LIVE in-hub — desktop ==");
  const cb = await chromium.launch();
  for (const [side, url] of [["old-inhub", OLD_INHUB], ["live-inhub", LIVE_HUB]]) {
    const ctx = await ctxFor(cb, "desktop"); const pg = await ctx.newPage();
    const elevProviders = [];
    pg.on("response", r => { const u = r.url(); if (/opentopodata|allorigins|corsproxy|open-elevation/i.test(u)) elevProviders.push(r.status() + " " + new URL(u).host); });
    try {
      await pg.goto(`${url}?lat=39.763&lon=-86.399${side === "live-inhub" ? `&cb=${Date.now()}` : ""}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await waitWells(pg); await sleep(2500);
      // toggles
      for (const id of ["typeUncon", "typeRock", "typeBucket", "typeDry", "typeEstimated", "yieldBlue", "yieldGreen", "yieldOrange", "yieldRed", "elevBlue", "elevGreen", "elevOrange", "elevRed", "hideWells"]) {
        const was = await pg.evaluate(i => document.getElementById(i)?.checked, id);
        await pg.evaluate(i => document.getElementById(i)?.click(), id); await sleep(1400);
        const wc = await wcOf(pg);
        await pg.evaluate(i => document.getElementById(i)?.click(), id); await sleep(500);
        row("desk", side, "toggle", `#${id}`, `${was}→${!was} wc=${wc}`);
      }
      // depth filter
      await pg.fill("#minDepth", "80"); await pg.fill("#maxDepth", "120");
      await pg.evaluate(() => { const b = [...document.querySelectorAll("button")].find(b => /apply depth/i.test(b.textContent)); b?.click(); });
      await sleep(2500);
      row("desk", side, "depth filter", "80–120", `wc=${await wcOf(pg)} ids=${await ids10(pg)}`);
      await pg.fill("#minDepth", ""); await pg.fill("#maxDepth", "");
      await pg.evaluate(() => { const b = [...document.querySelectorAll("button")].find(b => /apply depth/i.test(b.textContent)); b?.click(); }); await sleep(1500);
      // Avon search
      await pg.fill("#addressInput", "Avon, IN");
      await pg.evaluate(() => document.getElementById("btnAddressSearch").click()); await sleep(6000);
      const banner = ((await tc(pg, "#locationBanner")) || "").slice(0, 130);
      row("desk", side, "address search", "Avon, IN", `wc=${await wcOf(pg)} ids=${await ids10(pg)} banner="${banner}"`);
      // ground elevations
      await pg.evaluate(() => document.getElementById("btnGroundElev")?.click()); await sleep(15000);
      const banner2 = ((await tc(pg, "#locationBanner")) || "").slice(0, 130);
      const elevRows = await pg.evaluate(() => [...document.querySelectorAll("#wellsList .card, #wellsList > div")].slice(0, 10).map(el => { const m = el.textContent.match(/Ground elev:[^•·]*|elev[^•·]*\d+(\.\d+)?\s*ft/i); return m ? m[0].replace(/\s+/g, " ").slice(0, 60) : ""; }).join(" | "));
      row("desk", side, "ground elev", "click", `banner="${banner2}" elevRows=${elevRows} providers=${elevProviders.join(",") || "none"}`);
    } catch (e) { row("desk", side, "run", "crash", String(e).slice(0, 200)); }
    await ctx.close();
  }
  await cb.close();
}

await servedCssCheck();
await deviceOverflowPass();
await iphoneFunctional();
await desktopLayoutSanity();
await oldInhubVsLive();

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
let md = "| dev | side | feature | input | value |\n|---|---|---|---|---|\n";
for (const r of R) md += `| ${r.dev} | ${r.side} | ${r.feature} | ${r.input} | ${String(r.value).replace(/\|/g, "\\|")} |\n`;
fs.writeFileSync(`${OUT}/RAW.md`, md);
console.log(`\nDONE rows=${R.length} out=${OUT}`);
process.exit(0);
