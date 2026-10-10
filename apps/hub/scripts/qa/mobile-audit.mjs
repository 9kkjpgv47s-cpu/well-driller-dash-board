#!/usr/bin/env node
/**
 * mobile-audit.mjs — read-only mobile audit against production.
 * Matrix: 5 targets x 5 devices x 2 themes for checks 1-7,10,11;
 * check 8 (modal scroll restore) on phones/light; check 9 (toggle text tap)
 * on i14/px7 light; check 12 (perf) on px7/chromium light for 3 targets.
 *
 *   node scripts/qa/mobile-audit.mjs [--base URL] [--standalone URL] [--only substr] [--skip-perf] [--out DIR]
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
const OUT = path.resolve(A.out || "../../docs/design/qa/mobile-audit");
const BASE = A.base || "https://driller-hub.vercel.app";
const STANDALONE = A["standalone"] || "https://c-j-well-viewer.vercel.app";
const ONLY = A.only || null;
const SKIP_PERF = !!A["skip-perf"];
fs.mkdirSync(`${OUT}/shots`, { recursive: true });

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const R = [];
function row(target, device, theme, check, expected, actual, pass, detail){
  R.push({ target, device, theme, check, expected,
    actual: String(actual ?? "").replace(/\s+/g," ").trim().slice(0,500),
    pass: !!pass, detail: detail ?? null });
  console.log(`${pass ? "PASS" : "FAIL"} ${target}/${device}/${theme} ${check} | ${String(actual ?? "").slice(0,140)}`);
}

const TARGETS = {
  "hub-empty":      { url: () => `${BASE}/`, kind: "hub" },
  "hub-job":        { url: () => `${BASE}/?lat=39.6009&lon=-86.5265`, kind: "hub-job" },
  "viewer-hub":     { url: () => `${BASE}/well-viewer/index.html`, kind: "viewer" },
  "viewer-hub-pin": { url: () => `${BASE}/well-viewer/index.html?lat=39.6009&lon=-86.5265`, kind: "viewer-pin" },
  "viewer-sa":      { url: () => `${STANDALONE}/index.html`, kind: "viewer" },
};
const DEVICES = {
  "se":       { eng:"webkit",   desc:"iPhone SE (3rd gen)" },
  "i14":      { eng:"webkit",   desc:"iPhone 14 Pro" },
  "i14-land": { eng:"webkit",   desc:"iPhone 14 Pro landscape" },
  "px7":      { eng:"chromium", desc:"Pixel 7" },
  "ipadmini": { eng:"webkit",   desc:"iPad Mini" },
};
const THEMES = ["light","dark"];
const PHONES = new Set(["se","i14","px7"]);

async function waitForTarget(pg, kind){
  const t0 = Date.now();
  try {
    if (kind === "hub-job") {
      await pg.waitForFunction(() =>
        !!document.querySelector(".leaflet-container") &&
        document.querySelectorAll(".well-list-grid button").length >= 1,
        { timeout: 90000 });
    } else if (kind === "viewer" || kind === "viewer-pin") {
      await pg.waitForFunction(() =>
        document.querySelectorAll(".leaflet-tile-loaded").length >= 1 &&
        /\d/.test(document.getElementById("totalWells")?.textContent || "") &&
        parseInt((document.getElementById("totalWells")?.textContent||"0").replace(/[^\d]/g,""),10) > 0,
        { timeout: 60000 });
      if (kind === "viewer-pin") {
        await pg.waitForFunction(() =>
          (typeof wellLayer !== "undefined" && wellLayer) ? wellLayer.getLayers().length > 0 : false,
          { timeout: 90000 });
      }
    } else {
      await pg.waitForSelector("body", { timeout: 30000 });
      await sleep(2500);
    }
  } catch(e){ return { ms: Date.now()-t0, timeout: true, err: String(e && e.message || e).slice(0,140) }; }
  return { ms: Date.now()-t0, timeout: false };
}

function watchErrors(pg, store){
  pg.on("console", m => { if (m.type()==="error") store.push({kind:"console", text:m.text().slice(0,300), url:((m.location()&&m.location().url)||"").slice(0,200)}); });
  pg.on("pageerror", e => store.push({kind:"pageerror", text:String((e && e.message) || e).slice(0,300), url:"(page)"}));
}

/** Checks 1-7 in one in-page pass. */
function pageAudit(pg){
  return pg.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const shortSel = (el) => {
      const parts = []; let n = el;
      while (n && n !== document.documentElement && parts.length < 4) {
        let s = n.tagName.toLowerCase();
        if (n.id) { s += "#" + n.id; parts.unshift(s); break; }
        const cls = (typeof n.className === "string" ? n.className.trim().split(/\s+/).slice(0,2).join(".") : "");
        if (cls) s += "." + cls;
        parts.unshift(s); n = n.parentElement;
      }
      return parts.join(" > ");
    };
    const isVis = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false;
      if (el.closest("[hidden], .hidden")) return false;
      return true;
    };
    /* 1 overflow */
    const scrollW = document.documentElement.scrollWidth;
    const owDiff = scrollW - vw;
    const owOff = [];
    if (owDiff > 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1) owOff.push({ sel: shortSel(el), w: +r.width.toFixed(1), right: +r.right.toFixed(1) });
      }
      owOff.sort((a,b)=>b.right-a.right);
    }
    /* 2 tap targets */
    const TAP_SEL = 'a[href], button, input:not([type=hidden]), select, textarea, label.toggle-switch, label.switch, [role=button], [onclick], [tabindex]:not([tabindex="-1"])';
    const seen = new Set(); const taps = [];
    for (const el of document.querySelectorAll(TAP_SEL)) {
      let target = el;
      if (el.tagName === "INPUT") {
        const cs = getComputedStyle(el); const r0 = el.getBoundingClientRect();
        const lbl = el.closest("label");
        if (lbl && (parseFloat(cs.opacity) === 0 || r0.width === 0 || r0.height === 0)) target = lbl;
      }
      if (seen.has(target)) continue; seen.add(target);
      if (target.closest(".leaflet-marker-icon") || target.closest(".leaflet-control-attribution")) continue;
      if (target.classList.contains("skip-link") || target.closest(".skip-link")) continue;
      if (!isVis(target)) continue;
      const r = target.getBoundingClientRect();
      taps.push({ sel: shortSel(target), text: (target.textContent || "").replace(/\s+/g," ").trim().slice(0,40), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    }
    const lt24 = taps.filter(t => t.w < 24 || t.h < 24);
    const lt44 = taps.filter(t => t.w < 44 || t.h < 44);
    /* 3 text size */
    const mk = (el, fs, t) => ({ sel: shortSel(el), px: fs, text: t.slice(0,40) });
    const uMap = new Map(); const sMap = new Map();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = tw.nextNode())) {
      const t = (node.nodeValue || "").replace(/\s+/g," ").trim();
      if (!t) continue;
      const el = node.parentElement;
      if (!el || el.closest("svg") || el.closest(".leaflet-container")) continue;
      if (!isVis(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) { const o = mk(el, fs, t); uMap.set(o.sel+"|"+o.px+"|"+o.text, o); }
      else if (fs < 13) { const o = mk(el, fs, t); sMap.set(o.sel+"|"+o.px+"|"+o.text, o); }
      if (uMap.size > 200 && sMap.size > 400) break;
    }
    const under12 = [...uMap.values()]; const small = [...sMap.values()];
    /* 4 input zoom */
    const iz = [];
    for (const el of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
      if (!isVis(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) iz.push({ sel: shortSel(el), px: fs, text: (el.placeholder || el.value || "").slice(0,40) });
    }
    /* 5 meta */
    const vp = document.querySelector('meta[name=viewport]')?.content || "";
    const meta = {
      viewport: vp,
      viewportFitCover: /viewport-fit\s*=\s*cover/.test(vp),
      themeColorCount: document.querySelectorAll('meta[name=theme-color]').length,
      manifest: document.querySelector('link[rel=manifest]')?.href || null,
      appleTouchIcon: !!document.querySelector('link[rel=apple-touch-icon]'),
      mobileWebAppCapable: !!(document.querySelector('meta[name=apple-mobile-web-app-capable]') || document.querySelector('meta[name=mobile-web-app-capable]')),
    };
    /* 6 fixed/sticky */
    const fixed = [];
    for (const el of document.querySelectorAll("body *")) {
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) fixed.push({ sel: shortSel(el), pos, x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) });
      }
      if (fixed.length > 60) break;
    }
    /* 7 map geometry */
    let map = null;
    const mapEl = document.querySelector(".leaflet-container");
    if (mapEl) {
      const r = mapEl.getBoundingClientRect();
      const tbR = document.querySelector(".cj-topbar")?.getBoundingClientRect();
      const topbarH = tbR ? tbR.height : 0;
      const ta = getComputedStyle(mapEl).touchAction;
      map = { h: +r.height.toFixed(1), vh, ratio: +(r.height / vh).toFixed(3),
        touchAction: ta,
        topbarH: +topbarH.toFixed(1),
        trap_risk: ta === "none" && r.height > (vh - topbarH - 120) };
    }
    return { vw, vh, scrollW, owDiff, owOff: owOff.slice(0,5),
      tapTotal: taps.length, lt44, lt24,
      under12, smallCount: small.length, small: small.slice(0,30),
      iz, meta, fixed, map };
  });
}

/** Check 8 — viewer variant (static viewer #wellModal). */
async function viewerModal(pg, shot){
  const got = await pg.waitForFunction(() => document.querySelectorAll("#wellsList .card").length >= 1, { timeout: 90000 }).then(()=>true).catch(()=>false);
  if (!got) return { inconclusive: "no #wellsList .card within 90s" };
  await pg.evaluate(() => document.querySelector("#wellsList .card").scrollIntoView({ block: "center" }));
  await sleep(600);
  const A = await pg.evaluate(() => window.scrollY);
  await pg.evaluate(() => { const c = document.querySelector("#wellsList .card"); (c.querySelector("[onclick]") || c).click(); });
  const opened = await pg.waitForSelector("#wellModal:not(.hidden)", { timeout: 15000 }).then(()=>true).catch(()=>false);
  if (!opened) return { inconclusive: "modal did not open", A };
  await sleep(600);
  const B = await pg.evaluate(() => window.scrollY);
  const bodyPos = await pg.evaluate(() => getComputedStyle(document.body).position);
  const bodyTop = await pg.evaluate(() => getComputedStyle(document.body).top);
  if (shot) await pg.screenshot({ path: shot }).catch(()=>{});
  await pg.evaluate(() => document.getElementById("btnCloseModal")?.click());
  await pg.waitForSelector("#wellModal.hidden", { timeout: 10000 }).catch(()=>{});
  await sleep(500);
  const C = await pg.evaluate(() => window.scrollY);
  return { A, B, C, bodyPos, bodyTop, pass: Math.abs(C - A) <= 40 };
}

/** Check 8 — hub variant (WellDetailModal role=dialog). */
async function hubModal(pg, shot, isPx){
  const got = await pg.waitForFunction(() => document.querySelectorAll(".well-list-grid button").length >= 1, { timeout: 90000 }).then(()=>true).catch(()=>false);
  if (!got) return { inconclusive: "no .well-list-grid button within 90s" };
  await pg.evaluate(() => document.querySelector(".well-list-grid button").scrollIntoView({ block: "center" }));
  await sleep(600);
  const A = await pg.evaluate(() => window.scrollY);
  await pg.evaluate(() => document.querySelector(".well-list-grid button").click());
  const opened = await pg.waitForSelector("[role=dialog]", { state: "visible", timeout: 15000 }).then(()=>true).catch(()=>false);
  if (!opened) return { inconclusive: "dialog did not open", A };
  await sleep(600);
  const B = await pg.evaluate(() => window.scrollY);
  const info = await pg.evaluate(() => {
    const dlg = document.querySelector("[role=dialog]");
    const dr = dlg?.getBoundingClientRect();
    const inner = dlg?.querySelector(".modal-dialog")?.getBoundingClientRect();
    const cb = dlg?.querySelector('button[aria-label*="Close"]')?.getBoundingClientRect();
    const inVp = (r) => !!r && r.top >= -1 && r.bottom <= window.innerHeight + 1 && r.left >= -1 && r.right <= window.innerWidth + 1;
    return {
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      dialogRect: dr ? { t:+dr.top.toFixed(0), b:+dr.bottom.toFixed(0), h:+dr.height.toFixed(0) } : null,
      innerRect: inner ? { t:+inner.top.toFixed(0), b:+inner.bottom.toFixed(0), h:+inner.height.toFixed(0) } : null,
      closeRect: cb ? { t:+cb.top.toFixed(0), b:+cb.bottom.toFixed(0), w:+cb.width.toFixed(0), h:+cb.height.toFixed(0) } : null,
      fits: !!(dr && dr.top >= -1 && dr.bottom <= window.innerHeight + 1),
      innerFits: !!(inner && inner.top >= -1 && inner.bottom <= window.innerHeight + 1),
      closeInVp: inVp(cb),
    };
  });
  let bgLeak = null;
  if (isPx) {
    const y0 = await pg.evaluate(() => window.scrollY);
    await pg.mouse.wheel(0, 400);
    await sleep(700);
    const dy = (await pg.evaluate(() => window.scrollY)) - y0;
    bgLeak = { delta: dy, leak: dy > 10 };
  }
  if (shot) await pg.screenshot({ path: shot }).catch(()=>{});
  await pg.evaluate(() => document.querySelector('[role=dialog] button[aria-label*="Close"]')?.click());
  await pg.waitForSelector("[role=dialog]", { state: "detached", timeout: 10000 }).catch(async () => {
    await pg.waitForSelector("[role=dialog]", { state: "hidden", timeout: 5000 }).catch(()=>{});
  });
  await sleep(500);
  const C = await pg.evaluate(() => window.scrollY);
  const fits = info.innerFits !== false ? info.innerFits : info.fits;
  const pass = Math.abs(C - A) <= 40 && fits && (bgLeak === null || !bgLeak.leak) && info.closeInVp !== false;
  return { A, B, C, ...info, bgLeak, pass };
}

/** Check 9 — tap the toggle TEXT. */
async function toggleTextTapViewer(pg){
  return pg.evaluate(() => {
    const inp = document.getElementById("typeRock");
    if (!inp) return { error: "no #typeRock" };
    const before = inp.checked;
    const wrap = inp.closest(".toggle-wrap");
    const lbl = wrap ? wrap.querySelector(".toggle-label") : null;
    const sw = wrap ? wrap.querySelector("label.toggle-switch") : null;
    const swR = sw ? sw.getBoundingClientRect() : null;
    if (lbl) lbl.click();
    return { before, after: inp.checked, toggled: inp.checked !== before,
      labelClicked: lbl ? (lbl.textContent || "").replace(/\s+/g," ").trim().slice(0,40) : null,
      switchRect: swR ? { w:+swR.width.toFixed(1), h:+swR.height.toFixed(1) } : null };
  });
}
async function toggleTextTapHub(pg){
  return pg.evaluate(() => {
    const lbl = document.querySelector("label input[type=checkbox]")?.closest("label");
    if (!lbl) return { error: "no checkbox label" };
    const inp = lbl.querySelector("input[type=checkbox]");
    const span = [...lbl.querySelectorAll("span")].pop();
    const before = inp.checked;
    const r = lbl.getBoundingClientRect();
    (span || lbl).click();
    return { before, after: inp.checked, toggled: inp.checked !== before,
      labelClicked: (span?.textContent || lbl.textContent || "").replace(/\s+/g," ").trim().slice(0,40),
      switchRect: { w:+r.width.toFixed(1), h:+r.height.toFixed(1) } };
  });
}

async function perfRun(browser, key, url){
  const ctx = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
  await ctx.addInitScript(() => {
    window.__lcp = 0; window.__longest = 0; window.__ltCount = 0;
    try { new PerformanceObserver((l) => { const es = l.getEntries(); if (es.length) window.__lcp = es[es.length-1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__ltCount++; if (e.duration > window.__longest) window.__longest = e.duration; } }).observe({ type: "longtask", buffered: true }); } catch {}
  });
  const pg = await ctx.newPage();
  const sess = await ctx.newCDPSession(pg);
  await sess.send("Network.enable");
  await sess.send("Network.emulateNetworkConditions", { offline:false, latency:150, downloadThroughput:1.6*1024*1024/8, uploadThroughput:0.75*1024*1024/8 });
  await sess.send("Emulation.setCPUThrottlingRate", { rate:4 });
  const reqUrl = new Map(); const reqType = new Map();
  const bytes = {}; let gzBytes = 0; let reqCount = 0;
  sess.on("Network.requestWillBeSent", ev => { reqCount++; reqUrl.set(ev.requestId, ev.request.url); });
  sess.on("Network.responseReceived", ev => { reqType.set(ev.requestId, ev.type || "Other"); });
  sess.on("Network.loadingFinished", ev => {
    const t = reqType.get(ev.requestId) || "Other";
    bytes[t] = (bytes[t] || 0) + ev.encodedDataLength;
    const u = reqUrl.get(ev.requestId) || "";
    if (/\.csv\.gz($|\?)/.test(u)) gzBytes += ev.encodedDataLength;
  });
  const errs = []; watchErrors(pg, errs);
  const t0 = Date.now();
  await pg.goto(url, { waitUntil: "load", timeout: 120000 }).catch(()=>{});
  const nav = () => pg.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] || {};
    return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
      lcp: Math.round(window.__lcp || 0), longestTask: Math.round(window.__longest || 0), ltCount: window.__ltCount || 0,
      totalWells: document.getElementById("totalWells")?.textContent || null };
  });
  const waitTo = async (ms) => { const d = ms - (Date.now()-t0); if (d > 0) await sleep(d); };
  await waitTo(15000);
  const snap15 = { bytes: { ...bytes }, gzBytes, reqCount, ...(await nav().catch(()=>({}))) };
  await waitTo(60000);
  const snap60 = { bytes: { ...bytes }, gzBytes, reqCount, ...(await nav().catch(()=>({}))) };
  await ctx.close();
  return { snap15, snap60, errors: errs.slice(0,10) };
}

const meta = { base: BASE, standalone: STANDALONE, at: new Date().toISOString(), only: ONLY, skipPerf: SKIP_PERF };
const browsers = { webkit: null, chromium: null };
const browserFor = async (eng) => {
  if (!browsers[eng]) browsers[eng] = await (eng === "webkit" ? webkit : chromium).launch();
  return browsers[eng];
};

for (const [tKey, t] of Object.entries(TARGETS)) {
  for (const [dKey, d] of Object.entries(DEVICES)) {
    for (const theme of THEMES) {
      const key = `${tKey}/${dKey}/${theme}`;
      if (ONLY && !key.includes(ONLY) && !`${tKey}/${dKey}`.includes(ONLY) && !tKey.includes(ONLY) && !dKey.includes(ONLY)) continue;
      const url = t.url();
      const origin = new URL(url).origin;
      const errs = [];
      const b = await browserFor(d.eng);
      const ctx = await b.newContext({ ...devices[d.desc] });
      await ctx.addInitScript((th) => { try { localStorage.setItem("cj-theme", th); } catch {} }, theme);
      const pg = await ctx.newPage(); watchErrors(pg, errs);
      /* Chromium does not flip (pointer: coarse) under hasTouch device emulation
         (verified: matchMedia false on px7). Force it via CDP before navigation —
         real Android hardware reports coarse, so this makes px7 representative.
         One shared session is kept on the context for the gesture dispatches. */
      let px7Sess = null;
      if (dKey === "px7") {
        px7Sess = await ctx.newCDPSession(pg).catch(() => null);
        if (px7Sess) await px7Sess.send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }, { name: "any-pointer", value: "coarse" }] }).catch(() => {});
      }
      const shotBase = `${OUT}/shots/${tKey}-${dKey}-${theme}`;
      let w = { timeout: false, ms: 0 };
      try {
        await pg.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
        w = await waitForTarget(pg, t.kind);
        await sleep(1500);
        const a = await pageAudit(pg);
        /* 1 overflow */
        row(tKey, dKey, theme, "overflow", "scrollWidth-innerWidth<=1",
          `diff=${a.owDiff} (scrollW=${a.scrollW} vw=${a.vw})`, a.owDiff <= 1, a.owOff.length ? a.owOff : null);
        /* 2 tap targets */
        row(tKey, dKey, theme, "tap-targets", "0 targets <24px (AA 2.5.8)",
          `total=${a.tapTotal} lt44=${a.lt44.length} lt24=${a.lt24.length}`, a.lt24.length === 0,
          { lt24: a.lt24, lt44: a.lt44.slice(0,40) });
        /* 3 text size */
        row(tKey, dKey, theme, "text-size", "0 text nodes <12px",
          `under12=${a.under12.length} small12-13=${a.smallCount}`, a.under12.length === 0,
          { under12: a.under12.slice(0,50), small: a.small.slice(0,15) });
        /* 4 input zoom */
        row(tKey, dKey, theme, "input-zoom", "all visible inputs >=16px",
          `offenders=${a.iz.length}`, a.iz.length === 0, a.iz.length ? a.iz.slice(0,30) : null);
        /* 5 meta */
        row(tKey, dKey, theme, "meta", "informational",
          `viewport="${a.meta.viewport}" fitCover=${a.meta.viewportFitCover} themeColor=${a.meta.themeColorCount} manifest=${a.meta.manifest||"none"} appleIcon=${a.meta.appleTouchIcon} mwaCapable=${a.meta.mobileWebAppCapable}`, true, a.meta);
        /* 6 fixed/sticky */
        row(tKey, dKey, theme, "fixed-sticky", "informational",
          `${a.fixed.length} fixed/sticky els`, true, a.fixed);
        /* 7 map geometry */
        if (a.map) {
          row(tKey, dKey, theme, "map-geometry", "trap_risk=false",
            `mapH=${a.map.h} vh=${a.map.vh} ratio=${a.map.ratio} touchAction=${a.map.touchAction} topbarH=${a.map.topbarH} trap_risk=${a.map.trap_risk}`,
            !a.map.trap_risk, a.map);
        }
        await pg.screenshot({ path: `${shotBase}-view.png` }).catch(()=>{});
        await pg.screenshot({ path: `${shotBase}-full.png`, fullPage: true }).catch(()=>{});
        /* 8 modal scroll restore */
        if (theme === "light" && PHONES.has(dKey) && (t.kind === "viewer-pin" || tKey === "viewer-sa" || tKey === "hub-job")) {
          let m;
          if (tKey === "hub-job") {
            m = await hubModal(pg, `${shotBase}-modal.png`, dKey === "px7");
          } else {
            if (tKey === "viewer-sa") {
              await pg.goto(`${STANDALONE}/index.html?lat=39.6009&lon=-86.5265`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(()=>{});
              await waitForTarget(pg, "viewer-pin");
            }
            m = await viewerModal(pg, `${shotBase}-modal.png`);
          }
          const inc = m.inconclusive || (typeof m.A === "number" && m.A <= 200);
          row(tKey, dKey, theme, "modal-scroll-restore", "|C-A|<=40" + (tKey === "hub-job" ? " && fits && no bg leak" : ""),
            `A=${m.A} B=${m.B} C=${m.C}` + (m.inconclusive ? ` INCONCLUSIVE:${m.inconclusive}` : "") + (inc && !m.inconclusive ? " A<=200" : ""),
            !!m.pass && !inc, m);
        }
        /* 9 toggle text tap */
        if (theme === "light" && (dKey === "i14" || dKey === "px7") && (t.kind.startsWith("viewer") || tKey === "hub-job")) {
          const tt = tKey === "hub-job" ? await toggleTextTapHub(pg) : await toggleTextTapViewer(pg);
          row(tKey, dKey, theme, "toggle-text-tap", "text tap toggles",
            `toggled=${tt.toggled} before=${tt.before}->after=${tt.after} "${tt.labelClicked}" swRect=${JSON.stringify(tt.switchRect)}`,
            !!tt.toggled, tt);
        }
        /* gesture — two-finger map model on touch devices.
           WebKit emulation reports pointer:coarse natively. Chromium (px7)
           does NOT flip it reliably under Playwright (verified: matchMedia
           false while @media applied — engine-level flake), so for px7 we
           stub matchMedia via addInitScript + reload for a deterministic
           coarse JS path, and drive gestures with synthetic TouchEvents —
           Leaflet's own handlers respond to them (dragging off, TouchZoom
           pans). The CDP native-scroll attempt is recorded as cdpScroll. */
        if (a.map && ["hub-job","viewer-hub","viewer-hub-pin","viewer-sa"].includes(tKey)) {
          const g = await pg.evaluate(() => {
            const el = document.querySelector(".leaflet-container");
            return { coarse: matchMedia("(pointer: coarse)").matches,
              touchAction: getComputedStyle(el).touchAction,
              touchDrag: el.classList.contains("leaflet-touch-drag") };
          });
          let oneF = null, twoF = null, stub = null, cdpScroll = null, cdpPan = null, cdpMetric = null, touchOk = false;
          if (theme === "light") {
            /* px7: stub coarse + reload for a deterministic coarse JS path,
               THEN run the real CDP one-finger drag on the stubbed page —
               native page scroll with one finger over the map is the actual
               Android user behavior that synthetic TouchEvents cannot show. */
            if (dKey === "px7" && px7Sess) {
              await ctx.addInitScript(() => {
                const orig = window.matchMedia.bind(window);
                window.matchMedia = (q) => /pointer\s*:\s*coarse/.test(q)
                  ? { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }
                  : orig(q);
              });
              await pg.reload({ waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
              await waitForTarget(pg, t.kind);
              stub = await pg.evaluate(() => ({
                coarse: matchMedia("(pointer: coarse)").matches,
                touchDrag: document.querySelector(".leaflet-container")?.classList.contains("leaflet-touch-drag") ?? null,
                hintInstalled: !!document.querySelector(".leaflet-container .cj-map-gesture-hint"),
              })).catch(() => null);
            }
            /* synthetic 1F/2F drags — real listeners fire on any engine */
            /* WebKit supports the TouchEvent constructor but ignores the
               init-dict touches (empty TouchList) — probe one event for a
               real touch instead of trusting typeof checks. */
            touchOk = await pg.evaluate(() => {
              try {
                if (typeof Touch !== "function" || typeof TouchEvent !== "function") return false;
                const t = new Touch({ identifier: 1, target: document.body, clientX: 0, clientY: 0 });
                return new TouchEvent("touchstart", { touches: [t] }).touches.length === 1;
              } catch { return false; }
            });
            if (touchOk) {
              const mapPos = () => pg.evaluate(() => {
                const m = window.__cjMap || window.map;
                if (m && typeof m.getCenter === "function") {
                  const c = m.getCenter();
                  return { kind: "geo", c: [+c.lat.toFixed(6), +c.lng.toFixed(6)] };
                }
                const mk = document.querySelector(".leaflet-overlay-pane svg path") || document.querySelector(".leaflet-marker-pane .leaflet-marker-icon") || document.querySelector(".leaflet-tile-pane .leaflet-tile");
                const r = mk ? mk.getBoundingClientRect() : null;
                return { kind: "px", x: r ? +r.x.toFixed(1) : null, y: r ? +r.y.toFixed(1) : null };
              });
              const pxDelta = (u, v) => Math.hypot((v.x ?? 0) - (u.x ?? 0), (v.y ?? 0) - (u.y ?? 0));
              const geoDelta = (u, v) => Math.hypot((v.c[0] - u.c[0]) * 111320, (v.c[1] - u.c[1]) * 111320 * Math.cos(u.c[0] * Math.PI / 180));
              const snap = async () => ({ ...(await mapPos()), y: +((await pg.evaluate(() => window.scrollY)).toFixed(0)), hint: await pg.evaluate(() => !!window.__hintSeen) });
              await pg.evaluate(() => {
                window.__hintSeen = false;
                const el = document.querySelector(".leaflet-container");
                window.__hintMO = new MutationObserver(() => { if (el.classList.contains("is-gesture-hint")) window.__hintSeen = true; });
                window.__hintMO.observe(el, { attributes: true, attributeFilter: ["class"] });
              }).catch(() => {});
              const synth = (ptsSeq) => pg.evaluate(async (seq) => {
                const el = document.querySelector(".leaflet-container");
                const mk = (p, i) => new Touch({ identifier: i + 1, target: el, clientX: p[0], clientY: p[1] });
                for (const [type, pts] of seq) {
                  const ts = pts.map(mk);
                  el.dispatchEvent(new TouchEvent(type, { touches: type === "touchend" ? [] : ts, targetTouches: type === "touchend" ? [] : ts, changedTouches: ts, bubbles: true, cancelable: true }));
                  await new Promise(r => setTimeout(r, 30));
                }
              }, ptsSeq);
              /* let any initial fit/animation settle so the 1F baseline is
                 not taken mid-pan: require 3 consecutive quiet samples AND a
                 minimum elapsed window (a pin fit may start seconds late). */
              {
                const t0 = Date.now();
                let quiet = 0;
                let prev = await snap();
                for (let i = 0; i < 30; i++) {
                  await sleep(400);
                  const cur = await snap();
                  const d = cur.kind === "geo" ? geoDelta(prev, cur) : pxDelta(prev, cur);
                  quiet = (cur.kind === prev.kind && d < (cur.kind === "geo" ? 5 : 2)) ? quiet + 1 : 0;
                  prev = cur;
                  if (quiet >= 3 && Date.now() - t0 >= 5000) break;
                }
              }
              /* px7: REAL CDP one-finger drag on the settled stubbed page —
                 the map may sit below the fold, so scroll it into view first;
                 the drag must scroll the page (>100px) without moving the map. */
              if (dKey === "px7" && px7Sess) {
                try {
                  await pg.evaluate(() => document.querySelector(".leaflet-container")?.scrollIntoView({ block: "center" }));
                  await sleep(500);
                  const d0 = await snap();
                  const ctr0 = await pg.evaluate(() => { const r = document.querySelector(".leaflet-container").getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
                  await px7Sess.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: ctr0.x, y: ctr0.y, id: 1 }] });
                  for (let i = 1; i <= 8; i++) { await px7Sess.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: ctr0.x, y: ctr0.y - i * 25, id: 1 }] }); await sleep(25); }
                  await px7Sess.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
                  await sleep(500);
                  const d1 = await snap();
                  cdpScroll = d1.y - d0.y;
                  cdpMetric = d0.kind;
                  cdpPan = d0.kind === "geo" ? geoDelta(d0, d1) : pxDelta(d0, d1);
                } catch (e) { cdpScroll = "err:" + String(e && e.message || e).slice(0, 60); }
              }
              /* the CDP drag scrolled the page — put the map back in view and
                 recompute the touch point for the synthetic drags */
              await pg.evaluate(() => document.querySelector(".leaflet-container")?.scrollIntoView({ block: "center" })).catch(() => {});
              await sleep(400);
              const ctr = await pg.evaluate(() => { const r = document.querySelector(".leaflet-container").getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
              const s0 = await snap();
              /* 1 finger up ~200px — map must stay, hint must show */
              const seq1 = [["touchstart", [[ctr.x, ctr.y]]]];
              for (let i = 1; i <= 8; i++) seq1.push(["touchmove", [[ctr.x, ctr.y - i * 25]]]);
              seq1.push(["touchend", []]);
              await synth(seq1).catch(() => {});
              if (dKey === "px7" || dKey === "i14") await pg.screenshot({ path: `${shotBase}-gesture-hint.png` }).catch(() => {});
              await sleep(400);
              const s1 = await snap();
              oneF = { scrollDelta: s1.y - s0.y, metric: s0.kind, hintSeen: s1.hint,
                pan: s0.kind === "geo" ? geoDelta(s0, s1) : Math.abs(pxDelta(s0, s1) - Math.abs(s1.y - s0.y)) };
              /* 2 fingers parallel up ~120px — map must pan, page must not scroll */
              const seq2 = [["touchstart", [[ctr.x - 30, ctr.y], [ctr.x + 30, ctr.y]]]];
              for (let i = 1; i <= 8; i++) seq2.push(["touchmove", [[ctr.x - 30, ctr.y - i * 15], [ctr.x + 30, ctr.y - i * 15]]]);
              seq2.push(["touchend", []]);
              await synth(seq2).catch(() => {});
              await sleep(500);
              const s2 = await snap();
              twoF = { scrollDelta: s2.y - s1.y, metric: s1.kind,
                pan: s0.kind === "geo" ? geoDelta(s1, s2) : Math.abs(pxDelta(s1, s2) - Math.abs(s2.y - s1.y)) };
              await pg.evaluate(() => { window.__hintMO?.disconnect(); }).catch(() => {});
            }
          }
          const aOK = g.coarse && g.touchAction === "pan-x pan-y" && !g.touchDrag;
          /* px7 non-light cells: no stub reload — raw Chromium emulation is
             flaky, so these rows are informational (pass when the engine did
             flip, otherwise just record the raw state). */
          const stubOK = stub === null || (stub.coarse === true && stub.touchDrag === false && stub.hintInstalled === true);
          const bOK = oneF === null || (oneF.pan < (oneF.metric === "geo" ? 100 : 25) && oneF.hintSeen);
          const cOK = twoF === null || (twoF.pan > (twoF.metric === "geo" ? 300 : 60) && Math.abs(twoF.scrollDelta) <= 10);
          /* px7 stub rows additionally REQUIRE the real CDP one-finger drag
             to natively scroll the page (>100px) without moving the map —
             the Android behavior synthetic touches cannot show. */
          const cdpOK = typeof cdpScroll === "number" && cdpScroll > 100 && typeof cdpPan === "number" && cdpPan < (cdpMetric === "geo" ? 100 : 25);
          const pass = dKey === "px7"
            ? (stub ? stubOK && bOK && cOK && cdpOK : (g.coarse ? aOK : true))
            : aOK && bOK && cOK;
          row(tKey, dKey, theme, "gesture",
            dKey === "px7" ? (stub ? "coarse-stub: no touch-drag + hint + 1F still + 2F pans" : "informational (raw emulation)")
            : "coarse + pan-x pan-y + !touchDrag + synthetic drags",
            `coarse=${g.coarse} touchAction=${g.touchAction} touchDrag=${g.touchDrag}` +
            (theme === "light" && !touchOk && dKey !== "desk" ? " | synthetic-touch=unsupported" : "") +
            (stub ? ` | stub:{coarse=${stub.coarse} drag=${stub.touchDrag} hint=${stub.hintInstalled}} cdpScroll=${cdpScroll} cdpPan=${cdpPan === null ? "n/a" : cdpPan.toFixed(0) + "m"}` : "") +
            (oneF ? ` | 1F: pan=${oneF.pan?.toFixed(0)}${oneF.metric === "geo" ? "m" : "px"} hint=${oneF.hintSeen}` : "") +
            (twoF ? ` | 2F: pan=${twoF.pan?.toFixed(0)}${twoF.metric === "geo" ? "m" : "px"} dY=${twoF.scrollDelta}` : ""),
            pass, { ...g, stub, cdpScroll, cdpPan, syntheticTouchSupported: touchOk, oneFinger: oneF, twoFinger: twoF });
        }
        /* map-in-view shot for every cell that has a Leaflet map */
        if (a.map) {
          await pg.evaluate(() => document.querySelector(".leaflet-container")?.scrollIntoView({ block: "center" })).catch(() => {});
          await sleep(300);
          await pg.screenshot({ path: `${shotBase}-map.png` }).catch(() => {});
        }
        /* bottom-bar — viewer map bottom bar vs the zoom stack on phones:
           every toggle label fully visible, bar and stack rects disjoint. */
        if (a.map && tKey.startsWith("viewer") && ["se", "i14", "i14-land", "px7"].includes(dKey)) {
          const bb = await pg.evaluate(() => {
            const bar = document.querySelector(".leaflet-container .map-bottom-bar");
            const stack = document.querySelector(".leaflet-container .map-zoom-stack");
            const labels = [...document.querySelectorAll(".leaflet-container .map-bottom-bar .toggle-label")].map(el => ({
              text: (el.textContent || "").trim().slice(0, 30),
              scrollW: el.scrollWidth, clientW: el.clientWidth,
              clipped: el.scrollWidth > el.clientWidth + 1 }));
            const br = bar?.getBoundingClientRect(), sr = stack?.getBoundingClientRect();
            const intersect = !!(br && sr && br.left < sr.right && br.right > sr.left && br.top < sr.bottom && br.bottom > sr.top);
            return { labels, bar: br ? { x: +br.x.toFixed(0), y: +br.y.toFixed(0), w: +br.width.toFixed(0), h: +br.height.toFixed(0) } : null,
              stack: sr ? { x: +sr.x.toFixed(0), y: +sr.y.toFixed(0), w: +sr.width.toFixed(0), h: +sr.height.toFixed(0) } : null, intersect };
          }).catch(() => null);
          const clipped = bb ? bb.labels.filter(l => l.clipped) : [];
          row(tKey, dKey, theme, "bottom-bar", "labels unclipped + bar/stack disjoint",
            bb ? `labels=${bb.labels.map(l => `${l.text}:${l.scrollW}/${l.clientW}${l.clipped ? " CLIPPED" : ""}`).join(", ")} intersect=${bb.intersect}` : "no .map-bottom-bar",
            !!bb && clipped.length === 0 && !bb.intersect, bb);
        }
        /* 11 sw (hub only) */
        if (t.kind.startsWith("hub")) {
          const sw = await pg.evaluate(async () => {
            if (!("serviceWorker" in navigator)) return { supported: false };
            const r = await navigator.serviceWorker.getRegistration().catch(() => null);
            return r ? { supported: true, scope: r.scope, state: r.active?.state || "none" } : { supported: true, registration: null };
          });
          row(tKey, dKey, theme, "sw", "informational", JSON.stringify(sw), true, sw);
        }
      } catch (e) {
        row(tKey, dKey, theme, "load", "completes", `waitMs=${w.ms} timeout=${w.timeout} ${String(e && e.message || e).slice(0,150)}`, false, w);
      }
      /* 10 console errors — same-origin page scripts */
      const appErrs = errs.filter(e => e.kind === "pageerror" || e.url.startsWith(origin));
      row(tKey, dKey, theme, "console-errors", "0 app errors",
        `${appErrs.length} app / ${errs.length} total`, appErrs.length === 0,
        appErrs.length ? appErrs.slice(0,10) : (errs.length ? { noise: errs.slice(0,5) } : null));
      await ctx.close();
    }
  }
}

/* gesture (d) — desktop chromium regression guard: mouse drag must still pan */
if (!ONLY || ONLY === "gesture" || ONLY.includes("desk") || ["hub-job","viewer-hub"].some(k => ONLY.includes(k))) {
  for (const tKey of ["hub-job", "viewer-hub"]) {
    if (ONLY && ONLY !== "gesture" && !tKey.includes(ONLY)) continue;
    const url = TARGETS[tKey].url();
    const b = await browserFor("chromium");
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const pg = await ctx.newPage();
    try {
      await pg.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      const w = await waitForTarget(pg, TARGETS[tKey].kind);
      const g = await pg.evaluate(() => {
        const el = document.querySelector(".leaflet-container");
        return { coarse: matchMedia("(pointer: coarse)").matches,
          touchAction: el ? getComputedStyle(el).touchAction : null,
          touchDrag: el ? el.classList.contains("leaflet-touch-drag") : null };
      });
      const mapPos = () => pg.evaluate(() => {
        const m = window.__cjMap || window.map;
        if (m && typeof m.getCenter === "function") {
          const c = m.getCenter();
          return { kind: "geo", c: [+c.lat.toFixed(6), +c.lng.toFixed(6)] };
        }
        const mk = document.querySelector(".leaflet-overlay-pane svg path") || document.querySelector(".leaflet-marker-pane .leaflet-marker-icon") || document.querySelector(".leaflet-tile-pane .leaflet-tile");
        const r = mk ? mk.getBoundingClientRect() : null;
        return { kind: "px", x: r ? +r.x.toFixed(1) : null, y: r ? +r.y.toFixed(1) : null };
      });
      /* the map can be below the fold on the desk viewport — scroll it
         into view first or the raw mouse events land on nothing */
      await pg.evaluate(() => document.querySelector(".leaflet-container")?.scrollIntoView({ block: "center" }));
      await sleep(500);
      const p0 = await mapPos();
      const y0 = await pg.evaluate(() => window.scrollY);
      const r0 = await pg.evaluate(() => document.querySelector(".leaflet-container")?.getBoundingClientRect());
      if (r0) {
        const cx = r0.x + r0.width / 2, cy = r0.y + r0.height / 2;
        await pg.mouse.move(cx, cy); await pg.mouse.down();
        for (let i = 1; i <= 10; i++) { await pg.mouse.move(cx + i * 15, cy); await sleep(20); }
        await pg.mouse.up(); await sleep(800);
      }
      const p1 = await mapPos();
      const dy = (await pg.evaluate(() => window.scrollY)) - y0;
      const dm = p0.kind !== p1.kind ? -1 : p0.kind === "geo"
        ? Math.hypot((p1.c[0]-p0.c[0])*111320, (p1.c[1]-p0.c[1])*111320*Math.cos(p0.c[0]*Math.PI/180))
        : Math.abs(Math.hypot((p1.x??0)-(p0.x??0), (p1.y??0)-(p0.y??0)) - Math.abs(dy));
      row(tKey, "desk", "light", "gesture", "desktop mouse drag pans (dragging on)",
        `coarse=${g.coarse} mapMoved=${dm.toFixed(0)}${p0.kind === "geo" ? "m" : "px"} waitTimeout=${w.timeout}`,
        g.coarse === false && (p0.kind === "geo" ? dm > 300 : dm > 60) && !w.timeout, { ...g, p0, p1 });
    } catch (e) {
      row(tKey, "desk", "light", "gesture", "desktop mouse drag pans", `crash: ${String(e && e.message || e).slice(0,150)}`, false, null);
    }
    await ctx.close();
  }
}

/* hint overlay visual evidence at iPhone width (393px): chromium +
   matchMedia stub gives the coarse JS path; synthetic touchmove shows the
   hint (the listener fires without TouchZoom/Drag, so this works without
   native touch delivery). */
if (!ONLY || ONLY.includes("hint") || ONLY.includes("viewer-hub")) {
  const b = await browserFor("chromium");
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => /pointer\s*:\s*coarse/.test(q)
      ? { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }
      : orig(q);
  });
  const pg = await ctx.newPage();
  try {
    await pg.goto(TARGETS["viewer-hub"].url(), { waitUntil: "domcontentloaded", timeout: 90000 });
    await waitForTarget(pg, "viewer");
    const shown = await pg.evaluate(async () => {
      const el = document.querySelector(".leaflet-container");
      if (!el || typeof Touch !== "function") return false;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const mk = (pt) => new Touch({ identifier: 1, target: el, clientX: pt[0], clientY: pt[1] });
      const fire = (t, pts) => el.dispatchEvent(new TouchEvent(t, { touches: t === "touchend" ? [] : pts.map(mk), bubbles: true, cancelable: true }));
      fire("touchstart", [[cx, cy]]);
      for (let i = 1; i <= 6; i++) { fire("touchmove", [[cx, cy - i * 20]]); await new Promise(r2 => setTimeout(r2, 30)); }
      return el.classList.contains("is-gesture-hint");
    });
    if (shown) await pg.screenshot({ path: `${OUT}/shots/viewer-hub-393w-light-gesture-hint.png` });
    else await pg.screenshot({ path: `${OUT}/shots/viewer-hub-393w-light-gesture-hint-MISS.png` });
    row("viewer-hub", "i14w", "light", "gesture-hint-visual", "is-gesture-hint on synthetic one-finger drag at 393px",
      `hintShown=${shown}`, shown === true, { hintShown: shown });
  } catch (e) {
    row("viewer-hub", "i14w", "light", "gesture-hint-visual", "hint screenshot", `crash: ${String(e && e.message || e).slice(0,150)}`, false, null);
  }
  await ctx.close();
}

/* 12 perf — px7 chromium light, throttled, cold cache */
if (!SKIP_PERF) {
  const b = await browserFor("chromium");
  for (const tKey of ["hub-job", "viewer-hub", "viewer-sa"]) {
    if (ONLY && !tKey.includes(ONLY) && !"perf".includes(ONLY)) continue;
    const url = TARGETS[tKey].url();
    try {
      const p = await perfRun(b, tKey, url);
      const fmtB = (o) => Object.entries(o).map(([k,v]) => `${k}:${(v/1024).toFixed(0)}K`).join(" ");
      row(tKey, "px7", "light", "perf", "informational",
        `dcl=${p.snap15.dcl}ms load=${p.snap15.load}ms lcp=${p.snap15.lcp}ms | t15 req=${p.snap15.reqCount} bytes[${fmtB(p.snap15.bytes)}] gz=${(p.snap15.gzBytes/1048576).toFixed(1)}MB | t60 req=${p.snap60.reqCount} bytes[${fmtB(p.snap60.bytes)}] gz=${(p.snap60.gzBytes/1048576).toFixed(1)}MB | totalWells@60s=${p.snap60.totalWells} longestTask=${p.snap60.longestTask}ms (n=${p.snap60.ltCount})`,
        true, p);
    } catch(e){
      row(tKey, "px7", "light", "perf", "informational", `crash: ${String(e && e.message || e).slice(0,200)}`, false, null);
    }
  }
}
if (browsers.webkit) await browsers.webkit.close();
if (browsers.chromium) await browsers.chromium.close();

meta.rows = R.length;
fs.writeFileSync(`${OUT}/RESULTS.json`, JSON.stringify({ meta, rows: R }, null, 1));
/* RAW.md */
let md = `# Mobile audit — RAW\n\n- base: ${BASE}\n- standalone: ${STANDALONE}\n- run at: ${meta.at}\n- rows: ${R.length}\n\n`;
const byTC = {};
for (const r of R) { (byTC[r.check] = byTC[r.check] || []).push(r); }
md += `## Summary per check\n\n| Check | PASS | FAIL |\n|---|---|---|\n`;
for (const [c, rs] of Object.entries(byTC)) md += `| ${c} | ${rs.filter(r=>r.pass).length} | ${rs.filter(r=>!r.pass).length} |\n`;
md += `\n## All rows\n\n| Target | Device | Theme | Check | Expected | Actual | Result |\n|---|---|---|---|---|---|---|\n`;
for (const r of R) md += `| ${r.target} | ${r.device} | ${r.theme} | ${r.check} | ${r.expected} | ${r.actual.replace(/\|/g,"/")} | ${r.pass ? "PASS" : "FAIL"} |\n`;
md += `\n## Details (JSON, failed + informational checks)\n\n`;
md += "```json\n" + JSON.stringify(R.filter(r => !r.pass || ["meta","fixed-sticky","sw","perf"].includes(r.check)).map(r => ({ t:r.target, d:r.device, th:r.theme, check:r.check, detail:r.detail })), null, 1).slice(0, 240000) + "\n```\n";
fs.writeFileSync(`${OUT}/RAW.md`, md);
const fails = R.filter(r => !r.pass).length;
console.log(`DONE ${R.length} rows, ${fails} FAIL → ${OUT}`);
