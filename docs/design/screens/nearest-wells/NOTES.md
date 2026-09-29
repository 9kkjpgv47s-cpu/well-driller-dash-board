# Nearest wells strip — redesign critique log

Component: `apps/hub/src/components/drilling/NearestWellsStrip.tsx`
Job: synthetic job link at ~39.763,-86.399 (`/tmp/cj-demo/url.txt`).
Round-0 = pre-change baseline (old `.cj-plate` cards, 13rem scroll, no distance/rank/bar).

## Round 0 (baseline)

- Header repeated itself three ways (eyebrow, title, `25 WELLS` line).
- Cards were `.cj-plate` slabs with flush text, four same-weight lines, no rank/distance/hierarchy.
- Chips: raw colored text in light; cream `.cj-data` pills in dark — two different components.
- `max-h-[13rem]` cut the third row mid-card with no scroll affordance or fade.
- Phone: ~2 large cards per screen.
- Bonus defect found while measuring: `h1.visually-hidden` inside `.cj-main` was widened by
  `.cj-main > * { width: min(100%, var(--wrap)) }` → page `scrollWidth` 410 at 390px
  (20px horizontal overflow at 390 and 820). Fixed by hardening `.visually-hidden`
  (width/height `!important`, `clip-path`, `margin:0`) in `design/cj/base.css`.

## Round 1 — first pass of new component

Verified by geometry probe + card dumps:

- Alignment: rank/ID/distance on one baseline row; chips wrap in a `min-h-[22px]` row so
  cards align; all 25 cards 148px (desktop) / 76px (phone). Equal heights confirmed.
- Spacing rhythm: padding 12/14px, 8px row gap, 10px grid gap — consistent.
- Hierarchy: eyebrow → serif title → legend row → cards; rank mono ink-4, ID mono semibold ink,
  distance mono ink-3 right-aligned; stats mono tabular with micro labels; aquifer ink-3 clamped.
- Distance wired: `center` prop + `haversineMiles` → `0.01 mi` … `0.15 mi` ascending = order sanity ✓.
- Chip consistency: ONE paper-tag style both themes — measured identical tag bg
  `color(srgb .90 .91 .95)` etc. in light and dark; locked text colors preserved.
  Value/prefix contrast on tag bg: G 8.97/6.88, S 9.04/4.98, R 8.34/4.78 — all ≥4.5 ✓.
- Issues found → fixed:
  1. Third-row peek only 30% of a card (wanted ~40%) → `sm:max-h` 21rem → 24rem.
  2. `.well-depthbar` used `flex:1 1 auto` — would stretch the 3px bar vertically on a card
     missing the meta row → replaced with `margin-top:auto` on `.well-card-meta`.
  3. Capture script selected the wrong ancestor (filters panel) — switched to `.well-list`.
  4. Hint span needed `min-w-0` to truncate instead of overflowing the header flex row.
- Mobile: `max-h-[18.5rem]` ≈ 3.5 compact rows (76px cards, ≥44px tap target) ✓.
- `numbers in ft` legend note hidden <640px (chips still shown) — noted compromise for width.

## Round 2 — post-refine verification

- Peek now 41% of row 3 at 1440 ✓; 3.5-ish rows at 390 ✓.
- Fade mask present while scrollable; `well-list-fade` class removed at scroll end →
  `mask-image: none` ✓ (JS scroll listener, updates on resize + wells change).
- Click card → detail modal opens (DNR-185960 detail shown); Enter on focused card → same;
  `is-selected` applied (accent-soft bg + inset 3px left rule).
- Focus ring: `outline: 2px var(--accent), offset 2px`; hover: accent border + 1px lift,
  120ms (`--dur-fast`); both disabled under `prefers-reduced-motion`.
- No horizontal overflow at 390 / 820 / 1440 (`scrollWidth == clientWidth` in every shot).
- byDepth mode: eyebrow `Registry · by depth`, title `Wells by depth · map 2 mi`,
  sorted list, distance still shown (harmless), depth data intact.
- Sandstone paper: card surface + ink follow the paper tokens; tags keep their fixed light
  paper bg so locked hues stay ≥4.5:1 — reads consistent with the palette.
- Thermometer caller keeps `maxHeightClass` (`max-h-[22rem] md:max-h-[26rem]`) and now passes
  `listMode="byDepth"` so its eyebrow matches its by-depth title.

## Round 4 — DNR marker color code (Dom: "more vibrant, like the map colors")

Layout untouched; only color treatment changed:

- `.well-tag` is now a solid marker chip in BOTH themes: G `#2563eb`/white,
  R `#dc2626`/white, S `#fde047`/`#422006`; radius 6, no ring,
  `inset 0 -1px rgba(0,0,0,.12)` depth line. Token text + order unchanged.
- Contrast: white/#2563eb = **5.17**, white/#dc2626 = **4.83**,
  `#422006`/#fde047 = **10.8** — all ≥4.5 at full opacity (85% prefix opacity
  would drop white-on-blue below 4.5, so prefixes stay full white).
- Card type stripe: 4px `border-left` in `wellTypeColorViewer(w)` — verified
  live: unconsolidated wells `#2563eb`, estimated wells `#16a34a`, matching the
  markers. Inline style wins over `:hover` border-color, so the stripe persists
  on hover while the other three sides go accent.
- Depth bar fill = same `wellTypeColorViewer(w)` color on `--line` track,
  bar 4px.
- Selected = 1.5px inset accent ring (no left rule) so it can't fight the stripe.
- Chips are locked data colors → `.well-tag` was already in the audit's
  `LOCKED_SCOPE`; prefix findings stay in the locked bucket.
- Measured identical tag fills/text colors in light and dark; legend chips
  render the same style. Sandstone paper: chips keep DNR hues, card surfaces
  follow the paper tokens — reads correctly.

## Round 3 — final polish + gates

- Truncation: ID `truncate`, aquifer `truncate`, hint `truncate`+`min-w-0`,
  legend row `overflow-hidden` — verified no scrollWidth growth at any width.
- `getOrderedTagTokensViewer` / classifier / chip text+colors / ordering / click handler:
  untouched — card text for first 25 wells matches round-0 capture (IDs, token text,
  depth/gpm/aquifer strings; see `cards-*.json` round-0 vs round-N).
- Fallback path: `typeLb`/"Well" renders in the same `min-h-[22px]` chip row so
  token-less cards keep identical height.
- Axe / lint / tsc / test / sync / build — see final report.
