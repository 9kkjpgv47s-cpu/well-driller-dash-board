#!/usr/bin/env node
/**
 * design-baseline capture harness (Phase 1 of the C&J restyle).
 *
 * Usage:
 *   node capture.mjs capture --out docs/design/screens/before \
 *        --base http://localhost:3001 [--viewer-url <url>] [--with-tiles]
 *   node capture.mjs compare <dirA> <dirB>
 *   node capture.mjs extract [--locked-out docs/design/baseline/locked]
 *
 * capture: full-page screenshots + marker crops + behavior JSON + locked extraction.
 * compare: pixel-diffs every matching PNG under two capture dirs and diffs
 *          behavior.json. Exit 1 on any mismatch.
 * extract: re-run only the locked-file extraction (viewer scripts + marker CSS).
 *
 * Determinism notes (see docs/design/baseline/checks.md for context):
 * - Tiles are aborted by default (blank map background); --with-tiles allows
 *   them for review shots.
 * - /api/weather and /api/radar/** are fulfilled with fixed JSON (time-varying
 *   upstreams would otherwise break pixel/JSON equality).
 * - All other cross-origin requests are aborted (nominatim, elevation, NWS...).
 * - The viewer's 2-mile radius pool exceeds the 800-marker cap and takes a
 *   Math.random() subset, so after ?lat&lon= focuses the map we clear
 *   searchCenter and setView() to a fixed zoom (bounds mode = deterministic).
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = path.resolve(SCRIPT_DIR, "../..");
const REPO_ROOT = path.resolve(HUB_ROOT, "../..");

const TARGET = { lat: 39.763, lon: -86.399 };
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "1440x900", width: 1440, height: 900, isMobile: false },
];
const CROP_VIEWPORT = { name: "1440x900", width: 1440, height: 900 };
const SETTLE_MS = 700;

const TILE_HOST_RE =
  /(^|\.)(tile\.openstreetmap\.org|[a-z]\.tile\.openstreetmap\.(org|de|fr)|basemaps\.cartocdn\.com|server\.arcgisonline\.com|tilecache\.|rainviewer\.com|wmts\.|tiles\.)/i;

const STUB_WEATHER = {
  lat: TARGET.lat,
  lon: TARGET.lon,
  timezone: "America/Indiana/Indianapolis",
  anchorDate: "2026-09-27",
  fetchedAt: "2026-09-27T12:00:00.000Z",
  sources: [
    {
      id: "open-meteo-gfs",
      label: "Open-Meteo · GFS",
      provider: "Open-Meteo",
      model: "GFS",
      fetchedAt: "2026-09-27T12:00:00.000Z",
      hourly: [
        "00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00",
      ].map((hh, i) => ({
        time: `2026-09-27T${hh}:00`,
        tempF: 62 + i,
        precipPop: i === 4 ? 15 : 5,
        precipInches: 0,
        cloudPct: 40 + i * 3,
        windMph: 6 + i,
        windDirDeg: 180,
        weatherCode: 2,
        conditionLabel: "Partly cloudy",
        sourceId: "open-meteo-gfs",
        sourceLabel: "Open-Meteo · GFS",
      })),
    },
  ],
  explanations: [
    "Design-baseline stub: fixed Open-Meteo GFS payload, no live upstream.",
  ],
  daySummaries: [
    {
      date: "2026-09-27",
      maxPrecipPop: 15,
      maxWindMph: 13,
      minTempF: 62,
      maxTempF: 69,
      dominantCondition: "Partly cloudy",
      totalPrecipInches: 0,
      thunderstormHours: 0,
      modelSpreadPop: null,
    },
  ],
  primaryHourlyForDay: [],
};
STUB_WEATHER.primaryHourlyForDay = STUB_WEATHER.sources[0].hourly;

const STUB_RADAR = {
  host: "https://stubbed.invalid",
  radar: {
    past: [{ time: 1759000000, path: "/v2/radar/1759000000" }],
    nowcast: [],
  },
};

function loadPlaywright() {
  const candidates = [
    process.env.CJ_PLAYWRIGHT_PATH,
    "playwright",
    "/Users/dominiceasterling/Projects/cj-os/node_modules/playwright",
  ].filter(Boolean);
  const errs = [];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {
      errs.push(`${c}: ${e.message}`);
    }
  }
  throw new Error(
    "Could not load playwright. Tried:\n" + errs.join("\n") +
      "\nSet CJ_PLAYWRIGHT_PATH to a playwright install.",
  );
}

function loadPng() {
  const candidates = [
    process.env.CJ_PNGJS_PATH,
    "pngjs",
    "/Users/dominiceasterling/Projects/cj-os/node_modules/pngjs",
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      return require(c).PNG;
    } catch {}
  }
  return null;
}

// ---------- routing ----------

function setupRoutes(context, allowedOrigins, { allowTiles, hubCapCss }) {
  return context.route(/.*/, (route) => {
    const req = route.request();
    let u;
    try {
      u = new URL(req.url());
    } catch {
      return route.continue();
    }
    if (u.protocol === "data:" || u.protocol === "blob:" || u.protocol === "about:") {
      return route.continue();
    }
    if (allowedOrigins.has(u.origin)) {
      // Comparison-run width cap: inject a <style> into the HTML document so
      // it applies before hydration/Leaflet init (init scripts proved flaky).
      if (hubCapCss && req.resourceType() === "document") {
        return route.fetch().then(async (res) => {
          const body = (await res.text()).replace(
            "</head>",
            `<style data-cj-cap>${hubCapCss}</style></head>`,
          );
          return route.fulfill({ response: res, body });
        });
      }
      if (u.pathname.startsWith("/api/weather")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(STUB_WEATHER),
        });
      }
      if (u.pathname.startsWith("/api/radar")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(STUB_RADAR),
        });
      }
      return route.continue();
    }
    if (allowTiles && TILE_HOST_RE.test(u.hostname)) return route.continue();
    return route.abort();
  });
}

// ---------- page helpers ----------

async function newPage(browser, vp, extra = {}) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.isMobile,
    locale: "en-US",
    timezoneId: "America/Indiana/Indianapolis",
    serviceWorkers: "block",
    ...extra,
  });
  const page = await context.newPage();
  return { context, page };
}

async function settle(page, ms = SETTLE_MS) {
  try {
    await page.evaluate(() =>
      typeof document !== "undefined" && document.fonts
        ? document.fonts.ready
        : null,
    );
  } catch {}
  await page.waitForTimeout(ms);
}

async function markerCount(page, containerSel) {
  return page.evaluate((sel) => {
    const root = sel ? document.querySelector(sel) : document;
    if (!root) return { all: -1, wellDots: -1, clusters: -1, jobPins: -1 };
    const q = (s) => root.querySelectorAll(s).length;
    return {
      all: q(".leaflet-marker-icon"),
      wellDots: q(".leaflet-marker-icon.well-dot") || q(".vj-well-dot"),
      clusters: q(".marker-cluster"),
      jobPins: q(".vj-job-pin"),
    };
  }, containerSel);
}

async function waitMarkerStable(page, sel, { timeout = 90000, min = 1 } = {}) {
  const t0 = Date.now();
  let prev = -1;
  for (;;) {
    const c = (await markerCount(page, sel)).all;
    if (c === prev && c >= min) return c;
    prev = c;
    if (Date.now() - t0 > timeout) {
      throw new Error(`marker count never stabilized (last=${c})`);
    }
    await page.waitForTimeout(400);
  }
}

async function gotoIdle(page, url, timeout = 120000) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout });
  await page
    .waitForLoadState("networkidle", { timeout: 45000 })
    .catch(() => {});
  await settle(page);
}

// In-map overlay chrome (zoom control, bottom pill/stack, attribution) is
// legitimately restyled, so crop diffs mask these rects to measure marker
// pixels only. Rects: [x, y, w, h] relative to the crop image.
function cropMaskRects(w, h) {
  const ring = 2; // map-shell border is restyled chrome; also covers
  // fractional clip-boundary slivers of adjacent content
  return [
    [0, 0, w, ring], // top border ring
    [0, h - ring, w, ring], // bottom border ring
    [0, 0, ring, h], // left border ring
    [w - ring, 0, ring, h], // right border ring
    [0, 0, 84, 128], // zoom +/- control (top-left)
    [0, h - 76, w, 76], // bottom overlay band (pill, zoom stack, attribution)
    [w - 88, h - 170, 88, 170], // zoom stack above bottom band
    [w - 60, 0, 60, 60], // top-right overlay control (restyled chrome)
  ];
}

function maskedPixelDiff(imgA, imgB, oxB, oyB, masks) {
  const w = Math.min(imgA.width, imgB.width - oxB);
  const h = Math.min(imgA.height, imgB.height - oyB);
  if (w <= 0 || h <= 0) return Infinity;
  const inside = (x, y) =>
    masks.some(
      ([mx, my, mw, mh]) => x >= mx && x < mx + mw && y >= my && y < my + mh,
    );
  let n = 0;
  for (let y = 0; y < h; y++) {
    let ka = y * imgA.width * 4;
    let kb = ((y + oyB) * imgB.width + oxB) * 4;
    for (let x = 0; x < w; x++, ka += 4, kb += 4) {
      if (inside(x, y)) continue;
      if (
        imgA.data[ka] !== imgB.data[kb] ||
        imgA.data[ka + 1] !== imgB.data[kb + 1] ||
        imgA.data[ka + 2] !== imgB.data[kb + 2] ||
        imgA.data[ka + 3] !== imgB.data[kb + 3]
      )
        n++;
    }
  }
  return n;
}

// Element screenshots expand the clip to whole device pixels, so a fractional
// element origin yields a N+1 px image. Quantize the clip to the element's
// integer bounds so crops keep the element's real pixel size.
async function quantizeCrop(page, sel, outPath, { matchPath, targetFrac } = {}) {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  // Marker pixels are subpixel-sensitive: a fractional element origin shifts
  // every marker's AA. When a baseline crop exists (matchPath), nudge the
  // element to reproduce the baseline's fractional origin exactly, then clip
  // at floor/ceil bounds so dims match. Overlay chrome inside the map (zoom
  // control, bottom pill/stack, attribution) is legitimately restyled — those
  // rects are masked out of the diff. Without a baseline, snap to integers.
  await loc.evaluate((el) => {
    document.documentElement.style.scrollBehavior = "auto";
    const b = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (b.top < 4 || b.bottom > vh - 4) {
      window.scrollBy(0, b.top < 4 ? b.top - 40 : b.bottom - vh + 40);
    }
    // Quantize scroll to whole pixels so the element's viewport fraction
    // equals its document fraction.
    window.scrollTo(Math.round(window.scrollX), Math.round(window.scrollY));
  });
  await page.waitForTimeout(60);

  const PNG = loadPng();
  let matchPng = null;
  if (matchPath && fs.existsSync(matchPath)) {
    try {
      matchPng = PNG.sync.read(fs.readFileSync(matchPath));
    } catch {}
  }

  const shotPng = async () => {
    const r = await loc.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    });
    // Same capture call the baseline used (locator.screenshot) — the raw
    // encoder output makes identical pixels byte-identical.
    const buf = await loc.screenshot({ path: outPath });
    return { png: PNG.sync.read(buf), rect: r };
  };
  // Nudge via a position:relative offset on <body> — a paint-time shift that
  // re-rasterizes content at the fractional offset and moves the element
  // together with all its clipping ancestors (a direct nudge on the element
  // loses a sub-1px edge band to parent overflow:hidden). A CSS transform
  // would create a composited layer that gets bilinear-resampled, which can
  // never reproduce the baseline's natively-rasterized fractional phase.
  const setFrac = (fx, fy) =>
    loc.evaluate(
      (el, [tx, ty]) => {
        const b = el.getBoundingClientRect();
        let dx = tx - (b.left - Math.floor(b.left));
        let dy = ty - (b.top - Math.floor(b.top));
        // Wrap to the smallest equivalent nudge (frac equality is mod 1).
        if (dx > 0.5) dx -= 1;
        else if (dx <= -0.5) dx += 1;
        if (dy > 0.5) dy -= 1;
        else if (dy <= -0.5) dy += 1;
        const body = document.body;
        if (getComputedStyle(body).position === "static")
          body.style.position = "relative";
        body.style.left = `${(parseFloat(body.style.left) || 0) + dx}px`;
        body.style.top = `${(parseFloat(body.style.top) || 0) + dy}px`;
      },
      [fx, fy],
    );

  if (!matchPng || !PNG) {
    await loc.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const body = document.body;
      if (getComputedStyle(body).position === "static")
        body.style.position = "relative";
      body.style.left = `${Math.round(b.left) - b.left}px`;
      body.style.top = `${Math.round(b.top) - b.top}px`;
    });
    const r = await loc.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    });
    await loc.screenshot({ path: outPath });
    return { matched: false, rect: r };
  }

  // Baseline crops were captured at the element's natural fractional
  // document offset (recorded in <baseline>/crop-fracs.json). Nudge the
  // element's paint offset so its viewport fraction reproduces that offset
  // (scroll was quantized to integers above).
  const tf = targetFrac || { x: 0, y: 0 };
  await setFrac(tf.x, tf.y);
  const { png, rect } = await shotPng();
  const masks = cropMaskRects(matchPng.width, matchPng.height);
  return {
    matched: true,
    rect,
    frac: tf,
    maskedDiffs: maskedPixelDiff(matchPng, png, 0, 0, masks),
  };
}

// ---------- viewer ----------

async function viewerWaitDataLoaded(page) {
  // finishLoad writes "Loaded N wells." (or a failure line) into #loadingDnrStatus.
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

async function viewerWaitFocused(page) {
  // applyViewerQueryParamsOnce + flyTo(1.35s) happen after finishLoad.
  // NOTE: `map`/`wells`/`tempMarker` are top-level `let` bindings — bare
  // identifiers in evaluate (window.map is the #map div, not Leaflet).
  await page.waitForFunction(
    (t) => {
      try {
         
        const m = map;
        if (!m || typeof m.getZoom !== "function") return false;
        const c = m.getCenter();
        return (
          Math.abs(c.lat - t.lat) < 0.001 &&
          Math.abs(c.lng - t.lon) < 0.001 &&
          m.getZoom() === 13
        );
      } catch {
        return false;
      }
    },
    TARGET,
    { timeout: 45000 },
  );
  await waitMarkerStable(page, "#map");
  await settle(page);
}

async function viewerFixedView(page) {
  // searchCenter pools wells within 2mi (>800 near Indy) → Math.random() cap
  // subset. Clear it so pool = deterministic in-view bounds; zoom in until the
  // pool is under the cap.
  const out = await page.evaluate(async (t) => {
     
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof tempMarker !== "undefined" && tempMarker && map) {
      try {
        map.removeLayer(tempMarker);
      } catch {}
      tempMarker = null;
    }
    searchCenter = null;
    let zoom = 15;
    let inView = 0;
    for (; zoom <= 18; zoom++) {
      map.setView([t.lat, t.lon], zoom, { animate: false });
      await sleep(60);
      inView = getWellsInView().length;
      if (inView < 750) break;
    }
    await sleep(120);
    const c = map.getCenter();
    return {
      zoom: map.getZoom(),
      center: { lat: c.lat, lon: c.lng },
      wellsInView: inView,
      wellsTotal: typeof wells !== "undefined" ? wells.length : -1,
    };
     
  }, TARGET);
  await waitMarkerStable(page, "#map");
  await settle(page);
  return out;
}

async function captureViewer(browser, base, viewerUrl, outDir, opts) {
  const result = { screens: {}, crop: null, behavior: null };

  for (const vp of VIEWPORTS) {
    const { context, page } = await newPage(browser, vp);
    await setupRoutes(context, new Set([new URL(base).origin]), opts);
    await gotoIdle(page, viewerUrl.split("?")[0]);
    await viewerWaitDataLoaded(page).catch(() => {});
    await waitMarkerStable(page, "#map", { min: 0 }).catch(() => {});
    await settle(page, 1200);
    await page.screenshot({
      path: path.join(outDir, `viewer-${vp.name}.png`),
      fullPage: true,
    });
    result.screens[vp.name] = `viewer-${vp.name}.png`;
    await context.close();
  }

  // Deterministic pass at fixed viewport: data + focus + crop + behavior.
  const { context, page } = await newPage(browser, CROP_VIEWPORT);
  await setupRoutes(context, new Set([new URL(base).origin]), {
    allowTiles: false,
  });
  const focusUrl = `${viewerUrl}${viewerUrl.includes("?") ? "&" : "?"}lat=${TARGET.lat}&lon=${TARGET.lon}`;
  await gotoIdle(page, focusUrl);
  await viewerWaitDataLoaded(page);
  await viewerWaitFocused(page);

  const behavior = {
    url: focusUrl,
    totalWellsLoaded: await page.evaluate(() =>
       
      typeof wells !== "undefined" ? wells.length : -1,
    ),
    wellCountHeader: await page
      .locator("#wellCount")
      .textContent()
      .catch(() => null),
    loadingStatus: await page
      .locator("#loadingDnrStatus")
      .textContent()
      .catch(() => null),
    filterIds: await page.evaluate(() =>
      [...document.querySelectorAll('input[type="checkbox"]')]
        .filter((el) => el.id)
        .map((el) => el.id),
    ),
  };

  // coords-input focus check (existing UI: #coordsInput + sibling Go button).
  await page.evaluate((t) => {
     
    map.setView([t.lat + 0.08, t.lon + 0.08], 12, { animate: false });
  }, TARGET);
  await page.waitForTimeout(400);
  const centerBefore = await page.evaluate(() => {
     
    const c = map.getCenter();
     
    return { lat: c.lat, lon: c.lng, zoom: map.getZoom() };
  });
  await page.fill("#coordsInput", `${TARGET.lat}, ${TARGET.lon}`);
  await page
    .locator("#coordsInput ~ button, #coordsInput + button")
    .first()
    .click();
  await page.waitForFunction(
    (t) => {
      try {
         
        const c = map.getCenter();
        return (
          Math.abs(c.lat - t.lat) < 0.001 &&
          Math.abs(c.lng - t.lon) < 0.001 &&
           
          map.getZoom() === 13
        );
      } catch {
        return false;
      }
    },
    TARGET,
    { timeout: 25000 },
  );
  const centerAfter = await page.evaluate(() => {
     
    const c = map.getCenter();
     
    return { lat: c.lat, lon: c.lng, zoom: map.getZoom() };
  });
  behavior.coordsFocus = {
    before: centerBefore,
    after: centerAfter,
    movedToTarget:
      Math.abs(centerAfter.lat - TARGET.lat) < 0.001 &&
      Math.abs(centerAfter.lon - TARGET.lon) < 0.001,
  };

  // Deterministic fixed view.
  behavior.fixedView = await viewerFixedView(page);
  behavior.fixedView.note =
    "searchCenter cleared; pool = in-view bounds (radius pool exceeds the random 800-marker cap)";
  behavior.markers = { default: await markerCount(page, "#map") };

  // Crop the map element.
  const cropPath = path.join(outDir, "crops", "viewer-map-crop.png");
  fs.mkdirSync(path.dirname(cropPath), { recursive: true });
  result.cropInfo = await quantizeCrop(page, "#map", cropPath, {
    matchPath: opts.matchDir
      ? path.join(opts.matchDir, "crops", "viewer-map-crop.png")
      : null,
    targetFrac: opts.cropFrac,
  });
  result.crop = "crops/viewer-map-crop.png";

  // Toggle every filter checkbox on then off; record marker counts.
  behavior.toggleCounts = {};
  for (const id of behavior.filterIds) {
    const rec = {};
    for (const on of [true, false]) {
      await page.evaluate(
        ([id, on]) => {
          const el = document.getElementById(id);
          if (!el) return;
          if (el.checked !== on) el.click();
        },
        [id, on],
      );
      await page.waitForTimeout(450);
      rec[on ? "on" : "off"] = (await markerCount(page, "#map")).all;
    }
    behavior.toggleCounts[id] = rec;
  }

  // Modal: click the marker nearest the map center pixel-point, fall back to
  // showDetailById if the click does not open the modal.
  const targetWell = await page.evaluate(() => {
     
    const list = getWellsInView();
    if (!list.length) return null;
    // Prefer a well with a DNR report link so the modal check is meaningful.
    const withReport = list.find((w) => w.report && String(w.report).trim());
    return (withReport || list[0]).id;
  });
  let modalVia = "click";
  if (targetWell) {
    const pt = await page.evaluate((id) => {
       
      const w = wells.find((x) => x.id === id);
      if (!w) return null;
       
      const p = map.latLngToContainerPoint([Number(w.lat), Number(w.lon)]);
      return { x: p.x, y: p.y };
    }, targetWell);
    if (pt) {
      const mapBox = await page.locator("#map").boundingBox();
      await page.mouse.click(mapBox.x + pt.x, mapBox.y + pt.y);
    }
  }
  const opened = await page
    .waitForSelector("#wellModal:not(.hidden)", { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  let openedTitle = null;
  if (opened) {
    openedTitle = await page
      .locator("#modalTitle")
      .textContent()
      .catch(() => null);
  }
  if (!opened || (targetWell && openedTitle !== targetWell)) {
    // Overlapping marker stole the click (or none opened) — open the
    // deterministic target via the same code path the marker uses.
    modalVia = opened ? "click-overlap+evaluate" : "evaluate";
    await page.evaluate(() => {
      if (typeof closeModal === "function") closeModal();
    });
    await page.evaluate((id) => showDetailById(id), targetWell);
    await page
      .waitForSelector("#wellModal:not(.hidden)", { timeout: 5000 })
      .catch(() => {});
  }
  await page.waitForTimeout(800); // async finishModal fetch resolves/fails
  const summaryReportHref = await page.evaluate(
    () =>
      document.querySelector(
        '#wellModal #modalContent a[href*="dnr"], #wellModal #modalContent a.cj-report',
      )?.href ?? null,
  );
  // The a.cj-report link lives in the "View full DNR detailed report" section.
  await page.evaluate(() => {
    const b = document.getElementById("btnViewLog");
    if (b) b.click();
  });
  await page
    .waitForSelector("#logViewerSection:not(.hidden)", { timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  behavior.modal = {
    targetWellId: targetWell,
    opened: await page.evaluate(
      () => !document.getElementById("wellModal").classList.contains("hidden"),
    ),
    title: await page
      .locator("#modalTitle")
      .textContent()
      .catch(() => null),
    summaryReportHref,
    reportHref: await page.evaluate(
      () => document.querySelector("#wellModal a.cj-report")?.href ?? null,
    ),
    logViewerVisible: await page.evaluate(
      () =>
        !document
          .getElementById("logViewerSection")
          .classList.contains("hidden"),
    ),
  };
  await page.evaluate(() => {
     
    if (typeof closeModal === "function") closeModal();
  });
  console.log(`[viewer] modal via=${modalVia} title=${behavior.modal.title}`);

  result.behavior = behavior;
  await context.close();
  return result;
}

// ---------- hub ----------

async function hubWaitSettled(page) {
  await page.waitForSelector(".leaflet-container", { timeout: 60000 });
  await waitMarkerStable(page, ".leaflet-container", { timeout: 120000 });
  // Wait for wells strip + insights to populate.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("h3")].some((h) =>
          /registry wells|Wells by depth|Wells with logs/i.test(
            h.textContent || "",
          ),
        ),
      { timeout: 120000 },
    )
    .catch(() => {});
  await settle(page, 1200);
}

// Reproduce the pre-restyle content geometry (main max-w-6xl px-4 with the
// old .field-hub-scope -0.25rem margins / 1rem padding) for comparison runs
// only: the map element then has the same pixel size, so crops are diffable.
function hubCapCss(w) {
  return `
.cj-main { padding-left: 16px !important; padding-right: 16px !important; }
.cj-main > * { width: min(100%, ${w}px) !important; }
.field-hub-scope {
  padding-left: 1rem !important; padding-right: 1rem !important;
  margin-left: -0.25rem !important; margin-right: -0.25rem !important;
}`;
}

async function captureHub(browser, base, outDir, opts) {
  if (opts.hubCapWidth) opts.hubCapCss = hubCapCss(opts.hubCapWidth);
  const result = { screens: {}, crop: null, behavior: null };

  for (const vp of VIEWPORTS) {
    for (const [name, p] of [
      ["hub-home", "/"],
      [
        "hub-latlon",
        `/?lat=${TARGET.lat}&lon=${TARGET.lon}`,
      ],
    ]) {
      const { context, page } = await newPage(browser, vp);
      await setupRoutes(context, new Set([new URL(base).origin]), opts);
      await gotoIdle(page, base + p);
      if (name === "hub-latlon") await hubWaitSettled(page);
      await page.screenshot({
        path: path.join(outDir, `${name}-${vp.name}.png`),
        fullPage: true,
      });
      result.screens[`${name}-${vp.name}`] = `${name}-${vp.name}.png`;
      await context.close();
    }
  }

  // Deterministic pass: crop + behavior at fixed viewport.
  const { context, page } = await newPage(browser, CROP_VIEWPORT);
  await setupRoutes(context, new Set([new URL(base).origin]), {
    allowTiles: false,
    hubCapCss: opts.hubCapCss,
  });
  const url = `${base}/?lat=${TARGET.lat}&lon=${TARGET.lon}`;
  await gotoIdle(page, url);
  await hubWaitSettled(page);

  // Zoom to 15 (clusters disabled above 15) via the existing zoom control —
  // deterministic: the map always boots at zoom 13.
  for (let i = 0; i < 2; i++) {
    await page.locator(".leaflet-control-zoom-in").first().click();
    await page.waitForTimeout(650);
  }
  await page
    .waitForFunction(
      () => document.querySelectorAll(".marker-cluster").length === 0,
      { timeout: 15000 },
    )
    .catch(() => {});
  await waitMarkerStable(page, ".leaflet-container");
  await settle(page);

  const cropPath = path.join(outDir, "crops", "hub-map-crop.png");
  fs.mkdirSync(path.dirname(cropPath), { recursive: true });
  result.cropInfo = await quantizeCrop(page, ".leaflet-container", cropPath, {
    matchPath: opts.matchDir
      ? path.join(opts.matchDir, "crops", "hub-map-crop.png")
      : null,
    targetFrac: opts.cropFrac,
  });
  result.crop = "crops/hub-map-crop.png";

  const behavior = {
    url,
    fixedZoom: 15,
    zoomNote: "2 clicks on .leaflet-control-zoom-in from boot zoom 13",
    markers: await markerCount(page, ".leaflet-container"),
    nearestWells: await page.evaluate(() => {
      const h = [...document.querySelectorAll("h3")].find((x) =>
        /registry wells|Wells by depth|Wells with logs/i.test(
          x.textContent || "",
        ),
      );
      const box = h ? h.closest("div.rounded-lg.border") : null;
      if (!box) return null;
      const grid = box.querySelector(".grid") ?? box;
      return {
        title: h.textContent.trim(),
        hint: box.querySelector("span")?.textContent?.trim() ?? null,
        count: grid.querySelectorAll("button").length,
        entries: [...grid.querySelectorAll("button")].map((b) =>
          b.textContent.replace(/\s+/g, " ").trim(),
        ),
      };
    }),
    areaInsightsText: await page.evaluate(() => {
      const el = document.querySelector('[aria-labelledby="area-insights-h"]');
      return el ? el.innerText.replace(/\s+\n/g, "\n").trim() : null;
    }),
  };
  result.behavior = behavior;
  await context.close();
  return result;
}

// ---------- locked extraction ----------

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

function extractLocked(lockedDir) {
  fs.mkdirSync(lockedDir, { recursive: true });
  const html = fs.readFileSync(
    path.join(HUB_ROOT, "public/well-viewer/index.html"),
    "utf8",
  );

  // Every <script> block in order (src or inline content).
  const scripts = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(html))) {
    const src = /src\s*=\s*"([^"]+)"/i.exec(m[1])?.[1] ?? null;
    scripts.push({ index: i++, src, content: src ? null : m[2] });
  }
  const scriptsJson = scripts.map((s) => ({
    index: s.index,
    src: s.src,
    sha256: s.content != null ? sha256(s.content) : null,
    bytes: s.content != null ? Buffer.byteLength(s.content) : null,
  }));
  fs.writeFileSync(
    path.join(lockedDir, "viewer-scripts.json"),
    JSON.stringify(scripts.map((s) => ({ ...s, sha256: s.content != null ? sha256(s.content) : null })), null, 2),
  );
  fs.writeFileSync(
    path.join(lockedDir, "viewer-scripts-manifest.json"),
    JSON.stringify(scriptsJson, null, 2),
  );

  // Marker/data CSS rules from the inline <style> blocks.
  const STYLE_RE =
    /(\.vj-|\.well-marker|\.well-depth-label|\.leaflet-|\.marker-cluster|toggle-slider)/;
  const rules = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html))) {
    for (const raw of m[1].split("}")) {
      const rule = raw.trim();
      if (!rule || !rule.includes("{")) continue;
      const sel = rule.slice(0, rule.indexOf("{"));
      if (STYLE_RE.test(sel)) rules.push(rule + " }");
    }
  }
  fs.writeFileSync(
    path.join(lockedDir, "viewer-marker-css.txt"),
    rules.join("\n\n") + "\n",
  );

  // Hub globals.css marker section: the comment block preceding the first
  // .leaflet-marker-icon.vj-well-dot selector through end of file.
  const globals = fs.readFileSync(
    path.join(HUB_ROOT, "src/app/globals.css"),
    "utf8",
  );
  const selIdx = globals.indexOf(".leaflet-marker-icon.vj-well-dot");
  let start = 0;
  if (selIdx >= 0) {
    start = globals.lastIndexOf("/*", selIdx);
    if (start < 0) start = selIdx;
  }
  fs.writeFileSync(
    path.join(lockedDir, "hub-globals-marker.css"),
    globals.slice(start),
  );
  return {
    scripts: scriptsJson.length,
    inlineScripts: scripts.filter((s) => !s.src).length,
    cssRules: rules.length,
    hubMarkerBytes: globals.length - start,
  };
}

// ---------- compare ----------

function compareDirs(dirA, dirB) {
  const PNG = loadPng();
  const list = (d) => {
    const out = [];
    const walk = (p) => {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const fp = path.join(p, e.name);
        if (e.isDirectory()) walk(fp);
        else if (e.isFile()) {
          const rel = path.relative(d, fp);
          // Determinism gate: map crops + behavior.json only. Full-page
          // screens capture the *real* default state (the viewer's default
          // view can exceed the random 800-marker cap) and are for review.
          if (
            (rel.endsWith(".png") && rel.startsWith(`crops${path.sep}`)) ||
            rel === "behavior.json"
          )
            out.push(rel);
        }
      }
    };
    if (fs.existsSync(d)) walk(d);
    return out.sort();
  };
  const filesA = list(dirA);
  let totalMismatch = 0;
  let pixelMismatch = 0;
  const report = [];
  for (const rel of filesA) {
    const fa = path.join(dirA, rel);
    const fb = path.join(dirB, rel);
    if (!fs.existsSync(fb)) {
      report.push(`MISSING in B: ${rel}`);
      totalMismatch++;
      continue;
    }
    const ba = fs.readFileSync(fa);
    const bb = fs.readFileSync(fb);
    if (rel.endsWith(".png")) {
      if (ba.equals(bb)) {
        report.push(`OK  ${rel} (byte-identical)`);
        continue;
      }
      if (!PNG) {
        report.push(`DIFF ${rel} (bytes differ; pngjs unavailable for pixel count)`);
        totalMismatch++;
        continue;
      }
      const pa = PNG.sync.read(ba);
      const pb = PNG.sync.read(bb);
      // Map crops: mask the in-map overlay chrome (zoom control, bottom
      // pill/stack, attribution) — restyled chrome is not gate content.
      const masks = rel.startsWith(`crops${path.sep}`)
        ? cropMaskRects(Math.max(pa.width, pb.width), Math.max(pa.height, pb.height))
        : [];
      const pxCmp = (imgA, imgB, oxB, oyB) =>
        maskedPixelDiff(imgA, imgB, oxB, oyB, masks);
      if (pa.width !== pb.width || pa.height !== pb.height) {
        // Baseline element screenshots clip at floor/ceil of a fractional
        // origin, so they can include a 1px sliver of off-element bleed. The
        // quantized crops are exactly element-bounded. When dims differ by
        // <=2px, slide the smaller image inside the larger and compare the
        // best aligned overlap.
        const dw = Math.abs(pa.width - pb.width);
        const dh = Math.abs(pa.height - pb.height);
        if (dw <= 2 && dh <= 2) {
          const big = pb.width * pb.height >= pa.width * pa.height ? pb : pa;
          const small = big === pb ? pa : pb;
          let best = Infinity;
          for (let oy = 0; oy <= big.height - small.height; oy++) {
            for (let ox = 0; ox <= big.width - small.width; ox++) {
              const n = pxCmp(small, big, ox, oy);
              if (n < best) best = n;
              if (best === 0) break;
            }
            if (best === 0) break;
          }
          if (best === 0) {
            report.push(
              `OK  ${rel} (overlap pixel-identical${masks.length ? ", overlays masked" : ""}; ${pa.width}x${pa.height} vs ${pb.width}x${pb.height} — fractional clip-boundary sliver only)`,
            );
          } else {
            report.push(
              `DIFF ${rel} (size ${pa.width}x${pa.height} vs ${pb.width}x${pb.height}; best-aligned overlap ${best} mismatched pixels)`,
            );
            totalMismatch++;
            pixelMismatch += best;
          }
          continue;
        }
        report.push(
          `DIFF ${rel} (size ${pa.width}x${pa.height} vs ${pb.width}x${pb.height})`,
        );
        totalMismatch++;
        pixelMismatch += pa.width * pa.height;
        continue;
      }
      const pxDiff = pxCmp(pa, pb, 0, 0);
      report.push(
        pxDiff === 0
          ? `OK  ${rel} (re-encoded bytes differ, 0 pixel diffs${masks.length ? ", overlays masked" : ""})`
          : `DIFF ${rel} (${pxDiff} mismatched pixels${masks.length ? ", overlays masked" : ""})`,
      );
      if (pxDiff) {
        totalMismatch++;
        pixelMismatch += pxDiff;
      }
    } else if (rel === "behavior.json") {
      const ja = JSON.stringify(JSON.parse(ba.toString()), null, 2);
      const jb = JSON.stringify(JSON.parse(bb.toString()), null, 2);
      if (ja === jb) report.push(`OK  ${rel} (identical)`);
      else {
        totalMismatch++;
        const la = JSON.parse(ba.toString());
        const lb = JSON.parse(bb.toString());
        const diffs = [];
        const flat = (o, p, acc) => {
          if (o && typeof o === "object") {
            for (const k of Object.keys(o)) flat(o[k], `${p}.${k}`, acc);
          } else acc[p] = o;
        };
        const aa = {}, bbb = {};
        flat(la, "", aa);
        flat(lb, "", bbb);
        for (const k of new Set([...Object.keys(aa), ...Object.keys(bbb)])) {
          if (JSON.stringify(aa[k]) !== JSON.stringify(bbb[k])) {
            diffs.push(`    ${k}: ${JSON.stringify(aa[k])} != ${JSON.stringify(bbb[k])}`);
          }
        }
        report.push(`DIFF ${rel}\n${diffs.slice(0, 60).join("\n")}`);
      }
    } else {
      if (ba.equals(bb)) report.push(`OK  ${rel}`);
      else {
        report.push(`DIFF ${rel} (bytes differ)`);
        totalMismatch++;
      }
    }
  }
  const onlyB = list(dirB).filter((f) => !filesA.includes(f));
  for (const rel of onlyB) {
    report.push(`ONLY in B: ${rel}`);
    totalMismatch++;
  }
  report.push(
    `---\nfiles compared: ${filesA.length}, mismatches: ${totalMismatch}, mismatched pixels: ${pixelMismatch}`,
  );
  return { report: report.join("\n"), totalMismatch, pixelMismatch };
}

// ---------- review screenshots ----------

const REVIEW_THEMES = ["light", "dark", "field"];

async function captureReview(browser, base, outDir, { allowTiles, viewerUrl }) {
  const reviewDir = path.join(outDir, "review");
  fs.mkdirSync(reviewDir, { recursive: true });
  const written = [];
  const themeInit = (t) => {
    try {
      localStorage.setItem("cj-theme", t);
    } catch {}
  };
  for (const theme of REVIEW_THEMES) {
    for (const vp of VIEWPORTS) {
      for (const [name, p] of [
        ["hub-home", "/"],
        ["hub-latlon", `/?lat=${TARGET.lat}&lon=${TARGET.lon}`],
      ]) {
        const { context, page } = await newPage(browser, vp);
        await context.addInitScript(themeInit, theme);
        await setupRoutes(context, new Set([new URL(base).origin]), {
          allowTiles,
        });
        await gotoIdle(page, base + p);
        if (name === "hub-latlon") await hubWaitSettled(page);
        const f = `${name}-${vp.name}-${theme}.png`;
        await page.screenshot({
          path: path.join(reviewDir, f),
          fullPage: true,
        });
        written.push(`review/${f}`);
        await context.close();
      }
    }
    // /design showcase — desktop only, all themes.
    const vp = VIEWPORTS[1];
    const { context, page } = await newPage(browser, vp);
    await context.addInitScript(themeInit, theme);
    await setupRoutes(context, new Set([new URL(base).origin]), { allowTiles });
    await gotoIdle(page, `${base}/design`);
    const f = `design-${vp.name}-${theme}.png`;
    await page.screenshot({ path: path.join(reviewDir, f), fullPage: true });
    written.push(`review/${f}`);
    await context.close();
  }

  // Well viewer — all themes × viewports (with tiles).
  const viewerBase = viewerUrl ?? `${base}/well-viewer/index.html`;
  const viewerOrigin = new URL(viewerBase).origin;
  for (const theme of REVIEW_THEMES) {
    for (const vp of VIEWPORTS) {
      const { context, page } = await newPage(browser, vp);
      await context.addInitScript(themeInit, theme);
      await setupRoutes(context, new Set([new URL(base).origin, viewerOrigin]), {
        allowTiles,
      });
      await page.goto(
        `${viewerBase}?lat=${TARGET.lat}&lon=${TARGET.lon}`,
        { waitUntil: "domcontentloaded", timeout: 120000 },
      );
      await page
        .waitForSelector("#map .leaflet-marker-icon", { timeout: 120000 })
        .catch(() => {});
      await settle(page, 900);
      const f = `viewer-${vp.name}-${theme}.png`;
      await page.screenshot({
        path: path.join(reviewDir, f),
        fullPage: true,
      });
      written.push(`review/${f}`);
      await context.close();
    }
  }

  // Viewer modal open — 390x844 light (bottom-sheet layout).
  {
    const vp = VIEWPORTS[0];
    const { context, page } = await newPage(browser, vp);
    await context.addInitScript(themeInit, "light");
    await setupRoutes(context, new Set([new URL(base).origin, viewerOrigin]), {
      allowTiles,
    });
    await page.goto(`${viewerBase}?lat=${TARGET.lat}&lon=${TARGET.lon}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector("#map .leaflet-marker-icon", {
      timeout: 120000,
    });
    await settle(page, 800);
    const targetWell = await page.evaluate(() => {
       
      const list = getWellsInView();
      if (!list.length) return null;
      const withReport = list.find((w) => w.report && String(w.report).trim());
      return (withReport || list[0]).id;
    });
    if (targetWell)
      await page.evaluate((id) => showDetailById(id), targetWell);
    await page
      .waitForSelector("#wellModal:not(.hidden)", { timeout: 8000 })
      .catch(() => {});
    await page.waitForTimeout(800);
    const f = `viewer-modal-${vp.name}-light.png`;
    await page.screenshot({ path: path.join(reviewDir, f), fullPage: false });
    written.push(`review/${f}`);
    await context.close();
  }

  // Viewer loading state — capture early while DNR chunks still stream in.
  {
    const vp = VIEWPORTS[0];
    const { context, page } = await newPage(browser, vp);
    await context.addInitScript(themeInit, "light");
    await setupRoutes(context, new Set([new URL(base).origin, viewerOrigin]), {
      allowTiles,
    });
    await page.goto(viewerBase, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page
      .waitForSelector("#loadingDnrPanel:not(.hidden)", { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(350);
    const f = `viewer-loading-${vp.name}-light.png`;
    await page.screenshot({ path: path.join(reviewDir, f), fullPage: false });
    written.push(`review/${f}`);
    await context.close();
  }
  return written;
}

// ---------- main ----------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (k === "with-tiles") args[k] = true;
      else args[k] = argv[++i];
    } else args._.push(a);
  }
  return args;
}

async function main() {
  const mode = process.argv[2] ?? "capture";
  const args = parseArgs(process.argv.slice(3));

  if (mode === "extract") {
    const lockedDir = path.resolve(
      args["locked-out"] ?? path.join(REPO_ROOT, "docs/design/baseline/locked"),
    );
    const r = extractLocked(lockedDir);
    console.log(`locked extraction → ${lockedDir}`, r);
    return;
  }

  if (mode === "compare") {
    const [dirA, dirB] = args._;
    if (!dirA || !dirB) {
      console.error("usage: capture.mjs compare <dirA> <dirB>");
      process.exit(2);
    }
    const r = compareDirs(path.resolve(dirA), path.resolve(dirB));
    console.log(r.report);
    process.exit(r.totalMismatch ? 1 : 0);
  }

  if (mode === "review") {
    const outDir = path.resolve(args.out ?? "");
    const base = (args.base ?? "http://localhost:3001").replace(/\/$/, "");
    if (!args.out) {
      console.error(
        "usage: capture.mjs review --out <dir> --base <url> [--with-tiles]",
      );
      process.exit(2);
    }
    fs.mkdirSync(outDir, { recursive: true });
    const viewerUrl =
      args["viewer-url"] ?? `${base}/well-viewer/index.html`;
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch({ headless: true });
    try {
      const written = await captureReview(browser, base, outDir, {
        allowTiles: !!args["with-tiles"],
        viewerUrl,
      });
      console.log(
        "DONE",
        JSON.stringify({ outDir, shots: written.length, files: written }),
      );
    } finally {
      await browser.close();
    }
    return;
  }

  // capture
  const outDir = path.resolve(args.out ?? "");
  const base = (args.base ?? "http://localhost:3001").replace(/\/$/, "");
  if (!args.out) {
    console.error("usage: capture.mjs capture --out <dir> --base <url> [--viewer-url <url>] [--with-tiles]");
    process.exit(2);
  }
  const viewerUrl =
    args["viewer-url"] ?? `${base}/well-viewer/index.html`;
  // Locked extraction lands inside the capture's own dir — it must NOT
  // overwrite the committed baseline locked/ files.
  const lockedDir = path.resolve(
    args["locked-out"] ?? path.join(outDir, "locked"),
  );
  const matchDir = args["match-baseline"]
    ? path.resolve(args["match-baseline"])
    : null;
  // Baseline fractional element origins, measured at baseline capture time.
  let cropFracs = {};
  if (matchDir) {
    const fp = path.join(matchDir, "crop-fracs.json");
    if (fs.existsSync(fp)) cropFracs = JSON.parse(fs.readFileSync(fp, "utf8"));
  }
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const log = {
    startedAt: new Date().toISOString(),
    base,
    viewerUrl,
    outDir,
    allowTiles: !!args["with-tiles"],
    stubbed: ["/api/weather (fixed Open-Meteo GFS JSON)", "/api/radar/** (fixed frames)"],
    abortedExternal: "all other cross-origin requests (OSM tiles unless --with-tiles, nominatim, elevation, NWS, open-meteo, ...)",
  };
  try {
    const hub = await captureHub(browser, base, outDir, {
      allowTiles: !!args["with-tiles"],
      hubCapWidth: args["hub-cap-width"] ? Number(args["hub-cap-width"]) : 0,
      matchDir,
      cropFrac: cropFracs["crops/hub-map-crop.png"],
    });
    const viewer = await captureViewer(browser, base, viewerUrl, outDir, {
      allowTiles: !!args["with-tiles"],
      matchDir,
      cropFrac: cropFracs["crops/viewer-map-crop.png"],
    });
    const behavior = {
      hub: hub.behavior,
      viewer: viewer.behavior,
    };
    fs.writeFileSync(
      path.join(outDir, "behavior.json"),
      JSON.stringify(behavior, null, 2),
    );
    const locked = extractLocked(lockedDir);
    log.finishedAt = new Date().toISOString();
    log.locked = locked;
    fs.writeFileSync(
      path.join(outDir, "capture-log.json"),
      JSON.stringify(log, null, 2),
    );
    console.log("DONE", JSON.stringify({ outDir, locked, behavior }));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
