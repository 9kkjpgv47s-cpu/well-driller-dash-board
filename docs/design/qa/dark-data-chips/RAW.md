# Dark data chips — evidence (2026-10-10 pass)

Kills the cream "paper" chip (--data-chip #EFE9DF) behind locked data colors in
dark mode. New model: inline data colors are lifted onto `--dc` by
`cjDataColorize`/`cjWatchDataColors` (viewer index.html), `.cj-dc` keeps the
exact hex in light and lifts to `oklch(from var(--dc) max(l,0.76) c*0.85 h)` in
dark, and `.cj-data` chips tint with their own `currentColor` (12% fill + 24%
inset ring) instead of paper. Fallback for browsers without relative color
syntax keeps `--data-chip`.

## Kept screenshots (8 PNG cap)

| File | Proves |
|---|---|
| list-desk-dark-BEFORE.png | Cream paper chips under R/G/S/elev values + "0.0 mi" badge (desktop @2x 1440) |
| list-desk-dark-AFTER.png | Same list: no paper; hue-tinted chips, lifted text |
| modal-desk-dark-BEFORE.png | Open well modal, dark, before |
| modal-desk-dark-AFTER.png | Same modal: colored values are plain lifted text, no chip slabs |
| list-px7-dark-AFTER.png | Pixel 7 dark list |
| list-i14-dark-AFTER.png | iPhone 14 Pro dark list |
| standalone-px7-dark-AFTER.png | Standalone viewer :8795 — same result as embedded |
| palettes-dark-AFTER.png | Hub /design/palettes (dev server; route is prod-404-gated) — .cj-data swatches legible, no paper |

Full uncurated shot set + computed-color dumps: /tmp/darkchips/{before,after}/.

## Contrast (dark, embedded viewer, first 25 cards + open modal)

103 `.cj-dc`/`.cj-data` elements measured; **min 6.17:1, 0 below 4.5:1**.

| locked --dc | dark computed | contrast |
|---|---|---|
| .text-emerald-600 (badge) | rgb(91, 211, 155) = --ok | 7.90:1 |
| rgb(185, 28, 28) #b91c1c | oklch(0.76 0.162 27.5) | 6.50:1 |
| rgb(220, 38, 38) #dc2626 | oklch(0.76 0.183 27.3) | 6.17:1 |
| rgb(29, 78, 216) #1d4ed8 | oklch(0.76 0.185 264.4) | 6.46:1 |
| rgb(37, 99, 235) #2563eb | oklch(0.76 0.183 262.9) | 6.48:1 |

## Light invariance

210/267 light element colors byte-identical vs the pre-change capture. The 57
changed rows are all **outer `.cj-data` chip spans**: rgb(15,21,34) → their face
color (e.g. #dc2626) — intended: the outer span is now the `--dc` carrier so the
chip tint follows the face hue. Every inner text span (the visible glyphs) is
unchanged; pixel diff of desk-light list = 2743/5184000 px (0.053%), confined to
bbox x1118–2687 y0–977 (header/sidebar text churn between runs), zero diff in
the chip column.

## Runtime theme toggle

Light render → click `[data-cj-theme-toggle]`: R chip `rgb(220,38,38)` →
`oklch(0.76 0.182901 27.326)`, element still attached, **0 mutation records on
#wellsList** (no re-render; pure CSS lift). Earlier flaky run showed 1 mutation
— that was async list settling during load, not the toggle (theme-toggle.js only
sets `documentElement.dataset.theme`).

## Notes / limits

- `/design/palettes` is `notFound()`-gated in production; shot was taken against
  `next dev` on :3007 (killed after).
- Standalone :8795 can't serve `/api/dnr-report` (serverless route); DNR modal
  fetches 404 there — expected, unrelated.
- Colorize roots: `#wellsList` + `#modalBody` (modalBody contains modalSummary/
  modalContent + logViewerSection — one root covers all modal injection points).
