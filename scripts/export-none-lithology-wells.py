#!/usr/bin/env python3
"""Export wells still marked with lithology_source=none from hub chunks."""
from __future__ import annotations

import argparse
import csv
import glob
import gzip
import os
from pathlib import Path


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


def main() -> None:
    parser = argparse.ArgumentParser(description="Export wells with lithology_source=none from chunk files.")
    parser.add_argument("--dir", default=None, help="Chunk directory (default auto-detect)")
    parser.add_argument("--out", required=True, help="Output CSV path")
    parser.add_argument("--limit", type=int, default=0, help="Optional max rows (0 = all)")
    args = parser.parse_args()

    base = os.path.abspath(args.dir or default_well_viewer_dir())
    paths = sorted(glob.glob(os.path.join(base, "dnr_wells_chunk_*.csv.gz")))
    if not paths:
        raise SystemExit(f"No chunk files found in {base}")

    out = Path(args.out).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    kept = 0
    scanned = 0
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["refno", "county", "lat", "lon", "depth", "lithology_source"])
        for path in paths:
            with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    scanned += 1
                    source = (row.get("lithology_source") or "").strip().lower()
                    if source != "none":
                        continue
                    writer.writerow(
                        [
                            (row.get("refno") or "").strip(),
                            (row.get("county") or "").strip(),
                            (row.get("lat") or "").strip(),
                            (row.get("lon") or "").strip(),
                            (row.get("depth") or "").strip(),
                            source,
                        ]
                    )
                    kept += 1
                    if args.limit > 0 and kept >= args.limit:
                        print(f"Scanned {scanned:,} rows. Wrote {kept:,} none-source rows -> {out}")
                        return
    print(f"Scanned {scanned:,} rows. Wrote {kept:,} none-source rows -> {out}")


if __name__ == "__main__":
    main()
