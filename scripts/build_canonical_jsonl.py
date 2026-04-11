#!/usr/bin/env python3
"""
Read DNR wells → newline-delimited JSON (optional gzip out).

Two sources (pick one):

1) **Viewer chunks** — dnr_wells_chunk_*.csv.gz under a separate viewer checkout
   (requires WELL_VIEWER_ROOT / DNR_VIEWER_ROOT or --viewer-root).

2) **Full export in this repo** — dnr_wells_full.csv or dnr_wells_full.csv.gz at the
   hub repo root (or --hub-data-dir / DNR_FULL_CSV). Same row shape as the viewer
   build; no cross-repo reads.

Each line: {"well": {...row...}, "_provenance": {...}}

Usage:
  # From committed .gz in this repo (no viewer path):
  python3 scripts/build_canonical_jsonl.py --from-full

  # From viewer chunks:
  export DNR_VIEWER_ROOT=/absolute/path/to/dnr-viewer-repo
  python3 scripts/build_canonical_jsonl.py
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

from dnr_csv_input import open_dnr_wells_csv_for_read, resolve_dnr_full_wells_csv
from viewer_env import require_viewer_root

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
    default_out = script_dir.parent / "data" / "out" / "canonical_wells.jsonl.gz"
    hub_root = script_dir.parent

    ap = argparse.ArgumentParser(description="Build canonical JSONL from DNR wells")
    src = ap.add_mutually_exclusive_group()
    src.add_argument(
        "--from-full",
        action="store_true",
        help="Read dnr_wells_full.csv[.gz] under --hub-data-dir (this repo); no viewer checkout",
    )
    ap.add_argument(
        "--viewer-root",
        default=None,
        help="Folder containing dnr_wells_chunk_*.csv.gz (chunk mode; not used with --from-full)",
    )
    ap.add_argument(
        "--hub-data-dir",
        default=None,
        help="Directory with dnr_wells_full for --from-full (else HUB_DNR_DATA_DIR env, else repo root)",
    )
    ap.add_argument("--out", "-o", default=str(default_out), help="Output .jsonl or .jsonl.gz path")
    ap.add_argument("--limit", type=int, default=0, help="Max wells (0 = all)")
    ap.add_argument(
        "--no-gzip",
        action="store_true",
        help="Write plain .jsonl (use if --out has no .gz suffix)",
    )
    args = ap.parse_args()

    out_path = Path(args.out).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    use_gzip = out_path.suffix == ".gz" or str(out_path).endswith(".jsonl.gz")
    if args.no_gzip:
        use_gzip = False

    if args.from_full:
        env_hub = (os.environ.get("HUB_DNR_DATA_DIR") or "").strip()
        if args.hub_data_dir:
            data_dir = Path(args.hub_data_dir).expanduser().resolve()
        elif env_hub:
            data_dir = Path(env_hub).expanduser().resolve()
        else:
            data_dir = hub_root
        if args.viewer_root:
            print("Do not pass --viewer-root with --from-full.", file=sys.stderr)
            raise SystemExit(2)
        try:
            full_path = resolve_dnr_full_wells_csv(str(data_dir), os.environ.get("DNR_FULL_CSV"))
        except FileNotFoundError as e:
            print(str(e), file=sys.stderr)
            print(
                "Tip: copy dnr_wells_full.csv.gz from the viewer repo into this repo root, "
                "or set DNR_FULL_CSV to an absolute path.",
                file=sys.stderr,
            )
            raise SystemExit(1)
        provenance = {
            "dataset": "in_dnr_water_wells",
            "pipeline": "dnr_wells_full",
            "schema_version": 1,
            "source_path": full_path,
        }
        written = 0
        if use_gzip:
            out_f = gzip.open(out_path, "wt", encoding="utf-8", newline="\n")
        else:
            out_f = open(out_path, "w", encoding="utf-8", newline="\n")
        try:
            with open_dnr_wells_csv_for_read(full_path) as f:
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
        return

    # Chunk mode (separate viewer checkout)
    if args.viewer_root:
        viewer = Path(args.viewer_root).expanduser().resolve()
    else:
        viewer = require_viewer_root()
    chunks = find_chunks(viewer)
    if not chunks:
        print(f"No chunk files matching {CHUNK_GLOB} under {viewer}", file=sys.stderr)
        print("Run: ./scripts/sync_dnr_data.sh  (or build_statewide_data.py in the viewer repo)", file=sys.stderr)
        print("Or use: python3 scripts/build_canonical_jsonl.py --from-full", file=sys.stderr)
        raise SystemExit(1)

    provenance = {
        "dataset": "in_dnr_water_wells",
        "pipeline": "dnr_viewer_chunks",
        "schema_version": 1,
        "viewer_root": str(viewer),
    }

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
