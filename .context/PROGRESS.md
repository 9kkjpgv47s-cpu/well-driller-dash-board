# Progress ledger

## 2026-10-08 — Post-design-migration regression audit: viewer "Show wells on map" toggle restored

### Audit (what the C&J design migration changed structurally)
- **Hub React app** (`cd5e3ba` → `b450b41`): chrome only — new top bar (brand, "Well viewer →" link, theme toggle), C&J tokens/components, nearest-wells card redesign (rank, distance, chip legend, depth bar), weather source buttons → segmented toggle, map skeleton loader, ASL lithology hydration (new). Control inventory (aria-labels/titles/selects/buttons) identical old vs new; radius dropdown (0.25–5 mi, default 2) intact. **No hub feature lost.**
- **Well viewer** (standalone `772e522` → current; hub-embedded copy identical since May): panels re-ordered (search inputs → map → results → filters), top bar/page head/bore loader added, red banner removed, perf (spatial index, marker pool, coalesced refresh), modal Esc/backdrop close. **One control lost:** the `#showMapWells` "Show wells on map" toggle + map-gated markers (dropped when the hub's July build replaced the standalone viewer on 2026-09-27; the hub copy had already lost it between `123d9fc` and `3ce6561`). Without it `userRequestedWellMarkers()` was always true → a random 800-well sample rendered everywhere before any search.

### Restored (both `apps/hub/public/well-viewer/index.html` and `~/Projects/well-viewer/index.html`, byte-identical except the app-switch href)
- "Show wells on map" toggle in the map bottom bar (before "Hide well labels") and the April loading-panel copy that points at it. Strict parity: `userRequestedWellMarkers`/`onShowMapWellsChange`, the `cjFitMapToWellsIfNoneVisible` guard, CSV/clear-all toggle sync and comments are April's text verbatim. Only adaptations: `aria-label` on the input (matches the design pass on every other toggle), `.cj-datalbl` wrapper so the label flips to theme ink in dark, build stamps → `2026-10-08-show-wells-toggle`.
- April semantics: hide labels → no markers; search pin (location/address/coords/`?lat&lon`) → wells within 2 mi only; no pin + toggle off → empty map (sidebar list still follows map view); no pin + toggle on → wells in view (800 cap) + start chunk load + auto-fit if none visible.

### Verification
- `apps/hub/scripts/qa/show-wells-toggle.mjs` (Playwright, chromium desk + webkit iPhone 14 Pro) against the static viewer on :8794 — 38/38 PASS: cold load 0 markers / list 31,764 in view; toggle on → 800; off → 0; `?lat&lon` pin → 800 markers all ≤ 2.05 mi (page `haversine()` rounds to 0.1 mi, pre-existing); pin wins over toggle; hide labels → 0; dark-theme label flips to ink; no overflow desk/iPhone; 0 console errors. Evidence: `docs/design/qa/show-wells-toggle/`.
- Not changed (not regressions): hub radius select, viewer 2-mi pool logic, sidebar list gating (never gated).
- **Deployed 2026-10-08** via Vercel CLI from clean worktrees of hub `0d22c3b` / standalone `07edc8d` (GitHub push blocked — no git credentials on this Mac; `gh` token invalid). Live re-run of the same script against both origins: 38/38 each, build stamp `2026-10-08-show-wells-toggle` served, 0 console errors. Evidence: `docs/design/qa/show-wells-toggle/live/{inhub,standalone}/`. Follow-up: push `main` in both repos once `gh auth login` is redone (Vercel git-main integration will rebuild the same code).

## 2026-08-18 — Performance audit + improvements

### Audit findings
- Lithology KPI: **97.476% real parsed** (target 90% — MET). `.context/` was stale at 52.8%.
- Prod `/api/wells-nearby` and `/api/area-insights` 503 on cold start (server can't load 33.8MB in 4s Vercel budget).
- 64% of chunk payload was `lithology_json` — not needed for map rendering.
- 2600 lines of uncommitted work at risk (now committed).

### Improvements shipped
1. **Chunk split**: `scripts/split_chunks.py` produces base (18.4MB) + litho (14.3MB) sidecar chunks. Server `wells-nearby` API loads base only. Client renders map from base, loads litho in background for insights.
2. **IndexedDB persistence**: base chunk ArrayBuffers cached for instant repeat visits.
3. **Cache-Control headers**: chunk CSVs + area grid set to `immutable, max-age=31536000` for CDN edge caching.
4. **Code-split papaparse**: dynamic import, page bundle 65.7KB → 59KB.
5. **Service worker**: `public/sw.js` — app shell SWR, chunks cache-first, API network-first with offline fallback.
6. **Precomputed area grid**: `scripts/precompute_area_grid.py` → 28KB `area_grid.json.gz`. New `/api/area-grid` route for <10ms summary.
7. **Smarter API fallback**: wells-nearby success + area-insights 503 → map renders immediately, litho loads in background.

### Verification
- 139/139 tests pass
- `next build` clean
- `verify:chunks` 10 chunks, 414,953 wells, 100% lithology JSON
- `report-lithology-kpi` 97.476% real parsed, 100% parseable JSON

## 2026-07-28 — `/ce` bootstrap

- Created `.context/` from README, AGENTS.md, PROJECT_OUTLINE.md, apps/hub/README.md, package.json, data/README.md, docs/statewide-lithology-execution-report.md.
- Appended thin "Agent context pack" section to root `AGENTS.md`.
- No product feature work.

## Hub MVP

- Mono-page `/` with dispatch parse, map, weather, area insights — described as current app surface in hub README.

## 2026-08-30 — N2 fresh-clone verify + N3/N4/N5 status (kickoff 07)

### N2 verification (PASS)
- `build_canonical_jsonl.py --from-full` → 414,953 records ✓
- `npm install` clean, `npm test` **139/139 pass** ✓
- `npm run build` clean ✓ (chunk split holding — no 503-path regressions)
- Dev server smoke (port 3939): `/` → 200; `/api/wells-nearby` → 200 w/ real DNR rows (3.1s cold dev); `/api/area-insights` → 200 (7.1s cold dev compile; prod uses precomputed grid)
- 503 follow-up: `/api/wells-nearby` + `/api/area-insights` both serve 200 with data — 8/18 chunk-split fix confirmed still working locally. Prod spot-check not done (no deploy, no Vercel token used).

### N3 — analytics service: PARTIAL
- `scripts/precompute_area_grid.py` (shipped 8/18) covers **neighborhood summaries**: 0.1° grid, median depth, GPM distribution, aquifer breakdown, gravel/vein rates → `area_grid.json.gz` (<10ms server responses).
- **Not covered: outlier flags.** Needs a spec before implementation (Dom approval required).

### N4 — trip context: STILL PARKED
- Weather exists; traffic/routing still "later." No provider locked (OPEN #2).

### N5 — community notes: STILL BLOCKED
- Auth + storage + moderation blocked on Dom policy (OPEN #1). No change.
