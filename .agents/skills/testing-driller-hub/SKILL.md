---
name: testing-driller-hub
description: How to run and end-to-end test the Driller Hub Next.js app in apps/hub — dev vs production server setup (the full lithology cache needs a prod build), the single-page golden path, where each feature lives, headless-Chrome fallback when the GUI/recording stack is down, and known data-path gotchas (litho chunks, area-insights cold start, service worker, deep-link vs localStorage).
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

### Use a production build when testing anything that needs the full lithology cache

`npm run dev` **cannot reliably hold the full base+litho cache.** Loading it (19 MB gz base +
15 MB gz litho, expanded into JS objects) trips Next dev's own memory watchdog:

```
⚠ Server is approaching the used memory threshold, restarting...
```

The dev server restarts itself and **wipes the in-memory cache**, so `/api/wells-nearby?...&lithology=1`
never stays warm — you get a 503, then a connection error on the retry. This is a *dev-server*
limitation, not an app bug, and it is distinct from a kernel OOM kill (`dmesg | grep -i "killed process"`).

For ASL / lithology / area-insights testing, build once and serve:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
NODE_OPTIONS=--max-old-space-size=4096 npm run start   # no dev watchdog; cache stays warm
```

Warm the caches before asserting; expected cold-start shape at one location:
`lithology=1` → 503 @ ~22 s → retry 200 @ ~7 s → subsequent 200 @ ~0.02 s.

**Shell gotcha:** starting the server with `cmd && ... & sleep N; curl ...` in one line often lets
the `&` split the chain so the server never starts and the log file is missing. Verify with
`curl -o /dev/null -w '%{http_code}' http://localhost:3000/` before concluding anything, and keep
exactly one server on :3000 so you know which revision answered.

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

**A saved dispatch in localStorage overrides `?lat=&lon=`.** If you deep-link to a new location and
the page still shows the previous jobsite, click **Clear saved dispatch** and reload — otherwise you
will wrongly conclude the deep link is broken or that data is stale.

**Typing URLs via xdotool drops `?` and `&`.** `type` silently loses those characters, producing
`localhost:3000/lat=...` → 404. Type the `?` with `key shift+slash`, or paste, and re-read the
address bar before pressing Enter.

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

- **Lithology lives in separate sidecar chunks from the base well data.** By default
  `/api/wells-nearby` serves the base cache and returns **no** `lithology_json`. Pass
  **`?lithology=1`** to get the full base+litho cache (keeps `lithology_json` /
  `lithology_source`, limit capped at 200). The ASL view hydrates that endpoint itself, once per
  (center, depth radius), and merges logs into the nearby rows by well identity.
- **How to tell a working ASL from a broken one.** The historical regression looked like a
  working page: the chart just sat on "Need ground elevation and lithology logs" forever. Assert
  on the data path, not only the screenshot:
  - a request to `/api/wells-nearby?...&lithology=1` fires when the ASL tab opens;
  - `POST /api/elevation` body contains **more than one** location (jobsite **plus** wells). A body
    of exactly `{"locations":[{...jobsite...}]}` is the broken signature;
  - the chart has non-zero `document.querySelectorAll('svg rect').length` and a
    "Showing N of N wells with logs" line.
  Cross-check server-side truth with `/api/area-insights?...`, which reports `wellsWithLithology`.
- **Capture network evidence with a passive `window.fetch` wrapper**, installed via the console
  before interacting. Do **not** use Puppeteer/CDP request *interception* — forcing responses has
  broken React hydration here (the "Generate job brief" button goes dead) and wastes a run.
  Re-install the wrapper after any page reload.
- **Duplicate well coordinates are real source data, not a merge bug.** Several DNR wells
  (e.g. Carmel Water Dept) are geocoded to an identical lat/lon in
  `dnr_wells_base_chunk_*.csv.gz`, so the elevation POST legitimately repeats coordinates.
  Confirm against the base endpoint / raw CSV before reporting it as a defect.
- **ASL ground elevation may be user-triggered.** If the empty state offers
  **Load ground elevations**, clicking the ASL tab alone is not enough. The chart also skips wells
  with no ground elevation *before* checking lithology, so "N well(s) missing ground elevation"
  does **not** imply those wells have no logs.
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
