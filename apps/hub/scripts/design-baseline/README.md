# design-baseline capture harness

Reusable Playwright harness for the C&J restyle (`design/cj-universal`). No
package.json dependency — it `require()`s Playwright/pngjs from the C&J OS
checkout (`~/Projects/cj-os/node_modules`) or `CJ_PLAYWRIGHT_PATH` /
`CJ_PNGJS_PATH`.

## Capture

```bash
node capture.mjs capture --out ../../../docs/design/screens/<label> \
     --base http://localhost:3001            # hub dev server
     [--viewer-url http://localhost:8791/index.html]  # standalone viewer later
     [--with-tiles]                          # allow live OSM tiles in shots
     [--hub-cap-width 1152]                  # COMPARISON ONLY: inject CSS that
                                            # caps the hub field workspace at
                                            # the pre-restyle content width so
                                            # map geometry matches baseline
     [--match-baseline <baseline-dir>]       # COMPARISON ONLY: translate each
                                            # map element to the baseline's
                                            # fractional doc origin (recorded in
                                            # <baseline-dir>/crop-fracs.json) so
                                            # marker AA rasterizes identically
```

Produces under `<out>`: full-page PNGs at 390x844 + 1440x900 (hub `/`, hub
`/?lat=39.763&lon=-86.399`, viewer), `crops/{hub,viewer}-map-crop.png`
(deterministic map-element crops, tiles aborted), `behavior.json`, and
`capture-log.json` (non-deterministic run log — excluded from compare).
Also refreshes `docs/design/baseline/locked/` (viewer script blocks, marker CSS
rules, hub globals.css marker section) — re-runnable alone via `extract`.

## Compare (determinism / after-restyle gate)

```bash
node capture.mjs compare <dirA> <dirB>   # exit 0 = identical
```

Pixel-diffs `crops/*.png` (pngjs, mismatched-pixel count) and requires
`behavior.json` identical. Full-page screens are intentionally excluded from the
gate: the viewer's default zoom-11 view exceeds its random 800-marker cap, so
screens legitimately differ run-to-run.

Crop compare masks in-map overlay chrome (zoom control, bottom pill/stack,
attribution) — those are restyled UI, not gate content — and tolerates ±2px
size differences by sliding the smaller crop inside the larger (baseline
element screenshots could clip a 1px fractional-origin sliver).

## Comparison-run recipe (post-restyle)

```bash
node capture.mjs capture --out ../../../docs/design/screens/after-<label> \
     --base http://localhost:3001 --hub-cap-width 1152 \
     --match-baseline ../../../docs/design/screens/before
node capture.mjs compare ../../../docs/design/screens/before \
     ../../../docs/design/screens/after-<label>
```

`crop-fracs.json` in the baseline dir records the baseline elements'
fractional document origins (hub `{x:0.3281, y:0}`, viewer `{x:0, y:0.2188}`).
Markers rasterize at subpixel offsets — without matching fracs, identical
content diffs on every antialiased edge.

## Determinism contract

- `/api/weather` → fixed Open-Meteo-GFS-shaped JSON; `/api/radar/**` → fixed
  stub (upstream is time-varying).
- All other cross-origin requests aborted (tiles unless `--with-tiles`,
  nominatim, elevation, NWS, open-meteo...).
- Viewer: `?lat&lon` focuses via the existing param, then `searchCenter` is
  cleared and a fixed zoom is `setView`'d — the 2-mi radius pool exceeds the
  random `Math.random()` 800-marker cap, so counts/crops must run in bounds
  mode. Zoom auto-raises (≤18) until in-view wells < 750.
- Hub: map boots at zoom 13; two `.leaflet-control-zoom-in` clicks → 15
  (`disableClusteringAtZoom`, individual well dots).
- `serviceWorkers:'block'`, fixed timezone `America/Indiana/Indianapolis`,
  `en-US`, scale factor 1, marker-count stability polling.

Page-global note: the viewer declares `map`/`wells`/`tempMarker` as top-level
`let` — use bare identifiers in `page.evaluate` (`window.map` is the `#map`
DOM div, not Leaflet). `searchCenter` is `var` (window-attached).
