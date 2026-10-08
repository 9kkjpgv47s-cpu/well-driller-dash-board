#!/usr/bin/env node
/**
 * Show-wells-on-map toggle QA (build 2026-10-08-show-wells-toggle).
 * Verifies the restored April-2026 marker gating on the vendored static viewer:
 *   - no pin + toggle OFF -> 0 markers (sidebar list NOT gated)
 *   - no pin + toggle ON  -> wells-in-view markers (<=800 cap)
 *   - pin set             -> 2 mi radius markers regardless of toggle
 *   - Hide well labels    -> 0 markers either way
 *
 * Requires the viewer served statically first:
 *   cd apps/hub/public/well-viewer && python3 -m http.server 8794
 * Run from apps/hub:  node scripts/qa/show-wells-toggle.mjs
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
const OUT = path.resolve(A.out || "../../docs/design/qa/show-wells-toggle");
const BASE = A.base || "http://localhost:8794/index.html";
fs.mkdirSync(`${OUT}/shots`, { recursive: true });

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const R = [];
function rec(scn, name, expected, actual, pass) {
  R.push({ scenario: scn, check: name, expected, actual: String(actual ?? "").replace(/\s+/g," ").trim().slice(0,400), pass: !!pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${scn} | ${name} | expected ${expected} | actual ${String(actual ?? "").slice(0,180)}`);
}

const num = (t) => { const n = parseInt(String(t ?? "").replace(/[^\d]/g,""),10); return isNaN(n) ? null : n; };
const tc = (pg, sel) => pg.evaluate(s => { const e=document.querySelector(s); return e?e.textContent:null; }, sel);
const checked = (pg, id) => pg.evaluate(i => { const e=document.getElementById(i); return e ? !!e.checked : null; }, id);
const clickToggle = (pg, id) => pg.evaluate(i => { const e=document.getElementById(i); if(!e) return null; e.click(); return e.checked; }, id);
const markerCount = (pg) => pg.evaluate(() => (typeof wellLayer !== "undefined" && wellLayer) ? wellLayer.getLayers().length : -1);
const markerLatLngs = (pg) => pg.evaluate(() => (typeof wellLayer !== "undefined" && wellLayer)
  ? wellLayer.getLayers().map(m => (m.getLatLng && m.getLatLng())).filter(Boolean).map(ll => ({ lat: ll.lat, lng: ll.lng }))
  : []);

function distMi(aLat,aLon,bLat,bLon){
  const R=3958.8, toR=Math.PI/180;
  const h=Math.sin((bLat-aLat)*toR/2)**2 + Math.cos(aLat*toR)*Math.cos(bLat*toR)*Math.sin((bLon-aLon)*toR/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function maxDist(pts, lat, lon){ let mx=-1; for (const p of pts){ const d=distMi(lat,lon,p.lat,p.lng); if(d>mx) mx=d; } return mx; }

async function waitWells(pg, maxMs=200000) {
  const t0=Date.now();
  while (Date.now()-t0 < maxMs) {
    const tw = await tc(pg, "#totalWells");
    const n = num(tw);
    if (n !== null && n > 100000) return { ms: Date.now()-t0, total: n, raw: tw };
    await sleep(3000);
  }
  const tw = await tc(pg, "#totalWells");
  return { ms: maxMs, total: num(tw), raw: tw };
}
/* require (#totalWells, markerCount) identical on 3 consecutive 3s polls */
async function waitStable(pg, maxMs=180000) {
  const t0=Date.now(); let lastT=undefined, lastM=undefined, eqN=0;
  while (Date.now()-t0 < maxMs) {
    const t = await tc(pg,"#totalWells"); const m = await markerCount(pg);
    if (t===lastT && m===lastM) { eqN++; if (eqN>=2) return { ms:Date.now()-t0, total:num(t), markers:m }; }
    else eqN=0;
    lastT=t; lastM=m; await sleep(3000);
  }
  return { ms:maxMs, total:num(await tc(pg,"#totalWells")), markers:await markerCount(pg) };
}

const errs = [];
function watchErrors(pg){
  pg.on("console", m => { if (m.type()==="error") errs.push({kind:"console", text:m.text().slice(0,300), url:((m.location()&&m.location().url)||"").slice(0,200)}); });
  pg.on("pageerror", e => errs.push({kind:"pageerror", text:String((e && e.message) || e).slice(0,300), url:"(page)"}));
}
const appErrors = () => errs.filter(e => e.kind==="pageerror" || /index\.html/.test(e.url) || /^https?:\/\/localhost:8794\/?$/.test(e.url));

async function newCtx(browser, dev){
  const d = dev === "iphone" ? devices["iPhone 14 Pro"] : { viewport:{width:1440,height:900} };
  return browser.newContext({ ...d, serviceWorkers:"block", permissions:["geolocation"], geolocation:{ latitude:39.763, longitude:-86.399 } });
}

async function layoutInfo(pg){
  return pg.evaluate(() => {
    const de = document.documentElement;
    const mapEl = document.getElementById("map");
    const bar = document.querySelector(".map-bottom-bar");
    const m = mapEl ? mapEl.getBoundingClientRect() : null;
    const b = bar ? bar.getBoundingClientRect() : null;
    const inside = !!(m && b && b.left >= m.left-1 && b.right <= m.right+1 && b.top >= m.top-1 && b.bottom <= m.bottom+1);
    const labels = [...document.querySelectorAll(".map-bottom-bar .toggle-label")].map(el => ({ text: el.textContent.trim(), visible: el.offsetWidth > 0 }));
    const box = r => r ? { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) } : null;
    return { scrollW: de.scrollWidth, innerW: window.innerWidth, owOk: de.scrollWidth <= window.innerWidth, inside, barBox: box(b), mapBox: box(m), labels };
  });
}
function recLayout(scn, tag, li){
  rec(scn, `no horizontal overflow ${tag}`, "scrollWidth<=innerWidth", `${li.scrollW}<=${li.innerW}`, li.owOk);
  rec(scn, `.map-bottom-bar inside #map ${tag}`, "inside", `inside=${li.inside} bar=${JSON.stringify(li.barBox)} map=${JSON.stringify(li.mapBox)}`, li.inside);
  rec(scn, `both toggle labels visible ${tag}`, "2 labels offsetWidth>0", li.labels.map(l=>`"${l.text}":${l.visible}`).join(", "), li.labels.length>=2 && li.labels.every(l=>l.visible));
}

async function shot(pg, file, opts){
  try { await pg.screenshot({ path:`${OUT}/shots/${file}`, ...opts }); return `shots/${file}`; }
  catch(e){ rec("SHOT", file, "captured", String(e && e.message || e).slice(0,160), false); return null; }
}

const meta = { base: BASE, at: new Date().toISOString() };

/* ---------- A/B/C + desktop G : cold no-pin page ---------- */
{
  const b = await chromium.launch();
  const ctx = await newCtx(b,"desk");
  const pg = await ctx.newPage(); watchErrors(pg);
  await pg.goto(BASE, { waitUntil:"domcontentloaded", timeout:90000 });
  const w = await waitWells(pg);
  meta.buildStamp = await pg.evaluate(() => (document.querySelector('meta[name="cj-build"]')||{}).content || "");
  await sleep(3000);
  rec("A","build stamp","2026-10-08-show-wells-toggle", meta.buildStamp, meta.buildStamp==="2026-10-08-show-wells-toggle");
  rec("A","#showMapWells exists","true", await pg.evaluate(() => !!document.getElementById("showMapWells")), await pg.evaluate(() => !!document.getElementById("showMapWells")));
  const smw = await checked(pg,"showMapWells");
  rec("A","#showMapWells unchecked","false", smw, smw===false);
  const hw = await checked(pg,"hideWells");
  rec("A","#hideWells unchecked","false", hw, hw===false);
  const mA = await markerCount(pg);
  rec("A","marker count (cold, no pin, toggle off)","0", mA, mA===0);
  const wcA = num(await tc(pg,"#wellCount"));
  rec("A","#wellCount > 0 (sidebar list not gated)",">0", wcA, (wcA??0)>0);
  rec("A","#totalWells > 100000",">100000", `${w.total} (raw "${String(w.raw).trim()}", ${(w.ms/1000).toFixed(0)}s)`, (w.total??0)>100000);
  const layOff = await layoutInfo(pg);
  recLayout("G/desk","(toggle off)", layOff);
  await shot(pg, "desk-nopin.png", { fullPage:true });
  /* B */
  await clickToggle(pg,"showMapWells"); await sleep(1500);
  const mB = await markerCount(pg);
  rec("B","marker count after toggle ON","1..800", mB, mB>0 && mB<=800);
  const wcB = num(await tc(pg,"#wellCount"));
  rec("B","#wellCount > 0",">0", wcB, (wcB??0)>0);
  await shot(pg, "desk-toggle-on.png", { fullPage:true });
  const clip = await pg.evaluate(() => { const r=document.querySelector(".map-bottom-bar")?.getBoundingClientRect(); const sy=window.scrollY, sx=window.scrollX; return r?{x:Math.max(0,r.x+sx-8),y:Math.max(0,r.y+sy-8),width:r.width+16,height:r.height+16}:null; });
  if (clip) await shot(pg, "desk-bottombar.png", { fullPage:true, clip });
  const layOn = await layoutInfo(pg);
  recLayout("G/desk","(toggle on)", layOn);
  /* C */
  await clickToggle(pg,"showMapWells"); await sleep(1000);
  const mC = await markerCount(pg);
  rec("C","marker count after toggle OFF","0", mC, mC===0);
  /* F : fresh no-pin page (reload), coords search */
  await pg.goto(BASE, { waitUntil:"domcontentloaded", timeout:90000 });
  const wF = await waitWells(pg);
  await waitStable(pg);
  rec("F","reload #totalWells > 100000",">100000", wF.total, (wF.total??0)>100000);
  await sleep(2000);
  await pg.fill("#coordsInput","39.763, -86.399");
  await pg.locator('button[onclick="goToCoords()"]').evaluate(e=>e.click());
  await sleep(2000);
  const llF = await markerLatLngs(pg);
  const mdF = maxDist(llF, 39.763, -86.399);
  rec("F","marker count after coords Go","1..800", llF.length, llF.length>0 && llF.length<=800);
  rec("F","all markers within 2.0 mi of (39.763,-86.399) — page haversine rounds toFixed(1), gate admits <=2.05","maxDist<=2.05", `max=${mdF.toFixed(3)} n=${llF.length}`, llF.length>0 && mdF<=2.05);
  await ctx.close(); await b.close();
}

/* ---------- D/E : pin via ?lat&lon ---------- */
{
  const b = await chromium.launch();
  const ctx = await newCtx(b,"desk");
  const pg = await ctx.newPage(); watchErrors(pg);
  await pg.goto(`${BASE}?lat=39.763&lon=-86.399`, { waitUntil:"domcontentloaded", timeout:90000 });
  await waitWells(pg);
  await waitStable(pg);
  await sleep(3000);
  const llD = await markerLatLngs(pg);
  const mdD = maxDist(llD, 39.763, -86.399);
  rec("D","marker count with pin","1..800", llD.length, llD.length>0 && llD.length<=800);
  rec("D","all markers within 2.0 mi of pin — page haversine rounds toFixed(1), gate admits <=2.05","maxDist<=2.05", `max=${mdD.toFixed(3)}`, llD.length>0 && mdD<=2.05);
  const banner = (await tc(pg,"#locationBanner")) || "";
  rec("D","#locationBanner text","contains 'Wells within 2 mi'", banner.replace(/\s+/g," ").slice(0,140), /Wells within 2 mi/.test(banner));
  const n0 = llD.length;
  await clickToggle(pg,"showMapWells"); await sleep(1500);
  const llD2 = await markerLatLngs(pg);
  const mdD2 = maxDist(llD2, 39.763, -86.399);
  rec("D","toggle ON: pin pool unchanged",`count=${n0}, maxDist<=2.05`, `count=${llD2.length}, max=${mdD2.toFixed(3)}`, llD2.length===n0 && mdD2<=2.05);
  await clickToggle(pg,"showMapWells"); await sleep(1500);
  const llD3 = await markerLatLngs(pg);
  const mdD3 = maxDist(llD3, 39.763, -86.399);
  rec("D","toggle OFF: pin pool unchanged",`count=${n0}, maxDist<=2.05`, `count=${llD3.length}, max=${mdD3.toFixed(3)}`, llD3.length===n0 && mdD3<=2.05);
  /* E */
  await clickToggle(pg,"hideWells"); await sleep(1000);
  const mE = await markerCount(pg);
  rec("E","hideWells ON -> 0 markers","0", mE, mE===0);
  await clickToggle(pg,"hideWells"); await sleep(1000);
  const mE2 = await markerCount(pg);
  rec("E","hideWells OFF -> markers back",">0", mE2, mE2>0);
  await ctx.close(); await b.close();
}

/* ---------- dark theme : .cj-datalbl label flip ---------- */
{
  const b = await chromium.launch();
  const ctx = await newCtx(b,"desk");
  await ctx.addInitScript(() => { try { localStorage.setItem("cj-theme","dark"); } catch {} });
  const pg = await ctx.newPage(); watchErrors(pg);
  await pg.goto(BASE, { waitUntil:"domcontentloaded", timeout:90000 });
  await waitWells(pg);
  await sleep(1500);
  const dark = await pg.evaluate(() => {
    const span = document.querySelector("#showMapWells")?.closest(".toggle-wrap")?.querySelector(".cj-datalbl");
    return {
      theme: document.documentElement.dataset.theme || "",
      color: span ? getComputedStyle(span).color : null,
      text: span ? span.textContent.trim() : null,
    };
  });
  meta.darkLabel = dark;
  rec("DARK","html[data-theme] = dark","dark", dark.theme, dark.theme==="dark");
  rec("DARK","Show-wells .cj-datalbl color flipped (not light #047857)","!= rgb(4, 120, 87)", `${dark.text} -> ${dark.color}`, !!dark.color && dark.color!=="rgb(4, 120, 87)");
  const clipD = await pg.evaluate(() => { const r=document.querySelector(".map-bottom-bar")?.getBoundingClientRect(); const sy=window.scrollY, sx=window.scrollX; return r?{x:Math.max(0,r.x+sx-10),y:Math.max(0,r.y+sy-10),width:r.width+20,height:r.height+20}:null; });
  if (clipD) await shot(pg, "desk-dark-bottombar.png", { fullPage:true, clip:clipD });
  await ctx.close(); await b.close();
}

/* ---------- G mobile : iPhone 14 Pro ---------- */
let mobB = null;
meta.iphoneEngine = "webkit";
try { mobB = await webkit.launch(); }
catch(e){ meta.iphoneEngine = "chromium + iPhone 14 Pro descriptor (webkit launch failed: " + String(e && e.message || e).slice(0,120) + ")"; mobB = await chromium.launch(); }
try {
  const ctx = await newCtx(mobB,"iphone");
  const pg = await ctx.newPage(); watchErrors(pg);
  await pg.goto(BASE, { waitUntil:"domcontentloaded", timeout:90000 });
  const wM = await waitWells(pg);
  await waitStable(pg);
  await sleep(1500);
  const mOff = await markerCount(pg);
  const layOff = await layoutInfo(pg);
  rec("G/iphone","marker count cold (toggle off)","0", mOff, mOff===0);
  recLayout("G/iphone","(toggle off)", layOff);
  await shot(pg, "iphone-toggle-off.png", { fullPage:false });
  await clickToggle(pg,"showMapWells"); await sleep(1500);
  const mOn = await markerCount(pg);
  const layOn = await layoutInfo(pg);
  rec("G/iphone","marker count toggle ON","1..800", mOn, mOn>0 && mOn<=800);
  recLayout("G/iphone","(toggle on)", layOn);
  await shot(pg, "iphone-toggle-on.png", { fullPage:false });
  rec("G/iphone","#totalWells > 100000",">100000", wM.total, (wM.total??0)>100000);
  await ctx.close();
} catch(e){
  rec("G/iphone","run","completes", String(e && e.message || e).slice(0,250), false);
}
await mobB.close();

/* ---------- console/page errors ---------- */
const appErrs = appErrors();
rec("ALL","no console.error/pageerror from index.html","0", appErrs.length ? appErrs.map(e=>`${e.kind}:${e.text.slice(0,90)}`).join(" || ") : 0, appErrs.length===0);
meta.errorsCaptured = errs;
meta.errorsFromPage = appErrs;

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ meta, checks: R }, null, 1));
let md = `# Show-wells-on-map toggle QA — RAW\n\n`;
md += `- base: ${BASE}\n- buildStamp (served page meta[cj-build]): ${meta.buildStamp}\n- iphoneEngine: ${meta.iphoneEngine}\n- run at: ${meta.at}\n- dark-theme check: html[data-theme]=${meta.darkLabel ? meta.darkLabel.theme : "?"}; .cj-datalbl "${meta.darkLabel ? meta.darkLabel.text : "?"}" computed color = ${meta.darkLabel ? meta.darkLabel.color : "?"}\n- NOTE: page haversine() returns toFixed(1) (1 decimal mi), so the 2 mi pool admits wells with true distance up to ~2.05 mi — pre-existing getWellsWithin2Miles semantics, unchanged by this edit. Strict-precision max distances recorded in the Actual column.\n\n`;
md += `| Scenario | Check | Expected | Actual | Result |\n|---|---|---|---|---|\n`;
for (const r of R) md += `| ${r.scenario} | ${r.check} | ${r.expected} | ${r.actual.replace(/\|/g,"/")} | ${r.pass ? "PASS" : "FAIL"} |\n`;
md += `\n## console/page errors captured (all, incl. filtered CDN/tile noise)\n\n`;
if (!errs.length) md += `none\n`;
for (const e of errs) md += `- [${e.kind}] ${e.url} :: ${e.text.replace(/\|/g,"/")}\n`;
fs.writeFileSync(`${OUT}/RAW.md`, md);
const fails = R.filter(r=>!r.pass).length;
console.log(`DONE ${R.length} checks, ${fails} FAIL → ${OUT}`);
process.exit(fails ? 1 : 0);
