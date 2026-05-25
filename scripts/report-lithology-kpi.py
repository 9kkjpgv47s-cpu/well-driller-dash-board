#!/usr/bin/env python3
"""Report statewide lithology coverage KPIs from hub chunk files."""
from __future__ import annotations

import argparse
import csv
import glob
import gzip
import json
import os
from pathlib import Path
from typing import Any


def default_well_viewer_dir() -> str:
    env = os.environ.get("HUB_WELL_VIEWER_DIR", "").strip()
    if env:
        return os.path.abspath(env)
    here = Path(__file__).resolve()
    from_script = here.parent.parent / "apps" / "hub" / "public" / "well-viewer"
    if from_script.is_dir():
        return str(from_script)
    from_cwd = Path.cwd() / "public" / "well-viewer"
    if from_cwd.is_dir():
        return str(from_cwd.resolve())
    return str(from_script)


def parse_interval_count(value: str) -> int:
    if not value or value in ("{}", "[]", "null", '""'):
        return 0
    try:
        data: Any = json.loads(value)
        if isinstance(data, str):
            data = json.loads(data.strip())
    except (json.JSONDecodeError, TypeError):
        return 0

    arr: list[Any] | None = None
    if isinstance(data, list):
        arr = data
    elif isinstance(data, dict):
        for key in ("layers", "intervals", "data", "well_log", "Lithology"):
            v = data.get(key)
            if isinstance(v, list):
                arr = v
                break
    return len(arr or [])


def pct(value: int, total: int) -> float:
    return (100.0 * value / total) if total else 0.0


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Compute dual lithology KPIs from dnr_wells_chunk_*.csv.gz: "
            "real parsed coverage (`csv` + `html`) and parseable JSON interval coverage."
        )
    )
    parser.add_argument("--dir", default=None, help="Chunk folder (default: auto-detect hub public/well-viewer)")
    parser.add_argument("--json-out", default=None, help="Optional path for JSON report output")
    args = parser.parse_args()

    base = os.path.abspath(args.dir or default_well_viewer_dir())
    paths = sorted(glob.glob(os.path.join(base, "dnr_wells_chunk_*.csv.gz")))
    if not paths:
        raise SystemExit(f"No chunk files found in {base}")

    total = 0
    parseable = 0
    source_counts: dict[str, int] = {"csv": 0, "html": 0, "none": 0, "other": 0}

    for path in paths:
        with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                total += 1
                source = (row.get("lithology_source") or "").strip().lower()
                if source in ("csv", "html", "none"):
                    source_counts[source] += 1
                else:
                    source_counts["other"] += 1
                if parse_interval_count((row.get("lithology_json") or "").strip()) > 0:
                    parseable += 1

    real = source_counts["csv"] + source_counts["html"]
    report = {
        "chunk_dir": base,
        "chunk_count": len(paths),
        "total_wells": total,
        "lithology_source": source_counts,
        "real_parsed_wells": real,
        "real_parsed_pct": round(pct(real, total), 3),
        "parseable_json_wells": parseable,
        "parseable_json_pct": round(pct(parseable, total), 3),
    }

    print(f"Directory: {base}")
    print(f"Chunks: {len(paths)}  Wells: {total:,}")
    print(
        "Real parsed coverage (lithology_source in {csv,html}): "
        f"{real:,} ({report['real_parsed_pct']:.3f}%)"
    )
    print(
        "Parseable JSON interval coverage (>=1 interval): "
        f"{parseable:,} ({report['parseable_json_pct']:.3f}%)"
    )
    print(
        "Source counts: "
        f"csv={source_counts['csv']:,} "
        f"html={source_counts['html']:,} "
        f"none={source_counts['none']:,} "
        f"other={source_counts['other']:,}"
    )

    if args.json_out:
        out = Path(args.json_out).expanduser().resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote JSON report: {out}")


if __name__ == "__main__":
    main()
