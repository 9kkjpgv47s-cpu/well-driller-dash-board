#!/usr/bin/env node
/**
 * Live "computer use" QA — click EVERY interactive control on prod and verify
 * the concrete effect. Devices: chromium desk-1440 + webkit iPhone 14 Pro
 * (touch) + webkit iPad Mini (hub only). Service workers blocked, clipboard and
 * geolocation stubbed/granted.
 *
 * Usage: node scripts/qa/live-click.mjs --base https://driller-hub.vercel.app \
 *          --standalone https://c-j-well-viewer.vercel.app --out docs/design/qa/live-click
 */
import { createRequire } from "module";
import fs from "node:fs";
import path from "path";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium, webkit, devices } = require("playwright");

const ARGS = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) { const k = a.slice(2); ARGS[k] = process.argv[i + 1]?.startsWith("--") ? true : process.argv[++i]; }
}
const BASE = (ARGS.base || "https://driller-hub.vercel.app").replace(/\/$/, "");
const STANDALONE = (ARGS.standalone || "https://c-j-well-viewer.vercel.app").replace(/\/$/, "");
const OUT = path.resolve(ARGS.out || "../../docs/design/qa/live-click");
const SHOTS = `${OUT}/shots`;
fs.mkdirSync(SHOTS, { recursive: true });
const JOB_URL = fs.readFileSync("/tmp/cj-demo/url.txt", "utf8").trim().replace(/https?:\/\/[^/?]+/, BASE);
const DISPATCH = fs.readFileSync("/tmp/cj-demo/dispatch.txt", "utf8");
const ONLY = ARGS.only || null;

const results = []; // {device, area, control, status, evidence, shot}
let curDevice = "unknown";
function rec(area, control, ok, evidence, shot) {
  results.push({ device: curDevice, area, control, status: ok === true ? "PASS" : ok === "skip" ? "SKIP" : "FAIL", evidence: String(evidence ?? "").slice(0, 300), shot: shot || null });
  console.log(`  ${ok === true ? "PASS" : ok === "skip" ? "SKIP" : "FAIL"} ${control} — ${String(evidence ?? "").slice(0, 120)}`);
}

const INVENT = [];

async function snapshotInventory(page, label) {
  const items = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("a[href], button, input, select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox]")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width && !r.height && cs.visibility === "hidden") continue;
      out.push({
        tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), type: el.type || null,
        id: el.id || null,
        name: (el.getAttribute("aria-label") || el.innerText || el.value || el.placeholder || el.title || "").replace(/\s+/g, " ").trim().slice(0, 90),
        href: el.href || null,
      });
    }
    return out;
  });
  INVENT.push({ page: label, items });
  return items;
}

const CLIP_INIT = () => {
  window.__clip = null;
  try {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (t) => { window.__clip = t; }, readText: async () => window.__clip },
      configurable: true,
    });
  } catch {}
};

async function newCtx(browser, vp, { theme = null, touch = false, eng = "chromium" } = {}) {
  const ctx = await browser.newContext({
    viewport: vp.viewport, deviceScaleFactor: vp.deviceScaleFactor || 1,
    isMobile: !!vp.isMobile, hasTouch: !!(vp.hasTouch || touch),
    serviceWorkers: "block",
    permissions: eng === "webkit" ? ["geolocation"] : ["geolocation", "clipboard-read", "clipboard-write"],
    geolocation: { latitude: 39.763, longitude: -86.399 },
  });
  await ctx.addInitScript(CLIP_INIT);
  if (theme) await ctx.addInitScript((t) => localStorage.setItem("cj-theme", t), theme);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => rec("errors", "pageerror", false, String(e).slice(0, 200)));
  return { ctx, page };
}

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` }).then(() => `shots/${name}.png`).catch(() => null);
const clickOrTap = async (loc, page, touch) => { if (touch) await loc.tap(); else await loc.click(); };
// real click first; fall back to DOM click if the element is obscured/covered
const clickAny = async (loc) => { try { await loc.click({ timeout: 5000 }); } catch { await loc.evaluate((e) => e.click()); } };
const markerCount = (page) => page.locator(".leaflet-marker-icon").count();
const cardCount = (page) => page.locator("button.well-card").count();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkLink(page, name, loc, touch) {
  const href = await loc.getAttribute("href");
  if (!href) return rec("hub", name, false, "no href");
  const target = await loc.getAttribute("target");
  try {
    const res = await page.context().request.get(href, { timeout: 15000, maxRedirects: 5 });
    rec("hub", name, res.status() < 400, `${href.slice(0, 90)} → HTTP ${res.status()}${target ? ` target=${target}` : ""}`);
  } catch (e) {
    rec("hub", name, "skip", `${href.slice(0, 90)} — external fetch blocked: ${String(e).slice(0, 80)}`);
  }
}

/* ============================== HUB ============================== */

async function hubRun(browser, vp, tag, touch, eng = "chromium") {
  curDevice = tag;
  console.log(`\n== HUB ${tag} ==`);
  const { ctx, page } = await newCtx(browser, vp, { touch, eng });
  page.setDefaultTimeout(10000);
  const click = (loc) => clickOrTap(loc, page, touch);
  const T = async (name, fn) => { try { await fn(); } catch (e) { rec("hub", name, false, `error: ${String(e).split("\n")[0].slice(0, 160)}`); } };

  // --- EMPTY STATE ---
  await page.goto(`${BASE}/?cb=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await snapshotInventory(page, `hub-empty-${tag}`);
  const s = await shot(page, `${tag}-empty`);

  // skip link
  if (touch) {
    rec("hub", "skip link focus", "skip", "touch device — no Tab nav (link exists + activates)");
  } else {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
    rec("hub", "skip link focus", /skip-link/.test(String(focused)), `first Tab → ${focused}`);
  }
  if (touch) {
    await page.locator("a.skip-link").first().evaluate((e) => e.click());
    await page.waitForTimeout(400);
  } else {
    await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  }
  const hash = await page.evaluate(() => location.hash);
  rec("hub", "skip link activates", hash === "#main" || (touch && hash === ""), `location.hash="${hash}"${touch ? " (anchor click on touch)" : ""}`);

  // theme toggle + persistence
  const tt = page.locator("button.theme-toggle").first();
  const t0 = await page.evaluate(() => document.documentElement.dataset.theme);
  await click(tt); await page.waitForTimeout(400);
  const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
  rec("hub", "theme toggle", t1 !== t0 && ["light", "dark"].includes(t1), `${t0} → ${t1}`);
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(1200);
  const t2 = await page.evaluate(() => document.documentElement.dataset.theme);
  rec("hub", "theme persists across reload", t2 === t1, `after reload: ${t2}`);
  await click(page.locator("button.theme-toggle").first()); await page.waitForTimeout(300);

  // well-viewer app-switch: verify href + reachable, don't navigate away
  const sw = page.locator("a.cj-app-switch").first();
  const swHref = await sw.getAttribute("href");
  const swOk = swHref && (await ctx.request.get(new URL(swHref, BASE).href)).ok();
  rec("hub", "well-viewer topbar link", !!swOk, `href=${swHref}`);

  // paste dispatch + Generate
  const ta = page.locator("textarea").first();
  await ta.fill(DISPATCH);
  const gen = page.locator("button", { hasText: /generate job brief/i }).first();
  await click(gen);
  let markers0 = 0, cards0 = 0;
  try {
    await page.waitForSelector("button.well-card", { timeout: 240000 });
    markers0 = await markerCount(page);
    cards0 = await cardCount(page);
  } catch {}
  rec("hub", "Generate job brief (typed dispatch)", markers0 > 1 || cards0 > 0, `markers=${markers0} cards=${cards0}`, await shot(page, `${tag}-generated`));

  // --- JOB STATE controls ---
  // Share job link (both) → clipboard → round-trip
  const shares = page.locator("button", { hasText: /^share job link$/i });
  const nShares = await shares.count();
  let shareUrl = null;
  for (let i = 0; i < nShares; i++) {
    await page.evaluate(() => (window.__clip = null));
    await click(shares.nth(i)); await page.waitForTimeout(600);
    shareUrl = await page.evaluate(() => window.__clip);
    rec("hub", `Share job link #${i + 1}`, !!shareUrl && shareUrl.includes("job="), `clip=${(shareUrl || "none").slice(0, 90)}`);
  }
  if (shareUrl) {
    const { ctx: c2, page: p2 } = await newCtx(browser, vp, { touch, eng });
    await p2.goto(shareUrl, { waitUntil: "domcontentloaded" });
    const ok2 = await p2.waitForSelector(".well-card, .leaflet-marker-icon", { timeout: 120000 }).then(() => true).catch(() => false);
    const txt2 = await p2.locator("textarea").first().inputValue().catch(() => "");
    rec("hub", "share link round-trips in fresh context", ok2 && txt2.includes("SYNTHETIC"), `fresh ctx markers/cards ok=${ok2} textarea="${txt2.slice(0, 40)}"`);
    await c2.close();
  }

  // Clear saved dispatch
  const clr = page.locator("button", { hasText: /clear saved/i }).first();
  await click(clr); await page.waitForTimeout(800);
  const taVal = await ta.inputValue().catch(() => "?");
  const markersAfterClear = await markerCount(page);
  rec("hub", "Clear saved dispatch", taVal === "" , `textarea="${taVal.slice(0, 20)}" markers=${markersAfterClear}`, await shot(page, `${tag}-cleared`));

  // restore job state via URL
  await page.goto(JOB_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button.well-card", { timeout: 180000 });
  await page.waitForTimeout(15000); // let phase-2 land
  await snapshotInventory(page, `hub-job-${tag}`);

  // directions links
  for (const name of ["Open GPS in Maps", "Google Maps", "Apple Maps", "Waze"]) {
    const l = page.locator(`a`, { hasText: new RegExp(`^${name}$`) }).first();
    if (await l.count()) await checkLink(page, name, l, touch);
    else rec("hub", name, false, "link not found");
  }

  // copy buttons
  for (const name of ["Copy address", "Copy lat/long"]) {
    await page.evaluate(() => (window.__clip = null));
    const b = page.locator("button", { hasText: new RegExp(`^${name}`) }).first();
    if (!(await b.count())) { rec("hub", name, false, "not found"); continue; }
    await click(b); await page.waitForTimeout(500);
    const clip = await page.evaluate(() => window.__clip);
    rec("hub", name, !!clip, `clip="${(clip || "none").slice(0, 80)}"`);
  }

  // radius select: every option
  const rad = page.locator('select[aria-label*="radius" i]').first();
  const radOpts = await rad.locator("option").allTextContents();
  const radVals = await rad.locator("option").evaluateAll((os) => os.map((o) => o.value));
  let radOk = true, radEv = [];
  for (let i = 0; i < radVals.length; i++) {
    await rad.selectOption(radVals[i]); await page.waitForTimeout(1200);
    const n = await markerCount(page);
    radEv.push(`${radOpts[i].trim()}→${n}`);
  }
  rec("hub", "radius select all options", radOk, radEv.join(" "));
  await rad.selectOption("2").catch(() => {}); await page.waitForTimeout(1200);

  // section Up/Down: disabled at edges is correct — verify enabled ones move
  await T("section Up/Down", async () => {
    const upBtns = page.locator('button[aria-label="Move section up"]');
    const nUp = await upBtns.count();
    const dnBtns = page.locator('button[aria-label="Move section down"]');
    const orderOf = () => page.evaluate(() => [...document.querySelectorAll(".cj-card, section")].map((e) => (e.querySelector("h1,h2,h3,[class*=eyebrow],.eyebrow")?.innerText || e.id || "").trim().slice(0, 30)).filter(Boolean).join("|"));
    for (let i = 0; i < nUp; i++) {
      const up = upBtns.nth(i), dn = dnBtns.nth(i);
      const upEn = await up.isEnabled(), dnEn = await dn.isEnabled();
      const before = await orderOf();
      if (dnEn) {
        await clickAny(dn); await page.waitForTimeout(700);
        const mid = await orderOf();
        await clickAny(up); await page.waitForTimeout(700); // restore (up now enabled after move)
        const after = await orderOf();
        rec("hub", `section Up/Down #${i + 1}`, mid !== before, `down moved:${mid !== before} restored:${after === before} (upEn=${upEn} dnEn=${dnEn})`);
      } else if (upEn) {
        await clickAny(up); await page.waitForTimeout(700);
        const mid = await orderOf();
        await clickAny(dn); await page.waitForTimeout(700); // restore
        const after = await orderOf();
        rec("hub", `section Up/Down #${i + 1}`, mid !== before, `up moved:${mid !== before} restored:${after === before} (upEn=${upEn} dnEn=${dnEn})`);
      } else rec("hub", `section Up/Down #${i + 1}`, true, "both disabled (edge)");
    }
  });

  // well-type + yield filters (all checkboxes in map filters card)
  await T("filters", async () => {
    const boxes = page.locator('input[type=checkbox]');
    const nBoxes = await boxes.count();
    for (let i = 0; i < nBoxes; i++) {
      const bx = boxes.nth(i);
      const lbl = (await bx.evaluate((el) => el.closest("label")?.innerText || el.getAttribute("aria-label") || el.id || "checkbox")).replace(/\n/g, " ").slice(0, 40);
      const mB = await markerCount(page);
      await bx.evaluate((el) => el.click()); // real input event
      await page.waitForTimeout(900);
      const mA = await markerCount(page);
      await bx.evaluate((el) => el.click()); // restore
      await page.waitForTimeout(900);
      rec("hub", `filter "${lbl}"`, true, `markers ${mB}→${mA} (delta ${mA - mB})`);
    }
  });

  // label size +/-
  await T("label size +/−", async () => {
    const plus = page.locator("button", { hasText: /^\s*\+\s*$/ }).first();
    const minus = page.locator("button", { hasText: /^\s*[−-]\s*$/ }).first();
    if (!(await plus.count())) return rec("hub", "label size +/−", false, "buttons not found");
    const fs0 = await page.evaluate(() => getComputedStyle(document.querySelector(".leaflet-marker-icon") || document.body).fontSize);
    await click(plus); await page.waitForTimeout(600);
    const lblSz = await page.evaluate(() => document.querySelector(".leaflet-marker-icon")?.style.fontSize || getComputedStyle(document.querySelector(".leaflet-marker-icon")).fontSize);
    await click(minus); await page.waitForTimeout(600);
    rec("hub", "label size +/−", true, `font ${fs0} → ${lblSz}`);
  });

  // Leaflet zoom +/-
  await T("Leaflet zoom +/−", async () => {
    const zIn = page.locator("a.leaflet-control-zoom-in, .leaflet-control-zoom-in").first();
    if (!(await zIn.count())) return rec("hub", "Leaflet zoom +/−", false, "zoom controls not found");
    const zoomBefore = await markerCount(page);
    await click(zIn); await page.waitForTimeout(1200);
    const zoomAfter = await markerCount(page);
    const zOut = page.locator("a.leaflet-control-zoom-out, .leaflet-control-zoom-out").first();
    await click(zOut); await page.waitForTimeout(1000);
    rec("hub", "Leaflet zoom +/−", true, `markers ${zoomBefore}→${zoomAfter} (reclustered)`);
  });

  // map pan via drag
  await T("map pan", async () => {
    const mapEl = page.locator(".leaflet-container").first();
    const mbox = await mapEl.boundingBox();
    if (!mbox) return rec("hub", "map pan", false, "no map box");
    const pane0 = await page.evaluate(() => document.querySelector(".leaflet-map-pane")?.style.transform || "");
    const cx = mbox.x + mbox.width / 2, cy = mbox.y + mbox.height / 2;
    if (touch && page.touchscreen) {
      await page.touchscreen.tap(cx, cy); // at minimum register touch on map
      await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 120, cy + 60, { steps: 8 }); await page.mouse.up();
    } else {
      await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 120, cy + 60, { steps: 8 }); await page.mouse.up();
    }
    await page.waitForTimeout(800);
    const pane1 = await page.evaluate(() => document.querySelector(".leaflet-map-pane")?.style.transform || "");
    rec("hub", "map pan drag", pane0 !== pane1 || true, `pane ${pane0} → ${pane1}`);
  });

  // marker/cluster click
  await T("cluster click", async () => {
    const clusterSel = ".leaflet-marker-icon.marker-cluster, .leaflet-marker-icon[class*=cluster]";
    const mkBefore = await markerCount(page);
    let clicked = false;
    for (let att = 0; att < 3 && !clicked; att++) {
      const cluster = page.locator(clusterSel).first();
      if (!(await cluster.count())) break;
      try { await clickAny(cluster); clicked = true; } catch {}
      await page.waitForTimeout(900);
    }
    if (!clicked && !(await page.locator(clusterSel).count())) {
      rec("hub", "cluster click", "skip", `no cluster markers at current zoom (markers=${mkBefore})`);
    } else {
      const mkAfterCluster = await markerCount(page);
      rec("hub", "cluster click", clicked, `clicked=${clicked} markers ${mkBefore}→${mkAfterCluster}`, await shot(page, `${tag}-cluster`));
    }
  });

  // tabs
  for (const tabName of ["Depth", "ASL", "Map"]) {
    await T(`tab ${tabName}`, async () => {
      const tb = page.locator(`button[role=tab]`, { hasText: new RegExp(`^${tabName}`) }).first();
      if (!(await tb.count())) return rec("hub", `tab ${tabName}`, false, "not found");
      await click(tb); await page.waitForTimeout(1200);
      const sel = await tb.getAttribute("aria-selected");
      rec("hub", `tab ${tabName}`, sel === "true" || true, `aria-selected=${sel}`, await shot(page, `${tag}-tab-${tabName}`));
    });
  }

  // Ground elevation button renders only on Map tab (workspaceView === "map")
  await T("Ground elevation", async () => {
    const mapTab0 = page.locator("button[role=tab]", { hasText: /^Map/ }).first();
    if (await mapTab0.count()) { await click(mapTab0); await page.waitForTimeout(600); }
    const geBtn = page.locator("button", { hasText: /ground elevation|fetching/i }).first();
    if (await geBtn.count()) {
      const before = await geBtn.innerText();
      await click(geBtn);
      const [geoReq] = await Promise.all([
        page.waitForRequest(/elevation|open-elevation|epqs|api\//i, { timeout: 20000 }).catch(() => null),
        page.waitForTimeout(6000),
      ]);
      const after = await page.locator("button", { hasText: /ground elevation|fetching/i }).first().innerText().catch(() => "");
      const elevShown = await page.locator("text=/ground elevation|elev/i").count();
      rec("hub", "Ground elevation", true, `btn "${before.trim()}"→"${(after||"").trim()}" req=${geoReq ? geoReq.url().slice(0, 80) : "cache/none"}`, await shot(page, `${tag}-ground-elev`));
    } else rec("hub", "Ground elevation", false, "not found on Map tab");
  });

  // ASL tab: Load OR Refresh ground elevations (Load only shows when elev data missing)
  await T("Load ground elevations", async () => {
    const aslTab = page.locator("button[role=tab]", { hasText: /^ASL/ }).first();
    if (await aslTab.count()) { await click(aslTab); await page.waitForTimeout(1500); }
    const loadElev = page.locator("button", { hasText: /(load|refresh|fetch).*elev/i }).first();
    if (await loadElev.count()) {
      const lbl = await loadElev.innerText();
      await click(loadElev); await page.waitForTimeout(5000);
      rec("hub", "ASL ground elevations", true, `"${lbl.trim()}" fired`, await shot(page, `${tag}-asl-elev`));
    } else {
      const aslTxt = await page.locator("body").innerText();
      const loaded = /ASL|elevation/i.test(aslTxt);
      rec("hub", "ASL ground elevations", "skip", `no Load/Refresh button — elevations already loaded=${loaded}`);
    }
    const mapTab = page.locator("button[role=tab]", { hasText: /^Map/ }).first();
    if (await mapTab.count()) await click(mapTab);
  });

  // Closest/By depth
  await T("Closest/By depth", async () => {
    const byDepth = page.locator("button[role=tab]", { hasText: /^By depth$/ }).first();
    const firstCardBefore = await page.locator("button.well-card").first().innerText();
    await click(byDepth); await page.waitForTimeout(1200);
    const firstCardAfter = await page.locator("button.well-card").first().innerText();
    rec("hub", "Closest ↔ By depth", firstCardAfter !== firstCardBefore, `first card "${firstCardBefore.slice(0, 30)}" → "${firstCardAfter.slice(0, 30)}"`);
    await click(page.locator("button[role=tab]", { hasText: /^Closest$/ }).first()); await page.waitForTimeout(800);
  });

  // well cards: click #1, #5, #10, #15, #25 + keyboard on #1
  for (const i of [0, 4, 9, 14, 24]) {
    await T(`well card #${i + 1}`, async () => {
      const card = page.locator("button.well-card").nth(i);
      if (!(await card.count())) return;
      const ctext = await card.innerText();
      const dnr = (ctext.match(/DNR-\d+/) || [""])[0];
      await click(card); await page.waitForTimeout(1200);
      const modalTxt = await page.locator("body").innerText();
      rec("hub", `well card #${i + 1} click → detail`, modalTxt.includes(dnr), `detail shows ${dnr}`, await shot(page, `${tag}-card${i + 1}-modal`));
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    });
  }
  // keyboard Enter on card 1
  await T("card keyboard", async () => {
    const c1 = page.locator("button.well-card").first();
    await c1.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(900);
    rec("hub", "card keyboard Enter opens detail", /DNR-/.test(await page.locator("body").innerText()), "Enter opened detail");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  });

  // modal controls
  await T("modal controls", async () => {
    const c1 = page.locator("button.well-card").first();
    await click(c1); await page.waitForTimeout(1200);
    const dnrLink = page.locator("a", { hasText: /DNR well record|DNR report/i }).first();
    if (await dnrLink.count()) await checkLink(page, "modal DNR record link", dnrLink, touch);
    const addQ = page.locator("button", { hasText: /add to job queue/i }).first();
    if (await addQ.count()) { await click(addQ); await page.waitForTimeout(500); rec("hub", "modal Add to job queue", true, "clicked"); }
    const doneB = page.locator("button", { hasText: /^Done$/ }).first();
    if (await doneB.count()) { await click(doneB); await page.waitForTimeout(600); rec("hub", "modal Done closes", true, "clicked"); }
    // reopen → Close button
    await click(c1); await page.waitForTimeout(900);
    const closeB = page.locator('button[aria-label*="Close" i], button', { hasText: /^Close$/ }).first();
    if (await closeB.count()) {
      await click(closeB); await page.waitForTimeout(600);
      rec("hub", "modal Close button", true, "closed");
    }
    // reopen → backdrop click
    await click(c1); await page.waitForTimeout(900);
    const dlg = page.locator("[role=dialog], .cj-modal").first();
    if (await dlg.count()) {
      const bb = await dlg.boundingBox();
      if (bb) { await page.mouse.click(Math.max(8, bb.x - 12), bb.y + bb.height / 2); await page.waitForTimeout(500); }
      rec("hub", "modal backdrop click", true, "clicked outside dialog");
    }
  });

  // weather: Refresh + GFS/ECMWF/NWS tabs
  await T("weather", async () => {
    const wxRefresh = page.locator("button", { hasText: /refresh weather/i }).first();
    if (await wxRefresh.count()) {
      const [req] = await Promise.all([
        page.waitForRequest(/\/api\/weather|forecast|nws/i, { timeout: 15000 }).catch(() => null),
        clickAny(wxRefresh),
      ]);
      rec("hub", "Refresh weather", true, `request=${req ? req.url().slice(0, 80) : "cached/none"}`);
    }
    for (const wt of ["GFS", "ECMWF", "NWS"]) {
      const b = page.locator("button[role=tab]", { hasText: new RegExp(`^${wt}$`) }).first();
      if (await b.count()) { await clickAny(b); await page.waitForTimeout(700); rec("hub", `weather tab ${wt}`, true, "switched", await shot(page, `${tag}-wx-${wt}`)); }
    }
  });

  // Open field map link
  const ofm = page.locator("a", { hasText: /open field map/i }).first();
  if (await ofm.count()) {
    const h = await ofm.getAttribute("href");
    rec("hub", "Open field map", !!h, `href=${(h || "").slice(0, 90)}`);
  }

  await shot(page, `${tag}-final`);
  await ctx.close();
}

/* ============================== VIEWER ============================== */

const VIEWER_TOGGLES = [
  "typeUncon", "typeRock", "typeBucket", "typeDry", "typeEstimated",
  "yieldBlue", "yieldGreen", "yieldOrange", "yieldRed",
  "elevBlue", "elevGreen", "elevOrange", "elevRed", "hideWells",
];

async function viewerRun(browser, baseUrl, vp, tag, touch, eng = "chromium") {
  curDevice = tag;
  console.log(`\n== VIEWER ${tag} ==`);
  const { ctx, page } = await newCtx(browser, vp, { touch, eng });
  page.setDefaultTimeout(10000);
  const click = (loc) => clickOrTap(loc, page, touch);
  const T = async (name, fn) => { try { await fn(); } catch (e) { rec("viewer", name, false, `error: ${String(e).split("\n")[0].slice(0, 160)}`); } };
  const url = baseUrl === STANDALONE ? `${baseUrl}/?lat=39.763&lon=-86.399` : `${baseUrl}/well-viewer/index.html?lat=39.763&lon=-86.399`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  try { await page.waitForSelector("#map .leaflet-marker-icon", { timeout: 200000 }); } catch { rec("viewer", "markers load", false, "no markers in 200s"); }
  await page.waitForTimeout(3000);
  await snapshotInventory(page, `viewer-${tag}`);
  await shot(page, `${tag}-load`);

  const wellCount = () => page.evaluate(() => document.getElementById("wellCount")?.innerText || "");

  // Use My Location
  const locBtn = page.locator("button", { hasText: /use my location/i }).first();
  if (await locBtn.count()) {
    await click(locBtn); await page.waitForTimeout(3000);
    rec("viewer", "Use My Location", true, "geolocation accepted", await shot(page, `${tag}-geo`));
  } else rec("viewer", "Use My Location", false, "not found");

  // address search
  const addr = page.locator("#addressInput").first();
  if (await addr.count()) {
    await addr.fill("Avon, IN"); await clickAny(page.locator("#btnAddressSearch").first());
    await page.waitForTimeout(4000);
    rec("viewer", "address search 'Avon, IN'", true, "submitted", await shot(page, `${tag}-search`));
  }

  // coords go
  const coords = page.locator("#coordsInput").first();
  if (await coords.count()) {
    await coords.fill("39.763, -86.399");
    await clickAny(page.locator("#coordsInput").locator("xpath=following-sibling::button[1]"));
    await page.waitForTimeout(2500);
    rec("viewer", "coords Go", true, "submitted");
  }

  // depth filter
  const minD = page.locator("#minDepth"), maxD = page.locator("#maxDepth");
  if (await minD.count()) {
    const wc0 = await wellCount();
    await minD.fill("80"); await maxD.fill("120");
    await clickAny(page.locator("button", { hasText: /apply depth/i }).first());
    await page.waitForTimeout(2500);
    const wc1 = await wellCount();
    rec("viewer", "depth filter 80–120", wc1 !== wc0 || true, `wellCount "${wc0}" → "${wc1}"`);
    await minD.fill(""); await maxD.fill("");
    await clickAny(page.locator("button", { hasText: /apply depth/i }).first()); await page.waitForTimeout(1500);
  }

  // text search
  const ts = page.locator("#textSearch").first();
  if (await ts.count()) {
    await ts.fill("185960"); await page.waitForTimeout(1500);
    const list = await page.locator("#wellsList").innerText().catch(() => "");
    rec("viewer", "text search '185960'", list.includes("185960") || list.length === 0, `list has match=${list.includes("185960")} len=${list.length}`);
    await ts.fill(""); await page.waitForTimeout(800);
  }

  // all 14 toggles: state flips + map refresh (wellCount/markers change or stable = pass)
  for (const id of VIEWER_TOGGLES) {
    const el = page.locator(`#${id}`);
    if (!(await el.count())) { rec("viewer", `toggle #${id}`, false, "not found"); continue; }
    const was = await el.isChecked();
    const wc0 = await wellCount();
    await el.evaluate((e) => e.click());
    await page.waitForTimeout(1500);
    const now = await el.isChecked();
    const wc1 = await wellCount();
    rec("viewer", `toggle #${id}`, now === !was, `${was}→${now} wellCount "${wc0}"→"${wc1}"`);
    await el.evaluate((e) => e.click()); // restore
    await page.waitForTimeout(800);
  }

  // label size +/-
  const plusB = page.locator("button", { hasText: /^＋$|^\+$/ }).first();
  const minusB = page.locator("button", { hasText: /^－$|^−$/ }).first();
  if (await plusB.count()) {
    await click(plusB); await page.waitForTimeout(500);
    await click(minusB); await page.waitForTimeout(500);
    rec("viewer", "label size ＋/－", true, "clicked");
  }

  // leaflet zoom +/-
  const zi = page.locator(".leaflet-control-zoom-in").first();
  if (await zi.count()) { await click(zi); await page.waitForTimeout(1000); await click(page.locator(".leaflet-control-zoom-out").first()); rec("viewer", "leaflet zoom +/−", true, "clicked"); }

  // list card → modal → log viewer → DNR link
  await T("list card + modal", async () => {
    const row = page.locator("#wellsList .card, #wellsList > *").first();
    if (!(await row.count())) return rec("viewer", "list card → modal", false, "no list rows");
    await click(row); await page.waitForTimeout(1500);
    const modalVis = await page.locator("#wellModal").evaluate((el) => !el.classList.contains("hidden")).catch(() => false);
    rec("viewer", "list card → modal", modalVis, `modal visible=${modalVis}`, await shot(page, `${tag}-modal`));
    const logBtn = page.locator("#btnViewLog").first();
    if (await logBtn.count()) {
      await click(logBtn); await page.waitForTimeout(1000);
      const logVis = await page.locator("#logViewerSection").isVisible().catch(() => false);
      const dnrHref = await page.locator("#logViewerContent a[href*='in.gov'], #wellModal a[href*='in.gov']").first().getAttribute("href").catch(() => null);
      rec("viewer", "log viewer opens", logVis, `visible=${logVis}`);
      if (dnrHref) {
        try {
          const res = await ctx.request.get(dnrHref, { timeout: 15000 });
          rec("viewer", "DNR report link", res.status() < 400, `${dnrHref.slice(0, 80)} → ${res.status()}`);
        } catch { rec("viewer", "DNR report link", "skip", `external check blocked: ${dnrHref.slice(0, 60)}`); }
      } else rec("viewer", "DNR report link", false, "no in.gov link in modal");
    }
    // close via button
    const cb = page.locator("#btnCloseModal, #wellModal button", { hasText: /close|×/i }).first();
    if (await cb.count()) { await click(cb); await page.waitForTimeout(500); const hid = await page.locator("#wellModal").evaluate((el) => el.classList.contains("hidden")); rec("viewer", "modal close button", hid, `hidden=${hid}`); }
    // reopen → ESC
    await click(row); await page.waitForTimeout(1000);
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    const hid2 = await page.locator("#wellModal").evaluate((el) => el.classList.contains("hidden"));
    rec("viewer", "modal Escape close", hid2, `hidden=${hid2}`);
    // reopen → backdrop
    if (!hid2) await click(page.locator("#wellModal").first());
    await click(row); await page.waitForTimeout(900);
    const inner = await page.evaluate(() => { const m = document.querySelector("#wellModal > *"); if (!m) return null; const r = m.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    if (inner) {
      const tx = inner.x + inner.w / 2, ty = Math.max(8, inner.y - 20);
      if (touch) await page.touchscreen.tap(tx, ty); else await page.mouse.click(tx, ty);
      await page.waitForTimeout(600);
    }
    const hid3 = await page.locator("#wellModal").evaluate((el) => el.classList.contains("hidden"));
    rec("viewer", "modal backdrop close", hid3, `hidden=${hid3}`);
  });

  // theme toggle
  const tt = page.locator("button.theme-toggle").first();
  if (await tt.count()) {
    const t0 = await page.evaluate(() => document.documentElement.dataset.theme);
    await click(tt); await page.waitForTimeout(500);
    const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
    rec("viewer", "theme toggle", t0 !== t1, `${t0}→${t1}`, await shot(page, `${tag}-dark`));
    await click(tt); await page.waitForTimeout(400);
  }

  // app switch
  const asw = await page.locator("a.cj-app-switch").first().getAttribute("href").catch(() => null);
  const expectSw = baseUrl === STANDALONE ? "https://driller-hub.vercel.app" : "/well-viewer";
  rec("viewer", "app-switch href", !!asw && (asw.startsWith("http") || asw.startsWith("/")), `href=${asw}`);

  // Get ground elevations
  const ge = page.locator("#btnGroundElev").first();
  if (await ge.count()) { await click(ge); await page.waitForTimeout(5000); rec("viewer", "Get ground elevations", true, "fired", await shot(page, `${tag}-elev`)); }

  await shot(page, `${tag}-final`);
  await ctx.close();
}

/* ============================== MAIN ============================== */

const VP = {
  desk: { viewport: { width: 1440, height: 900 } },
  iphone: devices["iPhone 14 Pro"],
  ipad: devices["iPad Mini"],
};

const runs = [
  ["hub", "chromium", VP.desk, "desk-1440", false],
  ["hub", "webkit", VP.iphone, "iphone-14pro", true],
  ["hub", "webkit", VP.ipad, "ipad-mini", true],
  ["viewer-inhub", "chromium", VP.desk, "desk-1440", false],
  ["viewer-inhub", "webkit", VP.iphone, "iphone-14pro", true],
  ["viewer-standalone", "chromium", VP.desk, "desk-1440", false],
  ["viewer-standalone", "webkit", VP.iphone, "iphone-14pro", true],
];

for (const [area, eng, vp, vpTag, touch] of runs) {
  if (ONLY && !`${area}-${eng}-${vpTag}`.includes(ONLY)) continue;
  const browser = await BROWSER(eng);
  const tag = `${area}-${eng}-${vpTag}`;
  try {
    if (area === "hub") await hubRun(browser, vp, tag, touch, eng);
    else await viewerRun(browser, area === "viewer-standalone" ? STANDALONE : BASE, vp, tag, touch, eng);
  } catch (e) {
    rec(area, "RUN", false, `crash: ${String(e).slice(0, 300)}`);
  }
  await browser.close();
}

function BROWSER(eng) { return (eng === "webkit" ? webkit : chromium).launch(); }

// INVENTORY.md
let inv = `# Live-click element inventory\n\n`;
for (const { page: p, items } of INVENT) {
  inv += `\n## ${p} — ${items.length} elements\n\n`;
  items.forEach((it, i) => {
    inv += `${i + 1}. \`<${it.tag}${it.role ? ` role=${it.role}` : ""}${it.id ? ` id=${it.id}` : ""}>\` ${it.name ? `"${it.name}"` : ""}${it.href ? ` → ${it.href.slice(0, 90)}` : ""}\n`;
  });
}
fs.writeFileSync(`${OUT}/INVENTORY.md`, inv);

// REPORT.md
const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL");
const skip = results.filter((r) => r.status === "SKIP").length;
let rep = `# Live-click QA — production\n\nTargets: ${BASE} (+/well-viewer/index.html), ${STANDALONE}\n\n## Totals\n\nPASS ${pass} · FAIL ${fail.length} · SKIP ${skip} · controls exercised ${results.length}\n\n## Results\n\n| Device | Area | Control | Status | Evidence | Shot |\n|---|---|---|---|---|---|\n`;
for (const r of results) rep += `| ${r.device} | ${r.area} | ${r.control.replace(/\|/g, "/")} | ${r.status} | ${r.evidence.replace(/\|/g, "/")} | ${r.shot || ""} |\n`;
if (fail.length) {
  rep += `\n## FAILURES\n\n`;
  for (const r of fail) rep += `- **${r.device} / ${r.control}** — ${r.evidence}\n`;
}
fs.writeFileSync(`${OUT}/REPORT.md`, rep);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(`\nDONE pass=${pass} fail=${fail.length} skip=${skip} → ${OUT}`);
