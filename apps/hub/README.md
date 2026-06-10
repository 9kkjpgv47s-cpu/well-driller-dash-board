# Driller Dashboard — hub (`apps/hub`)

Next.js 15 / React 19 / Tailwind v4 **mono-page field hub** for water-well drillers.

Everything lives on **`/`** (rendered by `src/components/drilling/DrillingHubClient.tsx`):

1. **Dispatch input** — paste a dispatch email; we heuristically extract title, contact, phone, schedule, rig path, address, and GPS coordinates. If only an address is found, a **Geocode address** button resolves it via `GET /api/geocode` (Nominatim, server-side).
2. **Map & views** — Leaflet map of nearby DNR registry wells (with viewport culling and a deterministic nearest-800 marker cap), plus **Depth** (thermometer) and **ASL** (stratigraphy) views over the same data.
3. **Weather** — job-scoped forecast panel (`/api/weather` blends Open-Meteo and US NWS; cached ~15 min server-side).
4. **Area drilling analysis** — registry-backed insights (aquifer mix, sand/gravel intervals, yield buckets, depth medians) computed once per radius and shared across the page.

Sections are reorderable; radius, view, and ordering persist in `localStorage`.

## Routes

| Route | Behavior |
| --- | --- |
| `/` | The app. Optional `?lat=&lon=` deep link sets the jobsite center; `?job=` loads a shared job link. |
| `/drilling`, `/driller-job`, `/optimization`, `/well-viewer` | **Redirect to `/`** (legacy bookmarks; `/well-viewer` forwards `?lat=&lon=`). |
| `/api/area-insights?lat=&lon=&radius=` | Server-computed `AreaInsightsReport` JSON for a point + radius (miles). |
| `/api/optimization?lat=&lon=&radiusMiles=` | Depth/yield optimization summary from the same server chunk cache. |
| `/api/geocode?q=` | Forward geocode (Indiana-biased Nominatim). |
| `/api/elevation` | POST DEM ground elevations for a list of locations. |
| `/api/weather`, `/api/radar` | Forecast + radar proxies for the weather panel. |
| `/api/dnr-report?refNo=` | Official DNR record HTML parsing for the well detail modal (`vendor/dnr-report-local`). |

There is no separate scheduling board, optimization page, or iframe well viewer anymore — those legacy components were removed; git history is the record.

## How well data loads

- **Source files:** `public/well-viewer/dnr_wells_chunk_*.csv.gz` (~10 gzipped CSV chunks, tracked in git so a fresh clone works offline).
- **Browser:** once a jobsite center is set, `src/lib/dnr-chunk-browser.ts` fetches all existing chunks **concurrently** and decompresses + parses them in a small **Web Worker pool** (`dnr-chunk-worker.ts`), reporting per-chunk progress to a determinate progress bar. Rows are cached per session (`dnr-wells-cache.ts`).
- **Server (API routes):** `dnr-chunk-server.ts` + `dnr-wells-server-cache.ts` load the same chunks from disk once per process.
- **Queries:** `src/lib/well-spatial-index.ts` buckets wells into a 0.05° grid; radius and map-viewport queries go through it instead of scanning all ~415k rows. Lithology JSON is parsed once per record (`WeakMap` cache in `area-well-analytics.ts`).

When chunks are regenerated in the standalone DNR viewer repo, sync them in:

```bash
export WELL_VIEWER_ROOT="/absolute/path/to/dnr-viewer-repo"
./scripts/sync-well-viewer-into-hub.sh   # run from the monorepo root
```

## Develop, test, build

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest (src/**/*.test.ts)
npm run build
```

## Scripts

Python tooling is canonical at the **monorepo root `scripts/`** tree; hub npm scripts call it directly:

```bash
npm run verify:chunks                 # summarize chunk columns/coverage
npm run verify:lithology-kpi          # lithology source KPI report
npm run verify:viewer-hub-artifacts   # viewer/hub artifact parity check
npm run lithology:export-none         # export unresolved none-source wells → ../../data/out/
```

Statewide lithology ETL lanes (need `WELL_VIEWER_ROOT` pointing at the viewer checkout) remain hub-local under `apps/hub/scripts/`:

```bash
npm run lithology:statewide -- --mode cycle --window-max 5000 --delay-sec 0.2
npm run lithology:iterate-to-target -- --target-real-pct 90 --max-windows 8
npm run rebuild:viewer-data
```

**Canonical well JSONL** (hub analytics / `data/out/`) can be built **without** the viewer checkout by placing `dnr_wells_full.csv.gz` at the monorepo root and running `python3 scripts/build_canonical_jsonl.py --from-full` (see root `README.md` and `data/README.md`).
