# C&J design system

One design system for the Driller Hub (`apps/hub`) and the C&J Well Viewer
(`apps/hub/public/well-viewer/index.html`), lifted from C&J OS
(`~/Projects/cj-os`, read-only) and the cj4water brand surface.

**Canonical source:** `design/cj/`. Never edit the copies — run
`scripts/sync-cj-design.sh` to distribute, `--check` to verify no drift.

| File | Purpose |
|------|---------|
| `design/cj/tokens.css` | scale tokens + light/dark/field theme values |
| `design/cj/base.css` | reset, body/type, focus, selection, skip link, bg layer |
| `design/cj/components.css` | top bar, buttons, forms, card, callout, badge, chip, empty, modal, progress |
| `design/cj/motion.css` | reveal stagger, pop, slide-down, `.skel`, reduced-motion kill |
| `design/cj/loader.css` | `.cj-bore` bore loader |
| `design/cj/fonts.css` + `fonts/` | self-hosted woff2 + OFL licenses |
| `design/cj/icons.svg` | 25-symbol sprite (`i-*`), 24px grid, 1.6 stroke |
| `design/cj/theme-init.js` | no-flash theme bootstrap (localStorage `cj-theme`) |
| `design/cj/theme-toggle.js` | vanilla light→dark→field toggle for static surfaces |

Sync destinations:

- `apps/hub/src/styles/cj/` — css + fonts + `icons.svg` + generated `icons.ts`
  (consumed by `globals.css` imports and `src/components/ui/Icon.tsx`).
- `apps/hub/public/well-viewer/cj/` — everything, including the vanilla js
  (consumed by the static viewer HTML via relative paths).

## Tokens

| Token | light | dark | field |
|-------|-------|------|-------|
| `color-scheme` | light | dark | light |
| `--bg` | `#F6F4EF` | `#0A0F1A` | `#FFFFFF` |
| `--bg-2` | `#EFECE5` | `#0F1522` | `#F2F2F0` |
| `--bg-3` | `#E7E3DA` | `#151C2B` | `#E6E5E1` |
| `--surface` | `#FBFAF7` | `#0E1420` | `#FFFFFF` |
| `--ink` | `#0F1522` | `#EDEBE6` | `#000000` |
| `--ink-2` | `#3A4150` | `#B9BCC4` | `#1E232C` |
| `--ink-3` | `#565E6A` | `#8B939F` | `#3A4150` |
| `--ink-4` | `#5F6672` | `#828A96` | `#4A515C` |
| `--line` | `rgba(15,21,34,.10)` | `rgba(237,235,230,.09)` | `rgba(0,0,0,.22)` |
| `--line-strong` | `rgba(15,21,34,.22)` | `rgba(237,235,230,.20)` | `rgba(0,0,0,.45)` |
| `--accent` | `#C60000` | `#F2554D` | `#B00000` |
| `--accent-ink` | `#8F0000` | `#FF8A80` | `#7A0000` |
| `--accent-soft` | `rgba(198,0,0,.09)` | `rgba(242,85,77,.12)` | `rgba(176,0,0,.10)` |
| `--accent-2` | `#FFE90A` | `#FFE90A` | `#FFE90A` |
| `--accent-2-ink` | `#7A6200` | `#FFE90A` | `#5C4A00` |
| `--accent-2-soft` | `rgba(255,233,10,.16)` | `rgba(255,233,10,.16)` | `rgba(255,233,10,.28)` |
| `--ok` | `#267030` | `#5BD39B` | `#1B5E20` |
| `--ok-soft` | `rgba(15,123,79,.12)` | `rgba(91,211,155,.14)` | `rgba(27,94,32,.12)` |
| `--warn` | `#94570F` | `#F2B85C` | `#7A4500` |
| `--warn-soft` | `rgba(217,119,6,.14)` | `rgba(242,184,92,.14)` | `rgba(122,69,0,.12)` |
| `--bad` | `#B3261E` | `#F28B82` | `#A50E0E` |
| `--bad-soft` | `rgba(179,38,30,.10)` | `rgba(242,139,130,.14)` | `rgba(165,14,14,.10)` |
| `--bad-ink` | `#fff` | `#241210` | `#fff` |
| `--glass` | `rgba(246,244,239,.82)` | `rgba(10,15,26,.78)` | `#FFFFFF` (solid — no blur) |
| `--selection` | `rgba(198,0,0,.18)` | `rgba(242,85,77,.28)` | `rgba(176,0,0,.20)` |
| `--fs-base` | `1rem` | `1rem` | `1.0625rem` |
| `--tap` | `44px` | `44px` | `48px` |

light/dark values are verbatim from C&J OS globals.css. field is the
sunlight-legibility theme: white ground, black ink, deep C&J red, solid
surfaces (no translucency, no backdrop blur), 48px tap targets, +1px base type.

## Type / spacing / radii / motion

- Fonts: `--font-display` Instrument Serif (h1/h2, italic `<em>` in
  `--accent-ink`), `--font-body` Inter, `--font-mono` IBM Plex Mono.
- Scale: `--fs-xs .72` / `--fs-sm .84` / `--fs-base 1` / `--fs-md 1.1` /
  `--fs-lg 1.5` / `--fs-xl clamp(1.9→2.5)`.
- Spacing `--s-1`…`--s-8` = .25/.5/.75/1/1.5/2/3/4 rem.
- Radii: `--radius` 6px, `--radius-lg` 12px; buttons are pills.
- Motion: `--dur-fast .12s` / `--dur-med .18s` / `--dur-slow .28s`;
  easing `--ease-out` / `--ease-in-out` / `--ease-spring`; reveal stagger 60ms.
- Base type ≥16px in all themes; inputs are pinned to 16px minimum so iOS
  never auto-zooms.

## Icons

`icons.svg` — `<symbol id="i-NAME" viewBox="0 0 24 24">`, `fill:none`,
`stroke:currentColor`, `stroke-width:1.6`, round caps/joins, 2px safe padding.
Names: locate, elevation, layers, filter, search, well, drill, report,
external, share, close, chevron-down, chevron-right, refresh, weather, radar,
map-pin, info, alert, check, sun, moon, field (bold sun ring), arrow-right,
menu. In React use `<Icon name="…">` (`src/components/ui/Icon.tsx`), which
inlines markup generated from the sprite by the sync script — one source of
truth.

## Components

- `.cj-shell` / `.cj-topbar` / `.cj-main` — sticky glass top bar (solid in
  field), main column at `min(100%, var(--wrap))` with `--gutter` padding.
- `.cj-brand` = BrandMark + serif `.cj-brand-text` + mono `.cj-tag`
  (per-app identity: `DRILLER HUB`, `WELL VIEWER`).
- `.cj-app-switch` — pill link to the sibling app; collapses to an
  icon-only round button ≤560px (keep an `aria-label` on the link), and
  `.cj-tag` hides ≤420px so the brand never collides with the actions.
- `.theme-toggle` — 36px round button; the sun/moon/field morph is pure CSS.
- Buttons: `.btn` + `.btn-primary` (ink) / `.btn-accent` (C&J red) /
  `.btn-ghost` / `.btn-danger` / `.btn-icon` / `.btn-sm`. `min-height: var(--tap)`.
  `.is-loading` swaps content for a 14px spinner without changing width.
  `.arrow` inside a `.btn`/`.link-arrow` nudges → on hover.
- `.seg` — segmented control (`aria-pressed` or `.on`).
- `.field` + `.input` / `.select` / `.textarea`; `.switch` toggle.
- `.card` (`.is-featured`), `.callout` (`.is-ok/.is-warn/.is-bad/.is-info`,
  left rule), `.badge` (`badge-ok/warn/bad/info/faint`), `.chip`, `.empty`.
- `.modal-backdrop` + `.modal-dialog` — centered, bottom sheet ≤760px.
- `.cj-plate` (**data chips**) — a container whose content carries locked
  data colors (legend swatches, R/G/S chips, band labels). The container
  ALWAYS follows the theme: `--plate`/`--plate-ink`/`--plate-line` resolve
  to `--surface`/`--ink`/`--line` in every theme — there are no fixed-white
  surfaces in chrome. Locked data colors inside stay exact; dark theme
  adds legibility affordances only where needed:
  - Legend rows (hub filter cards; viewer elevation/yield/type bands): the
    colored ● dot / swatch and toggle slider keep their locked color; the
    label text is wrapped in `.cj-datalbl` and flips to `--ink-2` in dark
    theme only (light + field keep the locked color).
  - Bare data-colored text with no background of its own (`.cj-data`:
    viewer list R/G/S chips, distance badges, colored type/elev/yield
    words; hub nearest-well token chips) gets a small light paper chip in
    dark theme: `background: var(--data-chip)` (#EFE9DF), 4px radius,
    `0 4px` padding — the exact locked color sits on the chip.
  - Data elements that already carry their own colored background
    (registry chips, marker combo rows) are unchanged.
  - Viewer `#modalBody` follows the theme in dark; its data-colored text
    uses the same chip rule and tables use theme ink/lines.
- `.progress` — 3px accent hairline.
- Loading: `.skel` shimmer skeletons for placeholders, `.cj-bore` +
  `.cj-bore__status` for screen/section loading.

## Per-app identity

| | Driller Hub | Well Viewer |
|--|--|--|
| Tag | `DRILLER HUB` | `WELL VIEWER` |
| App switch target | `/well-viewer/index.html` | `/` |

## Locked — never restyle

- Well/map marker visuals: `globals.css` section marked
  `LOCKED: well/map marker styles` (byte-checked against
  `docs/design/baseline/locked/hub-globals-marker.css`).
- All colors encoding **well data**: divIcon colors + constants in
  `DrillingMap.tsx`, formation/lithology fills in
  `WellAslStratigraphyChart.tsx`, depth gauge colors in
  `WellDepthThermometer.tsx`, legend swatches in
  `DrillingViewerMapFilters.tsx`, well-type/lithology chips in
  `NearestWellsStrip.tsx`, radar/weather scales in `LiveRadarMap.tsx` /
  `JobWeatherPanel.tsx`.
- Viewer `<script>` blocks and marker CSS (baseline locked extracts).
- `src/lib/**`, `src/app/api/**` — no behavior changes, ever.

## Do / don't

- Do: semantic tokens everywhere; `<Icon>` instead of emoji; `.skel`/
  `BoreLoader` instead of "Loading…"; eyebrow+serif section heads.
- Don't: raw hex in components, gradients on chrome, new named colors,
  Tailwind palette utilities (zinc/blue/emerald…) for chrome.
- Showroom: `/design` (dev only — `notFound()` in production) demos every
  token, icon, component, state and theme.
