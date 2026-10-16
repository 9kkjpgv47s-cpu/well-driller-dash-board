---
name: testing-driller-hub
description: How to run and end-to-end test the Driller Hub Next.js app in apps/hub — dev server setup, the single-page golden path, where each feature lives, headless-Chrome fallback when the GUI/recording stack is down, and known data-path gotchas (litho chunks, area-insights cold start, service worker).
---

# Testing the Driller Hub (apps/hub)

## Running the app

```bash
source ~/.nvm/nvm.sh && nvm use 22.12.0   # default node 20.x breaks vitest/rolldown native bindings
cd apps/hub && npm install
NODE_OPTIONS=--max-old-space-size=4096 npm run dev   # http://localhost:3000
```

- There is **no authentication** anywhere. Every feature is reachable from `/`.
- Do **not** use `--max-old-space-size=8192` on an 8 GB box. The dev server loads large DNR
  registry chunks; an 8 GB heap cap lets it grow past physical RAM and the kernel OOM-kills
  `next-server` mid-run (`dmesg | grep -i "killed process"`). 4096 is stable. If the browser
  suddenly gets `ERR_CONNECTION_REFUSED`, check for an OOM kill before assuming an app bug.
- First request to a route compiles it (5–20 s in dev). Budget long waits before asserting.

## The golden path

Everything is one page. Paste dispatch text into the textarea → **Generate job brief** →
jobsite + map + weather + area analysis render below.

Dispatch text with GPS (parsed heuristically):

```
Dispatch: New residential well - Kilroy Farm
Address: 12450 N Meridian St, Carmel, IN 46032
Latitude: 39.9784 Longitude: -86.1180
Distance off drive: 220 ft
```

Address-only text (no coords) additionally exposes a green **Geocode address** button that
calls `/api/geocode`; `1 N Capitol Ave, Indianapolis, IN 46204` resolves to ~`39.7673, -86.1616`.

Deep links: `?lat=&lon=` and `?job=` (share-link round-trip restores dispatch text + pin).

## Where features live

| Feature | How to reach it | Backing route |
|---|---|---|
| Map markers + well-type / GPM filters | "Map & views" → Map tab | `/api/wells-nearby` |
| Depth thermometer | Depth tab | client-side, from wells |
| ASL stratigraphy | ASL tab (may need **Load ground elevations**) | `POST /api/elevation` |
| Well detail modal (lithology, test rate) | click a marker | `/api/dnr-report` (live Indiana DNR — slow) |
| Weather, GFS + NWS tabs | "Weather" section | `/api/weather` (+ api.weather.gov follow-up) |
| Area drilling analysis / Narrative summary | bottom panel | `/api/area-insights`, `/api/area-grid` |

**Not reachable from the UI** (don't waste time hunting for them):
- Live radar — `LiveRadarMap` only renders when `layout !== "field"`, and `/` uses the field layout.
- `DrillerFieldPrepPanel` ("Site optimization (auto)") — not imported anywhere; `/optimization`
  and `/driller-job` both `redirect("/")`. Test `/api/optimization` with curl instead.

## Known data-path gotchas

- **Lithology is in a separate chunk from the base well data.** `/api/wells-nearby` serves
  `getDnrWellsBaseCachedForApi()` (base chunks) and returns **no** `lithology_json` /
  `lithology` field. Client code that needs lithology (`getLithLayers`, and therefore the ASL
  stratigraphy chart and its elevation prefetch) gets nothing on that path. Litho chunks
  (`public/well-viewer/dnr_wells_litho_chunk_*.csv.gz`) are only loaded browser-side on the
  503 client-fallback path. If the ASL chart shows "Need ground elevation and lithology logs"
  forever and the `POST /api/elevation` body contains only the jobsite (one location, no wells),
  this is the cause — not a broken elevation API. Cross-check with
  `/api/area-insights?...&radius=0.3`, which is computed server-side *with* litho and will report
  a non-zero `wellsWithLithology` for the same radius.
- **ASL ground elevation is user-triggered.** Clicking the ASL tab is not enough; click
  **Load ground elevations**. The chart also skips wells with no ground elevation *before*
  checking lithology, so "N well(s) missing ground elevation" does **not** imply those wells
  have logs.
- **`/api/area-insights` can return 503 on a cold start** (~20 s) and succeed on retry. The
  client has a documented fallback to browser-side chunk loading, so a single 503 is not
  automatically a failure — retry before reporting.
- **The service worker is disabled in development.** `ServiceWorkerRegister` returns early
  unless `NODE_ENV === "production"`, so `navigator.serviceWorker.getRegistrations()` is empty
  under `npm run dev`. To test SW registration/caching you must `npm run build && npm run start`.
  Reload-state persistence (dispatch text, jobsite) uses localStorage and *is* testable in dev.

## Headless fallback when the GUI stack is down

The computer-use/recording stack can fail (`enigo init failed: no connection could be
established`) and may not reattach to a manually started Xvfb. Rather than blocking, drive the
UI with headless Chrome — this covers nearly every assertion, minus the annotated video.

```bash
mkdir -p /tmp/uitest && cd /tmp/uitest && npm i puppeteer-core
# Chrome binary on this box: /home/ubuntu/.local/bin/google-chrome
```

Useful patterns:
- There are no stable test ids; select buttons by text content
  (`Generate job brief`, `ASL`, `Depth`, `NWS`, `Load ground elevations`, `Geocode address`).
- Log every `/api/` response via `page.on("response", ...)` — status codes are the best evidence
  of which backend path actually ran.
- Assert narrative escaping in the DOM: the "Narrative summary" `<ul>` should contain `<strong>`
  tags but no `&amp;`/`&lt;`/`&#39;` text artifacts and no stray `**`.
- Avoid `page.setRequestInterception` on this app unless necessary — it interfered with
  hydration and left "Generate job brief" unresponsive in testing.
- Scroll with `element.scrollIntoView()`; mouse-wheel scrolling over the Leaflet map zooms the
  map instead of scrolling the page.

## Pre-existing noise (not regressions)

- Literal `**` in the "Methodology & limits" list — `disclaimers` bypass `formatNarrativeHtml`.
- `npm run lint` and `npx tsc --noEmit` fail on vendored minified viewer JS and one type error in
  `src/lib/weather/job-advice.test.ts`.

## Devin Secrets Needed

None — the app requires no credentials. All upstreams (Indiana DNR, open-meteo, api.weather.gov,
OpenTopoData/Open-Elevation, geocoder) are public and unauthenticated.
