#!/usr/bin/env bash
# Kick off full statewide offline extract in background.
# NEVER writes into apps/hub/public/well-viewer (live data stays untouched).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-$REPO_ROOT/data/offline_statewide_extract/run_${STAMP}}"
mkdir -p "$OUT_DIR"
mkdir -p "$(dirname "$OUT_DIR")"

# Safety: refuse live public paths
case "$OUT_DIR" in
  *"/apps/hub/public/"*|*"/public/well-viewer/"*)
    echo "ERROR: out dir must not be under live public well-viewer: $OUT_DIR" >&2
    exit 2
    ;;
esac

PID_FILE="$OUT_DIR/extract.pid"
CONSOLE_LOG="$OUT_DIR/console.log"
CHUNKS_DIR="$REPO_ROOT/apps/hub/public/well-viewer"

echo "Starting statewide full extract"
echo "  chunks (read-only): $CHUNKS_DIR"
echo "  out (offline only): $OUT_DIR"
echo "  console:            $CONSOLE_LOG"

nohup python3 -u "$REPO_ROOT/scripts/lithology_classify_v3/statewide_full_extract.py" \
  --chunks-dir "$CHUNKS_DIR" \
  --out "$OUT_DIR" \
  --log-every 5000 \
  >"$CONSOLE_LOG" 2>&1 &

PID=$!
echo "$PID" >"$PID_FILE"
# pointer for convenience
echo "$OUT_DIR" >"$REPO_ROOT/data/offline_statewide_extract/LATEST_RUN.txt"
echo "$PID" >"$REPO_ROOT/data/offline_statewide_extract/LATEST_PID.txt"

echo "PID $PID"
echo "Monitor:  tail -f $OUT_DIR/extract.log"
echo "Or:       tail -f $CONSOLE_LOG"
echo "Stop:     kill \$(cat $PID_FILE)"
