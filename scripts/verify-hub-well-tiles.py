#!/usr/bin/env python3
"""Verify 0.1° well tiles under the hub public folder against the source chunks.

Re-reads dnr_wells_base_chunk_*.csv.gz + dnr_wells_litho_chunk_*.csv.gz and the
tiles/ output of scripts/build_well_tiles.py.  Fails (exit 1) when:

  - manifest totals differ from the recomputed source totals
  - the manifest tile set differs from the base_*.csv.gz files on disk
  - any tile row's floor(lat/0.1)_floor(lon/0.1) does not equal its tile key
  - the summed tile rows differ from the wells-with-coords count (414,953)
  - a litho tile row id has no base row in the same tile
  - a litho chunk row is missing from any tile that holds its id

Duplicate-id count is printed as information only.

Examples (from hub repo root):
  python3 scripts/verify-hub-well-tiles.py
From apps/hub:
  python3 ../../scripts/verify-hub-well-tiles.py   |   npm run verify:tiles
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import os
import sys
from collections import Counter
from pathlib import Path

TILE_DEG = 0.1
TILES_DIRNAME = "tiles"
BASE_PREFIX = "dnr_wells_base_chunk_"
LITHO_PREFIX = "dnr_wells_litho_chunk_"
CHUNK_SUFFIX = ".csv.gz"
EXPECTED_TOTAL_WELLS = 414_953


def default_well_viewer_dir() -> Path:
    """Resolve well-viewer folder: env override, then repo layout from this script, then cwd."""
    env = os.environ.get("HUB_WELL_VIEWER_DIR", "").strip()
    if env:
        return Path(env).resolve()
    here = Path(__file__).resolve()
    from_script = here.parent.parent / "apps" / "hub" / "public" / "well-viewer"
    if from_script.is_dir():
        return from_script
    from_cwd = Path.cwd() / "public" / "well-viewer"
    if from_cwd.is_dir():
        return from_cwd.resolve()
    return from_script


def tile_key(lat: float, lon: float) -> str:
    """floor(lat / 0.1)_floor(lon / 0.1) — must match well-tiles.ts exactly."""
    return f"{math.floor(lat / TILE_DEG)}_{math.floor(lon / TILE_DEG)}"


def chunk_paths(viewer_dir: Path, prefix: str) -> list[Path]:
    return sorted(
        viewer_dir.glob(f"{prefix}*{CHUNK_SUFFIX}"),
        key=lambda p: int(p.name[len(prefix):][: -len(CHUNK_SUFFIX)]),
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=None, help="well-viewer directory (default: auto-detect)")
    args = ap.parse_args()
    viewer_dir = Path(args.dir).resolve() if args.dir else default_well_viewer_dir()
    tiles_dir = viewer_dir / TILES_DIRNAME

    failures: list[str] = []
    def fail(msg: str) -> None:
        failures.append(msg)

    base_chunks = chunk_paths(viewer_dir, BASE_PREFIX)
    litho_chunks = chunk_paths(viewer_dir, LITHO_PREFIX)
    manifest_path = tiles_dir / "manifest.json"
    if not base_chunks:
        print(f"FAIL: no {BASE_PREFIX}*{CHUNK_SUFFIX} under {viewer_dir}")
        return 1
    if not manifest_path.is_file():
        print(f"FAIL: no manifest at {manifest_path} — run scripts/build_well_tiles.py")
        return 1

    # --- Recompute from source chunks. ---
    id_tiles: dict[str, set[str]] = {}
    id_count: Counter[str] = Counter()
    rows_with_coords = 0
    skipped_no_coords = 0
    for chunk in base_chunks:
        with gzip.open(chunk, "rt", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            try:
                header = next(reader)
            except StopIteration:
                continue
            lowered = [c.lstrip("\ufeff").strip().lower() for c in header]
            lat_i, lon_i, id_i = lowered.index("lat"), lowered.index("lon"), lowered.index("id")
            for row in reader:
                try:
                    lat, lon = float(row[lat_i]), float(row[lon_i])
                except (ValueError, IndexError):
                    skipped_no_coords += 1
                    continue
                if not (math.isfinite(lat) and math.isfinite(lon)):
                    skipped_no_coords += 1
                    continue
                rows_with_coords += 1
                key = tile_key(lat, lon)
                wid = row[id_i].strip() if id_i < len(row) else ""
                id_tiles.setdefault(wid, set()).add(key)
                id_count[wid] += 1
    duplicate_ids = sum(1 for c in id_count.values() if c > 1)

    # Expected litho rows per tile: each source litho row in every tile its id occupies.
    expected_litho: dict[str, Counter[tuple[str, str, str]]] = {}
    total_litho_rows = 0
    for chunk in litho_chunks:
        with gzip.open(chunk, "rt", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                total_litho_rows += 1
                wid = (row.get("id") or "").strip()
                for key in id_tiles.get(wid, ()):
                    expected_litho.setdefault(key, Counter())[
                        (row.get("id", ""), row.get("lithology_json", ""), row.get("lithology_source", ""))
                    ] += 1

    # --- Manifest totals. ---
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    mtiles = manifest.get("tiles") or {}
    if manifest.get("tile_deg") != TILE_DEG:
        fail(f"manifest tile_deg {manifest.get('tile_deg')} != {TILE_DEG}")
    for field, got, want in (
        ("total_wells", manifest.get("total_wells"), rows_with_coords),
        ("skipped_no_coords", manifest.get("skipped_no_coords"), skipped_no_coords),
        ("duplicate_ids", manifest.get("duplicate_ids"), duplicate_ids),
        ("total_litho_rows", manifest.get("total_litho_rows"), total_litho_rows),
    ):
        if got != want:
            fail(f"manifest {field}={got} != recomputed {want}")

    base_files = {p.name[len("base_"):][: -len(CHUNK_SUFFIX)]: p for p in tiles_dir.glob("base_*.csv.gz")}
    if set(base_files) != set(mtiles):
        only_files = sorted(set(base_files) - set(mtiles))[:5]
        only_manifest = sorted(set(mtiles) - set(base_files))[:5]
        fail(f"manifest tile set != base tile files (files-only {only_files}, manifest-only {only_manifest})")

    # --- Tile contents. ---
    tile_rows_total = 0
    tile_ids: dict[str, set[str]] = {}
    for key in sorted(mtiles):
        path = base_files.get(key)
        if path is None:
            continue
        ids_in_tile = set()
        n = 0
        with gzip.open(path, "rt", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            try:
                header = next(reader)
            except StopIteration:
                fail(f"base tile {key} is empty (no header)")
                continue
            lowered = [c.lstrip("\ufeff").strip().lower() for c in header]
            lat_i, lon_i, id_i = lowered.index("lat"), lowered.index("lon"), lowered.index("id")
            for row in reader:
                n += 1
                try:
                    lat, lon = float(row[lat_i]), float(row[lon_i])
                except (ValueError, IndexError):
                    fail(f"base tile {key}: row {n} has unparseable coords")
                    continue
                actual = tile_key(lat, lon)
                if actual != key:
                    fail(f"base tile {key}: row {n} belongs to tile {actual}")
                    break
                if id_i < len(row):
                    ids_in_tile.add(row[id_i].strip())
        tile_rows_total += n
        tile_ids[key] = ids_in_tile
        if n != mtiles[key].get("n"):
            fail(f"manifest tiles[{key}].n={mtiles[key].get('n')} != {n} rows in file")

    if tile_rows_total != rows_with_coords:
        fail(f"tile rows total {tile_rows_total} != wells with coords {rows_with_coords}")
    if tile_rows_total != EXPECTED_TOTAL_WELLS:
        fail(f"tile rows total {tile_rows_total} != expected {EXPECTED_TOTAL_WELLS}")

    # --- Litho tiles. ---
    litho_files = {p.name[len("litho_"):][: -len(CHUNK_SUFFIX)]: p for p in tiles_dir.glob("litho_*.csv.gz")}
    for key in sorted(set(litho_files) | set(expected_litho)):
        expected = expected_litho.get(key, Counter())
        path = litho_files.get(key)
        if path is None:
            fail(f"litho tile {key} missing on disk ({sum(expected.values())} rows expected)")
            continue
        rows: Counter[tuple[str, str, str]] = Counter()
        with gzip.open(path, "rt", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rows[(row.get("id", ""), row.get("lithology_json", ""), row.get("lithology_source", ""))] += 1
        for rid in {r[0].strip() for r in rows}:
            if rid not in tile_ids.get(key, set()):
                fail(f"litho tile {key}: row id {rid} has no base row in tile {key}")
                break
        if rows != expected:
            fail(
                f"litho tile {key}: {sum(rows.values())} rows on disk != {sum(expected.values())} "
                "expected from chunks (per-id coverage mismatch)"
            )
        mf_litho = (mtiles.get(key) or {}).get("litho_n", 0)
        if mf_litho != sum(rows.values()):
            fail(f"manifest tiles[{key}].litho_n={mf_litho} != {sum(rows.values())} rows in file")

    if failures:
        print(f"FAIL: {len(failures)} problem(s)")
        for msg in failures[:20]:
            print(f"  - {msg}")
        if len(failures) > 20:
            print(f"  … and {len(failures) - 20} more")
        return 1

    print(
        f"PASS: {len(base_files)} base tiles / {len(litho_files)} litho tiles, "
        f"{tile_rows_total} wells (0 skipped), {total_litho_rows} litho rows, "
        f"{duplicate_ids} duplicate ids — matches chunks + manifest"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
