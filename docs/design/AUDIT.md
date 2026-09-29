# C&J design audit — Driller Hub + Well Viewer

Restyle of the Driller Hub (`apps/hub`) and the embedded C&J Well Viewer
(`apps/hub/public/well-viewer`) onto one shared C&J design system
(`design/cj/`, spec: `SYSTEM.md`). Local-only; nothing deployed or pushed.

- Branch: `design/cj-universal`
- Baseline capture: `screens/before/` (commit `7250327`)
- After capture: `screens/after/` (this commit)
- Review shots: `screens/after/review/` (24 PNGs, live tiles)
- Machine-readable a11y data: `audit/axe.json`, `audit/taps.json`, `audit/contrast.json`

> Themes are light/dark only — the high-contrast field theme was removed
> post-audit; field rows in the tables below were dropped.

## Before / after

| Surface | Before | After |
|---|---|---|
| Hub home 390 | [png](screens/before/hub-home-390x844.png) | [png](screens/after/hub-home-390x844.png) |
| Hub home 1440 | [png](screens/before/hub-home-1440x900.png) | [png](screens/after/hub-home-1440x900.png) |
| Hub lat/lon 390 | [png](screens/before/hub-latlon-390x844.png) | [png](screens/after/hub-latlon-390x844.png) |
| Hub lat/lon 1440 | [png](screens/before/hub-latlon-1440x900.png) | [png](screens/after/hub-latlon-1440x900.png) |
| Viewer 390 | [png](screens/before/viewer-390x844.png) | [png](screens/after/viewer-390x844.png) |
| Viewer 1440 | [png](screens/before/viewer-1440x900.png) | [png](screens/after/viewer-1440x900.png) |

Theme/matrix review shots (hub home + lat/lon, viewer, `/design`; viewer modal
bottom-sheet at 390 light + dark; viewer bore-loader state):
`screens/after/review/` — 24 PNGs.

## Findings (original audit + review rounds)

| # | Surface | Issue | Severity | Fix | Status |
|---|---------|-------|----------|-----|--------|
| F1 | Hub | Off-brand palette: Geist + blue/indigo gradients, zinc/slate chrome | high | C&J tokens (Instrument Serif/Inter/Plex Mono, C&J red/yellow accent system) | fixed |
| F2 | Hub | Three unrelated token sets (app `:root`, `.field-hub-scope`, legacy aliases) | high | One semantic token set in `design/cj/tokens.css`; legacy vars kept as aliases (`globals.css`) | fixed |
| F3 | Hub | Generic header, default favicon | med | `.cj-topbar` (BrandMark + tag + app-switch + theme toggle), `icon.svg` from BrandMark | fixed |
| F4 | Hub | Plain "Loading…" text states | med | Bore loader (`.cj-bore`) for Suspense fallback + `loading.tsx` | fixed |
| F5 | Hub | ~655 palette utility classes / 154 hex literals in chrome | med | Chrome migrated to semantic tokens (`ink`, `surface`, `accent`, `ok`/`warn`/`bad`) | fixed |
| F6 | Hub | No theme toggle | med | Light/dark cycle, `localStorage cj-theme`, no-flash init (light/dark; field later removed) | fixed |
| F7 | Hub | Nearest-wells strip squished to ~70px column (pre-existing) | med | Full-width card (`lg:col-span-12`), segmented control, readable card grid | fixed |
| F8 | Hub | GFS source indicator lost pill styling | low | `FieldSegmentedToggle` restyle | fixed |
| F9 | Hub | `/design` rendered a second sticky top bar | low | Static labeled specimen + header theme switcher | fixed |
| F10 | Hub | Page title "Field — Driller Dashboard" | low | "Field — Driller Hub · C&J Well Co" | fixed |
| F11 | Hub | Scrollable tables not keyboard-focusable (`.max-h-72` ×2, axe serious) | med | `tabIndex={0}` on weather table + modal log table scrollers | fixed |
| F12 | Hub | No `h1` on `/` (axe moderate) | low | Visually-hidden `h1` | fixed |
| F13 | Hub | Tap targets: zoom 30px, seg options 28px, checkboxes 20px, selects/sm-buttons 30px, topbar controls 36px | med | `--tap` floor (44px) on `.btn*`, `.seg*`, `.input*`, `.select*`, theme toggle, app-switch, brand, leaflet zoom, checkbox label rows (24px box + ≥44 label target) | fixed |
| F14 | Viewer | system-ui font stack, no C&J chrome | high | Same `.cj-topbar` + page head (INDIANA DNR REGISTRY eyebrow, serif h1) | fixed |
| F15 | Viewer | `--font-body: var(--f-body),…` invalid without `--f-*` → Times fallback for all chrome | **high** | `var()` fallbacks in `tokens.css`; font files self-hosted + verified loading | fixed |
| F16 | Viewer | Stroked yellow "Use My Location" button (low contrast), equal-weight button stack, emoji icons, 98 inline styles | med | `.btn-accent` CTA + ghost/primary hierarchy, sprite icons, tokens | fixed |
| F17 | Viewer | No dark mode | med | `data-theme` light/dark on all chrome | fixed |
| F18 | Viewer | Plain loading panel above page header | med | Bore loader, placed after page head | fixed |
| F19 | Viewer | Desktop not map-first (map at y≈1050) | med | CSS-only 4/8 sticky map column (rows 1–2 span, `top: var(--top)+s-4`) | fixed |
| F20 | Viewer | Top bar overlap ≤420px (tag ↔ app-switch) | med | Tag hidden ≤420px, icon-only app-switch ≤560px; 0px overlap at 360/390/430/560 | fixed |
| F21 | Viewer | Locked data colors invisible on dark surfaces ("Dry Hole" `#111827`, S/G/R chips, legend labels) | high | `.cj-plate` fixed-light data plates (same values all themes) on filter bands, well list, modal body | fixed |
| F22 | Viewer | Filter checkboxes unlabeled (14 axe criticals), `#wellsList` not focusable, no `<main>`, h1→h3 skip, `#totalWells` 3.4:1 in dark | med | `aria-label` ×14, `tabindex`, `<main>` landmark, h2 headings, `--ok` on `#totalWells` | fixed |
| F23 | Viewer | Modal chrome | med | Token backdrop/surface/radius, serif title, system buttons, ≤760px bottom sheet (120px padding hack retained) | fixed |
| F24 | Both | Crop parity after restyle (width + subpixel AA) | infra | `--hub-cap-width`, `--viewer-map-size`, `--match-baseline` fractional-origin nudge (comparison-only) | fixed |
| O1 | Viewer | Random 800-marker cap → nondeterministic marker counts at default zoom | product quirk | **not changed** — harness pins zoom-15 in-bounds mode for determinism | observed |
| O2 | Both | Locked filter checkbox inputs have no `<label>` association in viewer markup | a11y | fixed via `aria-label` (markup attributes only, no script/DOM-order change) | fixed |

## Accessibility — axe-core (Playwright, `scripts/design-baseline/audit.mjs`)

Counts = violation **nodes** outside locked scopes (`#map`, `.cj-plate`,
`.cj-filter-card`, `#wellsList`, `#modalBody`, `.toggle-wrap` — data colors,
markers, and JS-built content). Before = baseline worktree on :3005
(theme-less); after = restyle on :3001 per theme.

| Page × theme | critical | serious | moderate | locked-scoped (listed, not gated) |
|---|---|---|---|---|
| hub — before | 0 | 3 | 1 | 25 |
| hub — light | 0 | 0 | 0 | 1 |
| hub — dark | 0 | 0 | 0 | 128 |
| viewer — before | 0 | 0 | 17 | 63 |
| viewer — light | 0 | 0 | 0 | 46 |
| viewer — dark | 0 | 0 | 0 | 51 |

Gate: no new serious/critical vs before — **met** (all non-locked findings
resolved; 0 remaining). Remaining locked-scoped findings are all
`color-contrast` on locked data colors (marker fills, legend swatch text,
S/G/R well-type chips, elevation/yield band labels) plus Leaflet
attribution-link contrast — data encodings, deliberately unchanged.

Pre-existing issues now fixed (were in "before"): hub `text-orange-600`
3.51:1 and zinc-500 contrast, `.max-h-72` non-focusable scroller, missing
`h1`; viewer 14 unlabeled filter checkboxes (critical), `#wellsList`
non-focusable, missing `main` landmark, h1→h3 skip.

## Contrast — chrome text tokens (WCAG ratios)

Computed from `design/cj/tokens.css` values (`audit/contrast.json`).

| Theme | Surface | ink | ink-2 | ink-3 | ink-4 | accent | accent-ink |
|---|---|---|---|---|---|---|---|
| light | bg | 16.60 | 9.31 | 5.96 | 5.26 | 5.62 | 8.81 |
| light | surface | 17.48 | 9.81 | 6.28 | 5.54 | 5.92 | 9.28 |
| dark | bg | 16.08 | 10.08 | 6.18 | 5.50 | 5.64 | 8.39 |
| dark | surface | 15.47 | 9.70 | 5.94 | 5.29 | 5.42 | 8.07 |

All pairs ≥ 4.5:1 (min: light `ink-4` 5.26). Meets WCAG AA.

## Tap targets — chrome controls (`audit/taps.json`)

Floor: 44px. Inputs wrapped in `<label>` report the
label box (the real click target); raw checkbox squares are 24px.

| Page × theme | controls | min height | under floor |
|---|---|---|---|
| hub — before | 30 | 20 | 24 of 30 |
| viewer — before | 10 | 41 | 0 |
| hub — light / dark | 28 | 44 / 44 | 0 |
| viewer — light / dark | 9 | 44 / 44 | 0 |

## Locked surfaces — verification evidence

| Surface | Rule | Evidence |
|---|---|---|
| Viewer scripts | all 8 baseline `<script>` blocks byte-identical, ordered subsequence | `screens/after/locked/viewer-scripts.json` vs `baseline/locked/` — only additions `cj/theme-init.js`, `cj/theme-toggle.js` |
| Viewer marker CSS | byte-identical | `viewer-marker-css.txt` diff = 0 |
| Hub marker CSS | byte-identical | `hub-globals-marker.css` diff = 0 |
| Map markers, legend swatches, lithology/elevation/yield/type colors, weather scales | data, not chrome | unchanged in source; see SYSTEM.md LOCKED list |
| Behavior | `behavior.json` identical | compare output below |
| Map crops | 0 mismatched px outside chrome masks | compare output below |

```text
OK  behavior.json (identical)
OK  crops/hub-map-crop.png    (re-encoded bytes differ, 0 pixel diffs, overlays masked)
OK  crops/viewer-map-crop.png (re-encoded bytes differ, 0 pixel diffs, overlays masked)
files compared: 3, mismatches: 0, mismatched pixels: 0
```

Deterministic behavior (identical before/after): hub 263 markers (262 well
dots + 1 job pin) at zoom 15; viewer 414,953 wells loaded, 252 in-view
markers, all 14 filter toggle counts, modal `DNR-186413` + report href + log
viewer, coords focus `movedToTarget:true`.

## Emoji → icon replacements

`📍` Use My Location → `i-locate` (`.btn.btn-accent`); `📐` Get ground
elevations → `i-elevation` (`.btn.btn-ghost`); search/coords buttons →
`i-search` / `i-map-pin`; modal close → `i-close`. Emoji inside locked
`<script>` strings (marker/popup builders, the `btnGroundElev` textContent
rewrite) are untouched by design.

## Known limits

- Map tiles don't theme (locked raster tiles; only the shell and controls do).
- Geist Sans is still loaded solely to pin `.leaflet-container` marker-label
  rasterization to the captured baseline (`globals.css`, documented there).
- `viewer-…-loading` shot is best-effort: captured ~350ms after the bore
  panel is visible; on fast local chunk reads the panel may already be done.
- The iCloud/phone standalone viewer and C&J OS were not touched.
- Baseline viewer had `serious`/`critical` findings inside locked scopes
  (marker label contrast, unlabeled checkboxes); contrast items remain —
  data colors are locked. Checkbox labels were fixed via `aria-label`.
- The `hub-dark` locked-scoped count (128) is higher than light (1) because
  dark-theme chrome needs the `.cj-data` paper-chip backing for legibility of
  locked data colors; the chips themselves are the intentional affordance.

## Reproduce

```bash
# dev server must be on :3001
node apps/hub/scripts/design-baseline/capture.mjs capture \
  --out docs/design/screens/<label> --base http://localhost:3001 \
  --hub-cap-width 1152 --viewer-map-size 824x648 \
  --match-baseline docs/design/screens/before
node apps/hub/scripts/design-baseline/capture.mjs compare \
  docs/design/screens/before docs/design/screens/<label>
node apps/hub/scripts/design-baseline/capture.mjs review \
  --out docs/design/screens/<label> --base http://localhost:3001 --with-tiles
node apps/hub/scripts/design-baseline/audit.mjs \
  --out docs/design/audit --base http://localhost:3001 \
  [--baseline http://localhost:3005]
scripts/sync-cj-design.sh --check
```
