# Statewide Lithology Execution Report

## Scope
- Plan: `statewide-lithology-90-percent`.
- Primary target: real parsed coverage (`lithology_source` in `csv|html`) >= 90%.
- Secondary target: parseable JSON interval coverage >= 100%.
- Canonical lane: `apps/hub` command wrappers with viewer ETL in `WELL_VIEWER_ROOT`.

## Command Lane Implemented
- `npm run lithology:statewide -- --mode cycle --window-max 5000 --delay-sec 0.2`
- `npm run verify:lithology-kpi`
- `npm run lithology:export-none`
- `npm run lithology:iterate-to-target -- --target-real-pct 90 --max-windows <N> --window-max <M> --delay-sec <S>`
- `npm run verify:viewer-hub-artifacts`

## Baseline KPI (pre-window)
- Source: `data/out/lithology-kpi-baseline.json`
- Wells: `414,953`
- Real parsed (`csv+html`): `21,476` (`5.176%`)
- Parseable JSON intervals: `414,953` (`100.000%`)
- Source counts:
  - `csv=21,476`
  - `html=0`
  - `none=393,477`
  - `other=0`

## None-Source Export (baseline)
- File: `data/out/lithology-none-wells-baseline.csv`
- Rows exported: `393,477`

## Window Run Log
- Window 1 started via canonical lane:
  - `WELL_VIEWER_ROOT=/Users/dominiceasterling/DNR_Well_Viewer_Full_Demo python3 scripts/run-statewide-lithology-plan.py --mode window --window-max 2000 --delay-sec 0.05 --json-out data/out/lithology-kpi-window-1.json`
- Window 1 completed (`exit_code=0`) with bounded fetch cap behavior:
  - `new_HTTP=500`
  - cache-backed uplift applied across prior entries
- Post-window KPI (`data/out/lithology-kpi-window-1.json`):
  - Wells: `414,953`
  - Real parsed (`csv+html`): `214,314` (`51.648%`)
  - Parseable JSON intervals: `414,953` (`100.000%`)
  - Source counts: `csv=21,476`, `html=192,838`, `none=200,639`
- Remaining none-source export after window 1:
  - `data/out/lithology-none-wells-window-1.csv` (`200,639` rows)
- Iterative automation launched:
  - `WELL_VIEWER_ROOT=/Users/dominiceasterling/DNR_Well_Viewer_Full_Demo python3 scripts/iterate-lithology-to-target.py --target-real-pct 90 --max-windows 20 --window-max 5000 --delay-sec 0 --report-dir data/out`
- Latest live checkpoint snapshot:
  - `data/out/lithology-kpi-window-2.json`
  - Real parsed (`csv+html`): `215,291` (`51.883%`)
  - Parseable JSON intervals: `414,953` (`100.000%`)
  - Remaining none-source export: `data/out/lithology-none-wells-window-2.csv` (`199,662` rows)
- Newest checkpoint snapshot:
  - `data/out/lithology-kpi-window-3.json`
  - Real parsed (`csv+html`): `219,105` (`52.802%`)
  - Parseable JSON intervals: `414,953` (`100.000%`)
  - Remaining none-source export: `data/out/lithology-none-wells-window-3.csv` (`195,848` rows)

## Artifact Duplication Verification
- Pending final run completion:
  - `npm run verify:viewer-hub-artifacts`
- Output target:
  - `data/out/viewer-hub-artifact-report.json`

## Final Signoff Criteria
- `real_parsed_pct >= 90.000`
- `parseable_json_pct == 100.000`
- Viewer/hub chunk artifact parity check passes (matching chunk names + hashes).
