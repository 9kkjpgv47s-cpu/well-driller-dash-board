#!/usr/bin/env python3
"""
Per-well verification of dual-label + construction logic.

Reads well_records.jsonl.gz from a statewide extract (or classifies on the fly
from chunks) and checks EVERY well against hard rules. Writes:
  - verify_summary.json
  - failures.jsonl.gz          (rule violations / contradictions)
  - pass_samples.jsonl.gz      (random high-confidence passes for spot audit)
  - verify.log

Hard rules (must not fail):
  R1  rock_open_hole requires no screen
  R2  rock_open_hole requires open_hole_below_casing >= 1.5 ft when casing known
  R3  NEVER formation=rock with construction reject_no_open_hole
  R4  formation=rock + has_screen + uncon_ft>=8 is a contradiction (flag)
  R5  sandstone-family layers must not count as uncon thickness
  R6  set_label R@* implies formation rock (or estimated rock path)
  R7  set_label G@* implies screen or uncon formation
  R8  rock_open_hole kind must align with formation=rock when decided by construction

Soft flags (investigate, not always wrong):
  S1  formation rock but screen present and uncon_ft > 0
  S2  formation uncon but no screen and open hole into rock construction
  S3  aquifer bedrock vs formation uncon (or reverse)
  S4  low confidence
  S5  unknown formation with rich lithology
"""

from __future__ import annotations

import argparse
import gzip
import json
import random
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Import classifier for on-the-fly mode
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from reprocess_dual_label import (  # type: ignore
    SANDSTONE_FAMILY_RE,
    classify_well,
    discover_chunks,
    open_text_stream,
    positive_float,
)

import csv


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(msg: str, log_path: Path | None = None) -> None:
    line = f"{utc_now()} {msg}"
    print(line, flush=True)
    if log_path:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def iter_csv_rows(path: Path):
    with open_text_stream(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield {k: (v if v is not None else "") for k, v in row.items()}


def sandstone_counted_as_uncon(layers: list[dict[str, Any]]) -> bool:
    for L in layers or []:
        fm = str(L.get("formation") or "")
        if SANDSTONE_FAMILY_RE.search(fm) and L.get("counts_toward_uncon"):
            return True
        # Also: category uncon but name is sandstone family
        if SANDSTONE_FAMILY_RE.search(fm) and L.get("category") == "unconsolidated":
            return True
    return False


def verify_record(rec: dict[str, Any]) -> dict[str, Any]:
    """Return {hard: [...], soft: [...], ok: bool}."""
    hard: list[str] = []
    soft: list[str] = []

    # Support both extract-shaped and classify_well-shaped records
    ex = rec.get("extract") or rec
    form = ex.get("formation_class") or rec.get("formation_class")
    cons = ex.get("construction") or rec.get("construction") or {}
    if not cons and rec.get("layers_labeled") is not None:
        # rebuild minimal from fields if missing
        cons = {}
    layers = rec.get("layers_labeled") or rec.get("layers") or []
    reasons = ex.get("reasons") or rec.get("reasons") or []
    reasons_s = " ".join(str(r) for r in reasons)

    kind = cons.get("kind")
    has_screen = cons.get("has_screen")
    if has_screen is None:
        # derive from row fields if present
        sl = positive_float(str(rec.get("screen_length") or ""))
        sd = positive_float(str(rec.get("screen_diam") or rec.get("screen_diameter") or ""))
        has_screen = bool((sl and sl > 0) or (sd and sd > 0))
    open_h = cons.get("open_hole_below_casing_ft")
    casing = cons.get("casing_length_ft")
    if casing is None:
        casing = positive_float(str(rec.get("casing_length") or ""))
    set_label = ex.get("set_label") or rec.get("set_label") or cons.get("set_label")
    uncon_ft = ex.get("unconsolidated_ft")
    if uncon_ft is None:
        uncon_ft = rec.get("unconsolidated_ft")
    rock_top = ex.get("rock_top_ft")
    if rock_top is None:
        rock_top = rec.get("rock_top_ft")
    conf = ex.get("confidence") or rec.get("confidence")
    aq = str(rec.get("aquifer") or "")

    # R1
    if kind == "rock_open_hole" and has_screen:
        hard.append("R1_rock_open_hole_with_screen")

    # R2
    if kind == "rock_open_hole" and casing is not None:
        if open_h is None or float(open_h) < 1.5:
            hard.append("R2_rock_open_hole_without_open_hole")

    # R3
    if form == "rock" and "reject_rock_no_open_hole" in reasons_s:
        hard.append("R3_rock_despite_reject_no_open_hole")
    if form == "rock" and "reject:rock_top_without_open_hole" in reasons_s:
        # only hard if casing was known
        if casing is not None:
            hard.append("R3b_rock_despite_no_open_hole_reject")

    # R4 strong contradiction
    if form == "rock" and has_screen and uncon_ft is not None and float(uncon_ft) >= 8:
        hard.append("R4_rock_with_screen_and_thick_uncon")

    # R5
    if sandstone_counted_as_uncon(layers):
        hard.append("R5_sandstone_family_counted_as_uncon")

    # R6 set label R
    if set_label and str(set_label).startswith("R@") and form not in ("rock",):
        hard.append(f"R6_set_label_R_but_formation_{form}")

    # R7 set label G
    if set_label and str(set_label).startswith("G@"):
        if form == "rock" and not has_screen:
            hard.append("R7_set_label_G_but_rock_no_screen")

    # R8 construction kind rock_open_hole but not rock formation (after decide)
    if kind == "rock_open_hole" and form != "rock":
        # allowed only if thick uncon override with screen — but rock_open_hole implies no screen
        hard.append(f"R8_rock_open_hole_kind_but_formation_{form}")

    # Soft
    if form == "rock" and has_screen and (uncon_ft or 0) > 0:
        soft.append("S1_rock_with_screen")
    if (
        form == "unconsolidated"
        and kind == "rock_open_hole"
    ):
        soft.append("S2_uncon_with_rock_open_hole_kind")
    aq_l = aq.lower()
    if "bedrock" in aq_l and form == "unconsolidated":
        soft.append("S3_aquifer_bedrock_formation_uncon")
    if "unconsolidated" in aq_l and form == "rock":
        soft.append("S3b_aquifer_uncon_formation_rock")
    if conf == "low":
        soft.append("S4_low_confidence")
    if form == "unknown" and len(layers) >= 3:
        soft.append("S5_unknown_with_rich_lithology")

    return {
        "hard": hard,
        "soft": soft,
        "ok": len(hard) == 0,
        "formation_class": form,
        "construction_kind": kind,
        "set_label": set_label,
        "confidence": conf,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify classification on all wells")
    ap.add_argument(
        "--from-extract",
        type=Path,
        default=None,
        help="Path to well_records.jsonl.gz from statewide extract",
    )
    ap.add_argument(
        "--chunks-dir",
        type=Path,
        default=None,
        help="If set (and no --from-extract), classify every chunk well live",
    )
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--log-every", type=int, default=10000)
    ap.add_argument("--pass-sample-n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)
    log_path = out / "verify.log"
    fail_path = out / "failures.jsonl.gz"
    pass_path = out / "pass_samples.jsonl.gz"
    summary_path = out / "verify_summary.json"

    random.seed(args.seed)
    hard_counts: Counter[str] = Counter()
    soft_counts: Counter[str] = Counter()
    form_counts: Counter[str] = Counter()
    kind_counts: Counter[str] = Counter()
    conf_counts: Counter[str] = Counter()
    matrix: Counter[str] = Counter()
    n = 0
    n_hard = 0
    n_soft_only = 0
    n_pass = 0
    pass_reservoir: list[dict[str, Any]] = []
    t0 = time.time()

    log(f"START verify out={out}", log_path)

    def handle(rec: dict[str, Any], source: str) -> None:
        nonlocal n, n_hard, n_soft_only, n_pass
        v = verify_record(rec)
        n += 1
        form = v["formation_class"] or "null"
        kind = v["construction_kind"] or "null"
        form_counts[form] += 1
        kind_counts[kind] += 1
        conf_counts[str(v.get("confidence"))] += 1
        loc = (rec.get("extract") or rec).get("location_quality") or rec.get("location_quality") or "?"
        matrix[f"{loc}|{form}"] += 1

        for h in v["hard"]:
            hard_counts[h] += 1
        for s in v["soft"]:
            soft_counts[s] += 1

        if not v["ok"]:
            n_hard += 1
            fail_rec = {
                "refno": rec.get("refno") or rec.get("id") or (rec.get("extract") or {}).get("refno"),
                "source": source,
                "hard": v["hard"],
                "soft": v["soft"],
                "formation_class": form,
                "construction": rec.get("construction")
                or (rec.get("extract") or {}).get("construction"),
                "set_label": v["set_label"],
                "reasons": (rec.get("extract") or rec).get("reasons"),
                "aquifer": rec.get("aquifer"),
                "depth": rec.get("depth"),
                "casing_length": rec.get("casing_length"),
                "screen_length": rec.get("screen_length"),
                "screen_diam": rec.get("screen_diam"),
                "layers_preview": (rec.get("layers_labeled") or rec.get("layers") or [])[:6],
            }
            fail_f.write(json.dumps(fail_rec, ensure_ascii=False) + "\n")
        else:
            n_pass += 1
            if v["soft"]:
                n_soft_only += 1
            # reservoir sampling of clean high-confidence passes
            conf = v.get("confidence")
            if conf == "high" and not v["soft"]:
                item = {
                    "refno": rec.get("refno") or rec.get("id"),
                    "formation_class": form,
                    "set_label": v["set_label"],
                    "construction_kind": kind,
                    "aquifer": rec.get("aquifer"),
                    "depth": rec.get("depth"),
                    "casing_length": rec.get("casing_length"),
                    "screen_length": rec.get("screen_length"),
                }
                if len(pass_reservoir) < args.pass_sample_n:
                    pass_reservoir.append(item)
                else:
                    j = random.randint(0, n_pass)
                    if j < args.pass_sample_n:
                        pass_reservoir[j % args.pass_sample_n] = item

        if args.log_every and n % args.log_every == 0:
            rate = n / max(time.time() - t0, 1e-6)
            log(
                f"progress n={n} hard_fail={n_hard} soft_only={n_soft_only} "
                f"rate={rate:.0f}/s hard_top={hard_counts.most_common(3)}",
                log_path,
            )

    with gzip.open(fail_path, "wt", encoding="utf-8") as fail_f:
        if args.from_extract:
            log(f"reading extract {args.from_extract}", log_path)
            with gzip.open(args.from_extract, "rt", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    rec = json.loads(line)
                    # If extract was pre-v3 without construction, reclassify from fields
                    if not (rec.get("extract") or {}).get("construction") and not rec.get(
                        "construction"
                    ):
                        # rebuild row-like dict
                        row = {k: str(v) for k, v in rec.items() if k not in ("extract", "layers_labeled", "lithology_json") or k == "lithology_json"}
                        if rec.get("lithology_json"):
                            row["lithology_json"] = rec["lithology_json"]
                        for k in (
                            "aquifer",
                            "loc_type",
                            "depth",
                            "casing_length",
                            "screen_length",
                            "screen_diam",
                            "rock_start_ft",
                            "depth_bedrock",
                            "vein_size_ft",
                            "gravel_thickness_ft",
                            "refno",
                            "id",
                        ):
                            if k in rec and rec[k] is not None:
                                row[k] = str(rec[k])
                        classified = classify_well(row)
                        # merge
                        rec = {
                            **row,
                            **{k: classified[k] for k in classified if k != "layers"},
                            "layers_labeled": classified.get("layers"),
                            "extract": {
                                "formation_class": classified["formation_class"],
                                "location_quality": classified["location_quality"],
                                "set_label": classified.get("set_label"),
                                "confidence": classified["confidence"],
                                "reasons": classified["reasons"],
                                "unconsolidated_ft": classified.get("unconsolidated_ft"),
                                "rock_top_ft": classified.get("rock_top_ft"),
                                "construction": classified.get("construction"),
                            },
                            "construction": classified.get("construction"),
                        }
                    else:
                        # normalize extract shape for v3 extract if nested
                        if rec.get("extract") and not rec.get("construction"):
                            # construction may be only under extract in future
                            pass
                        # Re-run classify for accuracy audit (always freshest logic)
                        row = {}
                        for k, v in rec.items():
                            if k in ("extract", "layers_labeled", "layers"):
                                continue
                            if v is not None:
                                row[str(k)] = str(v) if not isinstance(v, (dict, list)) else json.dumps(v)
                        if "lithology_json" in rec and rec["lithology_json"]:
                            row["lithology_json"] = (
                                rec["lithology_json"]
                                if isinstance(rec["lithology_json"], str)
                                else json.dumps(rec["lithology_json"])
                            )
                        classified = classify_well(row)
                        rec = {
                            **row,
                            "formation_class": classified["formation_class"],
                            "location_quality": classified["location_quality"],
                            "set_label": classified.get("set_label"),
                            "reasons": classified["reasons"],
                            "unconsolidated_ft": classified.get("unconsolidated_ft"),
                            "rock_top_ft": classified.get("rock_top_ft"),
                            "confidence": classified["confidence"],
                            "construction": classified.get("construction"),
                            "layers_labeled": classified.get("layers"),
                            "extract": {
                                "formation_class": classified["formation_class"],
                                "location_quality": classified["location_quality"],
                                "set_label": classified.get("set_label"),
                                "confidence": classified["confidence"],
                                "reasons": classified["reasons"],
                                "unconsolidated_ft": classified.get("unconsolidated_ft"),
                                "rock_top_ft": classified.get("rock_top_ft"),
                                "construction": classified.get("construction"),
                            },
                        }
                    handle(rec, str(args.from_extract))
        else:
            chunks_dir = args.chunks_dir
            if chunks_dir is None:
                repo = Path(__file__).resolve().parents[2]
                chunks_dir = repo / "apps" / "hub" / "public" / "well-viewer"
            chunks = discover_chunks(chunks_dir.resolve())
            log(f"classifying+verifying {len(chunks)} chunks from {chunks_dir}", log_path)
            for src in chunks:
                log(f"source {src.name}", log_path)
                for row in iter_csv_rows(src):
                    classified = classify_well(row)
                    rec = {
                        **row,
                        **{k: classified[k] for k in classified if k != "layers"},
                        "layers_labeled": classified.get("layers"),
                        "construction": classified.get("construction"),
                        "extract": {
                            "formation_class": classified["formation_class"],
                            "location_quality": classified["location_quality"],
                            "set_label": classified.get("set_label"),
                            "confidence": classified["confidence"],
                            "reasons": classified["reasons"],
                            "unconsolidated_ft": classified.get("unconsolidated_ft"),
                            "rock_top_ft": classified.get("rock_top_ft"),
                            "construction": classified.get("construction"),
                        },
                    }
                    handle(rec, src.name)

    with gzip.open(pass_path, "wt", encoding="utf-8") as pf:
        for item in pass_reservoir:
            pf.write(json.dumps(item, ensure_ascii=False) + "\n")

    elapsed = time.time() - t0
    summary = {
        "finished_at": utc_now(),
        "wells_verified": n,
        "hard_failures": n_hard,
        "hard_failure_rate_pct": round(100 * n_hard / max(n, 1), 4),
        "soft_flags_wells": n_soft_only,
        "clean_pass": n_pass - n_soft_only if n_pass >= n_soft_only else n_pass,
        "elapsed_sec": round(elapsed, 2),
        "wells_per_sec": round(n / max(elapsed, 1e-6), 1),
        "formation_class": dict(form_counts),
        "construction_kind": dict(kind_counts),
        "confidence": dict(conf_counts),
        "location_x_formation": dict(matrix),
        "hard_rule_counts": dict(hard_counts.most_common()),
        "soft_flag_counts": dict(soft_counts.most_common()),
        "outputs": {
            "failures": str(fail_path),
            "pass_samples": str(pass_path),
            "log": str(log_path),
        },
        "verdict": (
            "PASS_ZERO_HARD_FAILURES"
            if n_hard == 0
            else f"FAIL_{n_hard}_HARD_RULE_VIOLATIONS"
        ),
    }
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    log(
        f"DONE n={n} hard_fail={n_hard} ({summary['hard_failure_rate_pct']}%) "
        f"verdict={summary['verdict']} summary={summary_path}",
        log_path,
    )
    return 0 if n_hard == 0 else 1


if __name__ == "__main__":
    # Fix botched import
    sys.exit(main())
