#!/usr/bin/env sh
# Optional sanity check after clone. No Homebrew, no Git LFS, no manual gzip
# required for the statewide export when you use dnr_wells_full.csv.gz.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Driller hub — DNR full export can live in this repo as dnr_wells_full.csv.gz"
echo "(same pattern as the standalone viewer repo; plain .csv is gitignored if large)."
echo ""
python3 -V
echo ""
echo "Canonical JSONL from full export (no viewer checkout):"
echo "  python3 scripts/build_canonical_jsonl.py --from-full"
echo ""
echo "Canonical JSONL from viewer chunks (requires WELL_VIEWER_ROOT):"
echo "  export WELL_VIEWER_ROOT=/absolute/path/to/viewer && python3 scripts/build_canonical_jsonl.py"
