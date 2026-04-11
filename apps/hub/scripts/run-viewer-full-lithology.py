#!/usr/bin/env python3
"""Run the DNR viewer's run_full_lithology_html_statewide.sh (separate repo)."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_hub_root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_hub_root / "scripts"))
from viewer_env import require_viewer_root  # noqa: E402


def main() -> int:
    viewer = require_viewer_root()
    sh = viewer / "run_full_lithology_html_statewide.sh"
    if not sh.is_file():
        print(f"Missing {sh}", file=sys.stderr)
        return 1
    env = os.environ.copy()
    env.setdefault("DNR_OUT_DIR", str(viewer))
    return subprocess.call(["bash", str(sh)], cwd=str(viewer), env=env)


if __name__ == "__main__":
    raise SystemExit(main())
