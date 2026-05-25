#!/usr/bin/env python3
"""Verify duplicated well-viewer artifacts match between viewer repo and hub public dir."""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def collect_chunks(base: Path) -> dict[str, Path]:
    files = sorted(glob.glob(str(base / "dnr_wells_chunk_*.csv.gz")))
    return {Path(p).name: Path(p) for p in files}


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify duplicated viewer chunks between source viewer and hub public.")
    parser.add_argument("--viewer-root", default=os.environ.get("WELL_VIEWER_ROOT", ""))
    parser.add_argument(
        "--hub-dir",
        default="/Users/dominiceasterling/well-driller-dash-board/apps/hub/public/well-viewer",
    )
    parser.add_argument("--json-out", default=None)
    args = parser.parse_args()

    viewer_root = Path(args.viewer_root).expanduser().resolve()
    hub_dir = Path(args.hub_dir).expanduser().resolve()

    if not viewer_root.is_dir():
        raise SystemExit(f"viewer-root is not a directory: {viewer_root}")
    if not hub_dir.is_dir():
        raise SystemExit(f"hub-dir is not a directory: {hub_dir}")

    viewer_chunks = collect_chunks(viewer_root)
    hub_chunks = collect_chunks(hub_dir)
    names_viewer = set(viewer_chunks)
    names_hub = set(hub_chunks)
    only_viewer = sorted(names_viewer - names_hub)
    only_hub = sorted(names_hub - names_viewer)

    mismatched: list[dict[str, str]] = []
    for name in sorted(names_viewer & names_hub):
        src = viewer_chunks[name]
        dst = hub_chunks[name]
        src_hash = sha256(src)
        dst_hash = sha256(dst)
        if src_hash != dst_hash:
            mismatched.append({"chunk": name, "viewer_sha256": src_hash, "hub_sha256": dst_hash})

    report = {
        "viewer_root": str(viewer_root),
        "hub_dir": str(hub_dir),
        "viewer_chunk_count": len(viewer_chunks),
        "hub_chunk_count": len(hub_chunks),
        "only_in_viewer": only_viewer,
        "only_in_hub": only_hub,
        "hash_mismatches": mismatched,
        "ok": not only_viewer and not only_hub and not mismatched,
    }

    print(json.dumps(report, indent=2))
    if args.json_out:
        out = Path(args.json_out).expanduser().resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote artifact report: {out}")

    if not report["ok"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
