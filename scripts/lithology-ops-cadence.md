# Lithology Ops Cadence

## Single-Writer Rule

- Use `scripts/resume-lithology-iterate-61pct.sh` for statewide iterate runs.
- The script now enforces a lock directory (`data/out/lithology-single-writer.lock`) and active PID guard.
- Do not start a second iterate run while the lock or active PID is present.

## Sync-Cycle Verification

- Run `bash scripts/etl-lithology-sync-cycle.sh` after each ETL sync window.
- The cycle emits `data/out/lithology-sync-cycle-<timestamp>.json` with:
  - hub chunk verification output (`verify-hub-well-chunks.py`)
  - viewer/hub artifact parity report (`verify-viewer-hub-artifacts.py`)
  - KPI snapshot output (`report-lithology-kpi.py`)

## Rollback

- If parity check fails, halt further publish/sync steps for that window.
- Keep the previous known-good `apps/hub/public/well-viewer` artifact set in place until the next clean cycle.
