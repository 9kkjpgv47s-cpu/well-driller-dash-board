#!/usr/bin/env python3
"""Summarize dnr_wells_chunk_*.csv.gz under the hub public folder (area insights columns)."""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import os
import re
import sys
import glob
from pathlib import Path


def default_well_viewer_dir() -> str:
    """Resolve chunk folder: env override, then repo layout from this script, then cwd (e.g. apps/hub)."""
    env = os.environ.get("HUB_WELL_VIEWER_DIR", "").strip()
    if env:
        return os.path.abspath(env)
    here = Path(__file__).resolve()
    # hub repo: scripts/this.py → …/apps/hub/public/well-viewer
    from_script = here.parent.parent / "apps" / "hub" / "public" / "well-viewer"
    if from_script.is_dir():
        return str(from_script)
    # Run as: cd apps/hub && python3 ../../scripts/verify-hub-well-chunks.py
    from_cwd = Path.cwd() / "public" / "well-viewer"
    if from_cwd.is_dir():
        return str(from_cwd.resolve())
    return str(from_script)


def main() -> None:
    p = argparse.ArgumentParser(
        description="Verify DNR chunk columns under the Next.js hub static well-viewer folder.",
        epilog=(
            "Examples (from hub repo root):\n"
            "  python3 scripts/verify-hub-well-chunks.py\n"
            "From apps/hub (no local scripts/ copy required):\n"
            "  python3 ../../scripts/verify-hub-well-chunks.py\n"
            "  npm run verify:chunks\n"
            "Do not put shell comments on the same line as cd (use a new line for # comments)."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--dir",
        default=None,
        help="Folder containing dnr_wells_chunk_*.csv.gz (default: auto-detect)",
    )
    args = p.parse_args()
    base = os.path.abspath(args.dir or default_well_viewer_dir())
    paths = sorted(glob.glob(os.path.join(base, "dnr_wells_chunk_*.csv.gz")))
    if not paths:
        print(f"No chunks under {base}")
        print(
            "Hint: run from monorepo root  python3 scripts/verify-hub-well-chunks.py\n"
            "  or from apps/hub  python3 ../../scripts/verify-hub-well-chunks.py  |  npm run verify:chunks"
        )
        raise SystemExit(1)

    n = 0
    has_lith_json = 0
    has_lith_intervals = 0
    has_vein = 0
    has_rock = 0
    has_gravel_thick = 0
    has_pump = 0
    has_aquifer_col = False
    aq_nonempty = 0
    expected = {
        "aquifer",
        "lithology_json",
        "vein_size_ft",
        "rock_start_ft",
        "gravel_thickness_ft",
        "depth_bedrock",
        "pump_rate",
        "lat",
        "lon",
    }

    for path in paths:
        with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
            r = csv.DictReader(f)
            keys = {c.lower().strip().lstrip("\ufeff") for c in (r.fieldnames or [])}
            if keys & {"aquifer", "primary_aquifer", "water_bearing_formation"}:
                has_aquifer_col = True
            missing = expected - keys
            if missing:
                print(f"WARN {os.path.basename(path)} missing columns: {sorted(missing)}")
            for row in r:
                n += 1

                def g(*names: str) -> str:
                    for name in names:
                        v = row.get(name, "")
                        if v is None:
                            continue
                        s = str(v).strip()
                        if s:
                            return s
                    return ""

                lj = g("lithology_json")
                if lj and lj not in ("{}", "[]", "null", '""'):
                    has_lith_json += 1
                    try:
                        j = json.loads(lj)
                        if isinstance(j, str):
                            j = json.loads(j.strip())
                        arr = j if isinstance(j, list) else None
                        if arr is None and isinstance(j, dict):
                            for k in (
                                "layers",
                                "intervals",
                                "data",
                                "well_log",
                                "Lithology",
                            ):
                                v = j.get(k)
                                if isinstance(v, list):
                                    arr = v
                                    break
                        if arr and len(arr) > 0:
                            has_lith_intervals += 1
                    except (json.JSONDecodeError, TypeError):
                        pass

                v = g("vein_size_ft")
                if v and v not in ("0", "0.0"):
                    try:
                        if float(v.replace(",", "")) > 0:
                            has_vein += 1
                    except ValueError:
                        has_vein += 1

                rock = False
                for k in ("rock_start_ft", "depth_bedrock"):
                    v = g(k)
                    if v and v not in ("0", "0.0"):
                        try:
                            if float(v.replace(",", "")) > 0:
                                rock = True
                                break
                        except ValueError:
                            rock = True
                            break
                if rock:
                    has_rock += 1

                vg = g("gravel_thickness_ft")
                if vg and vg not in ("0", "0.0"):
                    try:
                        if float(vg.replace(",", "")) > 0:
                            has_gravel_thick += 1
                    except ValueError:
                        has_gravel_thick += 1

                pr = g("pump_rate", "gpm")
                if pr and re.search(r"\d", pr):
                    has_pump += 1

                if g("aquifer"):
                    aq_nonempty += 1

    pct = lambda x: (100.0 * x / n) if n else 0.0
    print(f"Directory: {base}")
    print(f"Chunks: {len(paths)}  Rows: {n}")
    print(f"Non-trivial lithology_json: {has_lith_json} ({pct(has_lith_json):.1f}%)")
    print(f"JSON with ≥1 interval/layer: {has_lith_intervals} ({pct(has_lith_intervals):.1f}%)")
    if n and has_lith_intervals == n:
        print("  Lithology interval coverage: 100% of rows (build_statewide_data.py guarantee pass).")
    elif n:
        print(
            f"  WARN: {n - has_lith_intervals:,} rows lack parseable intervals — "
            "rebuild with current build_statewide_data.py (do not set DNR_SKIP_LITHO_100_GUARANTEE).",
            file=sys.stderr,
        )
    print(f"vein_size_ft > 0: {has_vein} ({pct(has_vein):.1f}%)")
    print(f"rock_start_ft or depth_bedrock > 0: {has_rock} ({pct(has_rock):.1f}%)")
    print(f"gravel_thickness_ft > 0: {has_gravel_thick} ({pct(has_gravel_thick):.1f}%)")
    print(f"pump_rate (has digit): {has_pump} ({pct(has_pump):.1f}%)")
    print(f"Registry aquifer column present: {has_aquifer_col}")
    if not has_aquifer_col:
        print(
            "  Note: Chunk header should include `aquifer` after rebuild (build_statewide_data.py). "
            "Values are pass-through from your CSV if present, else inferred from lithology + "
            "vein/rock (ArcGIS statewide layer has no aquifer-type text field)."
        )
    else:
        print(f"  Rows with non-empty aquifer: {aq_nonempty} ({pct(aq_nonempty):.1f}%)")


if __name__ == "__main__":
    main()
