# Prod QA — round 1 (post-deploy)

Targets: `https://driller-hub.vercel.app` (deploy 91640c1), `https://c-j-well-viewer.vercel.app` (acfb87e).
Artifacts: `docs/design/qa/round-prod-1/` (matrix/flows/viewer/gate JSON + shots), `prod-round-1/` (axe/contrast/taps), `round-prod-1-fixed/` (fixed-runner parity vs local prod build).

## Deployment sanity

- New build confirmed live: `cj-topbar`, inline `cj-paper`/`THEME_INIT` script, `.well-card` markup all present on `?cb=` fresh fetches.
- `/design` → **404**, `/design/palettes` → **404** (middleware gate works in prod).
- `/api/wells-nearby?…&limit=800&lithology=1` ×3: **503** after 4.4s / 8.7s / 5.3s, 101B body (`"DNR chunk load timed out after 4000ms … fallback: client-chunks"`) — the serverless cold-start timeout is the norm; prod users ride the client-chunk path. Payload size is moot (never reaches the 4.5MB limit — the route fails first).
- `/api/area-insights` likewise 500/503 on cold instance.

## Issues found

### FIXED — lithology lost on client-chunk fallback (prod-blocking, severity: high)

Symptoms on prod (reproduced identically on local :3001/:3006 forced-503 — **not** a deploy difference):

- Nearest-well cards show registry-derived labels (`DNR-185960 G1 4`, `DNR-186211 G1 3`, `DNR-186206 G1 5`, `DNR-185965 G1 3`, `DNR-185985 G1 36`, `DNR-18063 Well — depth`) instead of lithology-derived (`G1 8`, `G1 9`, `G1 8`, `S1 5 G1 13`, `G1 10 G2 5 G3 7`, `S1 4 R 90`).
- Area insights: "Lithology intervals **0 / 1125**" and "INSIGHT CONFIDENCE LOW".

Root cause: `getLithLayers` memoizes parsed intervals in a `WeakMap` keyed by record object identity (`area-well-analytics.ts`). The fallback Phase-1 render (base chunks, no `lithology_json`) poisons the cache with `[]` for every rendered well; Phase-2's `mergeLithoIntoBase` then **mutated `w.lithology_json` in place**, so the cache kept returning `[]` — cards, markers and insights stayed litho-less forever even though all 10 litho sidecars fetched (all 200) and merged.

Why round-1 local parity missed it: the fb leg's forced 503 was defeated by `sw.js`'s network-first API cache, which served the API leg's cached wells-nearby response — no chunk fallback ever ran (fbPaths showed zero chunk fetches).

Fix (committed on design/cj-universal):

- `dnr-chunk-browser.ts` `mergeLithoIntoBase` → copy-on-write (new object per merged row; invariant: never mutate `lithology_json` in place).
- `dnr-chunk-server.ts` same fix for the server copy.
- `DrillingHubClient.tsx` Phase 2 → `setAreaWells(fullWells)` so cards/markers/ASL upgrade once litho lands.
- `qa.mjs` parity → `serviceWorkers: "block"` on both legs so the fallback is real.
- New `dnr-chunk-browser.test.ts` (3 tests incl. the read-then-merge WeakMap regression).

Verified on a fresh production build (:3006): forced-503 fb → `G1 8` + `1125/1125`, markers 18, and fixed-runner parity api-vs-fb = **0 diffs** (fb leg really fetched 32 chunk files).

**Prod still shows the old labels until the fix is pushed.**

## Suite results (prod URLs, pre-fix deploy)

- **Matrix** (chromium+webkit × 10 viewports × light/dark + legacy `field`→light): 42 rows, **0 issues, 0 overflow, 0 page errors**. `cards=25` everywhere; `markers=1` is a measurement artifact — the probe samples before the slower prod fallback finishes chunk loading (markers=18 confirmed on a longer wait). Console errors = expected API 503s + chunk-discovery 404 probes only.
- **Flows** (5 combos): 0 issues — all sections, 3 directions links, radius select updates insights, modal + `secure.in.gov` DNR link, ESC/Enter, theme toggle, reload persistence.
- **Viewer**: 8/8 clean — in-hub + standalone prod; 800 markers, modal/log/DNR link, theme toggle, app-switch correct (`/` in-hub, `https://driller-hub.vercel.app/` standalone).
- **Axe/contrast/taps**: 0 free findings both themes both apps; min tap 44px; paper palette contrast ≥4.5.
- Vercel runtime errors observed: only the expected API 503s (wells-nearby, area-insights) — designed fallback triggers.

## Risks

- **Stale-shell risk from sw.js**: `staleWhileRevalidate` on navigations + cache-first on `/_next/static/` can serve repeat visitors a previous deployment. Not a code bug, but prod users may lag a release until cache refresh.
- API `lithology=1` on warm serverless instances still untested (cold-start 503 dominates); the fb path is now verified equivalent.
