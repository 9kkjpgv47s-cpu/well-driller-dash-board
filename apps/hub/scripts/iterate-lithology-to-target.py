#!/usr/bin/env python3
"""
Run multiple statewide lithology windows (each is a full pass over every well row).

Stopping rules:
- Default: exit early when KPI real_parsed_pct reaches --target-real-pct (often 90).
- With --no-early-exit: always run --max-windows iterations regardless of KPI, so every
  scheduled window applies the same pipeline to all wells (caps/cache permitting). That is
  "100% processed" in the operational sense; it does not guarantee lithology_source html/csv
  for every well if DNR has no data—those wells are still visited each pass.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[3]


def run(command: list[str], env: dict[str, str]) -> int:
    print(f"[loop] {' '.join(command)}")
    return subprocess.call(command, cwd=str(SCRIPT_DIR.parent), env=env)


def load_kpi(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Repeat `lithology:statewide` window mode. Each window rebuilds statewide data "
            "(every well). Use --no-early-exit to run all windows and fully process the dataset "
            "under the same rules, independent of KPI percentage."
        )
    )
    parser.add_argument(
        "--target-real-pct",
        type=float,
        default=90.0,
        help=(
            "Early-exit threshold for real_parsed_pct (csv+html KPI) when --no-early-exit is not set. "
            "Ignored for stopping once --no-early-exit is enabled (loop length is only --max-windows)."
        ),
    )
    parser.add_argument(
        "--start-window",
        type=int,
        default=1,
        help=(
            "First window index for KPI filenames (default 1). "
            "Use after an interruption to avoid overwriting earlier lithology-kpi-window-*.json "
            "snapshots; pipeline resume still comes from dnr_html_litho_cache.json in WELL_VIEWER_ROOT."
        ),
    )
    parser.add_argument("--max-windows", type=int, default=10)
    parser.add_argument("--window-max", type=int, default=2000)
    parser.add_argument("--delay-sec", type=float, default=0.05)
    parser.add_argument("--report-dir", default=None)
    parser.add_argument(
        "--no-early-exit",
        action="store_true",
        help=(
            "Always run exactly --max-windows iterations: do not stop when KPI crosses "
            "--target-real-pct. Every window runs a full statewide build—every row is processed "
            "the same way each time (subject to DNR_HTML_LITHO_MAX per window). Use this when "
            "the goal is complete scheduled coverage, not a KPI percentage stop."
        ),
    )
    args = parser.parse_args()

    report_dir = Path(args.report_dir or (REPO_ROOT / "data" / "out")).resolve()
    report_dir.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()

    start = max(1, int(args.start_window))
    last_real_pct = 0.0
    for idx in range(start, start + args.max_windows):
        json_out = report_dir / f"lithology-kpi-window-{idx:02d}.json"
        cmd = [
            sys.executable,
            "scripts/run-statewide-lithology-plan.py",
            "--mode",
            "window",
            "--window-max",
            str(args.window_max),
            "--delay-sec",
            str(args.delay_sec),
            "--json-out",
            str(json_out),
        ]
        rc = run(cmd, env)
        if rc != 0:
            print(f"[loop] window {idx} failed with exit {rc}")
            return rc
        kpi = load_kpi(json_out)
        real_pct = float(kpi.get("real_parsed_pct", 0.0))
        last_real_pct = real_pct
        print(f"[loop] window {idx}: real_parsed_pct={real_pct:.3f}%")
        if not args.no_early_exit and real_pct >= args.target_real_pct:
            print(f"[loop] target reached ({real_pct:.3f}% >= {args.target_real_pct:.3f}%)")
            return 0

    if args.no_early_exit:
        print(
            f"[loop] completed {args.max_windows} window(s) ({start}..{start + args.max_windows - 1}); "
            f"latest real_parsed_pct={last_real_pct:.3f}% (no early exit)"
        )
        return 0

    print(
        f"[loop] target not reached after {args.max_windows} window(s) "
        f"({start}..{start + args.max_windows - 1}); "
        f"latest below {args.target_real_pct:.3f}%"
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
