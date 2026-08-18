#!/usr/bin/env python3
"""Classify + verify every statewide chunk well. Offline only."""
from __future__ import annotations

import gzip
import json
import os
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

from reprocess_dual_label import classify_well, discover_chunks  # noqa: E402
from verify_all_wells import iter_csv_rows, verify_record  # noqa: E402


def log(msg: str, log_path: Path) -> None:
    line = f"{datetime.now(timezone.utc).isoformat()} {msg}"
    print(line, flush=True)
    with log_path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    out = Path(os.environ.get("OUT_DIR") or (repo / "data/offline_statewide_extract/verify_latest"))
    out.mkdir(parents=True, exist_ok=True)
    chunks_dir = Path(
        os.environ.get("CHUNKS_DIR") or (repo / "apps/hub/public/well-viewer")
    ).resolve()
    chunks = discover_chunks(chunks_dir)
    log_path = out / "full_run.log"
    well_path = out / "well_records.jsonl.gz"
    fail_path = out / "failures.jsonl.gz"

    hard_counts: Counter[str] = Counter()
    soft_counts: Counter[str] = Counter()
    form_counts: Counter[str] = Counter()
    kind_counts: Counter[str] = Counter()
    conf_counts: Counter[str] = Counter()
    matrix: Counter[str] = Counter()
    loc_counts: Counter[str] = Counter()
    n = n_hard = n_soft = 0
    t0 = time.time()
    log(f"START FINAL classify+verify sources={len(chunks)} out={out}", log_path)

    with gzip.open(well_path, "wt", encoding="utf-8") as wf, gzip.open(
        fail_path, "wt", encoding="utf-8"
    ) as ff:
        for si, src in enumerate(chunks):
            log(f"source[{si}] {src.name}", log_path)
            for row in iter_csv_rows(src):
                c = classify_well(row)
                layers = c.pop("layers", [])
                c.pop("rule_hits", None)
                rec = {
                    **{
                        k: v
                        for k, v in row.items()
                        if v and str(v).strip() and k != "lithology_json"
                    },
                    "formation_class": c.get("formation_class"),
                    "location_quality": c.get("location_quality"),
                    "marker_category": c.get("marker_category"),
                    "display_label": c.get("display_label"),
                    "set_label": c.get("set_label"),
                    "rock_top_ft": c.get("rock_top_ft"),
                    "unconsolidated_ft": c.get("unconsolidated_ft"),
                    "confidence": c.get("confidence"),
                    "reasons": c.get("reasons"),
                    "ruleset_id": c.get("ruleset_id"),
                    "construction": c.get("construction"),
                    "layers_labeled": layers,
                    "extract": {
                        "formation_class": c.get("formation_class"),
                        "location_quality": c.get("location_quality"),
                        "set_label": c.get("set_label"),
                        "confidence": c.get("confidence"),
                        "reasons": c.get("reasons"),
                        "unconsolidated_ft": c.get("unconsolidated_ft"),
                        "rock_top_ft": c.get("rock_top_ft"),
                        "construction": c.get("construction"),
                    },
                }
                wf.write(json.dumps(rec, ensure_ascii=False) + "\n")
                v = verify_record(rec)
                n += 1
                form = v["formation_class"] or "?"
                kind = v["construction_kind"] or "?"
                form_counts[form] += 1
                kind_counts[kind] += 1
                conf_counts[str(v.get("confidence"))] += 1
                loc = c.get("location_quality") or "?"
                loc_counts[loc] += 1
                matrix[f"{loc}|{form}"] += 1
                for h in v["hard"]:
                    hard_counts[h] += 1
                for s in v["soft"]:
                    soft_counts[s] += 1
                if not v["ok"]:
                    n_hard += 1
                    ff.write(
                        json.dumps(
                            {
                                "refno": row.get("refno"),
                                "hard": v["hard"],
                                "soft": v["soft"],
                                "formation_class": form,
                                "construction": c.get("construction"),
                                "set_label": v["set_label"],
                                "reasons": c.get("reasons"),
                                "aquifer": row.get("aquifer"),
                                "depth": row.get("depth"),
                                "casing_length": row.get("casing_length"),
                                "screen_length": row.get("screen_length"),
                                "layers_preview": layers[:6],
                                "source": src.name,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                elif v["soft"]:
                    n_soft += 1
                if n % 25000 == 0:
                    rate = n / max(time.time() - t0, 1e-6)
                    log(
                        f"progress n={n} hard={n_hard} soft={n_soft} rate={rate:.0f}/s",
                        log_path,
                    )
            log(f"finished {src.name} total={n}", log_path)

    elapsed = time.time() - t0
    bad_R = bad_G = rock_screen = 0
    with gzip.open(well_path, "rt", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            sl = r.get("set_label") or ""
            form = r.get("formation_class")
            if sl.startswith("R@") and form != "rock":
                bad_R += 1
            if sl.startswith("G@") and form == "rock":
                bad_G += 1
            if form == "rock" and (r.get("construction") or {}).get("has_screen"):
                rock_screen += 1

    summary = {
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "ruleset": "formation-class-v3-construction-FINAL",
        "wells": n,
        "hard_failures": n_hard,
        "hard_failure_rate_pct": round(100 * n_hard / max(n, 1), 4),
        "soft_flag_wells": n_soft,
        "elapsed_sec": round(elapsed, 2),
        "wells_per_sec": round(n / max(elapsed, 1e-6), 1),
        "formation_class": dict(form_counts),
        "construction_kind": dict(kind_counts),
        "confidence": dict(conf_counts),
        "location_quality": dict(loc_counts),
        "location_x_formation": dict(matrix),
        "hard_rule_counts": dict(hard_counts),
        "soft_flag_counts": dict(soft_counts),
        "integrity": {
            "R_label_not_rock": bad_R,
            "G_label_but_rock": bad_G,
            "rock_with_screen": rock_screen,
        },
        "live_paths_touched": False,
        "verdict": (
            "PASS"
            if n_hard == 0 and bad_R == 0 and bad_G == 0 and rock_screen == 0
            else f"ISSUES hard={n_hard} badR={bad_R} badG={bad_G} rock_screen={rock_screen}"
        ),
        "outputs": {
            "well_records": str(well_path),
            "failures": str(fail_path),
            "log": str(log_path),
        },
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    log(
        f"DONE verdict={summary['verdict']} wells={n} hard={n_hard} integrity={summary['integrity']}",
        log_path,
    )
    print(json.dumps(summary, indent=2))
    return 0 if summary["verdict"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
