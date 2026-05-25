# Driller Dashboard

Pre-departure hub for water-well drillers: location context, nearby well intelligence, and (later) community notes.

## Easiest hub path after `git clone` (no Homebrew, no Git LFS for DNR data)

1. Optional: `./setup.sh` — prints Python version and the two canonical-JSONL commands.
2. **DNR data in git:** **`dnr_wells_full.csv.gz`** at the **repo root** (~22 MB) and **`dnr_wells_chunk_*.csv.gz`** under **`apps/hub/public/well-viewer/`** (~20 MB total) are committed so a fresh clone can run the map and `build_canonical_jsonl.py --from-full` without copying files from the viewer. Plain **`dnr_wells_full.csv`** stays gitignored (over GitHub’s 100 MB cap); if both `.csv` and `.gz` exist locally, scripts prefer the `.csv`.
3. Build area-insights / canonical lines: `python3 scripts/build_canonical_jsonl.py --from-full` → `data/out/canonical_wells.jsonl.gz`.
4. Next app: `cd apps/hub && npm install && npm run dev` — **`/well-viewer`** loads chunks from the same origin. When you change **`index.html`**, **`api/dnr-report.js`**, or rebuild chunks in the standalone viewer, run `export WELL_VIEWER_ROOT=...` and **`./scripts/sync-well-viewer-into-hub.sh`** to refresh those pieces (then commit any updates).

## DNR well viewer (separate repository)

Static map + Python ETL for Indiana DNR chunks live in **another git checkout**. This hub **does not** locate it automatically.

1. Clone or keep your viewer repo anywhere on disk.
2. Export **`WELL_VIEWER_ROOT`** or **`DNR_VIEWER_ROOT`** to that directory’s **absolute path** whenever you sync or run delegated builds (see `AGENTS.md`).

Statewide lithology command lane (hub-canonical):

```bash
cd apps/hub
export WELL_VIEWER_ROOT="/absolute/path/to/dnr-viewer-repo"
npm run lithology:statewide -- --mode cycle --window-max 5000 --delay-sec 0.2
npm run verify:lithology-kpi
```

Optional: add to `apps/hub/.env.local` (gitignored):

```bash
WELL_VIEWER_ROOT=/absolute/path/to/your/dnr-viewer-repo
```

**Start here:** [`PROJECT_OUTLINE.md`](./PROJECT_OUTLINE.md) — product vision, architecture, data pipeline, and build milestones.

**Hub (MVP UI):** [`apps/hub/`](./apps/hub/) — `npm install && npm run dev` inside that folder. Chunks ship in **`public/well-viewer/`**; use [`scripts/sync-well-viewer-into-hub.sh`](./scripts/sync-well-viewer-into-hub.sh) when you need to pull a newer viewer build or regenerated chunks from the standalone repo (see [`apps/hub/README.md`](./apps/hub/README.md)).
