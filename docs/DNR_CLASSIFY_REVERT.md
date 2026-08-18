# DNR well classification — revert guide

## What changed (v3 construction + dual-label)

**Rock well construction (driller practice):**
- No screen
- Casing set at / a few feet into rock top (e.g. rock @ 100 → casing 102–105)
- Total depth continues **below** casing (open hole into rock)
- **Never** call rock well if casing ends at rock top with **no** additional drill footage

**Screen set** → unconsolidated completion chip `G@casing`.

**Sandstone family** (sandstone, sand rock, sandrock, sandra rock, …) is rock, matched **before** loose sand.

Map labels: `R@103`, `G@48`, `Est·R@103` (set depth without opening the well).

## What changed (v2 dual-label)

| Concern | v1 (archived) | v2 (current default) |
|--------|----------------|----------------------|
| Unverified / estimated location | Exclusive category; never rock or uncon | **Location quality** flag; marker stays **green** |
| Rock vs unconsolidated | Aquifer text only (hub); residual “rock” | **Lithology layers + rock top + aquifer text**; rock top ≠ rock well |
| Map filters | Estimated only when “unverified” on | Dual OR: estimated can match uncon **or** rock **or** unverified |
| Analytics mix | Estimated steals from uncon/rock | Formation first; estimated with lithology land in uncon/rock |

## Instant runtime revert (no data rebuild)

Set either env var to `v1` and restart the hub:

```bash
# apps/hub/.env.local or Vercel project env
NEXT_PUBLIC_DNR_CLASSIFY_VERSION=v1
```

Server-side scripts can also read:

```bash
DNR_CLASSIFY_VERSION=v1
```

This routes `classifyDrillingWell` / `wellMatchesDrillingFilters` through the frozen module:

`apps/hub/src/lib/archive/dnr-well-classify-v1.ts`

Unset or set to `v2` (default) to use dual-label again.

## Code-level full revert

1. Copy archive over live classifier:

```bash
cp apps/hub/src/lib/archive/dnr-well-classify-v1.ts \
   apps/hub/src/lib/dnr-well-classify.ts
```

2. Restore viewer filter short-circuit from git (or re-apply estimated-only branch in `passesTypeFilterViewer` / `wellTypeLabelViewer` in `viewer-well-map.ts`).

3. Restore `inferAquiferForMix` / `aquiferMix` exclusive estimated branch in `area-well-analytics.ts` from git history if needed.

4. Disable lithology v2 sidecar if desired:

```bash
NEXT_PUBLIC_LITHOLOGY_V2=0
```

5. Offline v3 reprocess artifacts live under `lithology_v2/out/` and `scripts/lithology_classify_v3/out/` — **delete those directories only**; they do not rewrite original chunks unless you ran a write flag.

## Original data is never overwritten by classify v2/v3

- Chunk CSVs `dnr_wells_chunk_*.csv.gz` stay source of truth.
- V2/V3 write **sidecars** and **logs** only (unless an explicit `--write-chunks` is used later).
- Lithology JSON inside chunks is not mutated by the dual-label hub path.

## Related archives (old logic fully separate)

| Path | Role |
|------|------|
| `apps/hub/src/lib/archive/dnr-well-classify-v1.ts` | Frozen hub marker/filter classifier (executable via env) |
| `apps/hub/src/lib/archive/viewer-well-map-isUnconsolidated-v1.ts` | Notes on frozen hub viewer uncon path |
| `apps/hub/public/well-viewer/archive/classify-v1-viewer.js` | Viewer v1 marker stub |
| `apps/hub/public/well-viewer/archive/classify-v1-snippets-from-index.html.js` | Raw old index.html function snippets |
| `apps/hub/public/well-viewer/formation-class-v3.js` | **Live** browser dual-label + construction (well viewer) |
| `apps/hub/src/lib/formation-class.ts` | **Live** TypeScript dual-label + construction (hub) |
| `apps/hub/public/well-viewer/lithology_v2/` | Isolated lithology lexicon + sidecar |
| `scripts/lithology_classify_v3/` | Offline reprocess + full verify audits |

### Viewer-only runtime revert

```
?classify=v1
```
or before scripts: `window.DNR_CLASSIFY_VERSION = 'v1'`

## Accuracy policy

Prefer **no label** / `unknown` over a guessed rock/uncon when lithology is empty and registry aquifer is blank or only “estimated”. Losing accuracy is worse than leaving a well in the estimated-only bucket.
