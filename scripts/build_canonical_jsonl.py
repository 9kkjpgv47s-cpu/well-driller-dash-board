#!/usr/bin/env python3
"""
Read DNR viewer gzipped chunk CSVs → newline-delimited JSON (optional gzip out).

Each line: {"well": {...row...}, "_provenance": {...}}

Usage:
  DNR_VIEWER_ROOT=../DNR_Well_Viewer_Full_Demo python3 scripts/build_canonical_jsonl.py
  python3 scripts/build_canonical_jsonl.py --viewer-root /path --limit 10000
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import os
import sys
from pathlib import Path


CHUNK_GLOB = "dnr_wells_chunk_*.csv.gz"


def find_chunks(viewer: Path) -> list[Path]:
    chunks = sorted(viewer.glob(CHUNK_GLOB), key=lambda p: p.name)
    if not chunks:
        alt = sorted(viewer.glob("statewide_wells_chunk_*.csv.gz"), key=lambda p: p.name)
        chunks = alt
    return chunks


def open_csv_gz(path: Path):
    raw = gzip.open(path, "rb")
    text = io.TextIOWrapper(raw, encoding="utf-8", newline="")
    return text


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    default_viewer = script_dir.parent.parent / "DNR_Well_Viewer_Full_Demo"
    default_out = script_dir.parent / "data" / "out" / "canonical_wells.jsonl.gz"

    ap = argparse.ArgumentParser(description="Build canonical JSONL from DNR viewer chunks")
    ap.add_argument(
        "--viewer-root",
        default=os.environ.get("DNR_VIEWER_ROOT", str(default_viewer)),
        help="Folder containing dnr_wells_chunk_*.csv.gz",
    )
    ap.add_argument("--out", "-o", default=str(default_out), help="Output .jsonl or .jsonl.gz path")
    ap.add_argument("--limit", type=int, default=0, help="Max wells (0 = all)")
    ap.add_argument(
        "--no-gzip",
        action="store_true",
        help="Write plain .jsonl (use if --out has no .gz suffix)",
    )
    args = ap.parse_args()

    viewer = Path(args.viewer_root).expanduser().resolve()
    out_path = Path(args.out).expanduser().resolve()
    chunks = find_chunks(viewer)
    if not chunks:
        print(f"No chunk files matching {CHUNK_GLOB} under {viewer}", file=sys.stderr)
        print("Run: ./scripts/sync_dnr_data.sh  (or build_statewide_data.py in the viewer repo)", file=sys.stderr)
        raise SystemExit(1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    provenance = {
        "dataset": "in_dnr_water_wells",
        "pipeline": "dnr_viewer_chunks",
        "schema_version": 1,
        "viewer_root": str(viewer),
    }

    use_gzip = out_path.suffix == ".gz" or str(out_path).endswith(".jsonl.gz")
    if args.no_gzip:
        use_gzip = False

    written = 0
    if use_gzip:
        out_f = gzip.open(out_path, "wt", encoding="utf-8", newline="\n")
    else:
        out_f = open(out_path, "w", encoding="utf-8", newline="\n")

    try:
        for cpath in chunks:
            if args.limit and written >= args.limit:
                break
            with open_csv_gz(cpath) as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if args.limit and written >= args.limit:
                        break
                    rec = {"well": dict(row), "_provenance": provenance}
                    out_f.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")
                    written += 1
    finally:
        out_f.close()

    print(f"Wrote {written:,} records → {out_path}")


if __name__ == "__main__":
    main()
