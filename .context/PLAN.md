# Plan — next incomplete

From `PROJECT_OUTLINE.md` milestones + lithology execution report + hub README.

## Done / in progress (documented)

1. **Data contract:** canonical export + sync docs — “in progress” ✓ note in outline  
2. **Hub shell MVP:** mono-page dispatch → map/weather/area insights (`apps/hub`)  
3. Chunks + full gz committed for clone path  
4. Lithology statewide command lane + KPI tooling; mid-run ~52–53% real parsed (window-3 snapshot in report)

## Next incomplete

### N1 — Lithology → 90% real parsed (data track) — ✅ DONE 2026-08-18

Real parsed: 97.476% (target 90%). Parseable JSON: 100%. See `npm run verify:lithology-kpi`.

### N2 — Fresh clone hub path verify — ✅ DONE 2026-08-30

414,953 records built; 139/139 tests; build clean; `/` 200; both 503-prone APIs serve 200 w/ data. Evidence in PROGRESS.md.

### N3 — Outline milestone: analytics service — PARTIAL

- Neighborhood summaries: ✅ covered by `scripts/precompute_area_grid.py` (8/18)
- Outlier flags: ❌ not covered — needs spec, Dom approval before implementation

### N4 — Trip context expansion — PARKED

- Weather exists; traffic/routing still later (confirmed 2026-08-30)

### N5 — Community notes — BLOCKED

- Auth + storage + moderation hooks (blocked on Dom policy — confirmed 2026-08-30)

## Non-work during `/ce`

- No product feature implementation in this bootstrap  
- Do not invent Dom policy locks  
