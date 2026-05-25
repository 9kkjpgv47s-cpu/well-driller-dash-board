#!/usr/bin/env python3
"""Run statewide HTML lithology backfill in the external DNR viewer checkout."""
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
    env = os.environ.copy()
    env.setdefault("DNR_OUT_DIR", str(viewer))
    # Canonical backfill intent: one run window with HTML lithology enabled.
    env.setdefault("RUN_HTML_BACKFILL", "1")
    env.setdefault("DNR_FILL_LITHO_HTML", "1")

    legacy = viewer / "run_full_lithology_html_statewide.sh"
    if legacy.is_file():
        print(f"[lithology] using legacy statewide script: {legacy}")
        return subprocess.call(["bash", str(legacy)], cwd=str(viewer), env=env)

    local = viewer / "run_dnr_pipeline_local.sh"
    if local.is_file():
        print(f"[lithology] using resumable local pipeline: {local}")
        return subprocess.call(["bash", str(local)], cwd=str(viewer), env=env)

    print(
        "Missing expected viewer scripts: run_full_lithology_html_statewide.sh "
        "or run_dnr_pipeline_local.sh",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
