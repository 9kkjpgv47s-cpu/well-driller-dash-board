#!/usr/bin/env python3
"""Delegate to the DNR well viewer's rebuild_viewer_data.py (separate repo)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_hub_root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_hub_root / "scripts"))
from viewer_env import require_viewer_root  # noqa: E402


def main() -> None:
    viewer = require_viewer_root()
    rebuild = viewer / "rebuild_viewer_data.py"
    if not rebuild.is_file():
        print(f"Missing {rebuild}", file=sys.stderr)
        sys.exit(1)
    raise SystemExit(subprocess.call([sys.executable, str(rebuild), *sys.argv[1:]]))


if __name__ == "__main__":
    main()
