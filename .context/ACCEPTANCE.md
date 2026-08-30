# Acceptance — measurable draft

## Hub MVP (from hub README + root README)

| ID | Check | Command / evidence |
|----|-------|-------------------|
| H1 | Install + dev server | `cd apps/hub && npm install && npm run dev` |
| H2 | Unit tests | `npm test` (vitest) |
| H3 | Production build | `npm run build` |
| H4 | Mono-page `/` only app surface; legacy routes redirect | manual / code |
| H5 | Jobsite set → chunks load with progress; map + area insights | UI |
| H6 | Weather panel for job lat/lon | UI + `/api/weather` |
| H7 | Canonical JSONL from committed full gz | `python3 scripts/build_canonical_jsonl.py --from-full` |

## Data / viewer boundary

| ID | Check |
|----|-------|
| D1 | Without WELL_VIEWER_ROOT, hub still serves committed chunks |
| D2 | With WELL_VIEWER_ROOT, sync/rebuild scripts delegate correctly |
| D3 | `npm run verify:chunks` summarizes coverage |

## Lithology 90% track (from statewide report)

| ID | Check |
|----|-------|
| L1 | `real_parsed_pct >= 90.000` |
| L2 | `parseable_json_pct == 100.000` |
| L3 | `verify:viewer-hub-artifacts` parity (names + hashes) |

## Later milestones (not v1 hub gate unless Dom says so)

- Analytics service outliers precompute  
- Traffic/routing tiles  
- Community notes + moderation  
