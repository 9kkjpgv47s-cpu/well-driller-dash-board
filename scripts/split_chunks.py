#!/usr/bin/env python3
"""
Split DNR well chunks into base + litho sidecars.

Input:  public/well-viewer/dnr_wells_chunk_N.csv.gz  (full rows, ~33.8 MB total)
Output: public/well-viewer/dnr_wells_base_chunk_N.csv.gz   (no lithology_json, ~6.8 MB)
        public/well-viewer/dnr_wells_litho_chunk_N.csv.gz  (id + lithology_json + lithology_source, ~21.5 MB)

The base chunks carry every field except `lithology_json` — enough for map
markers, wells-nearby API, and depth/yield/aquifer insights.  The litho
sidecars carry the heavy lithology_json blob keyed by well id, loaded
on-demand for area insights and well-detail panels.

Usage:
    python3 scripts/split_chunks.py [--viewer-dir PATH]

    --viewer-dir  Override the chunk directory (default: apps/hub/public/well-viewer)
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import os
import sys
from pathlib import Path

# Fields that go into the litho sidecar (everything else stays in base).
LITHO_FIELDS = {"id", "lithology_json", "lithology_source"}


def find_chunk_dir(viewer_dir: str | None) -> Path:
    repo = Path(__file__).resolve().parent.parent
    return Path(viewer_dir) if viewer_dir else repo / "apps" / "hub" / "public" / "well-viewer"


def split_one_chunk(src: Path, out_base: Path, out_litho: Path) -> tuple[int, int]:
    """Split a single chunk file. Returns (base_rows, litho_rows)."""
    with gzip.open(src, "rt", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        full_fields = reader.fieldnames or []
        # Base = all fields except lithology_json
        base_fields = [c for c in full_fields if c != "lithology_json"]
        # Litho = id + lithology_json + lithology_source (if present)
        litho_fields = [c for c in full_fields if c in LITHO_FIELDS]

        base_buf = io.StringIO()
        litho_buf = io.StringIO()
        base_writer = csv.DictWriter(base_buf, fieldnames=base_fields, extrasaction="ignore")
        litho_writer = csv.DictWriter(litho_buf, fieldnames=litho_fields, extrasaction="ignore")
        base_writer.writeheader()
        litho_writer.writeheader()

        base_n = 0
        litho_n = 0
        for row in reader:
            base_writer.writerow(row)
            base_n += 1
            # Only write litho rows that actually have lithology_json
            if row.get("lithology_json"):
                litho_writer.writerow(row)
                litho_n += 1

    # Write base
    base_bytes = base_buf.getvalue().encode("utf-8")
    with gzip.open(out_base, "wb") as gf:
        gf.write(base_bytes)

    # Write litho
    litho_bytes = litho_buf.getvalue().encode("utf-8")
    with gzip.open(out_litho, "wb") as gf:
        gf.write(litho_bytes)

    return base_n, litho_n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--viewer-dir", default=None, help="Override chunk directory")
    args = ap.parse_args()

    chunk_dir = find_chunk_dir(args.viewer_dir)
    if not chunk_dir.is_dir():
        print(f"Error: chunk directory not found: {chunk_dir}", file=sys.stderr)
        return 1

    # Find all dnr_wells_chunk_*.csv.gz (not base/litho variants)
    src_chunks = sorted(
        chunk_dir.glob("dnr_wells_chunk_*.csv.gz"),
        key=lambda p: int(p.stem.replace("dnr_wells_chunk_", "").replace(".csv", "")),
    )
    # Filter out already-split files
    src_chunks = [p for p in src_chunks if "_base_" not in p.name and "_litho_" not in p.name]

    if not src_chunks:
        print("No dnr_wells_chunk_*.csv.gz files found to split.", file=sys.stderr)
        return 1

    print(f"Splitting {len(src_chunks)} chunks in {chunk_dir}…")
    total_base = 0
    total_litho = 0
    for src in src_chunks:
        idx = src.stem.replace("dnr_wells_chunk_", "").replace(".csv", "")
        out_base = chunk_dir / f"dnr_wells_base_chunk_{idx}.csv.gz"
        out_litho = chunk_dir / f"dnr_wells_litho_chunk_{idx}.csv.gz"
        bn, ln = split_one_chunk(src, out_base, out_litho)
        src_mb = src.stat().st_size / 1048576
        base_mb = out_base.stat().st_size / 1048576
        litho_mb = out_litho.stat().st_size / 1048576
        print(
            f"  chunk {idx}: {bn:>6} rows | "
            f"src={src_mb:.1f}MB → base={base_mb:.1f}MB + litho={litho_mb:.1f}MB "
            f"({ln} rows with lithology_json)"
        )
        total_base += bn
        total_litho += ln

    total_src = sum(p.stat().st_size for p in src_chunks) / 1048576
    total_base_b = sum((chunk_dir / f"dnr_wells_base_chunk_{p.stem.replace('dnr_wells_chunk_', '').replace('.csv', '')}.csv.gz").stat().st_size for p in src_chunks) / 1048576
    total_litho_b = sum((chunk_dir / f"dnr_wells_litho_chunk_{p.stem.replace('dnr_wells_chunk_', '').replace('.csv', '')}.csv.gz").stat().st_size for p in src_chunks) / 1048576
    print(f"\nDone. {total_base} base rows, {total_litho} litho rows.")
    print(f"Total: {total_src:.1f}MB → base={total_base_b:.1f}MB + litho={total_litho_b:.1f}MB")
    if total_src > 0:
        print(f"Base chunk reduction: {100 * (1 - total_base_b / total_src):.0f}% smaller")
    return 0


if __name__ == "__main__":
    sys.exit(main())
