#!/usr/bin/env node
/**
 * OLD-vs-NEW functional comparison. Runs identical probes against the prior
 * production (hub :3010 prod build @ cd5e3ba, viewer :8792 static @ 772e522)
 * and NEW (live prod + local current). Records ACTUAL output values.
 *
 * NOTE: uses textContent (not innerText) — WebKit reports innerText="" inside
 * content-visibility:auto subtrees (measured artifact, not missing data).
 */
import { createRequire } from "module";
import fs from "node:fs";
import path from "path";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium, webkit, devices } = require("playwright");

const A = {}; for (let i=2;i<process.argv.length;i++){const a=process.argv[i]; if(a.startsWith("--")){A[a.slice(2)]=process.argv[i+1]?.startsWith("--")?true:process.argv[++i];}}
const OUT = path.resolve(A.out || "../../docs/design/qa/old-vs-new");
fs.mkdirSync(`${OUT}/shots`, { recursive: true });
const DISPATCH = fs.readFileSync("/tmp/cj-demo/dispatch.txt","utf8");

const SITES = {
  hubOld: A["hub-old"] || "http://localhost:3010",
  hubNew: A["hub-new"] || "https://driller-hub.vercel.app",
  viewOld: A["view-old"] || "http://localhost:8792/index.html",
  viewNewInhub: "https://driller-hub.vercel.app/well-viewer/index.html",
  viewNewStandalone: "https://c-j-well-viewer.vercel.app/index.html",
};

const R = []; // rows: {dev,side,feature,input,old,new}
let curDev, curSide;
function row(feature, input, value) { R.push({ dev: curDev, side: curSide, feature, input, value: String(value ?? "").replace(/\s+/g," ").trim().slice(0,400) }); }
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function ctxFor(browser, dev) {
  const d = dev === "iphone" ? devices["iPhone 14 Pro"] : { viewport:{width:1440,height:900} };
  const ctx = await browser.newContext({ ...d, serviceWorkers:"block",
    permissions: dev==="iphone" ? ["geolocation"] : ["geolocation","clipboard-read","clipboard-write"],
    geolocation: { latitude: 39.763, longitude: -86.399 } });
  await ctx.addInitScript(() => { window.__clip=null; try{Object.defineProperty(navigator,"clipboard",{value:{writeText:async t=>{window.__clip=t},readText:async()=>window.__clip},configurable:true});}catch{} });
  return ctx;
}

const tc = (pg, sel) => pg.evaluate(s => { const e=document.querySelector(s); return e?e.textContent:null; }, sel);

async function waitWells(pg, maxMs=200000) {
  const t0=Date.now();
  while (Date.now()-t0 < maxMs) {
    const tw = await tc(pg, "#totalWells");
    if (tw && /\d/.test(tw) && tw !== "0") return { ms: Date.now()-t0, tw };
    await sleep(3000);
  }
  return { ms: maxMs, tw: await tc(pg,"#totalWells") };
}

async function viewerSnapshot(pg, label) {
  return pg.evaluate(() => {
    const ids = [...document.querySelectorAll("#wellsList .card, #wellsList > div")].slice(0,10).map(el => (el.textContent.match(/DNR-\d+/)||["?"])[0]);
    const rows = [...document.querySelectorAll("#wellsList .card, #wellsList > div")].slice(0,10).map(el => el.textContent.replace(/\s+/g," ").slice(0,110));
    const banner = document.getElementById("locationBanner")?.textContent || "";
    return { wc: document.getElementById("wellCount")?.textContent, tw: document.getElementById("totalWells")?.textContent,
      ids: ids.join(","), rows: rows.join(" || "), banner: banner.slice(0,140),
      markers: document.querySelectorAll(".leaflet-marker-icon").length,
      ow: document.documentElement.scrollWidth - window.innerWidth };
  });
}

async function viewerRun(browser, baseUrl, dev, side) {
  curDev=dev; curSide=side;
  console.log(`\n== VIEWER ${side} ${dev} ==`);
  const ctx = await ctxFor(browser, dev); const pg = await ctx.newPage();
  const elevProviders = [];
  pg.on("response", r => { const u=r.url(); if (/opentopodata|allorigins|corsproxy|open-elevation/i.test(u)) elevProviders.push(r.status()+" "+new URL(u).host); });
  await pg.goto(`${baseUrl}?lat=39.763&lon=-86.399`, { waitUntil:"domcontentloaded", timeout:90000 });
  const w = await waitWells(pg);
  row("initial load", "url lat/lon", `totalWells="${w.tw}" in ${(w.ms/1000).toFixed(0)}s`);
  await sleep(2000);
  let snap = await viewerSnapshot(pg);
  row("initial view", "lat=39.763 lon=-86.399", `wc=${snap.wc} markers=${snap.markers} ow=${snap.ow} ids=${snap.ids} rows=${snap.rows.slice(0,200)} banner="${snap.banner}"`);

  // address searches
  for (const q of ["Avon, IN", "1234 E County Road 100 N, Avon, IN 46123", "Coatesville, IN"]) {
    await pg.fill("#addressInput", q);
    await pg.evaluate(() => document.getElementById("btnAddressSearch").click());
    await sleep(5000);
    snap = await viewerSnapshot(pg);
    row("address search", q, `wc=${snap.wc} ids=${snap.ids} banner="${snap.banner}" markers=${snap.markers}`);
  }
  // coordinate search
  for (const q of ["39.763, -86.399"]) {
    await pg.fill("#coordsInput", q);
    const go = await pg.evaluate(() => { const i=document.getElementById("coordsInput"); const b=i.parentElement.querySelector("button"); b.click(); return b.textContent; });
    await sleep(4000);
    snap = await viewerSnapshot(pg);
    row("coords search", q, `btn="${go}" wc=${snap.wc} ids=${snap.ids} banner="${snap.banner}"`);
  }
  // text searches
  for (const q of ["185960", "BURCH", "Hendricks"]) {
    await pg.fill("#textSearch", q); await sleep(1500);
    snap = await viewerSnapshot(pg);
    row("text search", q, `wc=${snap.wc} ids=${snap.ids} rowsN=${await pg.locator("#wellsList > *").count()}`);
    await pg.fill("#textSearch", ""); await sleep(800);
  }
  // Use My Location
  await pg.evaluate(() => { const b=[...document.querySelectorAll("button")].find(b=>/use my location/i.test(b.textContent)); b?.click(); });
  await sleep(4000);
  snap = await viewerSnapshot(pg);
  row("Use My Location", "geo 39.763,-86.399", `wc=${snap.wc} ids=${snap.ids} banner="${snap.banner}"`);
  // depth filter
  await pg.fill("#minDepth","80"); await pg.fill("#maxDepth","120");
  await pg.evaluate(() => { const b=[...document.querySelectorAll("button")].find(b=>/apply depth/i.test(b.textContent)); b?.click(); });
  await sleep(2500); snap = await viewerSnapshot(pg);
  row("depth filter", "80–120", `wc=${snap.wc} ids=${snap.ids}`);
  await pg.fill("#minDepth",""); await pg.fill("#maxDepth","");
  await pg.evaluate(() => { const b=[...document.querySelectorAll("button")].find(b=>/apply depth/i.test(b.textContent)); b?.click(); });
  await sleep(1500);
  // toggles
  for (const id of ["typeUncon","typeRock","typeBucket","typeDry","typeEstimated","yieldBlue","yieldGreen","yieldOrange","yieldRed","elevBlue","elevGreen","elevOrange","elevRed","hideWells"]) {
    const was = await pg.evaluate(i => document.getElementById(i)?.checked, id);
    await pg.evaluate(i => document.getElementById(i)?.click(), id);
    await sleep(1400);
    const wc = await tc(pg,"#wellCount");
    await pg.evaluate(i => document.getElementById(i)?.click(), id);
    await sleep(600);
    row("toggle", `#${id}`, `${was}→${!was} wc=${wc}`);
  }
  // elevations
  await pg.evaluate(() => document.getElementById("btnGroundElev")?.click());
  await sleep(12000);
  snap = await viewerSnapshot(pg);
  const elevRows = await pg.evaluate(() => [...document.querySelectorAll("#wellsList .card, #wellsList > div")].slice(0,10).map(el => { const m = el.textContent.match(/Ground elev:[^•·]*|elev[^•·]*\d+(\.\d+)?\s*ft/i); return m?m[0].replace(/\s+/g," ").slice(0,60):""; }).join(" | "));
  row("Get ground elevations", "click", `banner="${snap.banner}" elevRows=${elevRows} providers=${elevProviders.join(",")||"none"}`);
  await pg.screenshot({ path: `${OUT}/shots/viewer-${side}-${dev}.png` });
  await ctx.close();
}

async function hubRun(browser, baseUrl, dev, side) {
  curDev=dev; curSide=side;
  console.log(`\n== HUB ${side} ${dev} ==`);
  const ctx = await ctxFor(browser, dev); const pg = await ctx.newPage();
  await pg.goto(`${baseUrl}/?cb=${Date.now()}`, { waitUntil:"domcontentloaded" });
  await pg.waitForSelector("textarea", { timeout: 60000 });
  await pg.fill("textarea", DISPATCH);
  await pg.locator("button", { hasText: /generate job brief/i }).first().evaluate(e=>e.click());
  // wait for nearest wells
  try { await pg.waitForFunction(() => /DNR-\d+/.test(document.body.textContent), { timeout: 240000 }); } catch {}
  await sleep(12000);
  // parsed dispatch fields
  const parsed = await pg.evaluate(() => {
    const t = document.body.innerText;
    return {
      addr: (t.match(/\d{2,5}\s+[^\n,]{3,60},\s*Avon[^\n]*/)||[""])[0].slice(0,90),
      latlon: (t.match(/39\.76\d*[^\n]{0,20}-86\.3\d+/)||[""])[0].slice(0,50),
      feet: (t.match(/\d+\s*ft?[^\n]{0,20}drive/i)||[""])[0].slice(0,60),
    };
  });
  row("dispatch generate", "synthetic text", `addr="${parsed.addr}" latlon="${parsed.latlon}" feet="${parsed.feet}"`);
  // nearest wells values
  const wells = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll("button")].filter(b=>/DNR-\d+/.test(b.textContent)).slice(0,10).map(b=>b.textContent.replace(/\s+/g," ").slice(0,90));
    return cards.join(" || ");
  });
  row("nearest wells", "first 10", wells);
  // area insights at 2mi
  const rad = pg.locator('select[aria-label*="radius" i]').first();
  if (await rad.count()) { await rad.selectOption("2").catch(()=>{}); await sleep(4000); }
  const insights = await pg.evaluate(() => {
    const t=document.body.innerText; const out=[];
    for (const m of t.matchAll(/(Lithology intervals|Wells in radius|Well count|Avg|Median|depth)[^\n]{0,80}/gi)) out.push(m[0].slice(0,90));
    return out.slice(0,8).join(" ;; ");
  });
  row("area insights", "radius 2mi", insights);
  // Ground elevation
  const geBtn = pg.locator("button", { hasText: /ground elevation/i }).first();
  if (await geBtn.count()) {
    await geBtn.evaluate(e=>e.click()); await sleep(6000);
    const elev = await pg.evaluate(() => { const t=document.body.innerText; const m=t.match(/ground elevation[^\n]{0,80}|elevation[^\n]{0,60}ft/i); return m?m[0]:"none-found"; });
    row("Ground elevation", "click", elev);
  } else row("Ground elevation", "click", "button absent");
  // ASL tab
  const asl = pg.locator("button[role=tab]", { hasText: /^ASL/ }).first();
  if (await asl.count()) {
    await asl.evaluate(e=>e.click()); await sleep(6000);
    const aslTxt = await pg.evaluate(() => {
      const t=document.body.innerText;
      const ref = (t.match(/reference[^\n]{0,80}|ground elev[^\n]{0,80}|ft ASL[^\n]{0,60}/gi)||[]).slice(0,4).join(" ;; ");
      const chart = !!document.querySelector("svg, canvas");
      return `refs="${ref}" svg/canvas=${chart}`;
    });
    row("ASL tab", "open", aslTxt);
  } else row("ASL tab","open","no ASL tab");
  // Depth tab
  const dTab = pg.locator("button[role=tab]", { hasText: /^Depth/ }).first();
  if (await dTab.count()) {
    await dTab.evaluate(e=>e.click()); await sleep(3000);
    const dt = await pg.evaluate(() => document.body.innerText.match(/depth[^\n]{0,70}/gi)?.slice(0,5).join(" ;; "));
    row("Depth tab","open", dt);
  }
  // weather structure
  const wx = await pg.evaluate(() => {
    const tabs=[...document.querySelectorAll("button[role=tab]")].map(b=>b.textContent.trim()).filter(t=>/GFS|ECMWF|NWS/.test(t));
    return `tabs=${tabs.join(",")}`;
  });
  row("weather", "providers", wx);
  await pg.screenshot({ path: `${OUT}/shots/hub-${side}-${dev}.png`, fullPage:false });
  await ctx.close();
}

for (const dev of ["desk","iphone"]) {
  const eng = dev==="iphone" ? webkit : chromium;
  // viewers first (independent of hub build)
  for (const [side,url] of [["old",SITES.viewOld],["new-inhub",SITES.viewNewInhub],["new-standalone",SITES.viewNewStandalone]]) {
    const b = await eng.launch();
    try { await viewerRun(b, url, dev, side); } catch(e){ row("RUN","crash",String(e).slice(0,200)); }
    await b.close();
  }
  for (const [side,url] of [["old",SITES.hubOld],["new",SITES.hubNew]]) {
    const b = await eng.launch();
    try { await hubRun(b, url, dev, side); } catch(e){ row("RUN","crash",String(e).slice(0,200)); }
    await b.close();
  }
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R,null,1));
let md = "# OLD-vs-NEW functional comparison\n\n| Device | Side | Feature | Input | Value |\n|---|---|---|---|---|\n";
for (const r of R) md += `| ${r.dev} | ${r.side} | ${r.feature} | ${r.input} | ${r.value.replace(/\|/g,"/")} |\n`;
fs.writeFileSync(`${OUT}/RAW.md`, md);
console.log(`DONE ${R.length} rows → ${OUT}`);
