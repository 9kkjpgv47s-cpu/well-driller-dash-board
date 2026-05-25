#!/usr/bin/env bash
# Copy the standalone DNR well viewer into the Next.js hub public folder.
# All runtime assets under apps/hub/public/well-viewer/ are duplicated here —
# no symlinks, no runtime imports from WELL_VIEWER_ROOT after sync.
#
# Usage:
#   export WELL_VIEWER_ROOT="/absolute/path/to/dnr-viewer-repo"
#   ./scripts/sync-well-viewer-into-hub.sh
set -euo pipefail
ROOT="${WELL_VIEWER_ROOT:-}"
if [[ -z "$ROOT" || ! -f "$ROOT/index.html" ]]; then
  echo "Set WELL_VIEWER_ROOT to your well viewer folder (contains index.html)." >&2
  echo "Example: export WELL_VIEWER_ROOT=\"/absolute/path/to/dnr-viewer-repo\"" >&2
  exit 1
fi

need() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Missing required file in viewer repo (duplicate into hub): $f" >&2
    exit 1
  fi
}

need "$ROOT/leaflet.js"
need "$ROOT/leaflet.css"
need "$ROOT/markercluster.js"
need "$ROOT/markercluster.css"
need "$ROOT/markercluster-default.css"
need "$ROOT/api/dnr-report.js"

HUB_DIR="$(cd "$(dirname "$0")/../apps/hub" && pwd)"
DEST="$HUB_DIR/public/well-viewer"
VENDOR_DNR="$HUB_DIR/vendor/dnr-report-local/index.cjs"
PAPA_VER="5.4.1"
PAPA_URL="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/${PAPA_VER}/papaparse.min.js"

mkdir -p "$DEST/vendor" "$DEST/api" "$(dirname "$VENDOR_DNR")"

# --- Vendored map + CSV libs (copies only; hub serves from /well-viewer/vendor/) ---
cp "$ROOT/leaflet.js" "$DEST/vendor/leaflet.js"
cp "$ROOT/leaflet.css" "$DEST/vendor/leaflet.css"
cp "$ROOT/markercluster.js" "$DEST/vendor/leaflet.markercluster.js"
cp "$ROOT/markercluster.css" "$DEST/vendor/MarkerCluster.css"
cp "$ROOT/markercluster-default.css" "$DEST/vendor/MarkerCluster.Default.css"
curl -fsSL "$PAPA_URL" -o "$DEST/vendor/papaparse.min.js"

# --- Viewer HTML + static chrome ---
cp "$ROOT/index.html" "$DEST/"
[[ -f "$ROOT/icon.png" ]] && cp "$ROOT/icon.png" "$DEST/"
[[ -f "$ROOT/manifest.json" ]] && cp "$ROOT/manifest.json" "$DEST/"

# After copying index, strip CDN URLs so the hub bundle is self-contained (viewer may still use unpkg).
IDX="$DEST/index.html"
if grep -q 'unpkg.com/leaflet' "$IDX" || grep -q 'cdnjs.cloudflare.com/ajax/libs/PapaParse' "$IDX"; then
  sed \
    -e 's#https://unpkg.com/leaflet@[^/]*/dist/leaflet.js#vendor/leaflet.js#g' \
    -e 's#https://unpkg.com/leaflet@[^/]*/dist/leaflet.css#vendor/leaflet.css#g' \
    -e 's#https://unpkg.com/leaflet.markercluster@[^/]*/dist/MarkerCluster.css#vendor/MarkerCluster.css#g' \
    -e 's#https://unpkg.com/leaflet.markercluster@[^/]*/dist/MarkerCluster.Default.css#vendor/MarkerCluster.Default.css#g' \
    -e 's#https://unpkg.com/leaflet.markercluster@[^/]*/dist/leaflet.markercluster.js#vendor/leaflet.markercluster.js#g' \
    -e "s#https://cdnjs.cloudflare.com/ajax/libs/PapaParse/${PAPA_VER}/papaparse.min.js#vendor/papaparse.min.js#g" \
    "$IDX" > "${IDX}.tmp" && mv "${IDX}.tmp" "$IDX"
fi

# Duplicate DNR report handler: Next API package + static copy under well-viewer (same bytes).
cp "$ROOT/api/dnr-report.js" "$VENDOR_DNR"
cp "$ROOT/api/dnr-report.js" "$DEST/api/dnr-report.js"
if grep -q '^export default handler' "$VENDOR_DNR"; then
  grep -v '^export default handler' "$VENDOR_DNR" > "$VENDOR_DNR.tmp"
  mv "$VENDOR_DNR.tmp" "$VENDOR_DNR"
fi

shopt -s nullglob
for f in "$ROOT"/dnr_wells_chunk_*.csv.gz "$ROOT"/dnr-chunks/dnr_wells_chunk_*.csv.gz "$ROOT"/public/dnr_wells_chunk_*.csv.gz; do
  [[ -e "$f" ]] || continue
  cp "$f" "$DEST/"
done
[[ -d "$ROOT/litho_parts" ]] && rm -rf "$DEST/litho_parts" && cp -R "$ROOT/litho_parts" "$DEST/"
# V2 lithology sidecar + loader (optional overlay; original lithology unchanged)
if [[ -d "$ROOT/lithology_v2" ]]; then
  rm -rf "$DEST/lithology_v2"
  cp -R "$ROOT/lithology_v2" "$DEST/"
fi

echo "Synced viewer → $DEST (vendor libs + api duplicate + index)"
echo "Updated DNR report handler → $VENDOR_DNR"
echo "Static duplicate → $DEST/api/dnr-report.js"
