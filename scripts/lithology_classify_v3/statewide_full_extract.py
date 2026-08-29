#!/usr/bin/env python3
"""
FULL statewide offline extract — dual-label + every CSV field + all lithology text.

SAFE BY DEFAULT:
  - Reads viewer chunks (or full CSV) read-only
  - Writes ONLY under --out (default: data/offline_statewide_extract/)
  - NEVER writes into apps/hub/public/well-viewer or any live path
  - Does not call network / DNR HTML (use lithology already in chunks)

What is extracted per well:
  - All source CSV columns (pass-through)
  - Dual-label: location_quality, formation_class, marker, rock_top, uncon_ft
  - Every lithology layer: depths, formation text, category, rule_id
  - GPM signals: pump_rate, bailer_rate (parsed)
  - Rig: drill_rig_type
  - All non-empty free-text field values for statewide vocabulary mining

Outputs (gzipped where large):
  well_records.jsonl.gz       — one JSON object per well (full extract)
  layer_labels.jsonl.gz       — one line per lithology layer (optional detail)
  field_text_values.jsonl.gz  — distinct text values per field (counts)
  formation_vocabulary.csv    — every distinct formation string + counts
  word_frequency.csv          — token frequencies across all formation text
  summary.json                — counts, coverage, rig/GPM matrices, dual-label matrix
  extract.log                 — progress log

Resume: --resume continues from last completed chunk index file.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

# Reuse dual-label policy from sibling module
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from reprocess_dual_label import (  # type: ignore
    RULESET_ID,
    classify_well,
    discover_chunks,
    first_field,
    is_estimated_row,
    open_text_stream,
    parse_lithology_json,
    positive_float,
)

# Live paths we refuse to write into
FORBIDDEN_OUT_SUBSTRINGS = (
    "/apps/hub/public/",
    "/public/well-viewer/",
    "well-viewer/lithology_v2/out",
)

# All text-ish columns we always mine (plus any extras present in CSV)
KNOWN_TEXT_FIELDS = (
    "id",
    "refno",
    "county",
    "owner",
    "report",
    "loc_type",
    "aquifer",
    "well_use",
    "casing_material",
    "casing_diam",
    "casing_length",
    "screen_diam",
    "screen_length",
    "pump_type",
    "pump_rate",
    "bailer_rate",
    "vein_size_ft",
    "rock_start_ft",
    "gravel_thickness_ft",
    "depth",
    "ground_elev",
    "well_bottom_elev",
    "static_water",
    "depth_bedrock",
    "lithology_source",
    "drill_rig_type",
    "test_method",
    "date_complete",
    "township",
    "range",
    "section",
    "topo",
    "utm_x",
    "utm_y",
    "bedrock_elev",
)

TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9./&\-]{1,40}")


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
    for bad in FORBIDDEN_OUT_SUBSTRINGS:
        if bad in s:
            raise SystemExit(
                f"REFUSING to write under live path ({bad}). "
                f"Choose a local offline --out (got {out})"
            )
    if out.name == "well-viewer":
        raise SystemExit(f"REFUSING to use well-viewer as out dir: {out}")
    out.mkdir(parents=True, exist_ok=True)
    return out


def iter_csv_rows(path: Path) -> Iterator[dict[str, str]]:
    with open_text_stream(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield {k: (v if v is not None else "") for k, v in row.items()}


def parse_gpm(raw: str) -> float | None:
    if not raw or not str(raw).strip():
        return None
    s = str(raw).strip().lower().replace(",", "")
    s = re.sub(r"\s*gpm\s*", "", s)
    m = re.search(r"[-+]?\d*\.?\d+", s)
    if not m:
        return None
    try:
        n = float(m.group(0))
    except ValueError:
        return None
    if n < 0 or n > 50000:
        return None
    return n


def source_row_passthrough(row: dict[str, str]) -> dict[str, Any]:
    """Keep every non-empty source field (lithology_json truncated in summary only)."""
    out: dict[str, Any] = {}
    for k, v in row.items():
        if v is None:
            continue
        s = str(v)
        if not s.strip():
            continue
        # Keep full lithology in well record — needed for audit
        out[k] = s
    return out


def mine_text_fields(
    row: dict[str, str],
    field_values: dict[str, Counter[str]],
    max_value_len: int = 200,
) -> None:
    for k, v in row.items():
        if k in ("lithology_json", "well_log_json", "welllog_json", "log_json", "lithology"):
            continue
        if v is None:
            continue
        s = str(v).strip()
        if not s:
            continue
        if len(s) > max_value_len:
            s = s[:max_value_len] + "…"
        field_values[k][s] += 1


def tokenize_formation(text: str) -> list[str]:
    return [t.upper() for t in TOKEN_RE.findall(text or "")]


def file_fingerprint(paths: list[Path]) -> str:
    h = hashlib.sha256()
    for p in paths:
        st = p.stat()
        h.update(f"{p.name}:{st.st_size}:{int(st.st_mtime)}\n".encode())
    return h.hexdigest()[:16]


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Statewide full offline extract (does not touch live hub data)"
    )
    ap.add_argument(
        "--chunks-dir",
        type=Path,
        default=None,
        help="Directory with dnr_wells_chunk_*.csv.gz (read-only)",
    )
    ap.add_argument("--full-csv", type=Path, default=None)
    ap.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Offline output dir (default: data/offline_statewide_extract/<timestamp>)",
    )
    ap.add_argument("--log-every", type=int, default=5000)
    ap.add_argument(
        "--write-layer-detail",
        action="store_true",
        default=True,
        help="Write layer_labels.jsonl.gz (default on)",
    )
    ap.add_argument(
        "--no-layer-detail",
        action="store_true",
        help="Skip per-layer file (smaller disk)",
    )
    ap.add_argument("--max-wells", type=int, default=0)
    ap.add_argument(
        "--resume",
        action="store_true",
        help="Resume using progress.json in --out",
    )
    args = ap.parse_args()

    repo = Path(__file__).resolve().parents[2]
    if args.chunks_dir is None and args.full_csv is None:
        args.chunks_dir = repo / "apps" / "hub" / "public" / "well-viewer"

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    if args.out is None:
        args.out = repo / "data" / "offline_statewide_extract" / f"run_{stamp}"

    out = assert_safe_out(args.out)
    log_path = out / "extract.log"
    write_layers = args.write_layer_detail and not args.no_layer_detail

    sources: list[Path] = []
    if args.full_csv:
        if not args.full_csv.exists():
            log(f"ERROR: full csv missing {args.full_csv}", log_path)
            return 2
        sources.append(args.full_csv.resolve())
    else:
        chunks = discover_chunks(args.chunks_dir.resolve())
        if not chunks:
            log(f"ERROR: no chunks in {args.chunks_dir}", log_path)
            return 2
        sources = [c.resolve() for c in chunks]

    progress_path = out / "progress.json"
    start_source_idx = 0
    if args.resume and progress_path.exists():
        try:
            prog = json.loads(progress_path.read_text(encoding="utf-8"))
            start_source_idx = int(prog.get("next_source_idx", 0))
            log(f"RESUME from source index {start_source_idx}", log_path)
        except Exception as e:
            log(f"WARN resume parse failed: {e}", log_path)

    well_path = out / "well_records.jsonl.gz"
    layer_path = out / "layer_labels.jsonl.gz"
    # append mode when resuming
    well_mode = "at" if args.resume and well_path.exists() and start_source_idx > 0 else "wt"
    layer_mode = "at" if args.resume and layer_path.exists() and start_source_idx > 0 else "wt"

    meta = {
        "started_at": utc_now(),
        "ruleset_id": RULESET_ID,
        "sources": [str(s) for s in sources],
        "source_fingerprint": file_fingerprint(sources),
        "out": str(out),
        "live_paths_touched": False,
        "notes": [
            "Read-only input; offline extract only",
            "Does not modify apps/hub/public/well-viewer",
            "Verify locally before any deploy",
        ],
    }
    (out / "run_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    log(
        f"START statewide full extract sources={len(sources)} out={out} "
        f"layers={write_layers} ruleset={RULESET_ID}",
        log_path,
    )

    form_vocab: Counter[str] = Counter()
    word_freq: Counter[str] = Counter()
    field_values: dict[str, Counter[str]] = defaultdict(Counter)
    matrix: Counter[str] = Counter()
    form_counts: Counter[str] = Counter()
    loc_counts: Counter[str] = Counter()
    conf_counts: Counter[str] = Counter()
    litho_source_counts: Counter[str] = Counter()
    rig_counts: Counter[str] = Counter()
    aquifer_counts: Counter[str] = Counter()
    loc_type_counts: Counter[str] = Counter()
    well_use_counts: Counter[str] = Counter()
    pump_type_counts: Counter[str] = Counter()
    test_method_counts: Counter[str] = Counter()
    casing_mat_counts: Counter[str] = Counter()
    county_counts: Counter[str] = Counter()
    gpm_buckets: Counter[str] = Counter()
    has_lithology = 0
    has_pump_gpm = 0
    has_bailer_gpm = 0
    has_rig = 0
    has_rock_top = 0
    has_vein = 0
    n = 0
    n_layers = 0
    n_from_resume = 0
    t0 = time.time()

    # If resuming mid-run without reloading counters, summary will be partial —
    # document that in progress file.
    layer_f: Any = None
    try:
        well_f = gzip.open(well_path, well_mode, encoding="utf-8")
        if write_layers:
            layer_f = gzip.open(layer_path, layer_mode, encoding="utf-8")

        for si, src in enumerate(sources):
            if si < start_source_idx:
                continue
            log(f"source[{si}] {src.name}", log_path)
            src_n = 0
            try:
                for row in iter_csv_rows(src):
                    dual = classify_well(row)
                    layers = dual.pop("layers")
                    dual.pop("rule_hits", None)

                    src_fields = source_row_passthrough(row)
                    # Drop huge duplicate if we store structured layers
                    litho_raw = src_fields.get("lithology_json") or src_fields.get("lithology")
                    pump_gpm = parse_gpm(str(row.get("pump_rate") or ""))
                    bailer_gpm = parse_gpm(str(row.get("bailer_rate") or ""))
                    rig = (row.get("drill_rig_type") or "").strip()
                    aq = first_field(row, ("aquifer", "aquifer_type", "primary_aquifer"))
                    loc_t = first_field(row, ("loc_type", "location_type"))
                    litho_src = (row.get("lithology_source") or "").strip() or "none"

                    rec = {
                        **{k: v for k, v in src_fields.items() if k not in ("lithology_json",)},
                        "extract": {
                            "ruleset_id": RULESET_ID,
                            "location_quality": dual.get("location_quality"),
                            "formation_class": dual.get("formation_class"),
                            "marker_category": dual.get("marker_category"),
                            "display_label": dual.get("display_label"),
                            "rock_top_ft": dual.get("rock_top_ft"),
                            "unconsolidated_ft": dual.get("unconsolidated_ft"),
                            "confidence": dual.get("confidence"),
                            "reasons": dual.get("reasons"),
                            "layer_count": dual.get("layer_count"),
                            "pump_rate_gpm": pump_gpm,
                            "bailer_rate_gpm": bailer_gpm,
                            "drill_rig_type": rig or None,
                            "is_estimated_location": is_estimated_row(row),
                            "has_lithology": bool(layers),
                            "source_file": src.name,
                        },
                        "layers_labeled": [
                            {
                                "index": L.get("index"),
                                "formation": L.get("formation"),
                                "top_ft": L.get("top_ft"),
                                "bottom_ft": L.get("bottom_ft"),
                                "thickness_ft": L.get("thickness_ft"),
                                "category": L.get("category"),
                                "rule_id": L.get("rule_id"),
                                "counts_toward_uncon": L.get("counts_toward_uncon"),
                                "is_rock_top_signal": L.get("is_rock_top_signal"),
                            }
                            for L in layers
                        ],
                    }
                    # Keep raw lithology_json for audit (can be large)
                    if litho_raw:
                        rec["lithology_json"] = litho_raw

                    well_f.write(json.dumps(rec, ensure_ascii=False) + "\n")

                    if write_layers and layer_f is not None:
                        ref = dual.get("refno") or rec.get("refno") or rec.get("id")
                        for L in layers:
                            layer_f.write(
                                json.dumps(
                                    {"refno": ref, "source_file": src.name, **L},
                                    ensure_ascii=False,
                                )
                                + "\n"
                            )

                    # --- aggregates ---
                    for L in layers:
                        fm = str(L.get("formation") or "").strip()
                        if fm:
                            form_vocab[fm] += 1
                            for tok in tokenize_formation(fm):
                                word_freq[tok] += 1
                    n_layers += len(layers)
                    if layers:
                        has_lithology += 1

                    mine_text_fields(row, field_values)

                    loc = dual.get("location_quality") or "unknown"
                    form = dual.get("formation_class") or "unknown"
                    loc_counts[loc] += 1
                    form_counts[form] += 1
                    conf_counts[str(dual.get("confidence"))] += 1
                    matrix[f"{loc}|{form}"] += 1
                    litho_source_counts[litho_src] += 1
                    if rig:
                        has_rig += 1
                        rig_counts[rig[:120]] += 1
                    if aq:
                        aquifer_counts[aq[:120]] += 1
                    if loc_t:
                        loc_type_counts[loc_t[:120]] += 1
                    wu = (row.get("well_use") or "").strip()
                    if wu:
                        well_use_counts[wu[:120]] += 1
                    pt = (row.get("pump_type") or "").strip()
                    if pt:
                        pump_type_counts[pt[:120]] += 1
                    tm = (row.get("test_method") or "").strip()
                    if tm:
                        test_method_counts[tm[:120]] += 1
                    cm = (row.get("casing_material") or "").strip()
                    if cm:
                        casing_mat_counts[cm[:120]] += 1
                    co = (row.get("county") or "").strip()
                    if co:
                        county_counts[co.upper()] += 1

                    if pump_gpm is not None:
                        has_pump_gpm += 1
                        if pump_gpm < 10:
                            gpm_buckets["pump_<10"] += 1
                        elif pump_gpm <= 25:
                            gpm_buckets["pump_10_25"] += 1
                        else:
                            gpm_buckets["pump_>25"] += 1
                    if bailer_gpm is not None:
                        has_bailer_gpm += 1
                    if dual.get("rock_top_ft") is not None:
                        has_rock_top += 1
                    if positive_float(str(row.get("vein_size_ft") or row.get("gravel_thickness_ft") or "")):
                        has_vein += 1

                    n += 1
                    src_n += 1
                    if args.log_every and n % args.log_every == 0:
                        rate = n / max(time.time() - t0, 1e-6)
                        log(
                            f"progress n={n} layers={n_layers} rate={rate:.1f}/s "
                            f"litho={has_lithology} pump_gpm={has_pump_gpm} rig={has_rig} "
                            f"matrix={dict(matrix)}",
                            log_path,
                        )
                    if args.max_wells and n >= args.max_wells:
                        log(f"hit --max-wells {args.max_wells}", log_path)
                        break
            except Exception as e:
                log(f"ERROR source {src}: {e}", log_path)
                progress_path.write_text(
                    json.dumps(
                        {
                            "error": str(e),
                            "next_source_idx": si,
                            "wells_so_far": n,
                            "failed_source": str(src),
                        },
                        indent=2,
                    ),
                    encoding="utf-8",
                )
                raise

            progress_path.write_text(
                json.dumps(
                    {
                        "next_source_idx": si + 1,
                        "wells_so_far": n,
                        "last_source": src.name,
                        "last_source_wells": src_n,
                        "updated_at": utc_now(),
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
            log(f"finished source[{si}] {src.name} wells_in_source={src_n} total={n}", log_path)
            if args.max_wells and n >= args.max_wells:
                break

    finally:
        try:
            well_f.close()
        except Exception:
            pass
        if layer_f is not None:
            try:
                layer_f.close()
            except Exception:
                pass

    elapsed = time.time() - t0

    # Write vocabulary CSVs
    vocab_path = out / "formation_vocabulary.csv"
    with vocab_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["formation", "layer_count"])
        for form, c in form_vocab.most_common():
            w.writerow([form, c])

    word_path = out / "word_frequency.csv"
    with word_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["token", "count"])
        for tok, c in word_freq.most_common(5000):
            w.writerow([tok, c])

    # Distinct text values per field (top 500 each)
    text_path = out / "field_text_values.jsonl.gz"
    with gzip.open(text_path, "wt", encoding="utf-8") as f:
        for field, counter in sorted(field_values.items()):
            for val, c in counter.most_common(500):
                f.write(
                    json.dumps(
                        {"field": field, "value": val, "count": c},
                        ensure_ascii=False,
                    )
                    + "\n"
                )

    def top_dict(c: Counter[str], n: int = 50) -> dict[str, int]:
        return dict(c.most_common(n))

    summary = {
        "ruleset_id": RULESET_ID,
        "finished_at": utc_now(),
        "wells": n,
        "layers_labeled": n_layers,
        "elapsed_sec": round(elapsed, 2),
        "wells_per_sec": round(n / max(elapsed, 1e-6), 2),
        "live_paths_touched": False,
        "out": str(out),
        "coverage": {
            "has_lithology": has_lithology,
            "has_lithology_pct": round(100 * has_lithology / max(n, 1), 2),
            "has_pump_gpm": has_pump_gpm,
            "has_bailer_gpm": has_bailer_gpm,
            "has_drill_rig_type": has_rig,
            "has_rock_top": has_rock_top,
            "has_vein_or_gravel_ft": has_vein,
        },
        "location_quality": dict(loc_counts),
        "formation_class": dict(form_counts),
        "confidence": dict(conf_counts),
        "location_x_formation": dict(matrix),
        "lithology_source": top_dict(litho_source_counts, 20),
        "drill_rig_type": top_dict(rig_counts, 40),
        "aquifer": top_dict(aquifer_counts, 40),
        "loc_type": top_dict(loc_type_counts, 30),
        "well_use": top_dict(well_use_counts, 40),
        "pump_type": top_dict(pump_type_counts, 30),
        "test_method": top_dict(test_method_counts, 30),
        "casing_material": top_dict(casing_mat_counts, 30),
        "county_top": top_dict(county_counts, 30),
        "gpm_buckets": dict(gpm_buckets),
        "formation_vocab_distinct": len(form_vocab),
        "word_tokens_distinct": len(word_freq),
        "text_fields_mined": len(field_values),
        "outputs": {
            "well_records": str(well_path),
            "layer_labels": str(layer_path) if write_layers else None,
            "formation_vocabulary": str(vocab_path),
            "word_frequency": str(word_path),
            "field_text_values": str(text_path),
            "log": str(log_path),
        },
        "sources": [str(s) for s in sources],
        "verify_before_deploy": True,
    }
    summary_path = out / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    # Human-readable README in the run folder
    (out / "README.txt").write_text(
        "\n".join(
            [
                "OFFLINE statewide extract — not deployed",
                f"Finished: {summary['finished_at']}",
                f"Wells: {n}",
                f"Layers labeled: {n_layers}",
                f"Lithology coverage: {summary['coverage']['has_lithology_pct']}%",
                "",
                "This directory is local verification only.",
                "Nothing under apps/hub/public/well-viewer was modified.",
                "Review summary.json + sample well_records before any deploy.",
                "",
                "Key files:",
                "  well_records.jsonl.gz  — full per-well extract",
                "  layer_labels.jsonl.gz  — every layer label",
                "  formation_vocabulary.csv",
                "  word_frequency.csv",
                "  field_text_values.jsonl.gz",
                "  summary.json",
                "  extract.log",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    log(
        f"DONE wells={n} layers={n_layers} elapsed={elapsed:.1f}s "
        f"litho_pct={summary['coverage']['has_lithology_pct']} "
        f"summary={summary_path}",
        log_path,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
