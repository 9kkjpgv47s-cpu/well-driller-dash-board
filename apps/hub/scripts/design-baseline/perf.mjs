#!/usr/bin/env node
/**
 * perf.mjs — Well Viewer performance harness (Phase: perf pass).
 *
 *   node perf.mjs run     --url http://localhost:3001/well-viewer/index.html \
 *                         --out docs/design/perf/<label>.json [--only phone]
 *   node perf.mjs markers --url <viewer-url> --out <file.json>
 *   node perf.mjs check   --url <viewer-url>   (cj_perf_check=1 gate)
 *
 * Metrics (3 runs each, median reported):
 *   loadReadyMs, loadLongTaskMs, refreshMs, refreshCount,
 *   wheelPan {settleMs,longTaskMs,maxFrameGap,framesGt50,refreshCount},
 *   zoomStep {settleMs,longTaskMs,refreshCount},
 *   pageScroll {maxFrameGap,framesGt50} (touch profiles),
 *   filterToggle {offMs,onMs}
 *
 * Profiles: desktop 1440x900 | ipad 820x1180 touch dpr2 cpu4x |
 *           phone 390x844 touch dpr3 cpu4x.
 * Tiles/3rd-party aborted (same-origin only) so network never dominates.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PWT = [
  process.env.CJ_PLAYWRIGHT_PATH,
  "/Users/dominiceasterling/Projects/cj-os/node_modules/playwright",
];
function load(p) {
  for (const c of p) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error("missing module: " + p.join(", "));
}

const TARGET = { lat: 39.763, lon: -86.399 };
const PROFILES = {
  desktop: {
    viewport: { width: 1440, height: 900 },
  },
  ipad: {
    viewport: { width: 820, height: 1180 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    cpu: 4,
  },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    cpu: 4,
  },
};
const RUNS = 3;

// In-page instrumentation — installed before any page script runs.
const INIT = `(() => {
  window.__perf = { longTasks: [], mark: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__perf.longTasks.push({ t: e.startTime, d: e.duration });
    }).observe({ type: "longtask", buffered: true });
  } catch (e) {}
  // Deterministic subsample: fixed-seed PRNG replacing Math.random so the
  // >800-marker cap picks identically across before/after runs.
  let __s = 0x9e3779b9;
  Math.random = function () {
    __s |= 0; __s = (__s + 0x6d2b79f5) | 0;
    let t = Math.imul(__s ^ (__s >>> 15), 1 | __s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

const INSTRUMENT = `(() => {
  // Wrap refreshMap for invocation counting + last-call timestamp.
  // refreshMap is a top-level function declaration => lives on window.
  if (!window.__rmWrapped && typeof window.refreshMap === "function") {
    const orig = window.refreshMap;
    window.refreshMap = function () {
      window.__rmCount = (window.__rmCount || 0) + 1;
      window.__rmLast = performance.now();
      const v = orig.apply(this, arguments);
      window.__rmWork = (window.__rmWork || 0) + (performance.now() - window.__rmLast);
      return v;
    };
    window.__rmWrapped = true;
  }
  // Marker-pane mutation observer → settle detection.
  window.__rmQuietAt = performance.now();
  if (!window.__mo) {
    const pane = document.querySelector(".leaflet-marker-pane");
    if (pane) {
      window.__mo = new MutationObserver(() => {
        window.__moDirty = true;
        window.__rmQuietAt = performance.now();
      });
      window.__mo.observe(pane, { childList: true, subtree: true, attributes: true });
    }
  }
})()`;

async function newCtx(browser, profile, url) {
  const ctx = await browser.newContext({
    viewport: profile.viewport,
    isMobile: !!profile.isMobile,
    hasTouch: !!profile.hasTouch,
    deviceScaleFactor: profile.deviceScaleFactor ?? 1,
    locale: "en-US",
    timezoneId: "America/Indiana/Indianapolis",
    serviceWorkers: "block",
  });
  const origin = new URL(url).origin;
  await ctx.route(/.*/, (route) => {
    const u = new URL(route.request().url());
    if (["data:", "blob:", "about:"].includes(u.protocol) || u.origin === origin)
      return route.continue();
    return route.abort();
  });
  await ctx.addInitScript(INIT);
  return ctx;
}

async function pageSetup(browser, url, profile) {
  const ctx = await newCtx(browser, profile, url);
  const page = await ctx.newPage();
  if (profile.cpu) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  }
  return { ctx, page };
}

async function waitDataLoaded(page) {
  await page.waitForFunction(
    () => {
      const s = document.getElementById("loadingDnrStatus");
      const t = s ? s.textContent || "" : "";
      return (
        /^Loaded .*wells\./.test(t) ||
        /^(No |Chunks not|Using built-in|Chunk did not)/.test(t)
      );
    },
    { timeout: 240000 },
  );
}

async function waitFocused(page) {
  await page.waitForFunction(
    (t) => {
      try {
         
        const m = map;
        if (!m || typeof m.getZoom !== "function") return false;
        const c = m.getCenter();
        return (
          Math.abs(c.lat - t.lat) < 0.001 && Math.abs(c.lng - t.lon) < 0.001
        );
      } catch {
        return false;
      }
    },
    TARGET,
    { timeout: 120000 },
  );
}

// Fixed deterministic view: clear searchCenter, z15 at target (same as
// capture.mjs's fixedView state).
async function toFixedView(page) {
  await page.evaluate((t) => {
    searchCenter = null;
    map.setView([t.lat, t.lon], 15, { animate: false });
  }, TARGET);
  await settleMarkers(page);
}

async function settleMarkers(page, quietMs = 150, timeout = 30000) {
  await page.evaluate(
    ([q, to]) =>
      new Promise((res) => {
        const start = performance.now();
        const poll = () => {
          if (performance.now() - (window.__rmQuietAt || 0) >= q) return res(1);
          if (performance.now() - start > to) return res(0);
          requestAnimationFrame(() => setTimeout(poll, 20));
        };
        poll();
      }),
    [quietMs, timeout],
  );
}

async function longTaskMsSince(page, since) {
  return page.evaluate((s) => {
    return window.__perf.longTasks
      .filter((t) => t.t >= s)
      .reduce((a, t) => a + t.d, 0);
  }, since);
}

// rAF frame-gap sampler for `ms`; resolves {max,gaps,framesGt50,count}.
async function sampleFrames(page, ms) {
  return page.evaluate(
    (dur) =>
      new Promise((res) => {
        const gaps = [];
        let last = performance.now();
        const t0 = last;
        const tick = (t) => {
          const g = t - last;
          last = t;
          if (t - t0 < dur) {
            gaps.push(g);
            requestAnimationFrame(tick);
          } else {
            gaps.sort((a, b) => b - a);
            res({
              max: +(gaps[0] || 0).toFixed(1),
              framesGt50: gaps.filter((g) => g > 50).length,
              frames: gaps.length,
            });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

async function measureRefresh(page, action) {
  // Returns {ms, refreshCount}: action → last refreshMap call → marker-pane
  // quiet 150ms → +2 rAF.
  await page.evaluate(INSTRUMENT);
  const c0 = await page.evaluate(() => window.__rmCount || 0);
  const w0 = await page.evaluate(() => window.__rmWork || 0);
  const t0 = await page.evaluate(() => performance.now());
  await action();
  const settled = await page.evaluate(
    (t0) =>
      new Promise((res) => {
        const start = performance.now();
        const poll = () => {
          const quietFor = performance.now() - (window.__rmQuietAt || 0);
          if (quietFor >= 150)
            return requestAnimationFrame(() =>
              requestAnimationFrame(() => res(performance.now() - t0)),
            );
          if (performance.now() - start > 30000) return res(-1);
          requestAnimationFrame(() => setTimeout(poll, 20));
        };
        poll();
      }),
    t0,
  );
  const c1 = await page.evaluate(() => window.__rmCount || 0);
  const w1 = await page.evaluate(() => window.__rmWork || 0);
  return { ms: Math.round(settled), refreshCount: c1 - c0, refreshWorkMs: Math.round(w1 - w0) };
}

async function runOnce(browser, url, profile, profileName) {
  const { ctx, page } = await pageSetup(browser, url, profile);
  const out = { profile: profileName };
  const tNav = Date.now();
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}lat=${TARGET.lat}&lon=${TARGET.lon}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  const navDone = await page.evaluate(() => performance.now());
  await waitDataLoaded(page);
  out.loadReadyMs = Date.now() - tNav;
  out.loadLongTaskMs = Math.round(await longTaskMsSince(page, 0));
  void navDone;
  await waitFocused(page).catch(() => {});
  await toFixedView(page);
  await page.evaluate(INSTRUMENT);
  await page.waitForTimeout(300);

  // refreshMs — one panBy gesture.
  out.refresh = await measureRefresh(page, () =>
    page.evaluate(() => {
      map.panBy([200, 0], { animate: false });
    }),
  );
  // pan back for repeatability
  await page.evaluate(() => {
    map.panBy([-200, 0], { animate: false });
  });
  await settleMarkers(page);

  // wheelPan — 40 wheel events over map center at ~16ms.
  {
    // On phone/tablet layouts the map sits below the fold — bring its center
    // into the viewport first so wheel events actually land on #map.
    await page.evaluate(() =>
      document.getElementById("map").scrollIntoView({ block: "center" }),
    );
    await page.waitForTimeout(400);
    await page.evaluate(INSTRUMENT);
    const box = await page.evaluate(() => {
      const r = document.getElementById("map").getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 4), innerWidth - 4);
      const y = Math.min(Math.max(r.top + r.height / 2, 4), innerHeight - 4);
      return { x, y };
    });
    await page.mouse.move(box.x, box.y);
    const c0 = await page.evaluate(() => window.__rmCount || 0);
    const w0 = await page.evaluate(() => window.__rmWork || 0);
    const t0 = await page.evaluate(() => performance.now());
    const framesP = sampleFrames(page, 1600);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 30);
      await page.waitForTimeout(16);
    }
    await settleMarkers(page, 150, 30000);
    const lt = await longTaskMsSince(page, t0);
    const c1 = await page.evaluate(() => window.__rmCount || 0);
    const w1 = await page.evaluate(() => window.__rmWork || 0);
    const fr = await framesP;
    out.wheelPan = {
      refreshWorkMs: Math.round(w1 - w0),
      longTaskMs: Math.round(lt),
      maxFrameGap: fr.max,
      framesGt50: fr.framesGt50,
      frames: fr.frames,
      refreshCount: c1 - c0,
    };
  }

  // zoomStep — one click on zoom-in.
  out.zoomStep = await measureRefresh(page, async () => {
    await page.click(".leaflet-control-zoom-in");
  });
  // restore z15
  await page.evaluate(() => {
    map.setView([39.763, -86.399], 15, { animate: false });
  });
  await settleMarkers(page);

  // filterToggle — typeRock off then on.
  {
    const clickRock = () =>
      page.evaluate(() => document.getElementById("typeRock").click());
    out.filterToggle = {};
    out.filterToggle.off = (
      await measureRefresh(page, clickRock)
    ).ms;
    out.filterToggle.on = (
      await measureRefresh(page, clickRock)
    ).ms;
  }

  // pageScroll — touch profiles only.
  if (profile.isMobile) {
    const t0 = await page.evaluate(() => performance.now());
    const framesP = sampleFrames(page, 2500);
    await page.evaluate(
      () =>
        new Promise((res) => {
          let y = 0;
          const step = () => {
            y += 160;
            window.scrollTo(0, y);
            if (y < document.body.scrollHeight - innerHeight)
              requestAnimationFrame(step);
            else res(1);
          };
          requestAnimationFrame(step);
        }),
    );
    const fr = await framesP;
    out.pageScroll = { maxFrameGap: fr.max, framesGt50: fr.framesGt50 };
    const lt = await longTaskMsSince(page, t0);
    out.pageScroll.longTaskMs = Math.round(lt);
  }

  await ctx.close();
  return out;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function medRuns(runs, pick) {
  const vals = runs.map(pick).filter((v) => typeof v === "number" && v >= 0);
  return vals.length ? median(vals) : null;
}

async function cmdRun(args) {
  const url = args.url;
  const outFile = path.resolve(args.out);
  const only = args.only ? args.only.split(",") : null;
  const { chromium } = load(PWT);
  const browser = await chromium.launch({ headless: true });
  const result = { url, at: new Date().toISOString(), profiles: {} };
  for (const [name, profile] of Object.entries(PROFILES)) {
    if (only && !only.includes(name)) continue;
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      try {
        runs.push(await runOnce(browser, url, profile, name));
        console.log(`${name} run${i + 1}: load=${runs[i].loadReadyMs}ms refresh=${runs[i].refresh.ms}ms wheel=${JSON.stringify(runs[i].wheelPan)}`);
      } catch (e) {
        console.log(`${name} run${i + 1}: ERROR ${String(e).slice(0, 200)}`);
      }
    }
    result.profiles[name] = {
      runs,
      median: {
        loadReadyMs: medRuns(runs, (r) => r.loadReadyMs),
        loadLongTaskMs: medRuns(runs, (r) => r.loadLongTaskMs),
        refreshMs: medRuns(runs, (r) => r.refresh?.ms),
        refreshCount: medRuns(runs, (r) => r.refresh?.refreshCount),
        refreshWorkMs: medRuns(runs, (r) => r.refresh?.refreshWorkMs),
        wheelRefreshCount: medRuns(runs, (r) => r.wheelPan?.refreshCount),
        wheelRefreshWorkMs: medRuns(runs, (r) => r.wheelPan?.refreshWorkMs),
        wheelLongTaskMs: medRuns(runs, (r) => r.wheelPan?.longTaskMs),
        wheelMaxFrameGap: medRuns(runs, (r) => r.wheelPan?.maxFrameGap),
        wheelFramesGt50: medRuns(runs, (r) => r.wheelPan?.framesGt50),
        zoomRefreshCount: medRuns(runs, (r) => r.zoomStep?.refreshCount),
        zoomSettleMs: medRuns(runs, (r) => r.zoomStep?.ms),
        filterOffMs: medRuns(runs, (r) => r.filterToggle?.off),
        filterOnMs: medRuns(runs, (r) => r.filterToggle?.on),
        scrollMaxFrameGap: medRuns(runs, (r) => r.pageScroll?.maxFrameGap),
        scrollFramesGt50: medRuns(runs, (r) => r.pageScroll?.framesGt50),
        scrollLongTaskMs: medRuns(runs, (r) => r.pageScroll?.longTaskMs),
      },
    };
  }
  await browser.close();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log("WROTE", outFile);
}

async function cmdMarkers(args) {
  const url = args.url;
  const outFile = path.resolve(args.out);
  const { chromium } = load(PWT);
  const browser = await chromium.launch({ headless: true });
  const ctx = await newCtx(browser, PROFILES.desktop, url);
  const page = await ctx.newPage();
  const collect = async (label, mode) => {
    return page.evaluate(async (mode) => {
      const wait = () =>
        new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
      const grab = () => {
        const pane = [];
        document
          .querySelectorAll(".leaflet-marker-icon.well-dot")
          .forEach((el) => pane.push(el.innerHTML));
        const layers = wellLayer.getLayers();
        const markers = layers
          .map((m) => ({
            lat: m.getLatLng().lat,
            lng: m.getLatLng().lng,
            html: m.options.icon.options.html,
            size: m.options.icon.options.iconSize,
            anchor: m.options.icon.options.iconAnchor,
            popup:
              typeof m.getPopup === "function" && m.getPopup()
                ? m.getPopup().getContent()
                : null,
          }))
          .sort((a, b) =>
            a.lat !== b.lat ? a.lat - b.lat : a.lng !== b.lng ? a.lng - b.lng : 0,
          );
        return {
          markers,
          paneHtmlSorted: pane.sort(),
          wellsList: document.getElementById("wellsList")?.innerHTML ?? null,
          wellCount: document.getElementById("wellCount")?.textContent ?? null,
        };
      };
      void wait;
      return { mode, ...(await grab()) };
    }, mode);
  };

  // Radius mode: ?lat&lon WITHOUT clearing searchCenter (seeded PRNG on).
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}lat=${TARGET.lat}&lon=${TARGET.lon}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await waitDataLoaded(page);
  await waitFocused(page).catch(() => {});
  await page.waitForTimeout(1500);
  const radius = await collect("radius", "radius");

  // Fixed-view mode: searchCenter cleared, z15.
  await toFixedView(page);
  await page.waitForTimeout(800);
  const fixed = await collect("fixed", "fixed");
  await ctx.close();
  await browser.close();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ radius, fixed }, null, 2));
  console.log("WROTE", outFile, "radius:", radius.markers.length, "fixed:", fixed.markers.length);
}

async function cmdCheck(args) {
  // cj_perf_check=1 gate: run a capture-like flow + wheel + zoom + all 14
  // toggles; FAIL on any index-vs-linear mismatch console error.
  const url = args.url;
  const { chromium } = load(PWT);
  const browser = await chromium.launch({ headless: true });
  const ctx = await newCtx(browser, PROFILES.desktop, url);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Aborted tile/3rd-party requests log as resource errors — expected noise.
    if (/Failed to load resource: net::ERR_FAILED/.test(t)) return;
    errors.push(t);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  const u = `${url}${url.includes("?") ? "&" : "?"}lat=${TARGET.lat}&lon=${TARGET.lon}&cj_perf_check=1`;
  await page.goto(u, { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitDataLoaded(page);
  await waitFocused(page).catch(() => {});
  await page.evaluate(INSTRUMENT);
  await toFixedView(page);

  // wheelPan gesture
  const box = await page.evaluate(() => {
    const r = document.getElementById("map").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 30);
    await page.waitForTimeout(16);
  }
  await settleMarkers(page);

  // zoomStep both directions
  await page.click(".leaflet-control-zoom-in");
  await settleMarkers(page);
  await page.click(".leaflet-control-zoom-out");
  await settleMarkers(page);

  // all 14 toggles off+on
  for (const id of [
    "elevBlue", "elevGreen", "elevOrange", "elevRed",
    "yieldBlue", "yieldGreen", "yieldOrange", "yieldRed",
    "typeUncon", "typeRock", "typeBucket", "typeDry", "typeEstimated",
    "hideWells",
  ]) {
    await page.evaluate((i) => document.getElementById(i).click(), id);
    await settleMarkers(page, 150, 20000);
    await page.evaluate((i) => document.getElementById(i).click(), id);
    await settleMarkers(page, 150, 20000);
  }

  // a couple of pans + one radius-mode reload
  await page.evaluate(() => {
    map.panBy([300, -120], { animate: false });
  });
  await settleMarkers(page);
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}lat=${TARGET.lat}&lon=${TARGET.lon}&cj_perf_check=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await waitDataLoaded(page);
  await waitFocused(page).catch(() => {});
  await page.waitForTimeout(1200);

  await ctx.close();
  await browser.close();
  const idxErrs = errors.filter((e) => /cj_perf|index|mismatch/i.test(e));
  console.log(JSON.stringify({ consoleErrors: errors.length, indexMismatches: idxErrs }, null, 1));
  if (errors.length) console.log("first errors:", errors.slice(0, 6));
  process.exit(idxErrs.length ? 1 : errors.length ? 2 : 0);
}

async function main() {
  const mode = process.argv[2];
  const args = {};
  for (let i = 3; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) args[a.slice(2)] = process.argv[++i];
  }
  if (!args.url && mode !== "report") {
    console.error("usage: perf.mjs run|markers|check --url <viewer-url> [--out <file>] [--only p1,p2]");
    process.exit(2);
  }
  if (mode === "run") return cmdRun(args);
  if (mode === "markers") return cmdMarkers(args);
  if (mode === "check") return cmdCheck(args);
  console.error("unknown mode", mode);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
