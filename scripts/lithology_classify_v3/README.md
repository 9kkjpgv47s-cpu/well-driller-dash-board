# Lithology classify v3 — offline dual-label reprocess

Long-running offline job that walks every DNR well (chunks or full CSV), labels
**each lithology layer**, derives rock top vs unconsolidated well type, and
writes **audit logs + sidecars only**. Original chunk CSVs are never modified
unless you pass an explicit future write flag (not implemented by default).

## Why this exists

Hub dual-label (`formation-class.ts` / `dnr-well-classify.ts`) classifies at
runtime. This script does the same policy offline for:

- Full statewide audit logs (every layer rule id)
- Sidecar for map/analytics without re-parsing every request
- Diff reports vs v1 exclusive estimated behavior
- Multi-day runs (HTML lithology fetch is separate; this is CSV/chunk based)

## Accuracy / revert

- Does **not** rewrite `dnr_wells_chunk_*.csv.gz` or `dnr_wells_full.csv.gz`
- Outputs under `out/` only — delete `out/` to drop v3 artifacts
- Hub reverts via `NEXT_PUBLIC_DNR_CLASSIFY_VERSION=v1` (see `docs/DNR_CLASSIFY_REVERT.md`)
- Lithology v2 folder remains independent: `apps/hub/public/well-viewer/lithology_v2/`

## Run (sample first)

```bash
# From repo root — process one chunk, write layer + well logs
python3 scripts/lithology_classify_v3/reprocess_dual_label.py \
  --chunks-dir apps/hub/public/well-viewer \
  --chunk-index 0 \
  --out scripts/lithology_classify_v3/out \
  --log-every 5000
```

## Full statewide (days OK)

```bash
python3 scripts/lithology_classify_v3/reprocess_dual_label.py \
  --chunks-dir apps/hub/public/well-viewer \
  --all-chunks \
  --out scripts/lithology_classify_v3/out \
  --log-every 2000 \
  --write-layer-detail
```

Optional full CSV:

```bash
python3 scripts/lithology_classify_v3/reprocess_dual_label.py \
  --full-csv dnr_wells_full.csv.gz \
  --out scripts/lithology_classify_v3/out
```

## Outputs

| File | Purpose |
|------|---------|
| `out/well_dual_label.jsonl.gz` | Per-well: location_quality, formation_class, rock_top_ft, uncon_ft, confidence, reasons |
| `out/layer_labels.jsonl.gz` | Per-layer labels (optional `--write-layer-detail`) |
| `out/summary.json` | Counts: estimated×formation matrix, rule hits, unknowns |
| `out/reprocess.log` | Progress + errors |

## Policy notes

- **Rock top ≠ rock well** — thick water-bearing S&G above rock stays unconsolidated
- **Estimated location** stays green in the hub; this sidecar still stores formation
- Prefer `unknown` over guessing when lithology empty and aquifer is blank/estimated only
