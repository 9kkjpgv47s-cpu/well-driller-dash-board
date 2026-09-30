# Prod QA — round 2 (lithology-fallback fix live)

Target: `https://driller-hub.vercel.app` at `f4b0228` (copy-on-write merge + `setAreaWells` Phase-2 hydrate).
Artifacts: `docs/design/qa/round-prod-2/` (matrix/flows/parity + shots).

## Fix verification — the labels prod was missing

| Check | Result |
|---|---|
| New bundle served | page chunk `page-f3aba89c3c998d3d.js` (was `0af767612d7a9dac`); map-merge + litho-loader code present; SW blocked + `?cb=` cache-busts used |
| Nearest cards (prod, first 6) | `DNR-185960 G1 8`, `DNR-186211 G1 9`, `DNR-186206 G1 8`, `DNR-185965 S1 5 G1 13`, `DNR-185985 G1 10 G2 5 G3 7`, `DNR-18063 S1 4 R 90` — matches required values exactly (was `G1 4`/`G1 3`/`G1 5`/`G1 3`/`G1 36`/`Well`) |
| Area insights | `Lithology intervals 1125 / 1125` at 2 mi (was `0 / 1125`) |
| Time-to-labels, desktop | **10.5s** — cards+markers+insights all resolved by first poll |
| Time-to-labels, throttled phone (iPhone 14 Pro, 4× CPU, 400kbps/400ms) | cards+markers 63.8s with transient base-only `G1 4`; **labels + 1125/1125 at ~102s** — correct Phase-1→Phase-2 progressive render |
| Parity (SW blocked) | api 18 markers / fb 18 markers, **0 card diffs**; both legs fetched 32 chunk files — fallback genuinely exercised |
| Console/page errors | only expected API 503s + chunk-discovery 404 probes |

## Suite results (prod)

- **Matrix**: 42 rows (chromium+webkit × 10 viewports × light/dark + legacy `field`→light) — 0 issues, 0 overflow, 0 page errors; `cards=25` everywhere. `markers=1` rows are the known sampling artifact (probe reads before prod fallback finishes chunk load; markers verified at 18 via longer-wait probes and parity).
- **Flows**: 5/5 clean — sections, directions links, radius→insights, modal + `secure.in.gov` DNR link, ESC/Enter, theme toggle.
- **Standalone smoke**: `https://c-j-well-viewer.vercel.app` 200, app-switch → `https://driller-hub.vercel.app/` intact.
- Gate from round-prod-1 unchanged: `/design`, `/design/palettes` → 404.

## Notes / residual risk

- API `wells-nearby`/`area-insights` still time out on serverless cold start (~4–9s → designed 503 fallback); the fallback path is now verified data-complete.
- `sw.js` network-first API cache + stale-while-revalidate shell can keep repeat visitors on the previous deploy until revalidation — pre-existing, unchanged.
- No prod-only issues found in this round; nothing to fix.
