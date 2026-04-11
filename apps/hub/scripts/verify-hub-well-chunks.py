#!/usr/bin/env python3
"""Delegate to hub repo scripts/verify-hub-well-chunks.py (default dir = this app's public/well-viewer)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_REPO_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts" / "verify-hub-well-chunks.py"


def main() -> None:
    if not _REPO_SCRIPTS.is_file():
        print(f"Expected verifier at {_REPO_SCRIPTS}", file=sys.stderr)
        sys.exit(1)
    raise SystemExit(subprocess.call([sys.executable, str(_REPO_SCRIPTS), *sys.argv[1:]]))


if __name__ == "__main__":
    main()
