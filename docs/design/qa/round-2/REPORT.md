# QA round 2 — clean verification round

Target: rebuilt production bundle on `:3006` (`/private/tmp/wd-qa` @ `76afe90`, includes all round-1 fixes + middleware 404).
Engines: chromium + webkit (firefox unavailable on this machine — profile init failure).

## Result: zero open issues

| Suite | Rows | Issues | Evidence |
|-------|------|--------|----------|
| matrix | 42 (10 viewports × 2 engines × light/dark + legacy `cj-theme='field'` rows) | **0** — ow=0 at every width incl. 320px SE-1g; cards=25; markers 14–18 (clustered at z13 by design); 0 console/page errors; `field` stored theme → light fallback | `matrix.json`, `matrix-*.png` |
| flows | 5 combos | **0** — generate→all sections, 3 directions links, radius select changes insights (4532/4532 @5mi vs 1125/1125 @2mi), modal + DNR link `…refNo=185960`, ESC close, Enter open, reload persists dispatch, theme toggle | `flows.json`, `flow-*.png` |
| viewer | 8 combos (in-hub + standalone :8791) | **0** — 800 markers, 14 toggles, search, modal, ESC close (round-1 fix), log viewer + outbound DNR link, geolocation "Use My Location", theme toggle, app-switch hrefs (`/` in-hub, `localhost:3001` standalone) | `viewer.json`, `viewer-*.png` |
| parity | API vs forced-503 fallback | **0 diffs** on first-25 cards | `parity.json` |
| gate | /design + /design/palettes | **404 + 404** (middleware fix verified on prod build) | `gate.json` |

## Notes

- iPhone SE (1st gen, 320×568) row retained as a stress case — clean after the `shrink-0`→`min-w-0` fix.
- The viewer modal's *summary* only shows the outbound DNR link for wells without lithology; the full-log view (`btnViewLog`) always carries "Open DNR report" when `w.report` exists — documented behavior, not a defect.
- Dev-only anomaly (documented, not a prod risk): `next dev` on :3001 renders 801 unclustered markers because the markercluster plugin script and map init race under dev bundling; the production build clusters correctly (17 clusters + job pin at z13). Code path is identical; prod behavior is authoritative.
- Round-2 matrix/flows artifacts were regenerated after a directory-move error deleted the first set; console log of the original run matched.
