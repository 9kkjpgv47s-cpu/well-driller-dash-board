#!/usr/bin/env python3
"""
Run the standalone DNR well viewer (run_viewer.py in that repo) from the hub folder.

Requires WELL_VIEWER_ROOT or DNR_VIEWER_ROOT (same as other hub viewer scripts), e.g.:

  export WELL_VIEWER_ROOT="$HOME/DNR_Well_Viewer_Full_Demo"
  python3 run_viewer.py --full

Or one line:

  WELL_VIEWER_ROOT="$HOME/DNR_Well_Viewer_Full_Demo" python3 run_viewer.py
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "scripts"))
from viewer_env import require_viewer_root  # noqa: E402


def main() -> int:
    viewer = require_viewer_root()
    script = viewer / "run_viewer.py"
    if not script.is_file():
        print(f"Missing {script} — pull latest DNR_Well_Viewer_Full_Demo.", file=sys.stderr)
        return 1
    os.chdir(viewer)
    return subprocess.call([sys.executable, str(script), *sys.argv[1:]])


if __name__ == "__main__":
    raise SystemExit(main())
