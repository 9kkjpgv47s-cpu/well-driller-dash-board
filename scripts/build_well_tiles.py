#!/usr/bin/env python3
"""
Spatially shard the DNR well registry into 0.1° lat/lon tiles.

Input:  apps/hub/public/well-viewer/dnr_wells_base_chunk_N.csv.gz   (full well rows, no lithology_json)
        apps/hub/public/well-viewer/dnr_wells_litho_chunk_N.csv.gz  (id + lithology_json + lithology_source)
Output: apps/hub/public/well-viewer/tiles/base_{latIdx}_{lonIdx}.csv.gz   (same header as base chunks)
        apps/hub/public/well-viewer/tiles/litho_{latIdx}_{lonIdx}.csv.gz  (id + litho cols, only when non-empty)
        apps/hub/public/well-viewer/tiles/manifest.json

A radius API query loads only the tiles its bounding box touches — a few small
gz files instead of all 10 base chunks — so cold Vercel lambdas finish inside
the 4 s budget instead of 503ing on the full ~415k-row registry load.

Tile keys: ``floor(lat / 0.1)_floor(lon / 0.1)`` computed on the parsed float —
the exact same IEEE-754 math as ``wellTileIndex()`` in
apps/hub/src/lib/well-tiles.ts (e.g. Indianapolis 39.7684,-86.1581 -> 397_-862).

A litho row is written into EVERY tile that holds a base row with its ``id``
(ids can be duplicated across base rows); per-tile merge-by-id then matches the
legacy whole-registry merge.

Output is deterministic: gzip streams are written with ``mtime=0`` and no
embedded filename, rows keep registry order (chunk index asc, then row order),
and the manifest is pretty-printed with sorted keys, so re-running the builder
produces a zero git diff.  ``built_at`` follows SOURCE_DATE_EPOCH when set,
else the newest source chunk mtime (deterministic per checkout).

Usage:
    python3 scripts/build_well_tiles.py [--viewer-dir PATH]

    --viewer-dir  Override the well-viewer directory
                  (default: $HUB_WELL_VIEWER_DIR or apps/hub/public/well-viewer)
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import math
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

TILE_DEG = 0.1
TILES_DIRNAME = "tiles"
BASE_PREFIX = "dnr_wells_base_chunk_"
LITHO_PREFIX = "dnr_wells_litho_chunk_"
CHUNK_SUFFIX = ".csv.gz"
LITHO_HEADER = ["id", "lithology_json", "lithology_source"]


def default_well_viewer_dir() -> Path:
    """Resolve well-viewer folder: env override, then repo layout from this script, then cwd."""
    env = os.environ.get("HUB_WELL_VIEWER_DIR", "").strip()
    if env:
        return Path(env).resolve()
    here = Path(__file__).resolve()
    # hub repo: scripts/this.py → …/apps/hub/public/well-viewer
    from_script = here.parent.parent / "apps" / "hub" / "public" / "well-viewer"
    if from_script.is_dir():
        return from_script
    # Run as: cd apps/hub && python3 ../../scripts/build_well_tiles.py
    from_cwd = Path.cwd() / "public" / "well-viewer"
    if from_cwd.is_dir():
        return from_cwd.resolve()
    return from_script


def tile_key(lat: float, lon: float) -> str:
    """floor(lat / 0.1)_floor(lon / 0.1) — must match well-tiles.ts exactly."""
    return f"{math.floor(lat / TILE_DEG)}_{math.floor(lon / TILE_DEG)}"


def chunk_paths(viewer_dir: Path, prefix: str) -> list[Path]:
    paths = sorted(
        viewer_dir.glob(f"{prefix}*{CHUNK_SUFFIX}"),
        key=lambda p: int(p.name[len(prefix):][: -len(CHUNK_SUFFIX)]),
    )
    return paths


def write_gz_text(path: Path, text: str) -> None:
    """Deterministic gzip: no embedded filename, fixed mtime."""
    with open(path, "wb") as f:
        with gzip.GzipFile(filename="", mode="wb", fileobj=f, mtime=0) as gz:
            gz.write(text.encode("utf-8"))


def tile_writer(buffers: dict[str, io.StringIO], writers: dict[str, csv.writer], key: str, header: list[str]) -> csv.writer:
    w = writers.get(key)
    if w is None:
        buf = io.StringIO()
        buffers[key] = buf
        w = csv.writer(buf)
        w.writerow(header)
        writers[key] = w
    return w


def built_at_iso(source_files: list[Path]) -> str:
    """Deterministic timestamp: SOURCE_DATE_EPOCH, else newest source mtime."""
    epoch = os.environ.get("SOURCE_DATE_EPOCH", "").strip()
    if epoch:
        ts = float(epoch)
    else:
        ts = max((p.stat().st_mtime for p in source_files), default=0.0)
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_tiles(viewer_dir: Path) -> int:
    base_chunks = chunk_paths(viewer_dir, BASE_PREFIX)
    litho_chunks = chunk_paths(viewer_dir, LITHO_PREFIX)
    if not base_chunks:
        print(f"Error: no {BASE_PREFIX}*{CHUNK_SUFFIX} under {viewer_dir}", file=sys.stderr)
        return 1

    tiles_dir = viewer_dir / TILES_DIRNAME
    tiles_dir.mkdir(parents=True, exist_ok=True)
    # Drop stale tiles so the output set always matches this run.
    for stale in list(tiles_dir.glob("base_*.csv.gz")) + list(tiles_dir.glob("litho_*.csv.gz")):
        stale.unlink()

    # --- Base pass: bucket every row into its tile (registry order kept). ---
    base_bufs: dict[str, io.StringIO] = {}
    base_writers: dict[str, csv.writer] = {}
    tile_n: Counter[str] = Counter()
    id_tiles: dict[str, set[str]] = {}
    id_count: Counter[str] = Counter()
    header: list[str] | None = None
    lat_i = lon_i = id_i = -1
    total_rows = 0
    skipped_no_coords = 0

    for chunk in base_chunks:
        with gzip.open(chunk, "rt", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            try:
                chunk_header = next(reader)
            except StopIteration:
                continue
            if header is None:
                header = [c.lstrip("\ufeff") for c in chunk_header]
                lowered = [c.strip().lower() for c in header]
                try:
                    lat_i = lowered.index("lat")
                    lon_i = lowered.index("lon")
                    id_i = lowered.index("id")
                except ValueError as e:
                    print(f"Error: base chunk header missing id/lat/lon: {e}", file=sys.stderr)
                    return 1
            elif [c.lstrip("\ufeff") for c in chunk_header] != header:
                print(f"Error: header drift in {chunk.name}", file=sys.stderr)
                return 1

            for row in reader:
                total_rows += 1
                try:
                    lat = float(row[lat_i])
                    lon = float(row[lon_i])
                except (ValueError, IndexError):
                    skipped_no_coords += 1
                    continue
                if not (math.isfinite(lat) and math.isfinite(lon)):
                    skipped_no_coords += 1
                    continue
                key = tile_key(lat, lon)
                wid = row[id_i].strip() if id_i < len(row) else ""
                id_tiles.setdefault(wid, set()).add(key)
                id_count[wid] += 1
                tile_writer(base_bufs, base_writers, key, header or []).writerow(row)
                tile_n[key] += 1

    duplicate_ids = sum(1 for c in id_count.values() if c > 1)

    # --- Litho pass: each row lands in every tile holding its well id. ---
    litho_bufs: dict[str, io.StringIO] = {}
    litho_writers: dict[str, csv.writer] = {}
    litho_n: Counter[str] = Counter()
    total_litho_rows = 0
    orphan_litho_rows = 0

    for chunk in litho_chunks:
        with gzip.open(chunk, "rt", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_litho_rows += 1
                wid = (row.get("id") or "").strip()
                keys = id_tiles.get(wid)
                if not keys:
                    orphan_litho_rows += 1
                    continue
                out = [row.get("id", ""), row.get("lithology_json", ""), row.get("lithology_source", "")]
                for key in keys:
                    tile_writer(litho_bufs, litho_writers, key, LITHO_HEADER).writerow(out)
                    litho_n[key] += 1

    # --- Write tiles + manifest (sorted keys → clean diffs). ---
    n_base_files = 0
    for key in sorted(base_bufs):
        write_gz_text(tiles_dir / f"base_{key}.csv.gz", base_bufs[key].getvalue())
        n_base_files += 1
    n_litho_files = 0
    for key in sorted(litho_bufs):
        write_gz_text(tiles_dir / f"litho_{key}.csv.gz", litho_bufs[key].getvalue())
        n_litho_files += 1

    wells_with_coords = total_rows - skipped_no_coords
    assert sum(tile_n.values()) == wells_with_coords, "tile row total != wells with coords"
    assert n_litho_files == sum(1 for k in litho_n if litho_n[k] > 0)

    manifest = {
        "tile_deg": TILE_DEG,
        "built_at": built_at_iso(base_chunks + litho_chunks),
        "source": f"{BASE_PREFIX}0..{len(base_chunks) - 1} + {LITHO_PREFIX}0..{len(litho_chunks) - 1}",
        "total_wells": wells_with_coords,
        "total_litho_rows": total_litho_rows,
        "skipped_no_coords": skipped_no_coords,
        "duplicate_ids": duplicate_ids,
        "tiles": {
            key: {"n": tile_n[key], "litho_n": litho_n.get(key, 0)}
            for key in sorted(tile_n)
        },
    }
    with open(tiles_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
        f.write("\n")

    max_tile = max(tile_n.values()) if tile_n else 0
    print(f"Built {n_base_files} base tiles + {n_litho_files} litho tiles in {tiles_dir}")
    print(
        f"  wells: {wells_with_coords} ({skipped_no_coords} skipped no-coords) | "
        f"max rows/tile: {max_tile} | duplicate ids: {duplicate_ids} | "
        f"litho rows: {total_litho_rows} ({orphan_litho_rows} orphan ids not in base)"
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--viewer-dir", default=None, help="Override well-viewer directory")
    args = ap.parse_args()

    viewer_dir = Path(args.viewer_dir).resolve() if args.viewer_dir else default_well_viewer_dir()
    if not viewer_dir.is_dir():
        print(f"Error: well-viewer directory not found: {viewer_dir}", file=sys.stderr)
        return 1
    return build_tiles(viewer_dir)


if __name__ == "__main__":
    sys.exit(main())
