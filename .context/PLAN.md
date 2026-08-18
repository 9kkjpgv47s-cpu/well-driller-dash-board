# Plan — next incomplete

From `PROJECT_OUTLINE.md` milestones + lithology execution report + hub README.

## Done / in progress (documented)

1. **Data contract:** canonical export + sync docs — “in progress” ✓ note in outline  
2. **Hub shell MVP:** mono-page dispatch → map/weather/area insights (`apps/hub`)  
3. Chunks + full gz committed for clone path  
4. Lithology statewide command lane + KPI tooling; mid-run ~52–53% real parsed (window-3 snapshot in report)

## Next incomplete

### N1 — Lithology → 90% real parsed (data track)

```bash
cd apps/hub
export WELL_VIEWER_ROOT="/absolute/path/to/dnr-viewer-repo"
npm run lithology:statewide -- --mode cycle --window-max 5000 --delay-sec 0.2
# or iterate-to-target
npm run verify:lithology-kpi
npm run verify:viewer-hub-artifacts
```

Exit: `real_parsed_pct >= 90`, `parseable_json_pct == 100`, artifact parity (report final signoff).

### N2 — Fresh clone hub path verify

```bash
python3 scripts/build_canonical_jsonl.py --from-full
cd apps/hub && npm install && npm test && npm run dev
```

Exit: `/` loads; jobsite unlocks map/weather/insights.

### N3 — Outline milestone: analytics service

- Precompute neighborhood summaries + outlier flags  
- Outline still future vs mock/cached optimization  

### N4 — Trip context expansion

- Weather exists; traffic/routing later  

### N5 — Community notes

- Auth + storage + moderation hooks (blocked on Dom policy)

## Non-work during `/ce`

- No product feature implementation in this bootstrap  
- Do not invent Dom policy locks  
