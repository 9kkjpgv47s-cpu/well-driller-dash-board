#!/usr/bin/env python3
"""
Enrich high-production well CSVs (>=70 GPM) with current parcel/owner info.

Sources (all local, offline):
- Statewide parcels: ~/Projects/_data/wells-gis/parcels/Published_Data.gdb
  (Indiana Data Harvest FGDB, Mar 2026) -> situs address + parcel id.
- Owner name + mailing (all counties): DLGF Gateway RealParcel files in the
  indiana-wells-leads project (data/gateway/*_real_property_*.txt), joined on
  normalized 18-digit parcel id; Marion shapefile owner fields fill gaps.
- Marion County owner parcels: parcels/Parcels_w__Owner_Information...shp
  -> owner name + mailing address (fallback where Gateway has no record).
- SWWF registry: misc/IN-SWWF/Fac.xls (+ WU.xls annual withdrawals)
  joined on well refno -> swwf_* columns.
- Drilling-era contacts: well-records/WellRecords_*.csv joined on RefNum
  -> drill_* columns (owner name/address/phone at time of drilling).

Outputs land in data/ next to the input CSVs. Match quality is explicit via
match_method / match_confidence columns rather than hidden.
"""

import glob
import re
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pyogrio

REPO = Path(__file__).resolve().parents[1]
DATA = Path.home() / "Projects/_data/wells-gis"
GDB = DATA / "parcels/Published_Data.gdb"
MARION_SHP = (
    DATA
    / "parcels/Parcels_w__Owner_Information_&_Assessed_Values"
    / "Parcels_w__Owner_Information_%26_Assessed_Values.shp"
)
FAC_XLS = DATA / "misc/IN-SWWF/Fac.xls"
WU_XLS = DATA / "misc/IN-SWWF/WU.xls"
# DLGF Gateway RealParcel owner files live in the indiana-wells-leads project
LEADS_GW = (
    Path.home()
    / "Library/Mobile Documents/com~apple~CloudDocs/indiana-wells-leads"
    / "data/gateway"
)

WELL_CSVS = [
    REPO / "Commercial Leads/_source files/high_production_wells_70gpm_indy_metro.csv",
    REPO / "Commercial Leads/_source files/high_production_wells_70gpm_lafayette_area.csv",
]

FIPS_BY_NAME = {
    "MARION": "18097", "HAMILTON": "18057", "HANCOCK": "18059",
    "SHELBY": "18145", "JOHNSON": "18081", "MORGAN": "18109",
    "HENDRICKS": "18063", "BOONE": "18011", "MADISON": "18095",
    "TIPPECANOE": "18157", "BENTON": "18007", "CARROLL": "18015",
    "CLINTON": "18023", "FOUNTAIN": "18045", "MONTGOMERY": "18107",
    "WARREN": "18171", "WHITE": "18181",
}

# DLGF county numbers (alphabetical 1-92) used by Fac.xls / FGDB COUNTY_ID
DLGF_NO = {
    "BENTON": 4, "BOONE": 6, "CARROLL": 8, "CLINTON": 12, "FOUNTAIN": 23,
    "HAMILTON": 29, "HANCOCK": 30, "HENDRICKS": 32, "JOHNSON": 41,
    "MADISON": 48, "MARION": 49, "MONTGOMERY": 54, "MORGAN": 55,
    "SHELBY": 73, "TIPPECANOE": 79, "WARREN": 86, "WHITE": 91,
}

PARCEL_COLS = [
    "STATE_PARCEL_ID", "PARCEL_ID", "LOCAL_ID", "COUNTY_FIPS",
    "PROP_ADD", "PROP_CITY", "PROP_STATE", "PROP_ZIP",
    "DLGF_PROP_ADDRESS", "DLGF_PROP_ADDRESS_CITY", "DLGF_PROP_ADDRESS_ZIP",
    "DLGF_PROP_CLASS_CODE",
]
NEAREST_MAX_M = 300
METRIC_CRS = "EPSG:26916"  # UTM 16N covers all of Indiana


def load_wells() -> pd.DataFrame:
    frames = []
    for f in WELL_CSVS:
        df = pd.read_csv(f, dtype=str)
        df["_src"] = f.name
        frames.append(df)
    wells = pd.concat(frames, ignore_index=True)
    wells["county_fips"] = wells["county"].str.strip().str.upper().map(FIPS_BY_NAME)
    wells["lat"] = pd.to_numeric(wells["lat"], errors="coerce")
    wells["lon"] = pd.to_numeric(wells["lon"], errors="coerce")
    wells = wells[wells["lat"].notna() & wells["lon"].notna()]
    wells = wells[(wells["lat"] != 0) & (wells["lon"] != 0)]
    print(f"wells with usable coords: {len(wells)}")
    return wells


def wells_gdf(wells: pd.DataFrame) -> gpd.GeoDataFrame:
    gdf = gpd.GeoDataFrame(
        wells.reset_index(drop=True),
        geometry=gpd.points_from_xy(wells["lon"], wells["lat"]),
        crs="EPSG:4326",
    )
    return gdf.to_crs(METRIC_CRS)


def read_fgdb_county(fips: str) -> gpd.GeoDataFrame:
    # pyogrio quirk: the where-column must also appear in `columns`
    gdf = pyogrio.read_dataframe(
        str(GDB), layer="ParcelPolygon", columns=PARCEL_COLS,
        where=f"COUNTY_FIPS='{fips}'",
    )
    return gdf.to_crs(METRIC_CRS)


def join_parcels(wg: gpd.GeoDataFrame, parcels: gpd.GeoDataFrame,
                 attr_cols: dict) -> pd.DataFrame:
    """Point-in-polygon, then nearest-parcel fallback for misses."""
    keep = list(attr_cols.keys())
    p = parcels[keep + ["geometry"]].copy()
    inside = gpd.sjoin(wg, p, how="left", predicate="within")
    inside = inside[~inside.index.duplicated(keep="first")]
    matched = inside[inside["index_right"].notna()].copy()
    matched["match_method"] = "inside"
    matched["parcel_dist_m"] = 0.0

    # misses still carry the (NaN) parcel attr cols from the first join; drop
    # them so sjoin_nearest doesn't produce suffixed duplicates
    misses = inside[inside["index_right"].isna()][list(wg.columns)]
    if len(misses):
        near = gpd.sjoin_nearest(
            misses, p, how="left", max_distance=NEAREST_MAX_M,
            distance_col="parcel_dist_m",
        )
        near = near[~near.index.duplicated(keep="first")]
        near = near[near["index_right"].notna()].copy()
        near["match_method"] = "nearest"
        matched = pd.concat([matched, near])
    matched = matched.drop(columns=["index_right"], errors="ignore")
    return matched.rename(columns=attr_cols)


def marion_parcels() -> gpd.GeoDataFrame:
    gdf = gpd.read_file(str(MARION_SHP))
    gdf = gdf.to_crs(METRIC_CRS)
    return gdf


def confidence(loc_type: str, method: str) -> str:
    lt = (loc_type or "").lower()
    if method == "unmatched":
        return "unmatched"
    if "field located" in lt:
        return "high" if method == "inside" else "medium"
    if "office" in lt or "geocod" in lt:
        return "high" if method == "inside" else "medium"
    if "centroid" in lt:
        return "low"
    return "medium" if method == "inside" else "low"  # estimated TRS


def load_swwf() -> pd.DataFrame:
    fac = pd.read_excel(FAC_XLS)
    fac = fac[fac["Well Log"].notna()].copy()
    fac["refno"] = fac["Well Log"].astype("float64").astype("int64").astype(str)
    grp = fac.groupby("refno").agg(
        swwf_facility=("Facility", lambda s: " | ".join(sorted(set(s.astype(str))))),
        swwf_reg_no=("RegNo", lambda s: " | ".join(sorted(set(
            s.astype(str).str.replace(r"\.0$", "", regex=True))))),
        swwf_capacity_gpm=("Capacity (GPM)", "max"),
        swwf_reg_date=("RegDate", "min"),
    )
    wu = pd.read_excel(WU_XLS)
    wu = wu[wu["RegNo"].notna()]
    latest = wu.sort_values("Year").groupby("RegNo").tail(1)
    latest = latest[["RegNo", "Year", "Annual"]].rename(
        columns={"RegNo": "swwf_reg_no", "Year": "swwf_use_year",
                 "Annual": "swwf_annual_tg"})
    latest["swwf_reg_no"] = latest["swwf_reg_no"].astype(str).str.replace(
        r"\.0$", "", regex=True)
    return grp, latest


def _gw_parse_line(ln: str):
    """Indiana Gateway RealParcel fixed-width layout (verified 2024 files)."""
    if len(ln) < 400:
        return None
    key = ln[0:18].strip()
    if not key.isdigit():
        return None
    # strip numeric bleed from the preceding column ("6.0GREER", "00 Frito",
    # "0  TOWN OF PLAINFIELD")
    owner = re.sub(r"^\d+\.\d+\s*|^\d{2,}\s+|^0\s+|^\d\s{2,}", "",
                   ln[220:280].strip())
    mail1 = ln[300:340].strip()
    mail_city = ln[360:380].strip()
    tail = ln[380:420].strip()
    m = re.match(r"([A-Z]{2})\s*([\d\-]*)", tail)
    return key, {
        "gw_owner": owner,
        "gw_addr1": mail1,
        "gw_city": mail_city,
        "gw_state": m.group(1) if m else "",
        "gw_zip": m.group(2) if m else "",
    }


def load_gateway() -> dict:
    """norm(parcel_id)[:18] -> owner/mailing from DLGF Gateway RealParcel files."""
    out = {}
    for path in sorted(LEADS_GW.glob("*_real_property_*.txt")):
        county = path.name.split("_")[0].upper()
        n = 0
        with open(path, encoding="utf-8", errors="replace") as f:
            for ln in f:
                rec = _gw_parse_line(ln.rstrip("\n"))
                if rec:
                    out[rec[0]] = rec[1]
                    n += 1
        print(f"gateway {county.lower()}: {n:,} parcels")
    return out


def load_drill() -> pd.DataFrame:
    cols = ["RefNum", "Owner", "OwnerAddr", "OwnerZip", "OwnerPhone",
            "Driller", "WellUse", "WellType"]
    frames = []
    for f in glob.glob(str(DATA / "well-records/WellRecords_*.csv")):
        d = pd.read_csv(f, dtype=str, encoding="utf-8-sig",
                        usecols=lambda c: c in cols)
        frames.append(d)
    dr = pd.concat(frames, ignore_index=True)
    dr = dr.sort_values("OwnerPhone", na_position="last")
    dr = dr.drop_duplicates("RefNum", keep="first")
    return dr.set_index("RefNum").rename(columns={
        "Owner": "drill_owner", "OwnerAddr": "drill_owner_addr",
        "OwnerZip": "drill_owner_zip", "OwnerPhone": "drill_owner_phone",
        "Driller": "drilled_by", "WellUse": "drill_use",
        "WellType": "drill_well_type",
    })


# --- non-residential proof rules -------------------------------------------
# Owner-name entity signature -> business/institutional customer
# exact words (bounded both sides) + prefixes (leading boundary only)
_ENTITY_WORDS = (
    r"LLC|L\.L\.C|INC|CORP|CORPORATION|COMPANY|CO|LP|LLP|L\.P\.|"
    r"COUNTY|SCHOOL|UNIVERSITY|HOSPITAL|DISTRICT|CLUB|GOLF|FARMS?|"
    r"HOA|HOMEOWNERS|DEPT|DEPARTMENT|TOWNSHIP|BOARD|ACADEMY|"
    r"BANK|NATIONAL|FEDERAL|PARISH|LODGE|VFW|GRANGE|COOPERATIVE|ENERGY|"
    r"WATER|SANITATION|QUARRY|GRAVEL|CONCRETE|BUILDERS|"
    r"DAIRY|POULTRY|LIVESTOCK|CATTLE|FEED|ETHANOL|PACKING|"
    r"LOGISTICS|RAILROAD|AIRPORT"
)
_ENTITY_PREFIX = (
    r"UTILIT|CO-?OP|PARTNERSHIP|VENTURE|PROPERT|HOLDING|INVEST|DEVELOP|"
    r"REALTY|ENTERPRISE|CONSERV|MINISTR|CONGREG|AMERICAN LEGION|ASSOC|"
    r"GRAIN|SEED|CONSTRUCT|EXCAVAT|LANDSCAPE|GREENHOUSE|PROCESSING|"
    r"MANUFACTUR|INDUSTRI|TRANSPORT|PORT AUTH|TOWN OF|CITY OF|STATE OF|"
    r"MUNICIPAL|CHURCH|ORCHARD|VINEYARD|NURSER|AUTHORIT"
)
ENTITY_RE = re.compile(
    rf"\b({_ENTITY_WORDS})\b|\b({_ENTITY_PREFIX})", re.I)

# DLGF numeric classes that prove non-residential use (Indiana PTMS):
#   3xx industrial, 4xx commercial (incl. apartments 401/419 -> enterprise),
#   6xx exempt/institutional.  500/509 = agricultural land -> enterprise farm.
#   Everything else (1xx residential, 5xx dwellings/vacant-res) is residential.
AG_CODES = {500, 509}
NONHOME_USE = {"I", "P", "O", "T", "S"}  # irrigation/public/other/test/stock


def prop_use(code, text) -> str:
    t = ("" if pd.isna(text) else str(text)).strip().upper()
    if t in {"COMMERCIAL", "INDUSTRIAL", "UTILITIES-REAL", "EXEMPT", "MINERAL"}:
        return "commercial"
    if t == "AGRICULTURAL":
        return "agricultural"
    if t == "RESIDENTIAL":
        return "residential"
    try:
        c = int(float(str(code).strip()))
    except (TypeError, ValueError):
        return ""
    if c in AG_CODES:
        return "agricultural"
    if 300 <= c < 500 or 600 <= c < 700 or 800 <= c < 900:
        return "commercial"  # 3xx ind, 4xx com, 6xx exempt, 8xx utility
    return "residential"


def classify_lead(r) -> tuple[str, str]:
    if r.get("swwf_registered") == "Y":
        return "commercial", "swwf"
    pu = prop_use(r.get("prop_class"), r.get("prop_class_text"))
    owner = "" if pd.isna(r.get("owner_name")) else str(r.get("owner_name"))
    use = ("" if pd.isna(r.get("drill_use"))
           else str(r.get("drill_use"))).strip().upper()
    try:
        rate = float(r.get("pump_rate_gpm") or 0)
    except ValueError:
        rate = 0.0
    if pu == "commercial":
        return "commercial", "prop_class"
    if pu == "agricultural":
        return "commercial", "agricultural_parcel"
    if ENTITY_RE.search(owner):
        return "commercial", "owner_entity"
    if use in NONHOME_USE:
        return "commercial", "well_use"
    if rate >= 500:
        return "commercial", "capacity_500gpm"
    if pu == "residential":
        return "residential", "prop_class_res"
    return "unknown", "no_proof"


def main() -> int:
    wells = load_wells()
    wg = wells_gdf(wells)

    out_frames = []
    # --- Marion: local owner shapefile (has owner name + mailing) ---
    mw = wg[wg["county_fips"] == "18097"]
    if len(mw):
        mar = marion_parcels()
        m = join_parcels(mw, mar, {
            "STATEPARCE": "parcel_id",
            "FULLOWNERN": "owner_name",
            "OWNERADDRE": "owner_addr1",
            "OWNERADD_1": "owner_addr2",
            "OWNERCITY": "owner_city",
            "OWNERSTATE": "owner_state",
            "OWNERZIP": "owner_zip",
            "STNUMBER": "_stnum", "FULL_STNAM": "_stname",
            "CITY": "situs_city", "ZIPCODE": "situs_zip",
            "PROPERTY_C": "prop_class_text",
        })
        stnum = pd.to_numeric(m["_stnum"], errors="coerce").astype("Int64")
        m["situs_address"] = (
            stnum.astype(str).replace("<NA>", "") + " "
            + m["_stname"].fillna("").astype(str).str.strip()
        ).str.strip()
        m["owner_source"] = "marion_county_parcels"
        out_frames.append(m)
        print(f"marion: {len(mw)} wells, {int((m['match_method']=='inside').sum())} inside-parcel")

    # --- Other counties: FGDB situs polygons ---
    FGDB_ATTR = {
        "STATE_PARCEL_ID": "parcel_id",
        "PROP_ADD": "_prop_add", "DLGF_PROP_ADDRESS": "_dlgf_add",
        "PROP_CITY": "_prop_city", "DLGF_PROP_ADDRESS_CITY": "_dlgf_city",
        "PROP_ZIP": "_prop_zip", "DLGF_PROP_ADDRESS_ZIP": "_dlgf_zip",
        "DLGF_PROP_CLASS_CODE": "prop_class",
    }
    for name, fips in FIPS_BY_NAME.items():
        if fips == "18097":
            continue
        cw = wg[wg["county_fips"] == fips]
        if not len(cw):
            continue
        parcels = read_fgdb_county(fips)
        m = join_parcels(cw, parcels, FGDB_ATTR)
        # some counties populate only the DLGF-normalized address fields
        m["situs_address"] = m["_prop_add"].combine_first(m["_dlgf_add"])
        m["situs_city"] = m["_prop_city"].combine_first(m["_dlgf_city"])
        m["situs_zip"] = m["_prop_zip"].combine_first(m["_dlgf_zip"])
        m["owner_source"] = ""
        out_frames.append(m)
        print(f"{name.lower()}: {len(cw)} wells / {len(parcels)} parcels, "
              f"{int((m['match_method']=='inside').sum())} inside")

    enr = pd.concat(out_frames)
    enr = enr.reindex(wg.index)  # keep unmatched wells as rows with NaN enrich cols
    enr = enr.drop(columns=[c for c in enr.columns if c.startswith("_")],
                   errors="ignore")

    unmatched = enr["match_method"].isna().sum()
    print(f"unmatched (no parcel within {NEAREST_MAX_M}m): {unmatched}")

    # --- SWWF registry join on refno ---
    swwf, wu_latest = load_swwf()
    enr = enr.merge(swwf, left_on="refno", right_index=True, how="left")
    enr["swwf_registered"] = enr["swwf_reg_no"].notna().map({True: "Y", False: ""})
    enr["_reg1"] = enr["swwf_reg_no"].str.split(r"\s*\|\s*").str[0]
    enr = enr.merge(wu_latest, left_on="_reg1", right_on="swwf_reg_no",
                    how="left", suffixes=("", "_wu"))
    enr = enr.drop(columns=["_reg1", "swwf_reg_no_wu"], errors="ignore")

    # --- DLGF Gateway owner join on normalized 18-digit parcel id ---
    gw = load_gateway()
    enr["_gwkey"] = (
        enr["parcel_id"].astype(str).str.replace(r"[^0-9]", "", regex=True).str[:18]
    )
    gwdf = pd.DataFrame.from_dict(gw, orient="index")
    enr = enr.merge(gwdf, left_on="_gwkey", right_index=True, how="left")
    enr = enr.drop(columns=["_gwkey"])
    has_gw = enr["gw_owner"].notna()
    enr.loc[has_gw, "owner_source"] = "dlgf_gateway_2024"
    for dst, gwc in [("owner_name", "gw_owner"), ("owner_addr1", "gw_addr1"),
                     ("owner_city", "gw_city"), ("owner_state", "gw_state"),
                     ("owner_zip", "gw_zip")]:
        enr[dst] = enr[gwc].replace("", pd.NA).combine_first(enr[dst])
    enr = enr.drop(columns=[c for c in enr.columns if c.startswith("gw_")])

    # --- drilling-era contacts ---
    drill = load_drill()
    enr = enr.merge(drill, left_on="refno", right_index=True, how="left")

    enr["match_method"] = enr["match_method"].fillna("unmatched")
    enr["owner_name"] = enr["owner_name"].astype("string").str.replace(
        r"[,\s]+$", "", regex=True)

    # --- residential vs commercial lead classification ---
    enr["prop_use"] = [
        prop_use(c, t)
        for c, t in zip(enr.get("prop_class"), enr.get("prop_class_text"))
    ]
    cls = enr.apply(classify_lead, axis=1)
    enr["lead_class"] = [c for c, _ in cls]
    enr["lead_proof"] = [p for _, p in cls]
    enr["match_confidence"] = [
        confidence(lt, mm)
        for lt, mm in zip(enr["location_type"], enr["match_method"])
    ]
    enr["parcel_dist_m"] = enr["parcel_dist_m"].round(1)

    # column order: originals first, then enrichment
    base = [c for c in pd.read_csv(WELL_CSVS[0], nrows=0).columns]
    new_cols = [
        "parcel_id", "situs_address", "situs_city", "situs_zip",
        "owner_name", "owner_addr1", "owner_addr2", "owner_city",
        "owner_state", "owner_zip", "owner_source",
        "swwf_registered", "swwf_facility", "swwf_reg_no",
        "swwf_capacity_gpm", "swwf_reg_date", "swwf_use_year", "swwf_annual_tg",
        "drill_owner", "drill_owner_addr", "drill_owner_zip",
        "drill_owner_phone", "drilled_by", "drill_use", "drill_well_type",
        "prop_class", "prop_use", "lead_class", "lead_proof",
        "match_method", "parcel_dist_m", "match_confidence",
    ]
    enr = enr[[c for c in base + new_cols if c in enr.columns]]

    outdir = REPO / "Commercial Leads/_source files"
    enr.to_csv(outdir / "high_production_wells_70gpm_contacts_all.csv", index=False)
    for area, fname in [
        ("Indianapolis Metro", "high_production_wells_70gpm_contacts_indy_metro.csv"),
        ("Lafayette Area", "high_production_wells_70gpm_contacts_lafayette_area.csv"),
    ]:
        enr[enr["area"] == area].to_csv(outdir / fname, index=False)

    # commercial/enterprise lead lists: SWWF + proven non-residential only
    leads = enr[enr["lead_class"] == "commercial"]
    leads.to_csv(outdir / "high_production_commercial_leads_all.csv", index=False)
    for area, fname in [
        ("Indianapolis Metro", "high_production_commercial_leads_indy_metro.csv"),
        ("Lafayette Area", "high_production_commercial_leads_lafayette_area.csv"),
    ]:
        leads[leads["area"] == area].to_csv(outdir / fname, index=False)

    # --- match report ---
    rep = ["# Owner/parcel match report — >=70 GPM wells",
           f"total wells in: {len(enr)}",
           f"matched inside parcel: {int((enr['match_method']=='inside').sum())}",
           f"matched nearest (<={NEAREST_MAX_M}m): {int((enr['match_method']=='nearest').sum())}",
           f"unmatched: {int((enr['match_method']=='unmatched').sum())}",
           f"swwf registered: {int((enr['swwf_registered']=='Y').sum())}",
           f"with drill-era owner phone: {int(enr['drill_owner_phone'].notna().sum())}",
           "",
           "## lead classes",
           f"commercial (kept):  {int((enr['lead_class']=='commercial').sum())}",
           f"residential (dropped): {int((enr['lead_class']=='residential').sum())}",
           f"unknown (dropped):  {int((enr['lead_class']=='unknown').sum())}",
           "",
           "## proof mix for kept leads",
           *[f"{k:22s} {v}" for k, v in
             enr.loc[enr['lead_class']=='commercial','lead_proof']
             .value_counts().items()],
           "", "## by county"]
    for cty, g in enr.groupby("county"):
        rep.append(f"{cty:12s} n={len(g):5d}  inside={int((g['match_method']=='inside').sum()):5d}"
                   f"  situs={int(g['situs_address'].notna().sum()):5d}"
                   f"  owner={int(g['owner_name'].notna().sum()):5d}"
                   f"  swwf={int((g['swwf_registered']=='Y').sum()):4d}")
    (REPO / "Commercial Leads/_source files/out").mkdir(exist_ok=True)
    (REPO / "Commercial Leads/_source files/out/owner_match_report.txt").write_text("\n".join(rep))
    print("\n".join(rep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
