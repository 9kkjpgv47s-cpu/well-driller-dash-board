#!/usr/bin/env python3
"""
Precompute area insight summary grid for fast server-side responses.

Scans all DNR well chunks and produces a 0.1° grid of precomputed summary
stats (median depth, GPM distribution, aquifer breakdown, gravel/vein rates).
The server can return the precomputed summary for the grid cell containing
the jobsite in <10ms instead of scanning 415k wells.

Output: apps/hub/public/well-viewer/area_grid.json.gz

Usage:
    python3 scripts/precompute_area_grid.py [--viewer-dir PATH]
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import os
import sys
from collections import defaultdict
from pathlib import Path

GRID_CELL_DEG = 0.1
MILES_PER_DEG_LAT = 69.0


def find_chunk_dir(viewer_dir: str | None) -> Path:
    repo = Path(__file__).resolve().parent.parent
    return Path(viewer_dir) if viewer_dir else repo / "apps" / "hub" / "public" / "well-viewer"


def parse_gpm(raw: str) -> float | None:
    if not raw or not raw.strip():
        return None
    import re
    m = re.search(r"([\d.]+)", raw.replace(",", ""))
    if m:
        n = float(m.group(1))
        if n > 0:
            return n
    return None


def parse_depth(raw: str) -> float | None:
    if not raw or not raw.strip():
        return None
    try:
        n = float(str(raw).replace(",", ""))
        if n > 0:
            return round(n)
    except ValueError:
        pass
    return None


def parse_positive_ft(raw: str) -> float | None:
    if not raw or not raw.strip():
        return None
    try:
        n = float(str(raw).replace(",", "").replace("-", ""))
        if n > 0:
            return n
    except ValueError:
        pass
    return None


def aquifer_bucket(aq: str, loc_type: str) -> str:
    a = (aq or "").lower().strip()
    if not a:
        return "blank"
    if "estimated" in a:
        return "estimated"
    if any(k in a for k in ("bedrock", "limestone", "dolomite")):
        return "rock"
    if any(k in a for k in ("unconsolidated", "sand", "gravel")):
        return "unconsolidated"
    return "other"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--viewer-dir", default=None)
    args = ap.parse_args()

    chunk_dir = find_chunk_dir(args.viewer_dir)
    if not chunk_dir.is_dir():
        print(f"Error: chunk directory not found: {chunk_dir}", file=sys.stderr)
        return 1

    # Prefer base chunks (faster, no lithology_json to skip)
    base_chunks = sorted(chunk_dir.glob("dnr_wells_base_chunk_*.csv.gz"))
    if not base_chunks:
        base_chunks = sorted(chunk_dir.glob("dnr_wells_chunk_*.csv.gz"))
        base_chunks = [p for p in base_chunks if "_base_" not in p.name and "_litho_" not in p.name]

    if not base_chunks:
        print("No chunk files found.", file=sys.stderr)
        return 1

    print(f"Processing {len(base_chunks)} chunks…")

    # Grid cells: { "lat_cell:lon_cell": { stats } }
    grid: dict[str, dict] = defaultdict(lambda: {
        "well_count": 0,
        "depths": [],
        "gpms": [],
        "aquifer_counts": {"unconsolidated": 0, "rock": 0, "estimated": 0, "other": 0, "blank": 0},
        "gravel_count": 0,  # wells with gravel_thickness_ft > 0
        "rock_top_count": 0,  # wells with rock_start_ft or depth_bedrock > 0
        "dry_count": 0,
    })

    total = 0
    for chunk_path in base_chunks:
        with gzip.open(chunk_path, "rt", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    lat = float(row.get("lat", ""))
                    lon = float(row.get("lon", ""))
                except (ValueError, TypeError):
                    continue
                if not (math.isfinite(lat) and math.isfinite(lon)):
                    continue

                lat_cell = math.floor(lat / GRID_CELL_DEG)
                lon_cell = math.floor(lon / GRID_CELL_DEG)
                key = f"{lat_cell}:{lon_cell}"
                cell = grid[key]

                cell["well_count"] += 1
                total += 1

                d = parse_depth(row.get("depth", ""))
                if d is not None:
                    cell["depths"].append(d)

                g = parse_gpm(row.get("pump_rate", ""))
                if g is not None:
                    cell["gpms"].append(g)

                aq = row.get("aquifer", "")
                loc = row.get("loc_type", "")
                bucket = aquifer_bucket(aq, loc)
                cell["aquifer_counts"][bucket] += 1

                gt = parse_positive_ft(row.get("gravel_thickness_ft", "") or row.get("vein_size_ft", ""))
                if gt is not None:
                    cell["gravel_count"] += 1

                rt = parse_positive_ft(row.get("rock_start_ft", "") or row.get("depth_bedrock", ""))
                if rt is not None:
                    cell["rock_top_count"] += 1

                aq_lower = (aq or "").lower()
                wt = (row.get("well_type", "") or "").lower()
                if "dry" in aq_lower or "dry" in wt or "abandon" in (row.get("notes", "") or "").lower():
                    cell["dry_count"] += 1

        print(f"  {chunk_path.name}: {total} wells so far")

    # Compute medians and finalize
    def median(nums: list[float]) -> float | None:
        if not nums:
            return None
        s = sorted(nums)
        m = len(s) // 2
        return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2

    def avg(nums: list[float]) -> float | None:
        if not nums:
            return None
        return round(sum(nums) / len(nums), 1)

    output = {
        "grid_cell_deg": GRID_CELL_DEG,
        "total_wells": total,
        "cells": {}
    }

    for key, cell in grid.items():
        depths = cell["depths"]
        gpms = cell["gpms"]
        wc = cell["well_count"]
        output["cells"][key] = {
            "well_count": wc,
            "depth_median_ft": median(depths),
            "gpm_avg": avg(gpms),
            "gpm_count": len(gpms),
            "aquifer_mix": cell["aquifer_counts"],
            "gravel_rate": round(cell["gravel_count"] / wc, 3) if wc else 0,
            "rock_top_rate": round(cell["rock_top_count"] / wc, 3) if wc else 0,
            "dry_count": cell["dry_count"],
        }

    out_path = chunk_dir / "area_grid.json.gz"
    with gzip.open(out_path, "wt", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"))

    out_mb = out_path.stat().st_size / 1048576
    print(f"\nDone. {total} wells in {len(grid)} grid cells.")
    print(f"Output: {out_path} ({out_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
