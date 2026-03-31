#!/usr/bin/env bash
# Refresh Indiana DNR well data using the existing viewer ETL (ArcGIS + statewide build).
# Run from repo root: ./scripts/sync_dnr_data.sh
# Optional: DNR_VIEWER_ROOT=/path/to/DNR_Well_Viewer_Full_Demo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VIEWER="${DNR_VIEWER_ROOT:-$ROOT/../DNR_Well_Viewer_Full_Demo}"

if [[ ! -d "$VIEWER" ]]; then
  echo "DNR viewer not found at: $VIEWER" >&2
  echo "Clone or set DNR_VIEWER_ROOT to the folder containing fetch_dnr_wells.py" >&2
  exit 1
fi

cd "$VIEWER"
echo "==> Fetching ArcGIS registry → dnr_wells_full.csv"
python3 fetch_dnr_wells.py
echo "==> Building statewide chunks (WellLogs + derived columns)"
python3 build_statewide_data.py
echo "==> Done. Chunks: $VIEWER/dnr_wells_chunk_*.csv.gz"
