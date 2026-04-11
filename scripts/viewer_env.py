#!/usr/bin/env python3
"""
Require an explicit checkout of the DNR well viewer (separate repo).

This hub does not search disk for the viewer — set WELL_VIEWER_ROOT or DNR_VIEWER_ROOT.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_MARKERS = ("rebuild_viewer_data.py", "build_statewide_data.py")


def require_viewer_root() -> Path:
    raw = (os.environ.get("WELL_VIEWER_ROOT") or os.environ.get("DNR_VIEWER_ROOT") or "").strip()
    if not raw:
        print(
            "Set WELL_VIEWER_ROOT or DNR_VIEWER_ROOT to your DNR well viewer repository "
            "(directory containing rebuild_viewer_data.py).\n"
            "This project does not auto-detect the viewer path.\n"
            "For canonical JSONL only, you can use dnr_wells_full.csv.gz in this repo instead:\n"
            "  python3 scripts/build_canonical_jsonl.py --from-full",
            file=sys.stderr,
        )
        sys.exit(1)
    p = Path(raw).expanduser().resolve()
    if not p.is_dir():
        print(f"Viewer root is not a directory: {p}", file=sys.stderr)
        sys.exit(1)
    if not any((p / m).is_file() for m in _MARKERS):
        print(
            f"Not a DNR viewer checkout (missing rebuild_viewer_data.py / build_statewide_data.py): {p}",
            file=sys.stderr,
        )
        sys.exit(1)
    return p
