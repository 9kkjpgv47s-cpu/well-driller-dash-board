#!/usr/bin/env python3
"""Delegate to repo-level scripts/report-lithology-kpi.py."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_REPO_SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "report-lithology-kpi.py"


def main() -> None:
    if not _REPO_SCRIPT.is_file():
        print(f"Expected KPI script at {_REPO_SCRIPT}", file=sys.stderr)
        sys.exit(1)
    raise SystemExit(subprocess.call([sys.executable, str(_REPO_SCRIPT), *sys.argv[1:]]))


if __name__ == "__main__":
    main()
