#!/usr/bin/env python3
"""
Offline dual-label reprocess for DNR wells.

- Labels every lithology layer (rock / unconsolidated / mixed / overburden / …)
- Derives formation_class without treating estimated location as a formation
- Writes sidecars + logs only (never mutates source chunks by default)

Policy mirrors apps/hub/src/lib/formation-class.ts and lithology_v2/classify_v2.py.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

RULESET_ID = "formation-class-v3-construction-2026-07-21"
MIN_UNCON_OVERRIDE_FT = 8.0
CASING_ROCK_ABOVE_TOL_FT = 3.0
CASING_INTO_ROCK_MAX_FT = 15.0
MIN_OPEN_HOLE_ROCK_FT = 1.5

DRY_RE = re.compile(r"dry\s*hole|no\s*water|abandon|plugged|cement\s*fill", re.I)
ROCK_AQ_RE = re.compile(
    r"\b(bedrock|limestone|dolomite|dolostone|shale|sandstone|siltstone|granite|marble)\b",
    re.I,
)
UNCON_AQ_RE = re.compile(r"\b(unconsolidated|sand|gravel|drift|outwash)\b", re.I)
# Sandstone family BEFORE loose sand — includes sand rock / sandra rock / sandrock
SANDSTONE_FAMILY_RE = re.compile(
    r"sand\s*stone|sandstone|\bss\b|sand\s*[-_]?\s*rock|sandrock|sandy\s*rock|"
    r"sandra\s*rock|sandr\s*rock|snd\s*rock|"
    r"white\s*sand\s*rock|yel(?:low)?\s*sand\s*rock|brn\s*sand\s*rock|"
    r"gray\s*sand\s*rock|grey\s*sand\s*rock|soft\s*sand\s*rock|hard\s*sand\s*rock",
    re.I,
)

PATTERN_RULES: list[tuple[str, re.Pattern[str], str]] = [
    ("placeholder", re.compile(r"no digitized|merged welllogs|open dnr report|placeholder|^\s*-\s*$", re.I), "ignore"),
    ("dry_abandon", DRY_RE, "ignore"),
    ("sandstone_family", SANDSTONE_FAMILY_RE, "rock"),
    ("water_bearing_stone", re.compile(r"water\s*bear.*\bstone\b|\bstone\b.*water\s*bear", re.I), "rock"),
    ("hard_rock", re.compile(r"hard\s*rock|solid\s*rock|bedrock|rip\s*rap", re.I), "rock"),
    ("limestone_dolomite", re.compile(r"limestone|dolomite|dolostone|lime\s*stone|\blime\b|gray\s*lime|grey\s*lime|br\s*lime|hard\s*lime|sandy\s*lime", re.I), "rock"),
    ("shale_slate", re.compile(r"\bshale\b|\bslate\b|\bsh\b(?!\s*&\s*g)", re.I), "rock"),
    ("siltstone_quartzite", re.compile(r"\bsiltstone\b|\bquartzite\b|\bchert\b", re.I), "rock"),
    ("igneous_metamorphic", re.compile(r"granite|marble|basalt|gneiss|schist|conglomerate|argillite|\bcoal\b", re.I), "rock"),
    ("bedrock_abbrev", re.compile(r"\b(ls|lm|dl|dol)\b", re.I), "rock"),
    ("topsoil_fill", re.compile(r"^top\s*soil$|^topsoil$|^fill$|^soil$|^surface$|^top$|^dirt$|fill\s*dirt|surface\s*fill|blanket|overburden|top\s*dirt|black\s*dirt", re.I), "overburden"),
    ("sand_gravel_explicit", re.compile(r"\bs\s*&\s*g\b|\bsg\b|sand\s*/\s*g|sand\s*grav|sand\s+and\s+grav|s\s+and\s+g", re.I), "unconsolidated"),
    ("gravel", re.compile(r"\bgrav\b|\bgravel\b|pea\s*grav|gravelly|pea\s*stone", re.I), "unconsolidated"),
    ("water_bearing_uncons", re.compile(r"water\s*b\.?|water\s*bearing|water\s*grav|water\s*zone|producing|water\s*vein|\bvein\b|\bvain\b", re.I), "unconsolidated"),
    ("drift_outwash", re.compile(r"glacial\s*drift|\bdrift\b|outwash|esker|kame|\btill\b|alluv|terrace", re.I), "unconsolidated"),
    ("sand", re.compile(r"\bsand\b|\bsa\b|\bgr\b(?!\s*ls)|\bfine\s+sand\b|\bcoarse\s+sand\b|\bmedium\s+sand\b", re.I), "unconsolidated"),
    ("clay_silt", re.compile(r"\bclay\b|\bsilt\b|\bmuck\b|\bpeat\b|\bloam\b|hardpan|caliche", re.I), "mixed"),
    ("generic_rock_word", re.compile(r"\brock\b|\bstone\b", re.I), "rock"),
]

LITHO_KEYS = ("lithology_json", "lithology", "well_log_json", "welllog_json", "log_json")
AQ_KEYS = ("aquifer", "aquifer_type", "aquifer_desc", "primary_aquifer", "water_bearing_formation")
LOC_KEYS = ("loc_type", "location_type", "loc_method")


def log(msg: str, log_path: Path | None = None) -> None:
    line = f"{datetime.now(timezone.utc).isoformat()} {msg}"
    print(line, flush=True)
    if log_path:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def formation_category(name: str) -> tuple[str, str]:
    raw = (name or "").strip()
    if not raw:
        return "ignore", "empty"
    if DRY_RE.search(raw):
        return "ignore", "dry"
    for rid, rx, cat in PATTERN_RULES:
        if rx.search(raw):
            return cat, rid
    return "unknown", "none"


def litho_parse_depth(v: Any) -> float:
    if v is None:
        return float("nan")
    s = re.sub(r"[^0-9.\-]", "", str(v).strip())
    if not s:
        return float("nan")
    try:
        return float(s)
    except ValueError:
        return float("nan")


def litho_formation_name(layer: dict[str, Any]) -> str:
    for key in (
        "formation", "Formation", "material", "Material",
        "lithology", "Lithology", "description", "strata",
    ):
        v = layer.get(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def litho_top_bottom(layer: dict[str, Any], prev_bot: float) -> tuple[float, float]:
    top = litho_parse_depth(
        layer.get("top") or layer.get("Top") or layer.get("from") or layer.get("From")
        or layer.get("depth_top") or layer.get("depth_from") or layer.get("StartDepth")
    )
    bot = litho_parse_depth(
        layer.get("bottom") or layer.get("Bottom") or layer.get("to") or layer.get("To")
        or layer.get("depth_bottom") or layer.get("depth_to") or layer.get("EndDepth")
    )
    if bot != bot:
        return top, bot
    if top != top:
        top = 0.0 if prev_bot != prev_bot else prev_bot
    return top, bot


def counts_toward_uncon(category: str, fm: str) -> bool:
    if SANDSTONE_FAMILY_RE.search(fm or ""):
        return False
    if category == "unconsolidated":
        return True
    if category in ("rock", "overburden", "ignore"):
        return False
    if category == "mixed":
        return bool(re.search(r"grav|gravel|\bsg\b|s\s*&\s*g|sand\s*grav|s\s+and\s+g", fm, re.I))
    l = fm.lower()
    if re.search(r"lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|\brock\b", l, re.I) and not re.search(
        r"sand\s+and|gravel|drift|sa\b|gr\b|sg\b|outwash|till", l, re.I
    ):
        return False
    return bool(
        re.search(
            r"grav|gravel|\bsg\b|s\s*&\s*g|sand\s*grav|water\s*b\.?|water\s*bearing|"
            r"outwash|drift|till|\bsand\b|\bsa\b|\bgr\b",
            l,
            re.I,
        )
    )


def is_rock_top_signal(category: str, fm: str) -> bool:
    if SANDSTONE_FAMILY_RE.search(fm or "") or category == "rock":
        return True
    if category in ("unconsolidated", "overburden", "ignore"):
        return False
    l = fm.lower()
    return bool(
        re.search(r"lime|dolomite|shale|slate|sandstone|siltstone|bedrock|granite|marble|\brock\b", l, re.I)
        and "sand and" not in l
        and "gravel" not in l
    )


def analyze_construction(row: dict[str, str], rock_top: float | None) -> dict[str, Any]:
    """Rock open-hole: no screen + casing at/into rock + depth > casing."""
    reasons: list[str] = []
    casing = positive_float(first_field(row, ("casing_length",)))
    screen_len = positive_float(first_field(row, ("screen_length",)))
    screen_diam = positive_float(first_field(row, ("screen_diam", "screen_diameter")))
    depth = positive_float(first_field(row, ("depth", "well_depth", "total_depth")))
    has_screen = (screen_len is not None and screen_len > 0) or (
        screen_diam is not None and screen_diam > 0
    )
    no_screen = not has_screen
    open_hole = None
    if casing is not None and depth is not None:
        open_hole = round(max(0.0, depth - casing), 1)

    into = above = None
    if casing is not None and rock_top is not None and rock_top > 0:
        delta = casing - rock_top
        if delta >= 0:
            into = round(delta, 1)
            above = 0.0
        else:
            above = round(-delta, 1)
            into = 0.0

    kind = "unknown"
    set_label = None
    producing_set = None

    if has_screen:
        kind = "screen_set"
        reasons.append("construction:screen_present")
        if casing is not None:
            set_label = f"G@{int(round(casing))}"
            producing_set = int(round(casing + ((screen_len or 0) / 2)))
    elif (
        no_screen
        and rock_top is not None
        and rock_top > 0
        and casing is not None
        and depth is not None
    ):
        open_v = open_hole if open_hole is not None else 0.0
        into_v = into if into is not None else -999.0
        above_v = above if above is not None else 999.0
        casing_near_rock = (0 <= into_v <= CASING_INTO_ROCK_MAX_FT) or (
            0 <= above_v <= CASING_ROCK_ABOVE_TOL_FT and into_v == 0
        )
        if open_v < MIN_OPEN_HOLE_ROCK_FT:
            reasons.append(
                f"construction:reject_rock_no_open_hole casing={casing} depth={depth} rock={rock_top}"
            )
        elif casing_near_rock or into_v > CASING_INTO_ROCK_MAX_FT:
            kind = "rock_open_hole"
            reasons.append(
                f"construction:rock_open_hole casing={casing} rock_top={rock_top} open_hole={open_v}"
            )
            if into_v and into_v > 0:
                reasons.append(f"construction:casing_into_rock_ft:{into_v}")
            set_label = f"R@{int(round(casing))}"
            producing_set = int(round(casing))

    return {
        "casing_length_ft": casing,
        "screen_length_ft": screen_len,
        "screen_diam": screen_diam,
        "has_screen": has_screen,
        "no_screen": no_screen,
        "total_depth_ft": depth,
        "open_hole_below_casing_ft": open_hole,
        "casing_into_rock_ft": into,
        "casing_above_rock_ft": above,
        "kind": kind,
        "set_label": set_label,
        "producing_set_ft": producing_set,
        "reasons": reasons,
    }


def aquifer_class(aq: str) -> str:
    s = (aq or "").strip()
    if not s:
        return "unknown"
    if re.match(r"^estimated\b", s, re.I):
        return "unknown"
    if ROCK_AQ_RE.search(s) and not re.search(r"unconsolidated|sand\s*(and|&)?\s*grav", s, re.I):
        return "bedrock"
    if UNCON_AQ_RE.search(s) and not re.search(r"sandstone|siltstone", s, re.I):
        return "unconsolidated"
    if ROCK_AQ_RE.search(s):
        return "bedrock"
    return "unknown"


def parse_lithology_json(raw: Any) -> list[dict[str, Any]]:
    if raw is None:
        return []
    s = str(raw).strip()
    if not s:
        return []
    try:
        j = json.loads(s)
        if isinstance(j, str):
            t = j.strip()
            if t.startswith("[") or t.startswith("{"):
                j = json.loads(t)
    except Exception:
        return []
    if isinstance(j, list):
        return [x for x in j if isinstance(x, dict)]
    if isinstance(j, dict):
        for key in ("layers", "intervals", "data", "well_log", "WellLog", "Lithology", "records"):
            a = j.get(key)
            if isinstance(a, list):
                return [x for x in a if isinstance(x, dict)]
    return []


def first_field(row: dict[str, str], keys: Iterable[str]) -> str:
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip():
            return str(row[k]).strip()
        # case-insensitive
        for rk, rv in row.items():
            if rk.lower() == k.lower() and rv is not None and str(rv).strip():
                return str(rv).strip()
    return ""


def positive_float(s: str) -> float | None:
    if not s:
        return None
    try:
        n = float(re.sub(r"[^0-9.\-]", "", s.replace(",", "")))
    except ValueError:
        return None
    if n > 0:
        return n
    return None


def is_estimated_row(row: dict[str, str]) -> bool:
    aq = first_field(row, AQ_KEYS).lower()
    loc = first_field(row, LOC_KEYS).lower()
    return "estimated" in aq or "estimated" in loc


def classify_well(row: dict[str, str]) -> dict[str, Any]:
    reasons: list[str] = []
    layer_detail: list[dict[str, Any]] = []
    raw_litho = first_field(row, LITHO_KEYS)
    layers = parse_lithology_json(raw_litho)
    prev_bot = float("nan")
    rock_top: float | None = None
    wb_sum = 0.0
    only_overburden_uncon = True
    rule_hits: Counter[str] = Counter()

    for i, layer in enumerate(layers):
        fm = litho_formation_name(layer)
        top, bot = litho_top_bottom(layer, prev_bot)
        if bot == bot:
            prev_bot = bot
        cat, rule_id = formation_category(fm)
        rule_hits[rule_id] += 1
        thick = (bot - top) if (bot == bot and top == top and bot > top) else None
        ctu = counts_toward_uncon(cat, fm)
        rts = is_rock_top_signal(cat, fm)
        if rock_top is None and rts and top == top and top >= 0:
            rock_top = top
        if ctu and thick is not None and thick > 0:
            wb_sum += thick
            if cat != "overburden":
                only_overburden_uncon = False
        layer_detail.append(
            {
                "index": i,
                "formation": fm,
                "top_ft": None if top != top else top,
                "bottom_ft": None if bot != bot else bot,
                "thickness_ft": thick,
                "category": cat,
                "rule_id": rule_id,
                "counts_toward_uncon": ctu,
                "is_rock_top_signal": rts,
            }
        )

    chunk_rock = positive_float(first_field(row, ("rock_start_ft", "depth_bedrock")))
    if chunk_rock is not None:
        if rock_top is None:
            rock_top = chunk_rock
            reasons.append(f"rock_top_from_chunk:{chunk_rock}")
        else:
            rock_top = min(rock_top, chunk_rock)

    vein = positive_float(first_field(row, ("gravel_thickness_ft", "vein_size_ft", "vein_size")))
    if vein is not None and wb_sum <= 0:
        wb_sum = vein
        only_overburden_uncon = False
        reasons.append(f"uncon_from_vein_column:{vein}")

    aq = first_field(row, AQ_KEYS)
    aq_cls = aquifer_class(aq)
    if aq_cls != "unknown":
        reasons.append(f"aquifer_text:{aq_cls}")

    well_type = "unknown"
    wb = int(round(wb_sum)) if wb_sum > 0 else None
    construction = analyze_construction(row, rock_top)
    reasons.extend(construction["reasons"])

    # 1) Strong rock construction
    if construction["kind"] == "rock_open_hole":
        well_type = "rock"
        reasons.append("decide:rock_by_construction")

    # 2) Screen set → always unconsolidated (rock wells do not use screens)
    if well_type == "unknown" and construction["kind"] == "screen_set":
        if wb and wb > 0:
            well_type = "unconsolidated"
            reasons.append(f"decide:uncon_by_screen_and_thickness:{wb}")
        else:
            well_type = "unconsolidated"
            reasons.append("decide:uncon_by_screen_present")

    # 3) Lithology when construction inconclusive
    if well_type == "unknown":
        if wb and wb > 0:
            well_type = "unconsolidated"
            reasons.append(f"uncon_thickness_ft:{wb}")
        elif rock_top is not None and rock_top > 0:
            open_h = construction.get("open_hole_below_casing_ft")
            depth = construction.get("total_depth_ft")
            casing = construction.get("casing_length_ft")
            if (
                casing is not None
                and open_h is not None
                and open_h < MIN_OPEN_HOLE_ROCK_FT
                and construction["no_screen"]
            ):
                reasons.append("reject:rock_top_without_open_hole_below_casing")
            elif (
                construction["no_screen"]
                and open_h is not None
                and open_h >= MIN_OPEN_HOLE_ROCK_FT
            ):
                well_type = "rock"
                reasons.append(f"rock_top_ft:{int(round(rock_top))}_with_open_hole:{open_h}")
            elif (
                casing is None
                and construction["no_screen"]
                and depth is not None
                and depth > rock_top + MIN_OPEN_HOLE_ROCK_FT
            ):
                well_type = "rock"
                reasons.append(f"rock_top_ft:{int(round(rock_top))}_depth_below_rock:{depth}")
            else:
                reasons.append(f"rock_top_seen:{int(round(rock_top))}_insufficient_construction")

    # 4) Construction rock beats thin uncon
    if (
        well_type == "unconsolidated"
        and construction["kind"] == "rock_open_hole"
        and (wb or 0) < MIN_UNCON_OVERRIDE_FT
    ):
        well_type = "rock"
        reasons.append("override:rock_construction_beats_thin_uncon")

    # 5) Bedrock aquifer + thin uncon + rock completion evidence
    # Rock wells do NOT use screens — never flip to rock if screen present.
    if well_type == "unconsolidated" and aq_cls == "bedrock":
        if (wb or 0) < MIN_UNCON_OVERRIDE_FT and rock_top is not None:
            if construction["has_screen"]:
                reasons.append("override:skipped_bedrock_aq_because_screen_present")
            else:
                depth = construction.get("total_depth_ft")
                open_h = construction.get("open_hole_below_casing_ft") or 0
                casing_sealed = (
                    construction.get("casing_length_ft") is not None
                    and open_h < MIN_OPEN_HOLE_ROCK_FT
                )
                depth_past = depth is not None and depth > rock_top + MIN_OPEN_HOLE_ROCK_FT
                if casing_sealed and construction["no_screen"]:
                    reasons.append("override:skipped_bedrock_aq_no_open_hole")
                elif (
                    construction["kind"] == "rock_open_hole"
                    or (construction["no_screen"] and open_h >= MIN_OPEN_HOLE_ROCK_FT)
                    or (construction["no_screen"] and depth_past)
                    or (only_overburden_uncon and construction["no_screen"])
                ):
                    well_type = "rock"
                    reasons.append("override:bedrock_aq_thin_uncon_with_rock_completion")

    # 6) Screen present means not a rock open-hole well
    if well_type == "rock" and construction["has_screen"]:
        well_type = "unconsolidated"
        reasons.append("override:screen_present_not_rock_well")

    if well_type == "unknown":
        if aq_cls == "unconsolidated":
            well_type = "unconsolidated"
            reasons.append("fallback_aquifer_unconsolidated")
        elif aq_cls == "bedrock":
            open_h = construction.get("open_hole_below_casing_ft")
            if construction["has_screen"]:
                well_type = "unconsolidated"
                reasons.append("fallback:bedrock_aq_but_screen_present_uncon")
            elif (
                construction.get("casing_length_ft") is not None
                and open_h is not None
                and open_h < MIN_OPEN_HOLE_ROCK_FT
                and construction["no_screen"]
            ):
                reasons.append("fallback:bedrock_aq_but_no_open_hole_rejected")
            else:
                well_type = "rock"
                reasons.append("fallback_aquifer_bedrock")

    if well_type == "unknown" and construction["has_screen"]:
        well_type = "unconsolidated"
        reasons.append("fallback_screen_present")

    estimated = is_estimated_row(row)
    if estimated:
        reasons.insert(0, "location:estimated")
    else:
        reasons.insert(0, "location:verified")

    # Set label from construction + final type
    set_label = construction.get("set_label")
    if not set_label and construction.get("casing_length_ft") is not None:
        csg = int(round(construction["casing_length_ft"]))
        if well_type == "rock":
            set_label = f"R@{csg}"
        elif well_type == "unconsolidated":
            set_label = f"G@{csg}"

    if set_label:
        display = f"Est·{set_label}" if estimated else set_label
    elif estimated:
        display = (
            "Est·G"
            if well_type == "unconsolidated"
            else "Est·R"
            if well_type == "rock"
            else "Est"
        )
    else:
        display = "G" if well_type == "unconsolidated" else "R" if well_type == "rock" else "Well"

    confidence = "low"
    if construction["kind"] in ("rock_open_hole", "screen_set"):
        confidence = "high" if layers or rock_top is not None or wb else "medium"
    elif layers and (wb is not None or rock_top is not None):
        confidence = "high" if aq_cls != "unknown" else "medium"
    elif aq_cls != "unknown":
        confidence = "medium"
    elif well_type != "unknown":
        confidence = "low"

    ref = first_field(row, ("refno", "ref_no", "well_ref", "id", "well_id"))
    return {
        "refno": ref,
        "location_quality": "estimated" if estimated else "verified",
        "formation_class": well_type,
        "marker_category": "estimated" if estimated else well_type if well_type != "unknown" else "rock",
        "display_label": display,
        "set_label": set_label,
        "rock_top_ft": int(round(rock_top)) if rock_top is not None else None,
        "unconsolidated_ft": float(wb) if wb else None,
        "confidence": confidence,
        "reasons": reasons,
        "ruleset_id": RULESET_ID,
        "layer_count": len(layers),
        "layers": layer_detail,
        "rule_hits": dict(rule_hits),
        "construction": {
            k: construction[k]
            for k in (
                "kind",
                "has_screen",
                "casing_length_ft",
                "screen_length_ft",
                "open_hole_below_casing_ft",
                "casing_into_rock_ft",
                "set_label",
                "producing_set_ft",
            )
        },
    }


def open_text_stream(path: Path) -> io.TextIOBase:
    if str(path).endswith(".gz"):
        return io.TextIOWrapper(gzip.open(path, "rb"), encoding="utf-8", errors="replace")
    return path.open("r", encoding="utf-8", errors="replace")


def iter_csv_rows(path: Path) -> Iterator[dict[str, str]]:
    with open_text_stream(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield {k: (v if v is not None else "") for k, v in row.items()}


def discover_chunks(chunks_dir: Path) -> list[Path]:
    files = sorted(chunks_dir.glob("dnr_wells_chunk_*.csv.gz"))
    if not files:
        files = sorted(chunks_dir.glob("dnr_wells_chunk_*.csv"))
    return files


def main() -> int:
    ap = argparse.ArgumentParser(description="Dual-label offline reprocess (sidecars + logs only)")
    ap.add_argument("--chunks-dir", type=Path, default=None)
    ap.add_argument("--chunk-index", type=int, default=None)
    ap.add_argument("--all-chunks", action="store_true")
    ap.add_argument("--full-csv", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--log-every", type=int, default=2000)
    ap.add_argument("--write-layer-detail", action="store_true")
    ap.add_argument("--max-wells", type=int, default=0, help="0 = all")
    args = ap.parse_args()

    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)
    log_path = out / "reprocess.log"
    well_out = out / "well_dual_label.jsonl.gz"
    layer_out = out / "layer_labels.jsonl.gz" if args.write_layer_detail else None
    summary_path = out / "summary.json"

    sources: list[Path] = []
    if args.full_csv:
        sources.append(args.full_csv)
    elif args.chunks_dir:
        chunks = discover_chunks(args.chunks_dir)
        if not chunks:
            log(f"ERROR: no chunks in {args.chunks_dir}", log_path)
            return 2
        if args.all_chunks:
            sources.extend(chunks)
        elif args.chunk_index is not None:
            match = [c for c in chunks if f"chunk_{args.chunk_index}." in c.name or f"chunk_{args.chunk_index}_" in c.name]
            if not match:
                # try exact suffix
                cand = args.chunks_dir / f"dnr_wells_chunk_{args.chunk_index}.csv.gz"
                if cand.exists():
                    match = [cand]
            if not match:
                log(f"ERROR: chunk index {args.chunk_index} not found", log_path)
                return 2
            sources.extend(match)
        else:
            sources.append(chunks[0])
            log(f"defaulting to first chunk only: {chunks[0].name}", log_path)
    else:
        log("ERROR: provide --chunks-dir or --full-csv", log_path)
        return 2

    log(f"START ruleset={RULESET_ID} sources={len(sources)} out={out}", log_path)

    matrix: Counter[str] = Counter()
    form_counts: Counter[str] = Counter()
    loc_counts: Counter[str] = Counter()
    conf_counts: Counter[str] = Counter()
    rule_hits_all: Counter[str] = Counter()
    n = 0
    n_layers = 0
    t0 = time.time()

    with gzip.open(well_out, "wt", encoding="utf-8") as wf, (
        gzip.open(layer_out, "wt", encoding="utf-8") if layer_out else open("/dev/null", "w")
    ) as lf:
        for src in sources:
            log(f"source {src}", log_path)
            try:
                for row in iter_csv_rows(src):
                    rec = classify_well(row)
                    layers = rec.pop("layers")
                    hits = rec.pop("rule_hits", {})
                    for k, v in hits.items():
                        rule_hits_all[k] += v
                    n_layers += int(rec.get("layer_count") or 0)
                    loc = rec["location_quality"]
                    form = rec["formation_class"]
                    loc_counts[loc] += 1
                    form_counts[form] += 1
                    conf_counts[str(rec.get("confidence"))] += 1
                    matrix[f"{loc}|{form}"] += 1
                    wf.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    if args.write_layer_detail:
                        for layer in layers:
                            lf.write(
                                json.dumps(
                                    {"refno": rec.get("refno"), **layer},
                                    ensure_ascii=False,
                                )
                                + "\n"
                            )
                    n += 1
                    if args.log_every and n % args.log_every == 0:
                        rate = n / max(time.time() - t0, 1e-6)
                        log(f"progress n={n} layers={n_layers} rate={rate:.1f}/s matrix={dict(matrix)}", log_path)
                    if args.max_wells and n >= args.max_wells:
                        log(f"hit --max-wells {args.max_wells}", log_path)
                        break
                if args.max_wells and n >= args.max_wells:
                    break
            except Exception as e:
                log(f"ERROR reading {src}: {e}", log_path)
                raise

    elapsed = time.time() - t0
    summary = {
        "ruleset_id": RULESET_ID,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "wells": n,
        "layers_seen": n_layers,
        "elapsed_sec": round(elapsed, 2),
        "wells_per_sec": round(n / max(elapsed, 1e-6), 2),
        "location_quality": dict(loc_counts),
        "formation_class": dict(form_counts),
        "confidence": dict(conf_counts),
        "location_x_formation": dict(matrix),
        "rule_hits": dict(rule_hits_all.most_common(50)),
        "sources": [str(s) for s in sources],
        "outputs": {
            "wells": str(well_out),
            "layers": str(layer_out) if layer_out else None,
            "log": str(log_path),
        },
        "notes": [
            "Source chunks/CSV not modified",
            "Estimated location is separate from formation_class",
            "Rock top alone does not force rock well when thick uncon aquifer present",
        ],
    }
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    log(f"DONE wells={n} layers={n_layers} elapsed={elapsed:.1f}s summary={summary_path}", log_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
