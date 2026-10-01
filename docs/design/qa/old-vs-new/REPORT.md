# OLD-vs-NEW functional comparison — is anything broken?

- **OLD**: hub `cd5e3ba` (prior production) prod-built + served on `localhost:3010`; standalone viewer `772e522` static-served on `localhost:8792`.
- **NEW**: live `https://driller-hub.vercel.app` (+`/well-viewer/index.html`), `https://c-j-well-viewer.vercel.app`.
- Same inputs, same geolocation (39.763,-86.399), SW blocked, clipboard stubbed. Readings use `textContent` (see "iPhone artifact" below).
- Runner: `apps/hub/scripts/qa/old-vs-new.mjs`; raw rows: `results.json`, `RAW.md`; shots in `shots/`.

## Verdict

**No functional regression found.** Every feature works; the two real differences are (a) the intended lithology/classifier improvements and (b) one genuine WebKit CSS regression — found, root-caused, fixed locally (`2643003` hub / `20f66ee` standalone), verified `ow=0`. Needs a push to reach prod.

## iPhone "empty list" mystery — explained (not a regression)

`docs/design/qa/live-click` recorded `wellCount ""→""` and `list innerText=""` on webkit iPhone. Root cause: `cj/viewer.css` applies `content-visibility: auto; contain-intrinsic-size: auto 600px` to `.order-3`/`.order-4` below 768px. **WebKit returns `innerText=""` for elements inside content-visibility-skipped subtrees** — the data was present (`textContent` = "414,953", full well rows). Confirmed on the NEW page directly and cross-checked: OLD shows text because it has no content-visibility rule. All iPhone numbers below are `textContent` reads — NEW matches OLD.

## Side-by-side results

### Viewer (identical on in-hub + standalone NEW)

| Feature | Input | OLD (:8792) | NEW (live) | Match? |
|---|---|---|---|---|
| Dataset load | `?lat&lon` | 414,953 wells | 414,953 wells | ✅ same |
| Address search | "Avon, IN" | wc=1141, ids DNR-185960,186454,186206,186211,18063,… | wc=1141, **identical IDs/order** | ✅ (one desk leg sampled 1150 before geocode refresh — timing) |
| Address search | "1234 E County Road 100 N, Avon" | wc=1091, ids DNR-71643,186005,300930,… | wc=1091, identical | ✅ |
| Address search | "Coatesville, IN" (rural) | wc=247, ids DNR-184765,174733,… | wc=247, identical | ✅ |
| Coord search | "39.763, -86.399" | wc=1150 | wc=1150, same IDs | ✅ |
| Text search | "185960" / "BURCH" / "Hendricks" | list updates | identical behavior | ✅ |
| Use My Location | granted geo | wc=1150 | wc=1150, same IDs | ✅ |
| Depth filter | 80–120 ft | wc=**616** | wc=**593** | ⚠️ explained below |
| Get ground elevations | click | "Your ground elevation: **840 ft**", per-well elevs (840, 837, …) | identical 840 ft + same per-well values | ✅ |
| Yield toggles | 4 toggles | 1002 / 367 / 284 / 271 | identical | ✅ |
| Elev toggles | 4 toggles | 298 / 65 / 0 / 0 | identical | ✅ |
| Type toggles | Uncon/Rock/Bucket/Dry/Est | 224 / 122 / 0 / 133 / 671 | 527 / 354 / 30 / 133 / 651 | ⚠️ explained below |
| Hide wells | toggle | list unchanged (1150), labels hidden | same | ✅ |

### Hub

| Feature | Input | OLD (:3010) | NEW (live) | Match? |
|---|---|---|---|---|
| Dispatch parse | synthetic text | "1234 E County Road 100 N, Avon, IN 46123", 39.763,-86.399, 120 ft off drive | identical | ✅ |
| Nearest wells | first 10 | DNR-185960,186211,186206,185965,185985,18063,… + depth/gpm/aquifer | same IDs + order + values (+ lithology chips, distance, rank — new design) | ✅ + enhancement |
| DEM / ground elev | cards + Ground elevation btn | DEM 840 ft on cards | DEM 840 ft on cards | ✅ |
| ASL tab | open | "Need ground elevation and lithology logs" empty state | "Showing 24 of 44 wells with logs" + chart (svg) | ✅ improved (hydrated logs) |
| Depth tab | open | depth thermometer + stats | same structure | ✅ |
| Weather | providers | weather panel (no segmented tabs in old markup) | GFS / ECMWF / NWS tabs | ✅ provider tabs are new UI |
| **Area insights @2mi** | — | **Lithology intervals 0/1125**, confidence 38/100, "0% ≥3 intervals", 38% rock top | **Lithology intervals 1125/1125**, confidence 83/100, 18% ≥3 intervals, 28% rock top | ✅ **expected** — the f4b0228 fix |

## Explained differences

1. **Area insights 0/1125 → 1125/1125**: the committed production bug `f4b0228` fixed — OLD literally predates it. Registry-derived stats are identical (869/1125 parseable GPM, same %s); only lithology-derived stats moved because the denominator went 830→1125.
2. **Viewer type-toggle counts** (Uncon 224→527, Rock 122→354, Bucket 0→30, Est 671→651): formation-class v3 classifier (ef1d2ba) — different well typing, now non-exclusive (a well can be e.g. estimated + unconsolidated). Intentional.
3. **Depth filter 616→593**: filter logic byte-identical both sides (`depthOk = d>=min && d<=max`). Delta = `getWellDisplayDepthFt` fallback values resolve differently when wells lack `depth` — v3 lithology parse yields different max-bottom ft for those records. Behavior change from the classifier/parser work, not a logic regression.
4. **Hub "Lithology intervals" etc.**: covered by #1.

## The one real bug found — FIXED locally

**WebKit phone horizontal overflow on the viewer**: `.grid-cols-1 { grid-template-columns: 1fr }` (bare `1fr`) + WebKit treating `content-visibility:auto` items' `contain-intrinsic-size` width (~600px) as grid-item min-content → single column resolved to 650px → page `scrollW 666 > 393` (`ow=273`). Chromium unaffected.

- Fix (committed): `grid-cols-1 → minmax(0,1fr)` in `public/well-viewer/index.html` + standalone `index.html`; `min-width:0` on `.cj-viewer .order-1..4` in canonical `design/cj/viewer.css` (synced to hub `public/` + standalone `cj/`).
- Verified on webkit iPhone 14 Pro context locally (:3001 hub + :8791 standalone): `ow=0`, column=361px, all four panels fit.
- Commits: hub `2643003`, standalone `20f66ee` — **not pushed**; live prod still overflows on iPhone until deployed.
