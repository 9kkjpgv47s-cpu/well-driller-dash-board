# Progress ledger

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
