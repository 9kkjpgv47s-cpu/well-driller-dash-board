#!/usr/bin/env python3
"""
Statewide DNR well-report HTML scrape → offline sidecar.

SAFE BY DEFAULT:
  - Never rewrites apps/hub/public/well-viewer chunk CSVs
  - Writes only under --out (default data/dnr_html_scrape/)
  - Resume-safe: skips refnos already present in records.jsonl.gz
  - Rate-limited polite fetch against secure.in.gov

What we fill (missing or empty in chunk columns statewide today):
  drill_rig_type  ← Drilling method (Cable Tool / Rotary / …)
  pump_type       ← Pump type
  test_method     ← Type of test (Pumping / …)
Plus full construction/test extras when present on the HTML form.

Usage (from repo root):
  # Pilot 50 wells
  python3 scripts/dnr_html_scrape/scrape_statewide.py --limit 50 --out data/dnr_html_scrape/pilot

  # Full statewide (resume OK)
  python3 scripts/dnr_html_scrape/scrape_statewide.py --all --out data/dnr_html_scrape/full

  # Only wells missing rig/pump/test in chunks
  python3 scripts/dnr_html_scrape/scrape_statewide.py --all --only-empty-target-fields
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import random
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from parse_report import fields_for_sidecar, parse_report_html  # type: ignore

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHUNKS = REPO_ROOT / "apps/hub/public/well-viewer"
DEFAULT_OUT = REPO_ROOT / "data/dnr_html_scrape"

DNR_URL = (
    "https://secure.in.gov/apps/dnr/water/dnr_waterwell"
    "?refNo={refno}&_from=SUMMARY&_action=Details"
)
UA = (
    "Mozilla/5.0 (compatible; DrillerHubResearch/1.0; "
    "+https://driller-hub.vercel.app; offline field enrichment)"
)

TARGET_FIELDS = ("drill_rig_type", "pump_type", "test_method")
FORBIDDEN_OUT = ("/apps/hub/public/", "/public/well-viewer/")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(msg: str, log_path: Path | None = None) -> None:
    line = f"{utc_now()} {msg}"
    print(line, flush=True)
    if log_path:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def assert_safe_out(out: Path) -> Path:
    out = out.resolve()
    s = str(out)
    for bad in FORBIDDEN_OUT:
        if bad in s:
            raise SystemExit(f"REFUSING to write under live path ({bad}): {out}")
    out.mkdir(parents=True, exist_ok=True)
    return out


def open_text(path: Path):
    if str(path).endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8-sig", newline="")
    return path.open("rt", encoding="utf-8-sig", newline="")


def discover_chunks(chunks_dir: Path) -> list[Path]:
    paths = sorted(chunks_dir.glob("dnr_wells_chunk_*.csv.gz"))
    if not paths:
        paths = sorted(chunks_dir.glob("dnr_wells_chunk_*.csv"))
    return paths


def iter_chunk_wells(
    chunks_dir: Path,
    only_empty_target: bool = False,
) -> Iterator[dict[str, str]]:
    for path in discover_chunks(chunks_dir):
        with open_text(path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                ref = (row.get("refno") or "").strip()
                if not ref.isdigit():
                    continue
                if only_empty_target:
                    if any((row.get(k) or "").strip() for k in TARGET_FIELDS):
                        continue
                yield {
                    "refno": ref,
                    "id": (row.get("id") or f"DNR-{ref}").strip(),
                    "county": (row.get("county") or "").strip(),
                    "drill_rig_type_chunk": (row.get("drill_rig_type") or "").strip(),
                    "pump_type_chunk": (row.get("pump_type") or "").strip(),
                    "test_method_chunk": (row.get("test_method") or "").strip(),
                    "casing_length_chunk": (row.get("casing_length") or "").strip(),
                    "pump_rate_chunk": (row.get("pump_rate") or "").strip(),
                }


def load_done_refnos(records_path: Path) -> set[str]:
    done: set[str] = set()
    if not records_path.is_file():
        return done
    opener = gzip.open if str(records_path).endswith(".gz") else open
    with opener(records_path, "rt", encoding="utf-8") as f:  # type: ignore
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            ref = str(rec.get("refno") or "").strip()
            if ref:
                done.add(ref)
    return done


def fetch_html(refno: str, timeout: float = 30.0) -> tuple[int, str]:
    url = DNR_URL.format(refno=refno)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200) or 200
            body = resp.read().decode("utf-8", errors="replace")
            return int(status), body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return int(e.code), body
    except Exception as e:
        return 0, f"__FETCH_ERROR__:{e}"


def scrape_one(refno: str, sleep_s: float = 0.0) -> dict[str, Any]:
    if sleep_s > 0:
        time.sleep(sleep_s)
    status, html = fetch_html(refno)
    if status != 200 or html.startswith("__FETCH_ERROR__"):
        return {
            "refno": refno,
            "ok": False,
            "error": f"http_{status}" if status else html[:200],
            "fetched_at": utc_now(),
            "http_status": status,
        }
    parsed = parse_report_html(html, refno=refno)
    rec = fields_for_sidecar(parsed)
    rec["fetched_at"] = utc_now()
    rec["http_status"] = status
    return rec


def append_jsonl(path: Path, rec: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(rec, ensure_ascii=False, separators=(",", ":"))
    if str(path).endswith(".gz"):
        with gzip.open(path, "at", encoding="utf-8") as f:
            f.write(line + "\n")
    else:
        with path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def write_summary(out: Path, stats: dict[str, Any]) -> None:
    path = out / "summary.json"
    path.write_text(json.dumps(stats, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape DNR well report HTML fields")
    ap.add_argument("--chunks-dir", type=Path, default=DEFAULT_CHUNKS)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--limit", type=int, default=0, help="Max wells this run (0=all)")
    ap.add_argument("--all", action="store_true", help="Process all chunk wells")
    ap.add_argument(
        "--only-empty-target-fields",
        action="store_true",
        help="Skip wells that already have rig/pump/test filled in chunks",
    )
    ap.add_argument(
        "--sample",
        type=int,
        default=0,
        help="Random sample N wells from chunks (before limit)",
    )
    ap.add_argument("--sleep", type=float, default=0.35, help="Delay between fetches (s)")
    ap.add_argument("--workers", type=int, default=1, help="Concurrent fetch workers")
    ap.add_argument(
        "--refnos",
        type=str,
        default="",
        help="Comma-separated refnos (skip chunk scan)",
    )
    ap.add_argument(
        "--no-gzip",
        action="store_true",
        help="Write records.jsonl uncompressed (easier to tail)",
    )
    args = ap.parse_args()

    if not args.all and not args.limit and not args.refnos and not args.sample:
        # Safe default: pilot 25
        args.limit = 25
        print("No --all/--limit/--refnos/--sample; defaulting to --limit 25 pilot", flush=True)

    out = assert_safe_out(args.out)
    log_path = out / "scrape.log"
    records_name = "records.jsonl" if args.no_gzip else "records.jsonl.gz"
    records_path = out / records_name

    done = load_done_refnos(records_path)
    log(f"resume: {len(done)} refnos already in {records_path.name}", log_path)

    wells: list[dict[str, str]] = []
    if args.refnos:
        for r in args.refnos.split(","):
            r = r.strip()
            if r.isdigit():
                wells.append({"refno": r, "id": f"DNR-{r}"})
    else:
        for w in iter_chunk_wells(
            args.chunks_dir, only_empty_target=args.only_empty_target_fields
        ):
            wells.append(w)

    if args.sample and args.sample > 0 and len(wells) > args.sample:
        random.seed(42)
        wells = random.sample(wells, args.sample)

    # filter done
    pending = [w for w in wells if w["refno"] not in done]
    if args.limit and args.limit > 0:
        pending = pending[: args.limit]

    log(
        f"queue={len(pending)} total_candidates={len(wells)} done={len(done)} "
        f"workers={args.workers} sleep={args.sleep}",
        log_path,
    )

    field_hits: Counter[str] = Counter()
    value_counts: dict[str, Counter[str]] = {
        "drill_rig_type": Counter(),
        "pump_type": Counter(),
        "test_method": Counter(),
    }
    status_counts: Counter[str] = Counter()
    ok_n = err_n = 0
    t0 = time.time()

    def handle(rec: dict[str, Any]) -> None:
        nonlocal ok_n, err_n
        append_jsonl(records_path, rec)
        if rec.get("ok"):
            ok_n += 1
            status_counts["ok"] += 1
            for k in (
                "drill_rig_type",
                "pump_type",
                "test_method",
                "casing_length",
                "pump_rate",
                "bailer_rate",
                "static_water",
                "depth",
                "drawdown_ft",
                "date_complete",
                "driller_name",
            ):
                if str(rec.get(k) or "").strip():
                    field_hits[k] += 1
            for k in value_counts:
                v = str(rec.get(k) or "").strip()
                if v:
                    value_counts[k][v[:80]] += 1
        else:
            err_n += 1
            status_counts[str(rec.get("error") or "err")] += 1

    if args.workers <= 1:
        for i, w in enumerate(pending, 1):
            rec = scrape_one(w["refno"], sleep_s=args.sleep)
            # attach chunk context
            for ck in (
                "county",
                "drill_rig_type_chunk",
                "pump_type_chunk",
                "test_method_chunk",
                "casing_length_chunk",
                "pump_rate_chunk",
            ):
                if ck in w:
                    rec[ck] = w[ck]
            handle(rec)
            if i % 10 == 0 or i == len(pending):
                elapsed = max(time.time() - t0, 1e-6)
                rate = i / elapsed
                log(
                    f"progress {i}/{len(pending)} ok={ok_n} err={err_n} "
                    f"{rate:.2f}/s eta_min={(len(pending)-i)/max(rate,1e-6)/60:.1f} "
                    f"rig_hit={field_hits['drill_rig_type']} "
                    f"pump_hit={field_hits['pump_type']} "
                    f"test_hit={field_hits['test_method']}",
                    log_path,
                )
    else:
        # concurrent with small per-task jitter
        def job(w: dict[str, str]) -> dict[str, Any]:
            jitter = random.uniform(0, args.sleep)
            rec = scrape_one(w["refno"], sleep_s=jitter)
            for ck in (
                "county",
                "drill_rig_type_chunk",
                "pump_type_chunk",
                "test_method_chunk",
                "casing_length_chunk",
                "pump_rate_chunk",
            ):
                if ck in w:
                    rec[ck] = w[ck]
            return rec

        done_i = 0
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {ex.submit(job, w): w for w in pending}
            for fut in as_completed(futs):
                rec = fut.result()
                handle(rec)
                done_i += 1
                if done_i % 20 == 0 or done_i == len(pending):
                    elapsed = max(time.time() - t0, 1e-6)
                    rate = done_i / elapsed
                    log(
                        f"progress {done_i}/{len(pending)} ok={ok_n} err={err_n} "
                        f"{rate:.2f}/s "
                        f"rig_hit={field_hits['drill_rig_type']} "
                        f"pump_hit={field_hits['pump_type']} "
                        f"test_hit={field_hits['test_method']}",
                        log_path,
                    )

    elapsed = time.time() - t0
    stats = {
        "finished_at": utc_now(),
        "out": str(out),
        "records_path": str(records_path),
        "queued": len(pending),
        "ok": ok_n,
        "err": err_n,
        "elapsed_sec": round(elapsed, 2),
        "wells_per_sec": round(ok_n / elapsed, 3) if elapsed else 0,
        "field_hits": dict(field_hits),
        "field_hit_pct": {
            k: round(100.0 * field_hits[k] / ok_n, 1) if ok_n else 0
            for k in (
                "drill_rig_type",
                "pump_type",
                "test_method",
                "casing_length",
                "pump_rate",
                "bailer_rate",
                "static_water",
                "depth",
                "drawdown_ft",
                "date_complete",
                "driller_name",
            )
        },
        "top_values": {
            k: value_counts[k].most_common(25) for k in value_counts
        },
        "status_counts": dict(status_counts),
        "notes": [
            "Chunk columns drill_rig_type/pump_type/test_method were empty statewide before scrape.",
            "drill_rig_type is filled from HTML 'Drilling method'.",
            "test_method is filled from HTML 'Type of test'.",
            "Does not rewrite live chunk CSVs; sidecar only.",
        ],
    }
    write_summary(out, stats)
    log(f"DONE summary → {out / 'summary.json'}", log_path)
    log(json.dumps(stats["field_hit_pct"], indent=2), log_path)
    return 0 if err_n == 0 or ok_n > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
