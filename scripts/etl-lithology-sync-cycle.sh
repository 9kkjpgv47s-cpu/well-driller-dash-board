#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${LITHOLOGY_CYCLE_REPORT_DIR:-$ROOT/data/out}"
OUT_JSON="$OUT_DIR/lithology-sync-cycle-$STAMP.json"
VIEWER_ROOT="${WELL_VIEWER_ROOT:-/Users/dominiceasterling/DNR_Well_Viewer_Full_Demo}"
HUB_DIR="${HUB_WELL_VIEWER_DIR:-$ROOT/apps/hub/public/well-viewer}"

mkdir -p "$OUT_DIR"

TMP_CHUNKS="$(mktemp)"
TMP_PARITY="$(mktemp)"
TMP_KPI="$(mktemp)"
trap 'rm -f "$TMP_CHUNKS" "$TMP_PARITY" "$TMP_KPI"' EXIT

python3 "$ROOT/scripts/verify-hub-well-chunks.py" --dir "$HUB_DIR" >"$TMP_CHUNKS"
python3 "$ROOT/scripts/verify-viewer-hub-artifacts.py" \
  --viewer-root "$VIEWER_ROOT" \
  --hub-dir "$HUB_DIR" >"$TMP_PARITY"
python3 "$ROOT/scripts/report-lithology-kpi.py" >"$TMP_KPI"

python3 - "$TMP_CHUNKS" "$TMP_PARITY" "$TMP_KPI" "$OUT_JSON" <<'PY'
import json
import pathlib
import sys
from datetime import datetime, timezone

chunks_path = pathlib.Path(sys.argv[1])
parity_path = pathlib.Path(sys.argv[2])
kpi_path = pathlib.Path(sys.argv[3])
out_path = pathlib.Path(sys.argv[4])

report = {
    "schema_version": 1,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "checks": {
        "hub_chunks_stdout": chunks_path.read_text(encoding="utf-8", errors="replace"),
        "viewer_hub_parity": json.loads(parity_path.read_text(encoding="utf-8")),
        "lithology_kpi_stdout": kpi_path.read_text(encoding="utf-8", errors="replace"),
    },
}
out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(out_path)
PY

echo "lithology-sync-cycle: wrote $OUT_JSON"
