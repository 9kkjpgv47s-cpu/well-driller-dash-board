# Progress ledger

## 2026-10-12 — N6: API cold-start 503s fixed with 0.1° well tiles; mobile + dark-chip work deployed

### Fix (hub `505fc5a`)
- Root cause (repro'd live before the fix: 30/30 requests failed — 27×503 "DNR chunk load timed out after 4000ms", 3×500 `_error` HTML): `/api/wells-nearby` + `/api/area-insights` parsed the whole registry (10 base + 10 litho gz chunks, 414,953 rows) on every cold lambda, racing a 4 s budget it never met.
- Registry sharded into **0.1° lat/lon tiles** under `apps/hub/public/well-viewer/tiles/` (`scripts/build_well_tiles.py` → 1,056 base + 1,056 litho tiles + `manifest.json`, 36 MB; deterministic bytes, re-run = zero diff). Tile key = `floor(lat/0.1)_floor(lon/0.1)` pinned in both Python and `well-tiles.ts`. A radius query reads only its bbox tiles (`dnr-tile-server.ts`, per-tile single-flight cache, litho merged by id with the same `mergeLithoIntoBase`); `getDnrWellsForRadiusCachedForApi` falls back to the legacy whole-registry caches when tiles are absent. Routes emit `X-Wells-Source: tiles|registry` + `X-Wells-Tiles`. `npm run verify:tiles` checks manifest/tiles against the chunks. NFT traces all 2,113 tile files into both routes without `outputFileTracingIncludes`; `public/well-viewer` 76 → 112 MB.
- Parity: `TILES_PARITY=1 vitest run src/lib/well-tiles.realdata.test.ts` — 12 centers × radii {0.3, 2, 5, 25}: `queryWellsNearby` deep-equal, `computeAreaInsights` deep-equal, filter-path id sets equal. Only semantic change: with viewer filter params, "source order" is tile-key order (hub UI never sends filters).
- Gates: lint 0, tsc clean, vitest 187/187 (+23), build clean, local sweep 120/120 → 200 (cold p95 83 ms).

### Deploy (Vercel CLI, clean worktrees; GitHub push still blocked — no credentials)
- Hub: staged `--prod --skip-domain` build → `vercel promote` (staged URL was SSO-protected, so verification ran on the prod domain). Standalone viewer `6e84b41` → prod. Both serve stamp `2026-10-12-mobile-dark-chips`; dark-chip (`cjDataColorize`, `.cj-dc`) + mobile (`cjInstallGestureHint`, `cjLockBodyScroll`) code confirmed live on both origins.
- Prod sweep (20 centers × 3 requests, cold + warm pass; `docs/design/qa/api-cold-start/prod-after/`): **120/120 → 200, all `tiles`, 0×5xx**. Genuine first cold request 698 ms. Cold p50/p95/max: wells-nearby r=2 236/698/1229 ms; area-insights r=2 99/229/255 ms; r=0.3 78/118/163 ms. Warm p95 ≤ 87 ms. Baseline for contrast in `prod-before/`.
- Mobile first load (`apps/hub/scripts/qa/no-chunk-fetch.mjs`, iPhone 14 Pro + Pixel 7, SW blocked): `/api/wells-nearby` 200 `tiles`, `/api/area-insights` 200, **0 `dnr_wells_*` chunk downloads**, markers rendered. Evidence `docs/design/qa/mobile-no-chunk-fetch/`.
- show-wells-toggle live: 38/38 in-hub, 38/38 standalone (`docs/design/qa/show-wells-toggle/live-2026-10-12/`). Script's expected stamp updated to the new build.
- Known edge (not a hub UI path): `wells-nearby` at the 25 mi API cap over Indianapolis (88 tiles, ~61k rows with lithology) hit the 4 s budget once on a fresh lambda → 503 → designed client-chunk fallback; `area-insights` r=25 served in 4.8 s. r=5 ≤ 1.3 s cold. Follow-up if ever needed: longer budget or coarser tiles for radii > 5 mi.

## 2026-10-10 — Dark theme: data chips lose the light "paper" fill (viewer list + modal)

- Problem: in dark, `.cj-data` and the `#modalBody` inline-color rules put locked light-tuned data hexes on a cream chip (`--data-chip #EFE9DF`) — bright rectangles on every well card. Dom: remove them.
- Decision (Radix step-11 / Primer dark-fg / Material "lighter tones on dark"): keep the hue (the encoding), lift lightness for dark, tint the chip with its own hue. Viewer `cjDataColorize` (MutationObserver on `#wellsList` + `#modalBody`) moves inline `color:` onto `--dc` + class `.cj-dc`; `components.css`: `.cj-dc { color: var(--dc) }`, dark `oklch(from var(--dc) max(l, 0.76) calc(c*0.85) h)` under `@supports`, dark `.cj-data` = `currentColor` 12% fill + 24% inset ring; paper fill kept only as the no-relative-color fallback. `viewer.css`: list/modal Tailwind color classes mapped to tokens (`--ok`, `--ink*`, lifted blue), modal values are plain lifted text (no chips). R/G/S outer chip spans now carry the face color so the tint follows the hue. Light theme unchanged (computed colors identical for every inner text span).
- Evidence: `docs/design/qa/dark-data-chips/` — dark contrast min 6.17:1 across 103 chips/values (was paper-dependent); show-wells QA 38/38; lint 0; build clean; copies in sync.

## 2026-10-10 — Mobile audit + fixes (hub + both viewer copies)

### Audit (prod, read-only first)
- Runner `apps/hub/scripts/qa/mobile-audit.mjs` — 5 touch profiles (iPhone SE 3rd gen, iPhone 14 Pro portrait+landscape, Pixel 7, iPad Mini; webkit/chromium) × light/dark × hub job flow / embedded viewer / viewer with pin / standalone viewer; checks overflow, tap targets, text size, iOS input zoom, meta, map geometry, modal scroll restore, toggle text tap, gestures, SW, console errors, throttled perf (Pixel 7, 1.6 Mbps/150 ms/4× CPU). Prod evidence: `docs/design/qa/mobile-audit/{RESULTS.json,RAW.md}` (430 rows).
- Passed on prod: no horizontal overflow (50/50), tap targets ≥ 24 px, safe-area + 16 px inputs already in the design system, viewer console clean.
- Failed on prod: viewer well modal jumped the page to the top and never restored scroll (6/6 phone cells); hub well dialog let the background scroll on Pixel 7; viewer toggle text was not clickable (only the 44×24 switch); iPad `.select-sm` at 11.5 px (iOS zoom on focus); iPhone-landscape viewer map taller than the viewport (320 px in 343); map bottom bar clipped "Hide well labels" under the label-size stack on every phone; hub zoom buttons 30×30; hub viewport missing `viewport-fit=cover`/theme-color; SW cached `/well-viewer/cj/*.css` cache-first forever; viewer modal footer label overflowed its pill at 375 px.
- Dom's UX calls: two-finger map pan + hint (chosen over expand-map button); keep hub phone page order; keep C&J OS verbatim text sizes; API cold-start 503s → separate pass after this one.

### Fixed
- **Viewer (canonical `~/Projects/well-viewer/index.html`, mirrored into `apps/hub/public/well-viewer/index.html`; diff = app-switch href only):** `cjLockBodyScroll/cjUnlockBodyScroll` keep `scrollY` across the modal (A=C exact on all cells); all 15 toggle texts are now `<label for>`; map created with `dragging: false` on `(pointer: coarse)` + `cjInstallGestureHint` overlay ("Use two fingers to move the map"); phone media block moved after the zoom-stack base rule — bar `max-width: calc(100% - 24px)`, stack `bottom: 72px` (no overlap at 375/393/412); `window.__cjMap` exposed for QA.
- **design/cj (synced to hub `src/styles/cj`, `public/well-viewer/cj`, standalone `cj/`):** `components.css` — `.input-sm/.select-sm` 16 px also under `(pointer: coarse)`; `.modal-dialog { overscroll-behavior: contain }`; `.cj-main` safe-area gutters; touch-ergonomics block pins `touch-action: pan-x pan-y` on coarse maps + `.cj-map-gesture-hint` styles. `viewer.css` — phone map `min-height: clamp(200px, 100svh − top − s-4, 320px)` (i14-land 320 → 263), 768–1023 sticky map `min-height: min(400px, …)`, `#wellModal .btn` wraps on phones.
- **Hub:** `layout.tsx` viewport `viewportFit: "cover"` + light/dark `themeColor` (= `--bg`); `WellDetailModal` uses new `lib/use-body-scroll-lock.ts` (fixed-body lock, scroll restored); `DrillingMap` `dragging: !coarse` + `map-gesture-hint.ts`; `globals.css` zoom buttons 44 px via `.leaflet-container.leaflet-touch .leaflet-bar a` (previous `.leaflet-bar a` lost to leaflet.css specificity); `public/sw.js` → `driller-hub-v2`, "everything else" stale-while-revalidate (v1 caches purged on activate).

### Verification (local prod build :3005 + static viewer :8795)
- `npm run lint` 0 errors, `tsc --noEmit` clean, `vitest` 164/164, `next build` clean; `scripts/sync-cj-design.sh --check` OK; standalone `cj/` byte-identical to `design/cj`.
- Mobile runner re-run: 494 rows — modal scroll 9/9, input-zoom 50/50, overflow 50/50, map-geometry 40/40 (`touch-action: pan-x pan-y`, no trap), gesture 42/42 (Pixel 7 real CDP one-finger drag scrolls the page 185 px with 0 m map pan; two-finger synthetic pan moves the map 1.7–7 km; desktop mouse drag still pans), toggle-text-tap 8/8, bottom-bar 24/24, tap targets 50/50 incl. 44×44 zoom buttons. Remaining FAILs are the 50 sub-12 px text rows Dom chose to keep + 3 `dnr-report` 404s from the static dev server (serverless route). `show-wells-toggle.mjs` still 38/38. SW: `caches.keys()` = `driller-hub-v2-shell` only. Evidence: `docs/design/qa/mobile-audit/local-fixed/` (curated shots; full set archived in `/tmp/driller-audit/mobile-shots-archive/`).
- Chromium caveat: Playwright device emulation does not flip `(pointer: coarse)` reliably, so Pixel 7 gesture cells stub `matchMedia` (documented in the runner); WebKit profiles report coarse natively.
- Deployed 2026-10-12 together with the dark-chip change and N6 (see top entry). GitHub push still blocked (no credentials).

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

## 2026-10-30 — Hosted MCP server (`/api/mcp`)

- Added Streamable HTTP MCP endpoint at `apps/hub/src/app/api/mcp/route.ts` via `mcp-handler` 2.3.0 + `@modelcontextprotocol/server` 2.3.1 (zod 4.6.7).
- Bearer API keys from `DRILLER_MCP_API_KEYS` (`label:key` allowlist, constant-time compare); `withMcpAuth` required + `wells:read` scope. No OAuth/well-known/rate limit yet.
- Four Indiana-only tools: `geocode_address`, `area_insights`, `wells_nearby`, `dnr_well_record` — in-process calls to the same lib functions the JSON routes use; no mock data paths.
- Extracted `geocodeIndiana` → `src/lib/geocode-server.ts` and the DNR handler shim → `src/lib/dnr-report-server.ts`; routes kept identical responses.
- Vitest coverage: auth/indiana/tools/route + `scripts/mcp-smoke.mjs` client (`npm run mcp:smoke`). Follow-ups parked in OPEN #8.

## 2026-10-30 — MCP OAuth 2.1 resource server (ChatGPT-capable)

- `/api/mcp` now accepts both bearer API keys and OAuth JWTs. `MCP_OAUTH_ISSUER` unset ⇒ identical to API-key-only behavior.
- `src/lib/mcp/oauth.ts` (jose 6.2.13): `createOAuthVerifier` (iss+aud `jwtVerify`, all failures → undefined), RFC 8414 → OIDC JWKS discovery, lazy per-process verifier singleton (`resetOAuthVerifierForTests` for tests).
- `src/lib/mcp/auth.ts`: `createMcpTokenVerifier` factory — API-key allowlist first (`extra.authMethod: "api-key"`), then injected/env OAuth verifier; failed JWT denies, no fallback.
- `src/app/.well-known/oauth-protected-resource/route.ts` — hand-written RFC 9728 metadata (deterministic `resource`, 404 when unconfigured) + CORS OPTIONS.
- Tool `annotations`: readOnly+idempotent on all four, `openWorldHint` on geocode_address/dnr_well_record.
- Env: `MCP_OAUTH_ISSUER`, `MCP_OAUTH_AUDIENCE` (default = canonical `mcpResourceUrl()`), `MCP_OAUTH_JWKS_URL`. Operator WorkOS setup still pending (Dom) — tracked implicitly under OPEN #8's follow-ups.
