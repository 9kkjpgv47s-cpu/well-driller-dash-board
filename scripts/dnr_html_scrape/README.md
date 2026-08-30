# DNR HTML full-field scrape

Fills fields that are **empty in live chunks** by parsing each Indiana DNR
well detail page:

| Chunk column | DNR HTML label | Notes |
|--------------|----------------|-------|
| `drill_rig_type` | **Drilling method** | Cable Tool, Rotary, … |
| `pump_type` | **Pump type** | Often blank even on HTML |
| `test_method` | **Type of test** | Pumping, Bailer, … |
| `casing_*` | Casing Length/Material/Diameter | Usually already in CSV |
| `pump_rate` / `bailer_rate` | Test rate / BailTest rate | Usually already in CSV |
| extras | drawdown, hours, driller, date, screen slot, … | Sidecar only |

## Status vs prior work

- **Not done before this script.** Statewide extract showed `has_drill_rig_type: 0`.
- Existing `/api/dnr-report` only extracts lithology + test/bail GPM + static water.
- This pipeline is **offline sidecar only** — never rewrites `dnr_wells_chunk_*.csv.gz`.

## Pilot

```bash
cd ~/Projects/well-driller-dash-board
python3 scripts/dnr_html_scrape/scrape_statewide.py \
  --sample 100 --limit 100 \
  --out data/dnr_html_scrape/pilot \
  --sleep 0.25 --no-gzip
```

## Statewide (resume-safe)

```bash
python3 scripts/dnr_html_scrape/scrape_statewide.py \
  --all --only-empty-target-fields \
  --out data/dnr_html_scrape/full \
  --sleep 0.3 --workers 2
```

Re-run the same command to resume; completed refnos in `records.jsonl.gz` are skipped.

## Outputs

| File | Purpose |
|------|---------|
| `records.jsonl.gz` | One JSON object per refno |
| `summary.json` | Field fill rates + top values |
| `scrape.log` | Progress |

## Merge into hub (later, explicit)

Do **not** auto-merge into live chunks. A separate merge step can backfill empty
`drill_rig_type` / `pump_type` / `test_method` cells after Dom reviews pilot rates.
