"""Package the commercial lead CSVs into a single Excel workbook.

Tabs:
  READ FIRST          - overview / how to use the list
  FULL LIST           - all 5,302 commercial/enterprise leads
  FOCUS - INDY METRO  - 2,755 Indianapolis-metro leads
  FOCUS - LAFAYETTE   - 2,547 Lafayette-area leads
"""
import csv
import shutil
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

DATA = Path(__file__).resolve().parent.parent / "Commercial Leads"
SRC = DATA / "_source files"
OUT = DATA / "FULL LIST - All Leads.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=10)
TITLE_FONT = Font(bold=True, size=20, color="1F4E79")
SUB_FONT = Font(size=11, color="555555")
H2_FONT = Font(bold=True, size=13, color="1F4E79")
BODY_FONT = Font(size=11)
SMALL_FONT = Font(size=9, color="555555")
MONO_FONT = Font(name="Menlo", size=10)

README = [
    ("title", "High-Capacity Well Leads - Commercial / Enterprise Prospects"),
    ("sub", "Indiana - 16 counties - Prepared from IDNR well records - April 2026"),
    ("blank",),
    ("h2", "What this file is"),
    ("body", "5,302 verified commercial/enterprise water-well leads across the Indianapolis metro"),
    ("body", "and Lafayette areas. Every well tested at 70+ GPM - the state's Significant Water"),
    ("body", "Withdrawal Facility threshold (~100,000 gallons/day). These are wells that need real"),
    ("body", "pumping, treatment, and service capacity - not household systems."),
    ("blank",),
    ("h2", "Who's on the list"),
    ("body", "- All 509 state-registered SWWFs (utilities, towns, industries that report"),
    ("body", "  withdrawals to IDNR)"),
    ("body", "- Businesses and entities proven non-residential: commercial and industrial parcels,"),
    ("body", "  farms, schools, churches, quarries, golf courses, municipal facilities"),
    ("body", "- Residential properties were removed - verified via county assessor parcel"),
    ("body", "  classification, owner-entity check, and well-use records"),
    ("blank",),
    ("h2", "What's in each row"),
    ("body", "- Owner name + mailing address (current county assessor record)"),
    ("body", "- Property (situs) address and parcel ID"),
    ("body", "- Well specs: pump test GPM, depth, static water level, completion date"),
    ("body", "- Direct link to the official DNR well log + Google Maps pin"),
    ("body", "- Match confidence flag for location-estimated records"),
    ("blank",),
    ("h2", "Why each lead made the list ('lead_proof' column)"),
    ("code", "swwf                =  registered Significant Water Withdrawal Facility"),
    ("code", "prop_class          =  parcel classified commercial / industrial / exempt / utility"),
    ("code", "owner_entity        =  owner is LLC / corporation / utility / school / municipality"),
    ("code", "well_use            =  drill record shows public, irrigation, or industrial use"),
    ("code", "agricultural_parcel =  farm operation"),
    ("code", "capacity_500gpm     =  500+ GPM pump test - industrial scale regardless of parcel type"),
    ("blank",),
    ("h2", "The tabs in this file"),
    ("body", "FULL LIST           - all 5,302 leads (2,755 Indianapolis metro + 2,547 Lafayette area)"),
    ("body", "FOCUS - INDY METRO  - Marion, Hamilton, Hancock, Shelby, Johnson, Morgan,"),
    ("body", "                      Hendricks, Boone, Madison counties"),
    ("body", "FOCUS - LAFAYETTE   - Tippecanoe, Benton, Carroll, Clinton, Fountain,"),
    ("body", "                      Montgomery, Warren, White counties"),
    ("blank",),
    ("h2", "How to use"),
    ("body", "- Filter 'county', 'area', or 'lead_proof' to slice; sort by pump_rate_gpm for"),
    ("body", "  the biggest users first"),
    ("body", "- swwf_registered = Y rows are already on the state's radar; the rest are"),
    ("body", "  unregistered high-capacity prospects"),
    ("blank",),
    ("h2", "Data notes"),
    ("small", "- Pump test rate is capacity measured at drilling, not installed pump size"),
    ("small", "- Owner = assessor of record (2024); may differ from site operator"),
    ("small", "- Mailing address is not a phone number - drill-era phone included where"),
    ("small", "  available (~10%); these numbers were recorded at drilling and may be stale"),
    ("small", "- ~1% of rows lack owner/mailing data (exempt/government parcels)"),
    ("small", "- Sources: Indiana DNR well database (414,954 records), county assessor data via"),
    ("small", "  DLGF Gateway, statewide parcel layer, IDNR SWWF facility registry"),
]

SHEETS = [
    ("FULL LIST", "high_production_commercial_leads_all.csv"),
    ("FOCUS - INDY METRO", "high_production_commercial_leads_indy_metro.csv"),
    ("FOCUS - LAFAYETTE", "high_production_commercial_leads_lafayette_area.csv"),
]

# clean-named copies placed next to the workbook for send-ready packaging
FOCUS_CSVS = {
    "high_production_commercial_leads_indy_metro.csv": "FOCUS LIST - Indianapolis Metro.csv",
    "high_production_commercial_leads_lafayette_area.csv": "FOCUS LIST - Lafayette Area.csv",
}

WIDE_COLS = {"owner_name": 34, "situs_address": 30, "owner_addr1": 30,
             "owner_city": 18, "drill_owner": 28, "swwf_facility": 28,
             "dnr_link": 24, "map_link": 24, "owner_addr2": 24}
NARROW_COLS = {"latitude", "longitude", "township", "range", "section",
               "owner_state", "owner_zip", "situs_zip", "swwf_registered",
               "lead_class", "lead_proof", "match_method", "drill_well_use"}


def build_readme(ws):
    ws.column_dimensions["A"].width = 88
    for row in README:
        kind = row[0]
        if kind == "blank":
            ws.append([""])
            continue
        cell = ws.cell(row=ws.max_row + 1, column=1, value=row[1])
        cell.font = {
            "title": TITLE_FONT, "sub": SUB_FONT, "h2": H2_FONT,
            "code": MONO_FONT, "small": SMALL_FONT,
        }.get(kind, BODY_FONT)
        cell.alignment = Alignment(wrap_text=False)
    ws.sheet_view.showGridLines = False


def build_data_sheet(ws, csv_path):
    with open(csv_path, newline="") as f:
        for i, row in enumerate(csv.reader(f)):
            ws.append(row)
            if i == 0:
                for c in ws[1]:
                    c.fill = HEADER_FILL
                    c.font = HEADER_FONT
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    headers = [c.value for c in ws[1]]
    for idx, name in enumerate(headers, 1):
        if name in WIDE_COLS:
            ws.column_dimensions[get_column_letter(idx)].width = WIDE_COLS[name]
        elif name in NARROW_COLS:
            ws.column_dimensions[get_column_letter(idx)].width = 11


def main():
    wb = Workbook()
    ws = wb.active
    ws.title = "READ FIRST"
    build_readme(ws)
    for name, fname in SHEETS:
        build_data_sheet(wb.create_sheet(name), SRC / fname)
        print(f"{name}: {wb[name].max_row - 1} rows x {wb[name].max_column} cols")
    wb.save(OUT)
    for src_name, clean_name in FOCUS_CSVS.items():
        shutil.copy(SRC / src_name, DATA / clean_name)
        print(f"copied -> {clean_name}")
    print(f"\n{OUT}  ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
