# QA round 1 — pre-deploy matrix (production build @ :3006, worktree `/private/tmp/wd-qa` @ 2c3008a)

Engines: chromium + webkit (playwright firefox-1543 cannot launch on this machine — "Could not find profile folder" — treated as unavailable).
Viewports: iPhone SE (1g 320×568 stress + 3rd gen 375×667), iPhone 14 Pro, Pixel 7, iPad Mini, iPad Pro 11 landscape, 1280/1440/1920/2560.

## Issues found

| # | Severity | Issue | Evidence | Status |
|---|----------|-------|----------|--------|
| 1 | high | Horizontal overflow 32px at ≤352px: weather/field-prep header action rows (`Refresh weather` + Up/Down) used `flex shrink-0` so the flex item held max-content width (~307px) past the card's content box | matrix `iphone-se` (1g) rows, `find-ow` probe | **Fixed** — `shrink-0` → `min-w-0` in `JobWeatherPanel.tsx` (×2) and `DrillerFieldPrepPanel.tsx`; verified scrollW=320 on dev |
| 2 | med | Filter checkbox rows 24×24/36px tap target (<44px) | TAP probe flagged `h-5 w-5` inputs on every viewport | **Fixed** — `min-h-11` on the `<label>` rows in `DrillingViewerMapFilters.tsx` (whole row is the tap target); TAP probe now measures the enclosing label |
| 3 | med | Viewer `#wellModal` did not close on Escape or backdrop click (hub modal does); open modal then blocked all topbar interaction | viewer flow crash log — `button.theme-toggle` click timeout under open backdrop; `index.html` had no keydown/backdrop handlers | **Fixed** — Escape keydown + backdrop-click→`closeModal()` added to hub copy and standalone `index.html` |
| 4 | high | `/design` and `/design/palettes` return HTTP 200 in prod build (404 body but streamed 200) | `gate.json` `{"/design":200,"/design/palettes":200}` | **Fixed** — `export const dynamic = "force-dynamic"` on both pages (was uncommitted); re-verify on rebuilt :3006 |
| 5 | low | `.skip-link` flagged near-white in dark | flows | Non-issue — inverse `var(--ink)` skip link is off-screen (`left:-9999px`) until keyboard focus; probe now skips off-screen elements |

## Runner fixes (test-side, not product bugs)

- `iPhone SE` descriptor is 320×568 (1st gen); matrix now uses `iPhone SE (3rd gen)` 375×667 as briefed, plus `iphone-se-1g` 320px as a stress row (it caught issue 1).
- Radius "5 mi" step clicked an `<option>` — now `selectOption` on `select[aria-label*="radius"]`; asserts insights count changes (4532/4532 @5mi vs 1125/1125 @2mi ✓).
- Modal DNR-link probe searched text "report" but the link reads "Official DNR well record" — selector now `a[href*='in.gov']` inside the dialog → verified `…/dnr_waterwell?refNo=185960…`.
- Dark white-box probe ran post-toggle even when toggle landed on light → gated on `dataset.theme === "dark"`.
- Firefox entries in flow/viewer combos → webkit (firefox unusable on this machine).
- Viewer flow: added log-viewer click, Escape-close assertion, geolocation grant + "Use My Location".

## Data-path parity (API vs forced-503 client-chunk fallback)

- `parity.json`: **0 diffs** on first-25 nearest-well cards (IDs, order, G/R/S token strings), 25 cards and equal marker counts on both paths.
- Fallback verified actually exercised: request log shows `wells-nearby → 503` then `dnr_wells_base_chunk_*.csv.gz` fetches; cards rendered.
- Earlier live-vs-local "G1 4 vs G1 8" discrepancy is **not** a data-path bug — live's deployed build predates formation-class v3 (`ef1d2ba`); same `lithology_json` relabels differently by version. Local API and local fallback agree exactly.

## Matrix result (all 37 rows otherwise clean)

- markers 14–18 (clustered at z13 — intended, `disableClusteringAtZoom:15`), cards=25 everywhere.
- Zero console errors, pageerrors, or failed requests on every row (map tiles excluded).
- Note: `matrix.json` was partially overwritten by a targeted iphone-se re-run (directory-move mistake); the full-row PNG set is preserved and findings were captured above.

## Round-1 fixes committed

`qa: round 1 fixes — 320px header-actions overflow, 44px filter rows, viewer modal ESC/backdrop close, /design prod 404`
