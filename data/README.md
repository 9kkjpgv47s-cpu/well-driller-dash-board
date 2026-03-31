# Data directory

- **`out/`** — generated files (`canonical_wells.jsonl.gz`). Created by `scripts/build_canonical_jsonl.py`. Do not commit large binaries; folder is gitignored.

## Pipeline (best route)

1. **Upstream ETL stays in** `../DNR_Well_Viewer_Full_Demo` (or set `DNR_VIEWER_ROOT`):

   - `python3 fetch_dnr_wells.py` — ArcGIS → `dnr_wells_full.csv`
   - `python3 build_statewide_data.py` — merges WellLogs (+ optional HTML litho, pump CSV) → `dnr_wells_chunk_*.csv.gz`

2. **This repo:** run `scripts/sync_dnr_data.sh` from `Driller_Dashboard` to refresh upstream outputs, then `scripts/build_canonical_jsonl.py` to produce `data/out/canonical_wells.jsonl.gz`.

Optional env vars for the DNR build are documented in `build_statewide_data.py` (county filter, chunk size, HTML backfill caps).
