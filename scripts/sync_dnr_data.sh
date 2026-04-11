#!/usr/bin/env bash
# Run the DNR well viewer ETL in its own repository (no path guessing).
#
# Required: DNR_VIEWER_ROOT=/path/to/viewer/repo (contains fetch_dnr_wells.py)
#
# Run from this repo root: ./scripts/sync_dnr_data.sh
set -euo pipefail

if [[ -z "${DNR_VIEWER_ROOT:-}" ]]; then
  echo "Set DNR_VIEWER_ROOT to your DNR well viewer checkout (folder with fetch_dnr_wells.py)." >&2
  echo "This script does not search for the viewer." >&2
  exit 1
fi

VIEWER="$(cd "${DNR_VIEWER_ROOT}" && pwd)"
if [[ ! -f "${VIEWER}/fetch_dnr_wells.py" ]]; then
  echo "DNR_VIEWER_ROOT=${VIEWER} does not look like the viewer repo (missing fetch_dnr_wells.py)." >&2
  exit 1
fi

cd "$VIEWER"
echo "==> Fetching ArcGIS registry → dnr_wells_full.csv"
python3 fetch_dnr_wells.py
echo "==> Building statewide chunks (WellLogs + derived columns)"
python3 build_statewide_data.py
echo "==> Done. Chunks: $VIEWER/dnr_wells_chunk_*.csv.gz"
