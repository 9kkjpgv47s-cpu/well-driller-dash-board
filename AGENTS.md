# Agent / Cursor notes — Driller Dashboard

## What this repository is

- **Next.js hub** (`apps/hub`): scheduling, job views, weather APIs, embedded **static** well viewer under `public/well-viewer/`.
- **Scripts** in `scripts/` for copying DNR build artifacts into the hub and optional JSONL export.

## Boundary with the DNR well viewer

- **Chunk generation and ArcGIS fetch** run in a **different repository** (your DNR static viewer / ETL checkout).
- **This repo does not search disk** for that checkout. Export:

  `WELL_VIEWER_ROOT` **or** `DNR_VIEWER_ROOT` = absolute path to the viewer repo (must contain `rebuild_viewer_data.py`).

- Shared helper: `scripts/viewer_env.py` → `require_viewer_root()`.
- **Full statewide export in this repo:** optional `dnr_wells_full.csv.gz` at repo root (like the viewer). Reader: `scripts/dnr_csv_input.py` (hub copy — do not import from the viewer checkout).

## Commands

| Goal | Where | Command |
|------|--------|--------|
| Canonical JSONL from **committed .gz** (no viewer path) | repo root | `python3 scripts/build_canonical_jsonl.py --from-full` |
| Hub dev | `apps/hub` | `npm install && npm run dev` |
| Run viewer rebuild (delegates to other repo) | `apps/hub` | `export WELL_VIEWER_ROOT=...` then `npm run rebuild:viewer-data` |
| Viewer HTML lithology backfill (long) | `apps/hub` | `export WELL_VIEWER_ROOT=...` then `npm run rebuild:viewer-data:html-full` |
| Copy built viewer into `public/well-viewer/` | repo root | `export WELL_VIEWER_ROOT=...` then `./scripts/sync-well-viewer-into-hub.sh` |
| Viewer fetch + statewide build | repo root | `export DNR_VIEWER_ROOT=...` then `./scripts/sync_dnr_data.sh` |
| Verify chunk columns | `apps/hub` | `npm run verify:chunks` |

## Key paths (inside this repo only)

- `docs/reference/drilling-page-rendered-snapshot.html` — saved render of `/drilling` (reference only; not served).
- `apps/hub/public/well-viewer/` — synced static assets + `dnr_wells_chunk_*.csv.gz`.
- `apps/hub/vendor/dnr-report-local/` — synced from the viewer’s `api/dnr-report.js`.
