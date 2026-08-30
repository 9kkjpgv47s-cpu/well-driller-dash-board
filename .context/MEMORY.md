# Memory — agent working notes

## 2026-07-28

- Monorepo-style layout: `apps/hub` Next app + root `scripts/` Python ETL helpers + `data/`.
- Viewer is separate checkout; env `WELL_VIEWER_ROOT` / `DNR_VIEWER_ROOT`.
- ~415k Indiana wells in chunk pipeline (report figures).
- Key hub components under `apps/hub/src/components/drilling/` and libs under `src/lib/`.
- Always re-read AGENTS.md for command table before running rebuild/sync.
