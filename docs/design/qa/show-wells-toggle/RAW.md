# Show-wells-on-map toggle QA — RAW

- base: http://localhost:8794/index.html
- buildStamp (served page meta[cj-build]): 2026-10-08-show-wells-toggle
- iphoneEngine: webkit
- run at: 2026-10-08T17:42:04.408Z
- dark-theme check: html[data-theme]=dark; .cj-datalbl "Show wells on map" computed color = rgb(185, 188, 196)
- NOTE: page haversine() returns toFixed(1) (1 decimal mi), so the 2 mi pool admits wells with true distance up to ~2.05 mi — pre-existing getWellsWithin2Miles semantics, unchanged by this edit. Strict-precision max distances recorded in the Actual column.

| Scenario | Check | Expected | Actual | Result |
|---|---|---|---|---|
| A | build stamp | 2026-10-08-show-wells-toggle | 2026-10-08-show-wells-toggle | PASS |
| A | #showMapWells exists | true | true | PASS |
| A | #showMapWells unchecked | false | false | PASS |
| A | #hideWells unchecked | false | false | PASS |
| A | marker count (cold, no pin, toggle off) | 0 | 0 | PASS |
| A | #wellCount > 0 (sidebar list not gated) | >0 | 31764 | PASS |
| A | #totalWells > 100000 | >100000 | 414953 (raw "414,953", 7s) | PASS |
| G/desk | no horizontal overflow (toggle off) | scrollWidth<=innerWidth | 1440<=1440 | PASS |
| G/desk | .map-bottom-bar inside #map (toggle off) | inside | inside=true bar={"x":765.6,"y":977.6,"w":332.9,"h":37.2} map={"x":520,"y":222.8,"w":824,"h":804} | PASS |
| G/desk | both toggle labels visible (toggle off) | 2 labels offsetWidth>0 | "Show wells on map":true, "Hide well labels":true | PASS |
| B | marker count after toggle ON | 1..800 | 800 | PASS |
| B | #wellCount > 0 | >0 | 31764 | PASS |
| G/desk | no horizontal overflow (toggle on) | scrollWidth<=innerWidth | 1440<=1440 | PASS |
| G/desk | .map-bottom-bar inside #map (toggle on) | inside | inside=true bar={"x":765.6,"y":977.6,"w":332.9,"h":37.2} map={"x":520,"y":222.8,"w":824,"h":804} | PASS |
| G/desk | both toggle labels visible (toggle on) | 2 labels offsetWidth>0 | "Show wells on map":true, "Hide well labels":true | PASS |
| C | marker count after toggle OFF | 0 | 0 | PASS |
| F | reload #totalWells > 100000 | >100000 | 414953 | PASS |
| F | marker count after coords Go | 1..800 | 800 | PASS |
| F | all markers within 2.0 mi of (39.763,-86.399) — page haversine rounds toFixed(1), gate admits <=2.05 | maxDist<=2.05 | max=2.050 n=800 | PASS |
| D | marker count with pin | 1..800 | 800 | PASS |
| D | all markers within 2.0 mi of pin — page haversine rounds toFixed(1), gate admits <=2.05 | maxDist<=2.05 | max=2.050 | PASS |
| D | #locationBanner text | contains 'Wells within 2 mi' | Tap Get ground elevations to compare with wells. Wells within 2 mi — Nearest: 0.0 mi | PASS |
| D | toggle ON: pin pool unchanged | count=800, maxDist<=2.05 | count=800, max=2.050 | PASS |
| D | toggle OFF: pin pool unchanged | count=800, maxDist<=2.05 | count=800, max=2.050 | PASS |
| E | hideWells ON -> 0 markers | 0 | 0 | PASS |
| E | hideWells OFF -> markers back | >0 | 800 | PASS |
| DARK | html[data-theme] = dark | dark | dark | PASS |
| DARK | Show-wells .cj-datalbl color flipped (not light #047857) | != rgb(4, 120, 87) | Show wells on map -> rgb(185, 188, 196) | PASS |
| G/iphone | marker count cold (toggle off) | 0 | 0 | PASS |
| G/iphone | no horizontal overflow (toggle off) | scrollWidth<=innerWidth | 393<=393 | PASS |
| G/iphone | .map-bottom-bar inside #map (toggle off) | inside | inside=true bar={"x":60,"y":1278.3,"w":273,"h":35.6} map={"x":16,"y":903.5,"w":361,"h":422.4} | PASS |
| G/iphone | both toggle labels visible (toggle off) | 2 labels offsetWidth>0 | "Show wells on map":true, "Hide well labels":true | PASS |
| G/iphone | marker count toggle ON | 1..800 | 800 | PASS |
| G/iphone | no horizontal overflow (toggle on) | scrollWidth<=innerWidth | 393<=393 | PASS |
| G/iphone | .map-bottom-bar inside #map (toggle on) | inside | inside=true bar={"x":60,"y":1278.3,"w":273,"h":35.6} map={"x":16,"y":903.5,"w":361,"h":422.4} | PASS |
| G/iphone | both toggle labels visible (toggle on) | 2 labels offsetWidth>0 | "Show wells on map":true, "Hide well labels":true | PASS |
| G/iphone | #totalWells > 100000 | >100000 | 414953 | PASS |
| ALL | no console.error/pageerror from index.html | 0 | 0 | PASS |

## console/page errors captured (all, incl. filtered CDN/tile noise)

none
