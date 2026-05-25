#!/usr/bin/env python3
"""Canonical hub lane for statewide lithology execution windows."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

_hub_root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_hub_root / "scripts"))
from viewer_env import require_viewer_root  # noqa: E402


def run_command(command: list[str], cwd: Path, env: dict[str, str]) -> int:
    print(f"[run] cwd={cwd} :: {' '.join(command)}")
    return subprocess.call(command, cwd=str(cwd), env=env)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Run canonical statewide lithology steps from the hub repo. "
            "Supports resumable HTML backfill windows and KPI snapshot output."
        )
    )
    parser.add_argument(
        "--mode",
        choices=("baseline", "window", "cycle"),
        default="cycle",
        help=(
            "baseline: rebuild only; "
            "window: HTML backfill window + KPI; "
            "cycle: baseline + window + verify + sync + KPI."
        ),
    )
    parser.add_argument(
        "--window-max",
        type=int,
        default=None,
        help="Set DNR_HTML_LITHO_MAX for this run window (omit for existing env/default behavior).",
    )
    parser.add_argument(
        "--delay-sec",
        type=float,
        default=None,
        help="Set DNR_HTML_LITHO_DELAY for this run window (omit to keep existing env/default).",
    )
    parser.add_argument(
        "--json-out",
        default=None,
        help="Write KPI snapshot JSON to this file path.",
    )
    parser.add_argument(
        "--skip-sync",
        action="store_true",
        help="Skip copy into apps/hub/public/well-viewer after build window.",
    )
    args = parser.parse_args()

    viewer = require_viewer_root()
    env = os.environ.copy()
    env.setdefault("WELL_VIEWER_ROOT", str(viewer))
    env.setdefault("DNR_VIEWER_ROOT", str(viewer))

    app_hub = _hub_root / "apps" / "hub"
    baseline_cmd = [sys.executable, "scripts/rebuild-viewer-data.py"]
    window_cmd = [sys.executable, "scripts/run-viewer-full-lithology.py"]
    verify_cmd = [sys.executable, "../../scripts/verify-hub-well-chunks.py"]
    kpi_cmd = [sys.executable, "scripts/report-lithology-kpi.py"]
    if args.json_out:
        kpi_cmd.extend(["--json-out", args.json_out])
    sync_cmd = ["bash", str(_hub_root / "scripts" / "sync-well-viewer-into-hub.sh")]

    status: dict[str, str | int] = {
        "mode": args.mode,
        "viewer_root": str(viewer),
        "started_at": dt.datetime.now().isoformat(timespec="seconds"),
    }

    if args.mode in ("baseline", "cycle"):
        code = run_command(baseline_cmd, app_hub, env)
        status["baseline_exit"] = code
        if code != 0:
            print("[error] baseline rebuild failed", file=sys.stderr)
            print(json.dumps(status, indent=2))
            return code

    if args.mode in ("window", "cycle"):
        env["RUN_HTML_BACKFILL"] = "1"
        env["DNR_FILL_LITHO_HTML"] = "1"
        if args.window_max is not None:
            env["DNR_HTML_LITHO_MAX"] = str(max(args.window_max, 0))
            env.pop("DNR_HTML_LITHO_UNLIMITED", None)
        if args.delay_sec is not None:
            env["DNR_HTML_LITHO_DELAY"] = str(max(args.delay_sec, 0.0))
        code = run_command(window_cmd, app_hub, env)
        status["window_exit"] = code
        status["window_max"] = env.get("DNR_HTML_LITHO_MAX", "default")
        status["window_delay_sec"] = env.get("DNR_HTML_LITHO_DELAY", "default")
        if code != 0:
            print("[error] backfill window failed", file=sys.stderr)
            print(json.dumps(status, indent=2))
            return code

    if args.mode in ("window", "cycle"):
        code = run_command(verify_cmd, app_hub, env)
        status["verify_exit"] = code
        if code != 0:
            print("[error] chunk verification failed", file=sys.stderr)
            print(json.dumps(status, indent=2))
            return code

        if not args.skip_sync:
            code = run_command(sync_cmd, _hub_root, env)
            status["sync_exit"] = code
            if code != 0:
                print("[error] sync into hub failed", file=sys.stderr)
                print(json.dumps(status, indent=2))
                return code

    code = run_command(kpi_cmd, app_hub, env)
    status["kpi_exit"] = code
    status["finished_at"] = dt.datetime.now().isoformat(timespec="seconds")
    print(json.dumps(status, indent=2))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
