# Locks — frozen facts from repo docs

## Product

| Lock | Source |
|------|--------|
| Pre-departure hub for water-well drillers | README, PROJECT_OUTLINE |
| App is mono-page on `/` (`DrillingHubClient`) | apps/hub/README, root README |
| Legacy `/drilling`, `/driller-job`, `/optimization`, `/well-viewer` → redirect `/` | apps/hub/README |
| Deep links: `?lat=&lon=`, share `?job=` | root README, hub README |

## Architecture / data

| Lock | Source |
|------|--------|
| Hub embeds static viewer under `apps/hub/public/well-viewer/` | AGENTS, README |
| Chunks: `dnr_wells_chunk_*.csv.gz` committed in hub public path | README |
| Full export: `dnr_wells_full.csv.gz` at repo root for clone without LFS | README |
| Canonical JSONL: `scripts/build_canonical_jsonl.py --from-full` → `data/out/canonical_wells.jsonl.gz` | README, data/README |
| Viewer path env: `WELL_VIEWER_ROOT` or `DNR_VIEWER_ROOT` (absolute; must have `rebuild_viewer_data.py`) | AGENTS.md |
| This repo does not search disk for viewer checkout | AGENTS.md |
| Canonical record provenance envelope schema_version 1 | PROJECT_OUTLINE |
| Map/chunks are downstream projection of canonical model | PROJECT_OUTLINE |
| Indiana sources: ArcGIS registry, WellLogs CSV, optional HTML reports | PROJECT_OUTLINE |

## Hub runtime stack

| Lock | Source |
|------|--------|
| Next 15.5.x, React 19, Tailwind 4, Leaflet, Vitest | apps/hub/package.json |
| Browser: parallel chunk fetch + Web Worker parse; spatial index 0.05° grid | apps/hub/README |
| Weather: Open-Meteo + US NWS blend; ~15 min server cache | apps/hub/README |
| Geocode: Indiana-biased Nominatim server-side | apps/hub/README |

## Lithology KPI (execution report)

| Lock | Source |
|------|--------|
| Plan name: `statewide-lithology-90-percent` | docs/statewide-lithology-execution-report.md |
| Primary target: real parsed (`csv\|html`) ≥ 90% | same |
| Secondary: parseable JSON intervals ≥ 100% | same |
| Baseline: 414,953 wells; real parsed 5.176% → window progress ~52.8% at window-3 snapshot | same |
| Canonical lane: hub npm wrappers + viewer ETL via WELL_VIEWER_ROOT | same |

## Operator ownership

| Lock | Source |
|------|--------|
| API keys, hosting, maps, weather, OAuth — operator creates/injects | PROJECT_OUTLINE §7 |
| Liability copy, retention, moderation policy — Dom approves | PROJECT_OUTLINE §7 |
