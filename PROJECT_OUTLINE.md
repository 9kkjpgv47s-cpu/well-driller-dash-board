# Driller Dashboard — project outline

**Purpose:** Single reference for AI and humans. Summarizes product intent, architecture, data strategy, and how this repo relates to the Indiana DNR well viewer. Update this file when scope shifts.

---

## 1. Product vision

**Pre-departure hub** for water-well drillers: a **customizable dashboard** that answers “what should I expect here?” before leaving for the job.

### 1.1 Core experience

- **Trip context:** Weather, traffic, drive time / route framing, jobsite location.
- **Local well intelligence:** Nearby registry wells — common ranges, **outliers**, **area statistics** (depth, construction, GPM, static, casing/screen, gravel/vein-style signals from lithology), distance and bearing.
- **Community layer:** Drillers leave **notes** for others in the same geography (tips, rare production, success in “unlikely” scenarios). **Not** mixed with official data semantics — separate trust model and moderation.

### 1.2 Principles

- **Correct, rich results** over shipping fast; choices should **not** block a customizable dashboard later.
- **Official/state facts** vs **crowd-sourced notes** stay structurally separate (tables, API surfaces, UI labeling).
- **Field-ready:** poor cell service at the rig implies **lean payloads**, optional offline/PWA, precomputed summaries where possible.

---

## 2. Technical architecture (target)

### 2.1 Canonical well record

- **One logical record per well** (or per `refno`): merge **ArcGIS registry**, **WellLogs CSV**, optional **DNR HTML report** parsing, and any future sources.
- Every derived field should be traceable: **`lithology_source`** (`csv` | `html` | `none`), registry vs inferred depth, etc. (already reflected in the DNR viewer build.)
- **Map/chunks** are a **downstream projection** of the canonical model — not the source of truth.

### 2.2 Metric / tile catalog (dashboard extensibility)

- Treat each dashboard widget as: **metric id**, **parameters** (e.g. radius R, route corridor width), **freshness**, **permissions**.
- v1 can hardcode tiles; the **schema** should allow users/plugins to pick from a **catalog** later without rewriting the app core.

### 2.3 Compute split

- **Heavy:** Area stats, baselines, anomaly/outlier scoring, large spatial joins → **batch jobs** and/or **backend**; emit **small JSON** (or tiles + sidecar summaries) per jobsite/corridor.
- **Light:** Browser or app consumes **summaries + bounded neighbor lists**, not full statewide raw tables in JS.

### 2.4 Community / notes

- Requires **auth**, durable **storage**, **spatial binding** (well, radius, route segment), **abuse reporting**, and clear **disclaimers** (user is responsible for compliance and accuracy of crowd content).

### 2.5 Integrations (later milestones)

- Weather, traffic, routing APIs (keys and quotas = operator-owned).
- Optional: push notifications, native shells — product decision.

---

## 3. Data sources (Indiana, current)

| Layer | Source | Role |
|--------|--------|------|
| Registry bulk | Indiana DNR **ArcGIS** `WaterWells_DNR_Water_IN_1` FeatureServer | Lat/lon, depth, construction, pump fields, report URL, etc. |
| Lithology bulk | DNR **WellLogs** CSV/TXT (`RefNum`, intervals) | Rich intervals; drives vein/gravel-style signals in build pipeline. |
| Per-well HTML | DNR well **report pages** (parsed table) | Optional gap-fill when logs missing; same parsing idea as `api/dnr-report.js`. |
| Pump enrich | Optional `dnr_pump_rates.csv` | Merge pump rates by ref. |

**Authoritative ETL** today lives in **`DNR_Well_Viewer_Full_Demo`**: `fetch_dnr_wells.py` → `dnr_wells_full.csv` → `build_statewide_data.py` → `dnr_wells_chunk_*.csv.gz`.

---

## 4. Repository layout (this folder)

| Path | Role |
|------|------|
| `PROJECT_OUTLINE.md` | This document. |
| Repo root (`package.json`, `src/`) | Next.js **driller-only MVP**: paste dispatch → brief + **Leaflet** map with **Search job site** (GPS first, Nominatim geocode via `api/geocode`); mock wells on map. Deploy from repo root on Vercel (Root Directory `.`). |
| `scripts/sync_dnr_data.sh` | Thin wrapper: run DNR fetch + statewide build (see env vars inside). |
| `scripts/build_canonical_jsonl.py` | Read viewer **gz chunks** → **`data/out/canonical_wells.jsonl.gz`** for hub backends or analytics (provenance envelope). |
| `data/out/` | Generated artifacts (gitignored). |

The **map viewer** can remain the static Leaflet app in `DNR_Well_Viewer_Full_Demo`; the **hub** is the Next.js app at the repo root and will consume canonical exports and future APIs.

---

## 5. Canonical export schema (v1)

Each line in `canonical_wells.jsonl.gz` is one JSON object:

- **`well`:** Flat dict matching chunk columns (see `build_statewide_data.py` `fields` list: id, refno, lat, lon, depth, county, owner, report, loc_type, ground_elev, well_bottom_elev, static_water, depth_bedrock, well_use, casing_*, screen_*, pump_*, vein_*, gravel_*, lithology_json, lithology_source).
- **`_provenance`:** `{ "dataset": "in_dnr_water_wells", "pipeline": "dnr_viewer_chunks", "schema_version": 1 }`.

**Outliers / area stats** are **not** in v1 export; they are computed in a later **analytics** step from this file or from DB loaders.

---

## 6. Milestones (suggested)

1. **Data contract:** Stable canonical export + `sync_dnr_data` documented ✓ (in progress).
2. **Hub shell:** App with auth placeholder, empty customizable grid, one real tile (e.g. “wells in radius”). *Progress:* **single driller page** at repo root: paste-only dispatch parsing, brief with mock neighborhood wells + Leaflet. Next: optional Google APIs; then real well stats from canonical export.
3. **Analytics service:** Precompute neighborhood summaries + outlier flags for chosen metrics.
4. **Trip context tile:** Weather + traffic (keys from operator).
5. **Notes:** PostGIS or equivalent + moderation hooks.

---

## 7. Operator checklist (secrets & policy)

API keys, Vercel/hosting, maps, weather, OAuth — **you** create projects and inject secrets. **You** approve liability copy, data retention, and moderation policy. AI can implement wiring and stubs.

---

## 8. How to re-use this doc in a new chat

Say: **“Read `Driller_Dashboard/PROJECT_OUTLINE.md` and continue from milestone X.”**  
Also point to **`DNR_Well_Viewer_Full_Demo`** for viewer-specific bugs and chunk format changes.
