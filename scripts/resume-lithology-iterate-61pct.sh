#!/usr/bin/env bash
# Resume the statewide HTML lithology iterate loop with the same parameters that
# produced ~61% real parsed (csv+html), without wiping cache.
#
# Progress is resumed via DNR_Well_Viewer_Full_Demo/dnr_html_litho_cache.json.
# Do NOT set DNR_HTML_LITHO_REFRESH=1 unless you intend to refetch from scratch.
#
# Usage:
#   bash scripts/resume-lithology-iterate-61pct.sh              # foreground
#   bash scripts/resume-lithology-iterate-61pct.sh --background  # nohup + log + pid file

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HUB_APP="$ROOT/apps/hub"
VIEWER="${WELL_VIEWER_ROOT:-/Users/dominiceasterling/DNR_Well_Viewer_Full_Demo}"
REPORT_DIR="$ROOT/data/out"
LOG="${LITHOLOGY_ITERATE_LOG:-$REPORT_DIR/lithology-iterate-resume-$(date +%Y%m%d-%H%M%S).log}"
LOCK_DIR="${LITHOLOGY_SINGLE_WRITER_LOCK_DIR:-$REPORT_DIR/lithology-single-writer.lock}"
PID_FILE="$REPORT_DIR/lithology-iterate.pid"

export WELL_VIEWER_ROOT="$VIEWER"
export DNR_VIEWER_ROOT="$VIEWER"
unset DNR_HTML_LITHO_REFRESH 2>/dev/null || true
export DNR_HTML_LITHO_PROGRESS="${DNR_HTML_LITHO_PROGRESS:-250}"

# Match the successful long run: 40× windows, 20k HTTP cap/window, zero delay.
# Default --no-early-exit: run every scheduled window so all wells are processed the same way,
# regardless of KPI% (each pass touches every row; some rows may stay `none` if DNR has no litho).
# Set LITHOLOGY_NO_EARLY_EXIT=0 to stop the loop as soon as --target-real-pct is reached.
START_WINDOW="${LITHOLOGY_START_WINDOW:-13}"
TARGET="${LITHOLOGY_TARGET_REAL_PCT:-90}"
MAXW="${LITHOLOGY_MAX_WINDOWS:-400}"
WINMAX="${LITHOLOGY_WINDOW_MAX:-20000}"
DELAY="${LITHOLOGY_DELAY_SEC:-0}"
NO_EARLY="${LITHOLOGY_NO_EARLY_EXIT:-1}"

CMD=(
  python3 scripts/iterate-lithology-to-target.py
  --target-real-pct "$TARGET"
  --start-window "$START_WINDOW"
  --max-windows "$MAXW"
  --window-max "$WINMAX"
  --delay-sec "$DELAY"
  --report-dir "$REPORT_DIR"
)
if [[ "$NO_EARLY" != "0" ]]; then
  CMD+=(--no-early-exit)
fi

acquire_lock() {
  mkdir -p "$REPORT_DIR"
  if [[ -f "$PID_FILE" ]]; then
    local existing_pid
    existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
      echo "Refusing to start: lithology iterate already running with PID $existing_pid."
      echo "If this is stale, stop it first or remove $PID_FILE after verification."
      exit 3
    fi
  fi
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "Refusing to start: single-writer lock exists at $LOCK_DIR."
    echo "Confirm no active run, then remove lock directory to continue."
    exit 4
  fi
  printf "%s\n" "$$" >"$LOCK_DIR/pid"
}

release_lock() {
  rm -rf "$LOCK_DIR"
}

run_fg() {
  acquire_lock
  trap release_lock EXIT
  cd "$HUB_APP"
  "${CMD[@]}"
}

run_bg() {
  acquire_lock
  cd "$HUB_APP"
  nohup bash -lc "trap 'rm -rf \"$LOCK_DIR\"' EXIT; ${CMD[*]}" >>"$LOG" 2>&1 &
  echo $! >"$PID_FILE"
  echo "Started lithology iterate (PID $(cat "$PID_FILE"))."
  echo "Log: $LOG"
  echo "Stop: kill \$(cat $PID_FILE)"
}

if [[ "${1:-}" == "--background" ]]; then
  run_bg
else
  run_fg
fi
