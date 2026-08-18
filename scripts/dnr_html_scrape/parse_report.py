#!/usr/bin/env python3
"""
Parse Indiana DNR water-well detail HTML into structured fields.

Maps onto hub chunk columns where possible:
  drill_rig_type  ← "Drilling method:"  (Cable Tool, Rotary, …)
  pump_type       ← "Pump type:"
  test_method     ← "Type of test:"     (Pumping, Bailer, …)
  casing_*        ← Casing Length / Material / Diameter
  screen_*        ← Screen Length / Material / Diameter / Slot
  pump_rate       ← Test rate gpm
  bailer_rate     ← BailTest rate gpm
  static_water    ← Static water level
  depth           ← Depth
  well_use        ← Use
  depth_bedrock   ← Depth to bedrock

Also captures extra report-only fields (drawdown, durations, driller, etc.).
Does not require network — pure HTML → dict.
"""
from __future__ import annotations

import re
from typing import Any


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_SCRIPT_RE = re.compile(r"<script[\s\S]*?</script>", re.I)
_STYLE_RE = re.compile(r"<style[\s\S]*?</style>", re.I)


def strip_tags(s: str) -> str:
    s = _TAG_RE.sub(" ", s or "")
    s = s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return _WS_RE.sub(" ", s).strip()


def html_to_plain(html: str) -> str:
    s = _SCRIPT_RE.sub(" ", html or "")
    s = _STYLE_RE.sub(" ", s)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</(tr|p|div|li|h\d|td|th)>", "\n", s, flags=re.I)
    s = _TAG_RE.sub(" ", s)
    s = s.replace("&nbsp;", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s


def _bold_label_value(html: str, label: str) -> str | None:
    """
    Match DNR pattern: <B>Label:</B> value</FONT>
    Value may be empty.
    """
    # Allow optional spaces around colon inside bold
    pat = re.compile(
        rf"<B>\s*{re.escape(label)}\s*:?\s*</B>\s*([^<]*)",
        re.I,
    )
    m = pat.search(html)
    if not m:
        # plain-text fallback after strip
        return None
    val = strip_tags(m.group(1)).strip()
    # Drop trailing unit-only placeholders later
    return val if val else ""


def _plain_label_value(plain: str, label: str) -> str | None:
    # "Label: value" on a line or mid-line
    pat = re.compile(rf"{re.escape(label)}\s*:\s*(.*)$", re.I | re.M)
    m = pat.search(plain)
    if not m:
        return None
    return m.group(1).strip()


def _first_nonempty(*vals: str | None) -> str:
    for v in vals:
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s
    return ""


def _clean_num_token(raw: str) -> str:
    """Keep leading numeric token; drop unit crumbs."""
    s = (raw or "").strip()
    if not s:
        return ""
    m = re.match(r"^([-+]?\d+(?:\.\d+)?)", s.replace(",", ""))
    return m.group(1) if m else ""


def _parse_rate_and_hours(raw: str) -> tuple[str, str]:
    """
    '10.0 gpm for 1.0 hrs.' → ('10.0', '1.0')
    'gpm for hrs.' → ('', '')
    """
    s = (raw or "").strip()
    if not s:
        return "", ""
    # strip unit placeholders if no number
    if re.fullmatch(r"gpm\s+for\s+hrs\.?", s, re.I):
        return "", ""
    gpm = ""
    hrs = ""
    m = re.search(r"([-+]?\d+(?:\.\d+)?)\s*gpm", s, re.I)
    if m:
        gpm = m.group(1)
    else:
        m2 = re.match(r"^([-+]?\d+(?:\.\d+)?)", s)
        if m2:
            gpm = m2.group(1)
    hm = re.search(r"for\s+([-+]?\d+(?:\.\d+)?)\s*hrs?", s, re.I)
    if hm:
        hrs = hm.group(1)
    return gpm, hrs


def _section_after(html: str, heading: str, max_chars: int = 2500) -> str:
    low = html.lower()
    i = low.find(heading.lower())
    if i < 0:
        return ""
    return html[i : i + max_chars]


def parse_report_html(html: str, refno: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {
        "refno": refno or "",
        "ok": False,
        "error": None,
        # chunk-aligned fields
        "drill_rig_type": "",  # drilling method
        "pump_type": "",
        "test_method": "",
        "casing_length": "",
        "casing_material": "",
        "casing_diam": "",
        "screen_length": "",
        "screen_material": "",
        "screen_diam": "",
        "screen_slot": "",
        "pump_rate": "",
        "bailer_rate": "",
        "static_water": "",
        "depth": "",
        "well_use": "",
        "depth_bedrock": "",
        "aquifer": "",
        # extras
        "date_complete": "",
        "pump_setting_depth": "",
        "water_quality": "",
        "test_rate_hours": "",
        "bailer_rate_hours": "",
        "drawdown_ft": "",
        "bailer_drawdown_ft": "",
        "bedrock_elevation": "",
        "driller_name": "",
        "operator_name": "",
        "owner_name": "",
        "directions": "",
        "sealing_material": "",
        "installation_method": "",
        "lithology": [],
        "raw_labels": {},
        "html_bytes": len(html or ""),
    }

    if not html or len(html) < 200:
        out["error"] = "empty_html"
        return out

    low = html.lower()
    if "record of water well" not in low and "reference number" not in low:
        # still try if construction details present
        if "construction details" not in low and "drilling method" not in low:
            out["error"] = "not_dnr_report"
            return out

    plain = html_to_plain(html)

    def lab(label: str) -> str:
        v = _bold_label_value(html, label)
        if v is None:
            v = _plain_label_value(plain, label)
        if v is None:
            return ""
        return v.strip()

    # Core construction
    drill_method = lab("Drilling method")
    pump_type = lab("Pump type")
    well_use = lab("Use")
    depth = _clean_num_token(lab("Depth"))
    # Depth appears multiple times; prefer Construction Details well depth
    # Re-parse depth carefully from construction block
    constr = _section_after(html, "Construction Details", 4000)
    if constr:
        dm = _bold_label_value(constr, "Drilling method")
        if dm is not None:
            drill_method = dm
        pt = _bold_label_value(constr, "Pump type")
        if pt is not None:
            pump_type = pt
        u = _bold_label_value(constr, "Use")
        if u is not None:
            well_use = u
        # Depth after Pump type row often is total depth
        d_m = re.search(
            r"<B>\s*Depth\s*:?\s*</B>\s*([^<]*)",
            constr,
            re.I,
        )
        if d_m:
            depth = _clean_num_token(strip_tags(d_m.group(1))) or depth

    pump_setting = _clean_num_token(lab("Pump setting depth"))
    water_quality = lab("Water quality")

    # Casing / Screen blocks: "Casing" then Length/Material/Diameter
    casing_len = casing_mat = casing_diam = ""
    screen_len = screen_mat = screen_diam = screen_slot = ""
    casing_block = _section_after(html, ">Casing<", 800) or _section_after(html, "\nCasing\n", 800)
    if not casing_block:
        # HTML: <FONT...>Casing</FONT>
        m = re.search(r">\s*Casing\s*<", html, re.I)
        if m:
            casing_block = html[m.start() : m.start() + 900]
    if casing_block:
        casing_len = _clean_num_token(_bold_label_value(casing_block, "Length") or "")
        casing_mat = (_bold_label_value(casing_block, "Material") or "").strip()
        casing_diam = _clean_num_token(_bold_label_value(casing_block, "Diameter") or "")

    screen_block = ""
    m = re.search(r">\s*Screen\s*<", html, re.I)
    if m:
        screen_block = html[m.start() : m.start() + 1000]
    if screen_block:
        screen_len = _clean_num_token(_bold_label_value(screen_block, "Length") or "")
        screen_mat = (_bold_label_value(screen_block, "Material") or "").strip()
        diam_raw = _bold_label_value(screen_block, "Diameter") or ""
        # Diameter may include "Slot size: .014"
        diam_part = diam_raw
        slot_part = ""
        if re.search(r"slot\s*size", diam_raw, re.I):
            parts = re.split(r"slot\s*size\s*:", diam_raw, maxsplit=1, flags=re.I)
            diam_part = parts[0]
            slot_part = parts[1] if len(parts) > 1 else ""
        else:
            slot_part = _bold_label_value(screen_block, "Slot size") or ""
        screen_diam = _clean_num_token(diam_part)
        screen_slot = (slot_part or "").strip()
        if not screen_slot:
            sm = re.search(r"Slot\s*size\s*:\s*([^\s<]+)", screen_block, re.I)
            if sm:
                screen_slot = strip_tags(sm.group(1))

    # Capacity test
    test_block = _section_after(html, "Well Capacity Test", 1500)
    test_method = ""
    test_rate_raw = bail_rate_raw = ""
    drawdown = bailer_drawdown = static_water = ""
    if test_block:
        test_method = (_bold_label_value(test_block, "Type of test") or "").strip()
        test_rate_raw = (_bold_label_value(test_block, "Test rate") or "").strip()
        # BailTest rate (no space in DNR HTML)
        bail_m = re.search(
            r"<B>\s*Bail\s*Test\s*rate\s*:?\s*</B>\s*([^<]*)",
            test_block,
            re.I,
        )
        if not bail_m:
            bail_m = re.search(
                r"<B>\s*BailTest\s*rate\s*:?\s*</B>\s*([^<]*)",
                test_block,
                re.I,
            )
        if bail_m:
            bail_rate_raw = strip_tags(bail_m.group(1)).strip()
        static_water = _clean_num_token(_bold_label_value(test_block, "Static water level") or "")
        if not static_water:
            static_water = _clean_num_token(lab("Static water level"))
        drawdown = _clean_num_token(_bold_label_value(test_block, "Drawdown") or "")
        bailer_drawdown = _clean_num_token(
            _bold_label_value(test_block, "Bailer Drawdown") or lab("Bailer Drawdown")
        )
    else:
        test_method = lab("Type of test")
        test_rate_raw = lab("Test rate")
        bail_rate_raw = lab("BailTest rate") or lab("Bail Test rate")
        static_water = _clean_num_token(lab("Static water level"))
        drawdown = _clean_num_token(lab("Drawdown"))

    pump_gpm, pump_hrs = _parse_rate_and_hours(test_rate_raw)
    bail_gpm, bail_hrs = _parse_rate_and_hours(bail_rate_raw)

    # Bedrock
    depth_bedrock = _clean_num_token(lab("Depth to bedrock"))
    bedrock_elev = _clean_num_token(lab("Bedrock elevation"))

    # Header identities — rough plain extract
    ref_from_page = ""
    mref = re.search(r"Reference Number[\s\S]{0,200}?(\d{4,8})", plain, re.I)
    if mref:
        ref_from_page = mref.group(1)
    if not out["refno"] and ref_from_page:
        out["refno"] = ref_from_page

    date_complete = ""
    # Date like "Aug 01, 1964" near top
    dm = re.search(
        r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4})\b",
        plain,
        re.I,
    )
    if dm:
        date_complete = dm.group(1)

    # Owner / Driller / Operator blocks are noisy; take first line after label
    def name_after(label: str) -> str:
        m = re.search(rf"\b{label}\b\s*\n\s*([^\n]+)", plain, re.I)
        if not m:
            return ""
        name = m.group(1).strip()
        if re.match(r"^(Name|Address|Telephone)$", name, re.I):
            # next non-meta line
            m2 = re.search(
                rf"\b{label}\b\s*\n(?:Name\s*\n)?(?:Address\s*\n)?(?:Telephone\s*\n)?([^\n]+)",
                plain,
                re.I,
            )
            if m2:
                name = m2.group(1).strip()
        if re.match(r"^(Name|Address|Telephone|Owner|Driller|Operator)$", name, re.I):
            return ""
        return name[:120]

    owner_name = name_after("Owner")
    driller_name = name_after("Driller")
    operator_name = name_after("Operator")

    # Directions: line after "Driving directions to well"
    directions = ""
    md = re.search(r"Driving directions to well\s*\n\s*([^\n]+)", plain, re.I)
    if md:
        directions = md.group(1).strip()[:240]

    sealing = lab("Sealing material")
    install = lab("Installation Method")

    # Lithology table (same strategy as JS dnr-report)
    lithology: list[dict[str, str]] = []
    log_idx = low.find("well log")
    slice_html = html[log_idx : log_idx + 100000] if log_idx >= 0 else html
    for tr_m in re.finditer(r"<tr[^>]*>([\s\S]*?)</tr>", slice_html, re.I):
        row_html = tr_m.group(1)
        tds = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row_html, re.I)
        if len(tds) < 3:
            continue
        cells = [strip_tags(td) for td in tds]
        row_text = " ".join(cells).lower()
        if "top" in row_text and "bottom" in row_text and "formation" in row_text:
            continue
        pair_i = -1
        for i in range(len(cells) - 1):
            a = re.sub(r"\s", "", cells[i])
            b = re.sub(r"\s", "", cells[i + 1])
            if re.fullmatch(r"[\d.]+", a) and re.fullmatch(r"[\d.]+", b):
                pair_i = i
                break
        if pair_i < 0:
            continue
        top_s = re.sub(r"\s", "", cells[pair_i])
        bot_s = re.sub(r"\s", "", cells[pair_i + 1])
        formation = ""
        for j in range(pair_i + 2, len(cells)):
            if cells[j].strip():
                formation = cells[j].strip()
                break
        try:
            top_n = float(top_s)
            bot_n = float(bot_s)
        except ValueError:
            continue
        if top_n >= bot_n + 200:
            continue
        lithology.append(
            {"top": top_s, "bottom": bot_s, "formation": formation or "—"}
        )

    # de-dupe + sort
    seen: set[str] = set()
    uniq: list[dict[str, str]] = []
    for row in lithology:
        k = f"{row['top']}|{row['bottom']}|{row['formation']}"
        if k in seen:
            continue
        seen.add(k)
        uniq.append(row)
    uniq.sort(key=lambda r: float(r["top"]))

    out.update(
        {
            "ok": True,
            "error": None,
            "drill_rig_type": drill_method.strip(),
            "pump_type": pump_type.strip(),
            "test_method": test_method.strip(),
            "casing_length": casing_len,
            "casing_material": casing_mat,
            "casing_diam": casing_diam,
            "screen_length": screen_len,
            "screen_material": screen_mat,
            "screen_diam": screen_diam,
            "screen_slot": screen_slot,
            "pump_rate": pump_gpm,
            "bailer_rate": bail_gpm,
            "static_water": static_water,
            "depth": depth,
            "well_use": well_use.strip(),
            "depth_bedrock": depth_bedrock,
            "date_complete": date_complete,
            "pump_setting_depth": pump_setting,
            "water_quality": water_quality.strip(),
            "test_rate_hours": pump_hrs,
            "bailer_rate_hours": bail_hrs,
            "drawdown_ft": drawdown,
            "bailer_drawdown_ft": bailer_drawdown,
            "bedrock_elevation": bedrock_elev,
            "driller_name": driller_name,
            "operator_name": operator_name,
            "owner_name": owner_name,
            "directions": directions,
            "sealing_material": sealing.strip(),
            "installation_method": install.strip(),
            "lithology": uniq,
            "raw_labels": {
                "drilling_method": drill_method,
                "test_rate_raw": test_rate_raw,
                "bail_rate_raw": bail_rate_raw,
            },
        }
    )
    return out


def fields_for_sidecar(parsed: dict[str, Any]) -> dict[str, Any]:
    """Compact record written to jsonl (no giant html)."""
    keys = [
        "refno",
        "ok",
        "error",
        "drill_rig_type",
        "pump_type",
        "test_method",
        "casing_length",
        "casing_material",
        "casing_diam",
        "screen_length",
        "screen_material",
        "screen_diam",
        "screen_slot",
        "pump_rate",
        "bailer_rate",
        "static_water",
        "depth",
        "well_use",
        "depth_bedrock",
        "date_complete",
        "pump_setting_depth",
        "water_quality",
        "test_rate_hours",
        "bailer_rate_hours",
        "drawdown_ft",
        "bailer_drawdown_ft",
        "bedrock_elevation",
        "driller_name",
        "operator_name",
        "owner_name",
        "sealing_material",
        "installation_method",
        "html_bytes",
    ]
    rec = {k: parsed.get(k, "") for k in keys}
    # optional compact lithology count only (full lith already in chunks)
    lith = parsed.get("lithology") or []
    rec["lithology_layers"] = len(lith)
    return rec
