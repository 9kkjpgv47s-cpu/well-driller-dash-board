# Data directory

- **`out/`** — generated files (`canonical_wells.jsonl.gz`). Created by `scripts/build_canonical_jsonl.py`. Do not commit large binaries; folder is gitignored.

## Canonical JSONL — two supported inputs (no cross-repo file sharing required)

**A. Full export inside this hub repo** (same pattern as the viewer: gzip in git, plain CSV optional locally)

- Commit or copy **`dnr_wells_full.csv.gz`** at the **hub repository root** (or set **`HUB_DNR_DATA_DIR`** / **`DNR_FULL_CSV`**).
- Run: `python3 scripts/build_canonical_jsonl.py --from-full`
- Resolution uses `scripts/dnr_csv_input.py`: if both `dnr_wells_full.csv` and `.csv.gz` exist, **plain `.csv` wins** (e.g. after `fetch_dnr_wells.py` in the viewer repo, then copied here).

**B. Viewer chunks** (separate checkout)

1. In the **DNR viewer** repo: run `build_statewide_data.py`, etc., to produce `dnr_wells_chunk_*.csv.gz`.
2. In **this** repo: set **`WELL_VIEWER_ROOT`** or **`DNR_VIEWER_ROOT`** to that checkout, then run `python3 scripts/build_canonical_jsonl.py` (no `--from-full`).

Optional env vars for the viewer-side build are documented in that repo’s `build_statewide_data.py`.

## Well map inside the Next app

Chunks for **`/well-viewer`** are committed under **`apps/hub/public/well-viewer/`** (`dnr_wells_chunk_*.csv.gz`). Run **`./scripts/sync-well-viewer-into-hub.sh`** when you want to refresh **`index.html`**, **`api/dnr-report.js` → vendor**, **`litho_parts/`**, or rebuilt chunks from the standalone viewer. That path is independent of whether canonical JSONL was built from `--from-full` or chunks.
