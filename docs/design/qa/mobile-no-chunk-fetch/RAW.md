# mobile no-chunk-fetch — RAW

- url: https://driller-hub.vercel.app/?lat=39.6009&lon=-86.5265
- run at: 2026-10-12T17:26:39.950Z

| dev | check | expected | actual | result |
|---|---|---|---|---|
| iphone14p | /api/wells-nearby 200 + x-wells-source:tiles | 200 tiles | 200/tiles | PASS |
| iphone14p | /api/area-insights 200 | 200 | 200, 200 | PASS |
| iphone14p | no registry chunk fetches | 0 | 0 | PASS |
| iphone14p | map markers rendered | >0 | markers=15 panes=7 | PASS |
| pixel7 | /api/wells-nearby 200 + x-wells-source:tiles | 200 tiles | 200/tiles | PASS |
| pixel7 | /api/area-insights 200 | 200 | 200, 200 | PASS |
| pixel7 | no registry chunk fetches | 0 | 0 | PASS |
| pixel7 | map markers rendered | >0 | markers=16 panes=7 | PASS |

## request log

### iphone14p
- 200 - https://driller-hub.vercel.app/?lat=39.6009&lon=-86.5265
- 200 - https://driller-hub.vercel.app/_next/static/chunks/619-ba102abea3e3d0e4.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/webpack-fbe00dbd87626840.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/main-app-d0c453942ef7afd8.js
- 200 - https://driller-hub.vercel.app/_next/static/media/9cc5b37ab1350db7-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/media/98e207f02528a563-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/chunks/app/layout-c855db104bce29f9.js
- 200 - https://driller-hub.vercel.app/_next/static/media/e4af272ccee01ff0-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/media/d3ebbfd689654d3a-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/css/9254fc535f4d4f39.css
- 200 - https://driller-hub.vercel.app/_next/static/media/22a5144ee8d83bca-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/media/e6099e249fd938cc-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/chunks/app/page-81bb2e1fe1f5f178.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/4bd1b696-c023c6e3521b1417.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/255-87552e6e05b8e3aa.js
- 200 - https://driller-hub.vercel.app/_next/static/css/1de76be520b4de19.css
- 200 tiles https://driller-hub.vercel.app/api/area-insights?lat=39.6009&lon=-86.5265&radius=2
- 200 tiles https://driller-hub.vercel.app/api/area-insights?lat=39.6009&lon=-86.5265&radius=0.3
- 200 tiles https://driller-hub.vercel.app/api/wells-nearby?lat=39.6009&lon=-86.5265&radius=2&limit=800&lithology=1
- 200 - https://driller-hub.vercel.app/_next/static/css/7a04e0e42e942455.css
- 200 - https://driller-hub.vercel.app/_next/static/chunks/355.a3207acc3e23474d.js
- 200 - https://driller-hub.vercel.app/well-viewer/vendor/MarkerCluster.Default.css
- 200 - https://driller-hub.vercel.app/well-viewer/vendor/MarkerCluster.css
- 200 - https://driller-hub.vercel.app/_next/static/chunks/d0deef33.cac6acee3fffe7af.js
- 200 - https://driller-hub.vercel.app/well-viewer/vendor/leaflet.markercluster.js
- 200 - https://b.tile.openstreetmap.org/13/2127/3112.png
- 200 - https://b.tile.openstreetmap.org/13/2126/3113.png
- 200 - https://a.tile.openstreetmap.org/13/2126/3112.png
- 200 - https://c.tile.openstreetmap.org/13/2127/3113.png
- 200 - https://driller-hub.vercel.app/api/weather?lat=39.6009&lon=-86.5265&timezone=America%2FIndiana%2FIndianapolis&date=2026-10-12

### pixel7
- 200 - https://driller-hub.vercel.app/?lat=39.6009&lon=-86.5265
- 200 - https://driller-hub.vercel.app/_next/static/chunks/main-app-d0c453942ef7afd8.js
- 200 - https://driller-hub.vercel.app/_next/static/media/9cc5b37ab1350db7-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/chunks/app/layout-c855db104bce29f9.js
- 200 - https://driller-hub.vercel.app/_next/static/media/22a5144ee8d83bca-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/chunks/255-87552e6e05b8e3aa.js
- 200 - https://driller-hub.vercel.app/_next/static/media/98e207f02528a563-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/media/e6099e249fd938cc-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/css/9254fc535f4d4f39.css
- 200 - https://driller-hub.vercel.app/_next/static/media/e4af272ccee01ff0-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/chunks/app/page-81bb2e1fe1f5f178.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/619-ba102abea3e3d0e4.js
- 200 - https://driller-hub.vercel.app/_next/static/css/1de76be520b4de19.css
- 200 - https://driller-hub.vercel.app/_next/static/media/d3ebbfd689654d3a-s.p.woff2
- 200 - https://driller-hub.vercel.app/_next/static/chunks/webpack-fbe00dbd87626840.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/4bd1b696-c023c6e3521b1417.js
- 200 - https://driller-hub.vercel.app/_next/static/chunks/355.a3207acc3e23474d.js
- 200 - https://driller-hub.vercel.app/_next/static/css/7a04e0e42e942455.css
- 200 - https://driller-hub.vercel.app/api/weather?lat=39.6009&lon=-86.5265&timezone=America%2FIndiana%2FIndianapolis&date=2026-10-12
- 200 tiles https://driller-hub.vercel.app/api/area-insights?lat=39.6009&lon=-86.5265&radius=2
- 200 tiles https://driller-hub.vercel.app/api/area-insights?lat=39.6009&lon=-86.5265&radius=0.3
- 200 tiles https://driller-hub.vercel.app/api/wells-nearby?lat=39.6009&lon=-86.5265&radius=2&limit=800&lithology=1
- 200 - https://driller-hub.vercel.app/_next/static/chunks/d0deef33.cac6acee3fffe7af.js
- 200 - https://driller-hub.vercel.app/well-viewer/vendor/MarkerCluster.Default.css
- 200 - https://driller-hub.vercel.app/well-viewer/vendor/MarkerCluster.css
- 200 - https://driller-hub.vercel.app/well-viewer/vendor/leaflet.markercluster.js
- 200 - https://b.tile.openstreetmap.org/13/2126/3113.png
- 200 - https://b.tile.openstreetmap.org/13/2127/3112.png
- 200 - https://c.tile.openstreetmap.org/13/2127/3113.png
- 200 - https://c.tile.openstreetmap.org/13/2126/3114.png
- 200 - https://a.tile.openstreetmap.org/13/2126/3112.png
- 200 - https://a.tile.openstreetmap.org/13/2127/3114.png
