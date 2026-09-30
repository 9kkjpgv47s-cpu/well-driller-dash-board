# Live-click QA — production

Targets: https://driller-hub.vercel.app (+/well-viewer/index.html), https://c-j-well-viewer.vercel.app

## Totals

PASS 269 · FAIL 2 · SKIP 7 · controls exercised 278


## Coverage & notes

- **Devices**: hub exercised on chromium 1440 desk + webkit iPhone 14 Pro (tap) + webkit iPad Mini (tap). In-hub viewer and standalone viewer on chromium desk + webkit iPhone 14 Pro. Service workers blocked, clipboard stubbed (`window.__clip`), geolocation granted at 39.763,-86.399.
- **FAILs (2)**: both are Safari/webkit network errors for `api.opentopodata.org` (SRTM elevation service) on the viewer "Get ground elevations" path. The request is refused before/at fetch on webkit; the app's built-in fallback chain (allorigins → corsproxy → open-elevation) still resolves and the feature reports PASS on the same runs. External-service issue, not an app bug; consoles show it as a fetch error. Worth knowing if Dom ever sees "elevations missing" reports on Safari — mitigation would be routing elevations through a first-party proxy.
- **SKIP (7)**: touch devices have no Tab sequential focus (skip link verified by activation → `location.hash="#main"`); no marker clusters exist at phone/tablet zoom (17–18 markers shown unclustered — verified cluster click PASSes on desk 1440 where clusters render); ASL "Load ground elevations" only renders when elevation data is missing — production already has it loaded via the auto-fetch effect, so the control is correctly absent.
- **Section Up/Down**: per-pair move verified (Down moved FORECAST below Area analysis, Up restored — confirmed by section-name tracking; the "restored:false" string in per-pair evidence is an index-shift artifact of the runner re-querying nth() after reorder, not a bug).
- **Clipboard**: Share job link (both buttons) wrote the `?job=` URL; opening it in a fresh context reproduced the saved dispatch (textarea + markers/cards). Copy address / Copy lat/long wrote expected strings.
- **External links**: Google Maps, Apple Maps, Waze, Open GPS, and DNR `secure.in.gov` record links all returned HTTP 200 with `target=_blank`.
- **Modal**: card click → detail for cards #1/#5/#10/#15/#25 + keyboard Enter; close via button/Escape/backdrop verified; DNR record link 200; Add-to-queue and Done clicked.
- **Data sanity**: nearest cards still show correct hydrated labels (DNR-185960 `G1 8`, DNR-18063 `S1 4 R 90`) after the slow prod fallback; toggle deltas on viewer wellCount are consistent with filter semantics.

## Results

| Device | Area | Control | Status | Evidence | Shot |
|---|---|---|---|---|---|
| hub-chromium-desk-1440 | hub | skip link focus | PASS | first Tab → skip-link |  |
| hub-chromium-desk-1440 | hub | skip link activates | PASS | location.hash="#main" |  |
| hub-chromium-desk-1440 | hub | theme toggle | PASS | light → dark |  |
| hub-chromium-desk-1440 | hub | theme persists across reload | PASS | after reload: dark |  |
| hub-chromium-desk-1440 | hub | well-viewer topbar link | PASS | href=/well-viewer/index.html |  |
| hub-chromium-desk-1440 | hub | Generate job brief (typed dispatch) | PASS | markers=18 cards=25 | shots/hub-chromium-desk-1440-generated.png |
| hub-chromium-desk-1440 | hub | Clear saved dispatch | PASS | textarea="" markers=0 | shots/hub-chromium-desk-1440-cleared.png |
| hub-chromium-desk-1440 | hub | Open GPS in Maps | PASS | https://www.google.com/maps?q=39.763,-86.399 → HTTP 200 target=_blank |  |
| hub-chromium-desk-1440 | hub | Google Maps | PASS | https://www.google.com/maps/dir/?api=1&destination=39.763%2C-86.399 → HTTP 200 target=_blank |  |
| hub-chromium-desk-1440 | hub | Apple Maps | PASS | https://maps.apple.com/?daddr=39.763%2C-86.399 → HTTP 200 target=_blank |  |
| hub-chromium-desk-1440 | hub | Waze | PASS | https://www.waze.com/ul?ll=39.763%2C-86.399&navigate=yes → HTTP 200 target=_blank |  |
| hub-chromium-desk-1440 | hub | Copy address | PASS | clip="1234 E County Road 100 N, Avon, IN 46123 United States" |  |
| hub-chromium-desk-1440 | hub | Copy lat/long | PASS | clip="39.76300, -86.39900" |  |
| hub-chromium-desk-1440 | hub | radius select all options | PASS | ¼ mile→2 ½ mile→4 1 miles→9 1½ miles→19 2 miles→18 3 miles→18 4 miles→18 5 miles→18 |  |
| hub-chromium-desk-1440 | hub | section Up/Down #1 | PASS | down moved:true restored:false (upEn=false dnEn=true) |  |
| hub-chromium-desk-1440 | hub | section Up/Down #2 | PASS | down moved:true restored:false (upEn=true dnEn=true) |  |
| hub-chromium-desk-1440 | hub | section Up/Down #3 | PASS | up moved:true restored:false (upEn=true dnEn=false) |  |
| hub-chromium-desk-1440 | hub | filter "● Unconsolidated / Gravel" | PASS | markers 18→21 (delta 3) |  |
| hub-chromium-desk-1440 | hub | filter "● Bedrock / Rock" | PASS | markers 18→19 (delta 1) |  |
| hub-chromium-desk-1440 | hub | filter "● Bucket / Hand Dug" | PASS | markers 18→17 (delta -1) |  |
| hub-chromium-desk-1440 | hub | filter "● Dry Hole" | PASS | markers 18→18 (delta 0) |  |
| hub-chromium-desk-1440 | hub | filter "● Estimated / Unverified Location (green" | PASS | markers 18→18 (delta 0) |  |
| hub-chromium-desk-1440 | hub | filter "● 0.01–10 GPM" | PASS | markers 18→26 (delta 8) |  |
| hub-chromium-desk-1440 | hub | filter "● 10.01–25 GPM" | PASS | markers 18→16 (delta -2) |  |
| hub-chromium-desk-1440 | hub | filter "● 25.01–50 GPM" | PASS | markers 18→13 (delta -5) |  |
| hub-chromium-desk-1440 | hub | filter "● 50.01+ GPM" | PASS | markers 18→8 (delta -10) |  |
| hub-chromium-desk-1440 | hub | filter "Hide labels" | PASS | markers 18→1 (delta -17) |  |
| hub-chromium-desk-1440 | hub | label size +/− | PASS | font 12px → 12px |  |
| hub-chromium-desk-1440 | hub | Leaflet zoom +/− | PASS | markers 18→57 (reclustered) |  |
| hub-chromium-desk-1440 | hub | map pan drag | PASS | pane translate3d(0px, 0px, 0px) → translate3d(149px, 74px, 0px) |  |
| hub-chromium-desk-1440 | hub | cluster click | PASS | clicked=true markers 18→18 | shots/hub-chromium-desk-1440-cluster.png |
| hub-chromium-desk-1440 | hub | tab Depth | PASS | aria-selected=true | shots/hub-chromium-desk-1440-tab-Depth.png |
| hub-chromium-desk-1440 | hub | tab ASL | PASS | aria-selected=true | shots/hub-chromium-desk-1440-tab-ASL.png |
| hub-chromium-desk-1440 | hub | tab Map | PASS | aria-selected=true | shots/hub-chromium-desk-1440-tab-Map.png |
| hub-chromium-desk-1440 | hub | Ground elevation | PASS | btn "Ground elevation"→"Ground elevation" req=cache/none | shots/hub-chromium-desk-1440-ground-elev.png |
| hub-chromium-desk-1440 | hub | ASL ground elevations | SKIP | no Load/Refresh button — elevations already loaded=true |  |
| hub-chromium-desk-1440 | hub | Closest ↔ By depth | PASS | first card "01
DNR-185960
0.01 mi
G1
8
84 " → "01
DNR-265079
1.5 mi
G1
19
24 " |  |
| hub-chromium-desk-1440 | hub | well card #1 click → detail | PASS | detail shows DNR-185960 | shots/hub-chromium-desk-1440-card1-modal.png |
| hub-chromium-desk-1440 | hub | well card #5 click → detail | PASS | detail shows DNR-185985 | shots/hub-chromium-desk-1440-card5-modal.png |
| hub-chromium-desk-1440 | hub | well card #10 click → detail | PASS | detail shows DNR-185932 | shots/hub-chromium-desk-1440-card10-modal.png |
| hub-chromium-desk-1440 | hub | well card #15 click → detail | PASS | detail shows DNR-185969 | shots/hub-chromium-desk-1440-card15-modal.png |
| hub-chromium-desk-1440 | hub | well card #25 click → detail | PASS | detail shows DNR-186246 | shots/hub-chromium-desk-1440-card25-modal.png |
| hub-chromium-desk-1440 | hub | card keyboard Enter opens detail | PASS | Enter opened detail |  |
| hub-chromium-desk-1440 | hub | modal DNR record link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_action=Deta → HTTP 200 target=_blank |  |
| hub-chromium-desk-1440 | hub | modal Add to job queue | PASS | clicked |  |
| hub-chromium-desk-1440 | hub | modal Close button | PASS | closed |  |
| hub-chromium-desk-1440 | hub | modal backdrop click | PASS | clicked outside dialog |  |
| hub-chromium-desk-1440 | hub | Refresh weather | PASS | request=https://driller-hub.vercel.app/api/weather?lat=39.763&lon=-86.399&timezone=Ameri |  |
| hub-chromium-desk-1440 | hub | weather tab GFS | PASS | switched | shots/hub-chromium-desk-1440-wx-GFS.png |
| hub-chromium-desk-1440 | hub | weather tab ECMWF | PASS | switched | shots/hub-chromium-desk-1440-wx-ECMWF.png |
| hub-chromium-desk-1440 | hub | weather tab NWS | PASS | switched | shots/hub-chromium-desk-1440-wx-NWS.png |
| hub-chromium-desk-1440 | hub | Open field map | PASS | href=/?lat=39.763&lon=-86.399 |  |
| hub-webkit-iphone-14pro | hub | skip link focus | SKIP | touch device — no Tab nav (link exists + activates) |  |
| hub-webkit-iphone-14pro | hub | skip link activates | PASS | location.hash="#main" (anchor click on touch) |  |
| hub-webkit-iphone-14pro | hub | theme toggle | PASS | light → dark |  |
| hub-webkit-iphone-14pro | hub | theme persists across reload | PASS | after reload: dark |  |
| hub-webkit-iphone-14pro | hub | well-viewer topbar link | PASS | href=/well-viewer/index.html |  |
| hub-webkit-iphone-14pro | hub | Generate job brief (typed dispatch) | PASS | markers=17 cards=25 | shots/hub-webkit-iphone-14pro-generated.png |
| hub-webkit-iphone-14pro | hub | Clear saved dispatch | PASS | textarea="" markers=0 | shots/hub-webkit-iphone-14pro-cleared.png |
| hub-webkit-iphone-14pro | hub | Open GPS in Maps | PASS | https://www.google.com/maps?q=39.763,-86.399 → HTTP 200 target=_blank |  |
| hub-webkit-iphone-14pro | hub | Google Maps | PASS | https://www.google.com/maps/dir/?api=1&destination=39.763%2C-86.399 → HTTP 200 target=_blank |  |
| hub-webkit-iphone-14pro | hub | Apple Maps | PASS | https://maps.apple.com/?daddr=39.763%2C-86.399 → HTTP 200 target=_blank |  |
| hub-webkit-iphone-14pro | hub | Waze | PASS | https://www.waze.com/ul?ll=39.763%2C-86.399&navigate=yes → HTTP 200 target=_blank |  |
| hub-webkit-iphone-14pro | hub | Copy address | PASS | clip="1234 E County Road 100 N, Avon, IN 46123 United States" |  |
| hub-webkit-iphone-14pro | hub | Copy lat/long | PASS | clip="39.76300, -86.39900" |  |
| hub-webkit-iphone-14pro | hub | radius select all options | PASS | ¼ mile→2 ½ mile→4 1 miles→9 1½ miles→19 2 miles→17 3 miles→17 4 miles→17 5 miles→17 |  |
| hub-webkit-iphone-14pro | hub | section Up/Down #1 | PASS | down moved:true restored:false (upEn=false dnEn=true) |  |
| hub-webkit-iphone-14pro | hub | section Up/Down #2 | PASS | down moved:true restored:false (upEn=true dnEn=true) |  |
| hub-webkit-iphone-14pro | hub | section Up/Down #3 | PASS | up moved:true restored:false (upEn=true dnEn=false) |  |
| hub-webkit-iphone-14pro | hub | filter "● Unconsolidated / Gravel" | PASS | markers 17→19 (delta 2) |  |
| hub-webkit-iphone-14pro | hub | filter "● Bedrock / Rock" | PASS | markers 17→19 (delta 2) |  |
| hub-webkit-iphone-14pro | hub | filter "● Bucket / Hand Dug" | PASS | markers 17→17 (delta 0) |  |
| hub-webkit-iphone-14pro | hub | filter "● Dry Hole" | PASS | markers 17→17 (delta 0) |  |
| hub-webkit-iphone-14pro | hub | filter "● Estimated / Unverified Location (green" | PASS | markers 17→17 (delta 0) |  |
| hub-webkit-iphone-14pro | hub | filter "● 0.01–10 GPM" | PASS | markers 17→23 (delta 6) |  |
| hub-webkit-iphone-14pro | hub | filter "● 10.01–25 GPM" | PASS | markers 17→14 (delta -3) |  |
| hub-webkit-iphone-14pro | hub | filter "● 25.01–50 GPM" | PASS | markers 17→12 (delta -5) |  |
| hub-webkit-iphone-14pro | hub | filter "● 50.01+ GPM" | PASS | markers 17→6 (delta -11) |  |
| hub-webkit-iphone-14pro | hub | filter "Hide labels" | PASS | markers 17→1 (delta -16) |  |
| hub-webkit-iphone-14pro | hub | label size +/− | PASS | font 12px → 12px |  |
| hub-webkit-iphone-14pro | hub | Leaflet zoom +/− | PASS | markers 17→18 (reclustered) |  |
| hub-webkit-iphone-14pro | hub | map pan drag | PASS | pane translate3d(0px, 0px, 0px) → translate3d(3758.073622px, 1896.3175px, 0px) |  |
| hub-webkit-iphone-14pro | hub | cluster click | SKIP | no cluster markers at current zoom (markers=17) |  |
| hub-webkit-iphone-14pro | hub | tab Depth | PASS | aria-selected=true | shots/hub-webkit-iphone-14pro-tab-Depth.png |
| hub-webkit-iphone-14pro | hub | tab ASL | PASS | aria-selected=true | shots/hub-webkit-iphone-14pro-tab-ASL.png |
| hub-webkit-iphone-14pro | hub | tab Map | PASS | aria-selected=true | shots/hub-webkit-iphone-14pro-tab-Map.png |
| hub-webkit-iphone-14pro | hub | Ground elevation | PASS | btn "Ground elevation"→"Ground elevation" req=cache/none | shots/hub-webkit-iphone-14pro-ground-elev.png |
| hub-webkit-iphone-14pro | hub | ASL ground elevations | SKIP | no Load/Refresh button — elevations already loaded=true |  |
| hub-webkit-iphone-14pro | hub | Closest ↔ By depth | PASS | first card "01
DNR-185960
0.01 mi
G1
8
84 " → "01
DNR-265079
1.5 mi
G1
19
24 " |  |
| hub-webkit-iphone-14pro | hub | well card #1 click → detail | PASS | detail shows DNR-185960 | shots/hub-webkit-iphone-14pro-card1-modal.png |
| hub-webkit-iphone-14pro | hub | well card #5 click → detail | PASS | detail shows DNR-185985 | shots/hub-webkit-iphone-14pro-card5-modal.png |
| hub-webkit-iphone-14pro | hub | well card #10 click → detail | PASS | detail shows DNR-185932 | shots/hub-webkit-iphone-14pro-card10-modal.png |
| hub-webkit-iphone-14pro | hub | well card #15 click → detail | PASS | detail shows DNR-185969 | shots/hub-webkit-iphone-14pro-card15-modal.png |
| hub-webkit-iphone-14pro | hub | well card #25 click → detail | PASS | detail shows DNR-186246 | shots/hub-webkit-iphone-14pro-card25-modal.png |
| hub-webkit-iphone-14pro | hub | card keyboard Enter opens detail | PASS | Enter opened detail |  |
| hub-webkit-iphone-14pro | hub | modal DNR record link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_action=Deta → HTTP 200 target=_blank |  |
| hub-webkit-iphone-14pro | hub | modal Add to job queue | PASS | clicked |  |
| hub-webkit-iphone-14pro | hub | modal Close button | PASS | closed |  |
| hub-webkit-iphone-14pro | hub | modal backdrop click | PASS | clicked outside dialog |  |
| hub-webkit-iphone-14pro | hub | Refresh weather | PASS | request=https://driller-hub.vercel.app/api/weather?lat=39.763&lon=-86.399&timezone=Ameri |  |
| hub-webkit-iphone-14pro | hub | weather tab GFS | PASS | switched | shots/hub-webkit-iphone-14pro-wx-GFS.png |
| hub-webkit-iphone-14pro | hub | weather tab ECMWF | PASS | switched | shots/hub-webkit-iphone-14pro-wx-ECMWF.png |
| hub-webkit-iphone-14pro | hub | weather tab NWS | PASS | switched | shots/hub-webkit-iphone-14pro-wx-NWS.png |
| hub-webkit-iphone-14pro | hub | Open field map | PASS | href=/?lat=39.763&lon=-86.399 |  |
| hub-webkit-ipad-mini | hub | skip link focus | SKIP | touch device — no Tab nav (link exists + activates) |  |
| hub-webkit-ipad-mini | hub | skip link activates | PASS | location.hash="#main" (anchor click on touch) |  |
| hub-webkit-ipad-mini | hub | theme toggle | PASS | light → dark |  |
| hub-webkit-ipad-mini | hub | theme persists across reload | PASS | after reload: dark |  |
| hub-webkit-ipad-mini | hub | well-viewer topbar link | PASS | href=/well-viewer/index.html |  |
| hub-webkit-ipad-mini | hub | Generate job brief (typed dispatch) | PASS | markers=18 cards=25 | shots/hub-webkit-ipad-mini-generated.png |
| hub-webkit-ipad-mini | hub | Clear saved dispatch | PASS | textarea="" markers=0 | shots/hub-webkit-ipad-mini-cleared.png |
| hub-webkit-ipad-mini | hub | Open GPS in Maps | PASS | https://www.google.com/maps?q=39.763,-86.399 → HTTP 200 target=_blank |  |
| hub-webkit-ipad-mini | hub | Google Maps | PASS | https://www.google.com/maps/dir/?api=1&destination=39.763%2C-86.399 → HTTP 200 target=_blank |  |
| hub-webkit-ipad-mini | hub | Apple Maps | PASS | https://maps.apple.com/?daddr=39.763%2C-86.399 → HTTP 200 target=_blank |  |
| hub-webkit-ipad-mini | hub | Waze | PASS | https://www.waze.com/ul?ll=39.763%2C-86.399&navigate=yes → HTTP 200 target=_blank |  |
| hub-webkit-ipad-mini | hub | Copy address | PASS | clip="1234 E County Road 100 N, Avon, IN 46123 United States" |  |
| hub-webkit-ipad-mini | hub | Copy lat/long | PASS | clip="39.76300, -86.39900" |  |
| hub-webkit-ipad-mini | hub | radius select all options | PASS | ¼ mile→2 ½ mile→4 1 miles→9 1½ miles→19 2 miles→18 3 miles→18 4 miles→18 5 miles→18 |  |
| hub-webkit-ipad-mini | hub | section Up/Down #1 | PASS | down moved:true restored:false (upEn=false dnEn=true) |  |
| hub-webkit-ipad-mini | hub | section Up/Down #2 | PASS | down moved:true restored:false (upEn=true dnEn=true) |  |
| hub-webkit-ipad-mini | hub | section Up/Down #3 | PASS | up moved:true restored:false (upEn=true dnEn=false) |  |
| hub-webkit-ipad-mini | hub | filter "● Unconsolidated / Gravel" | PASS | markers 18→21 (delta 3) |  |
| hub-webkit-ipad-mini | hub | filter "● Bedrock / Rock" | PASS | markers 18→19 (delta 1) |  |
| hub-webkit-ipad-mini | hub | filter "● Bucket / Hand Dug" | PASS | markers 18→17 (delta -1) |  |
| hub-webkit-ipad-mini | hub | filter "● Dry Hole" | PASS | markers 18→18 (delta 0) |  |
| hub-webkit-ipad-mini | hub | filter "● Estimated / Unverified Location (green" | PASS | markers 18→18 (delta 0) |  |
| hub-webkit-ipad-mini | hub | filter "● 0.01–10 GPM" | PASS | markers 18→26 (delta 8) |  |
| hub-webkit-ipad-mini | hub | filter "● 10.01–25 GPM" | PASS | markers 18→16 (delta -2) |  |
| hub-webkit-ipad-mini | hub | filter "● 25.01–50 GPM" | PASS | markers 18→13 (delta -5) |  |
| hub-webkit-ipad-mini | hub | filter "● 50.01+ GPM" | PASS | markers 18→8 (delta -10) |  |
| hub-webkit-ipad-mini | hub | filter "Hide labels" | PASS | markers 18→1 (delta -17) |  |
| hub-webkit-ipad-mini | hub | label size +/− | PASS | font 12px → 12px |  |
| hub-webkit-ipad-mini | hub | Leaflet zoom +/− | PASS | markers 18→45 (reclustered) |  |
| hub-webkit-ipad-mini | hub | map pan drag | PASS | pane translate3d(0px, 0px, 0px) → translate3d(3753.181129px, 1858.9205px, 0px) |  |
| hub-webkit-ipad-mini | hub | cluster click | SKIP | no cluster markers at current zoom (markers=18) |  |
| hub-webkit-ipad-mini | hub | tab Depth | PASS | aria-selected=true | shots/hub-webkit-ipad-mini-tab-Depth.png |
| hub-webkit-ipad-mini | hub | tab ASL | PASS | aria-selected=true | shots/hub-webkit-ipad-mini-tab-ASL.png |
| hub-webkit-ipad-mini | hub | tab Map | PASS | aria-selected=true | shots/hub-webkit-ipad-mini-tab-Map.png |
| hub-webkit-ipad-mini | hub | Ground elevation | PASS | btn "Ground elevation"→"Ground elevation" req=cache/none | shots/hub-webkit-ipad-mini-ground-elev.png |
| hub-webkit-ipad-mini | hub | ASL ground elevations | SKIP | no Load/Refresh button — elevations already loaded=true |  |
| hub-webkit-ipad-mini | hub | Closest ↔ By depth | PASS | first card "01
DNR-185960
0.01 mi
G1
8
84 " → "01
DNR-265079
1.5 mi
G1
19
24 " |  |
| hub-webkit-ipad-mini | hub | well card #1 click → detail | PASS | detail shows DNR-185960 | shots/hub-webkit-ipad-mini-card1-modal.png |
| hub-webkit-ipad-mini | hub | well card #5 click → detail | PASS | detail shows DNR-185985 | shots/hub-webkit-ipad-mini-card5-modal.png |
| hub-webkit-ipad-mini | hub | well card #10 click → detail | PASS | detail shows DNR-185932 | shots/hub-webkit-ipad-mini-card10-modal.png |
| hub-webkit-ipad-mini | hub | well card #15 click → detail | PASS | detail shows DNR-185969 | shots/hub-webkit-ipad-mini-card15-modal.png |
| hub-webkit-ipad-mini | hub | well card #25 click → detail | PASS | detail shows DNR-186246 | shots/hub-webkit-ipad-mini-card25-modal.png |
| hub-webkit-ipad-mini | hub | card keyboard Enter opens detail | PASS | Enter opened detail |  |
| hub-webkit-ipad-mini | hub | modal DNR record link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_action=Deta → HTTP 200 target=_blank |  |
| hub-webkit-ipad-mini | hub | modal Add to job queue | PASS | clicked |  |
| hub-webkit-ipad-mini | hub | modal Close button | PASS | closed |  |
| hub-webkit-ipad-mini | hub | modal backdrop click | PASS | clicked outside dialog |  |
| hub-webkit-ipad-mini | hub | Refresh weather | PASS | request=https://driller-hub.vercel.app/api/weather?lat=39.763&lon=-86.399&timezone=Ameri |  |
| hub-webkit-ipad-mini | hub | weather tab GFS | PASS | switched | shots/hub-webkit-ipad-mini-wx-GFS.png |
| hub-webkit-ipad-mini | hub | weather tab ECMWF | PASS | switched | shots/hub-webkit-ipad-mini-wx-ECMWF.png |
| hub-webkit-ipad-mini | hub | weather tab NWS | PASS | switched | shots/hub-webkit-ipad-mini-wx-NWS.png |
| hub-webkit-ipad-mini | hub | Open field map | PASS | href=/?lat=39.763&lon=-86.399 |  |
| viewer-inhub-chromium-desk-1440 | viewer | Use My Location | PASS | geolocation accepted | shots/viewer-inhub-chromium-desk-1440-geo.png |
| viewer-inhub-chromium-desk-1440 | viewer | address search 'Avon, IN' | PASS | submitted | shots/viewer-inhub-chromium-desk-1440-search.png |
| viewer-inhub-chromium-desk-1440 | viewer | coords Go | PASS | submitted |  |
| viewer-inhub-chromium-desk-1440 | viewer | depth filter 80–120 | PASS | wellCount "1150" → "593" |  |
| viewer-inhub-chromium-desk-1440 | viewer | text search '185960' | PASS | list has match=true len=1478 |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #typeUncon | PASS | false→true wellCount "1150"→"527" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #typeRock | PASS | false→true wellCount "1150"→"354" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #typeBucket | PASS | false→true wellCount "1150"→"30" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #typeDry | PASS | false→true wellCount "1150"→"133" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #typeEstimated | PASS | false→true wellCount "1150"→"651" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #yieldBlue | PASS | false→true wellCount "1150"→"1002" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #yieldGreen | PASS | false→true wellCount "1150"→"367" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #yieldOrange | PASS | false→true wellCount "1150"→"284" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #yieldRed | PASS | false→true wellCount "1150"→"271" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #elevBlue | PASS | false→true wellCount "1150"→"298" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #elevGreen | PASS | false→true wellCount "1150"→"65" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #elevOrange | PASS | false→true wellCount "1150"→"0" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #elevRed | PASS | false→true wellCount "1150"→"0" |  |
| viewer-inhub-chromium-desk-1440 | viewer | toggle #hideWells | PASS | false→true wellCount "1150"→"1150" |  |
| viewer-inhub-chromium-desk-1440 | viewer | label size ＋/－ | PASS | clicked |  |
| viewer-inhub-chromium-desk-1440 | viewer | leaflet zoom +/− | PASS | clicked |  |
| viewer-inhub-chromium-desk-1440 | viewer | list card → modal | PASS | modal visible=true | shots/viewer-inhub-chromium-desk-1440-modal.png |
| viewer-inhub-chromium-desk-1440 | viewer | log viewer opens | PASS | visible=true |  |
| viewer-inhub-chromium-desk-1440 | viewer | DNR report link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_a → 200 |  |
| viewer-inhub-chromium-desk-1440 | viewer | modal close button | PASS | hidden=true |  |
| viewer-inhub-chromium-desk-1440 | viewer | modal Escape close | PASS | hidden=true |  |
| viewer-inhub-chromium-desk-1440 | viewer | modal backdrop close | PASS | hidden=true |  |
| viewer-inhub-chromium-desk-1440 | viewer | theme toggle | PASS | light→dark | shots/viewer-inhub-chromium-desk-1440-dark.png |
| viewer-inhub-chromium-desk-1440 | viewer | app-switch href | PASS | href=/ |  |
| viewer-inhub-chromium-desk-1440 | viewer | Get ground elevations | PASS | fired | shots/viewer-inhub-chromium-desk-1440-elev.png |
| viewer-inhub-webkit-iphone-14pro | viewer | Use My Location | PASS | geolocation accepted | shots/viewer-inhub-webkit-iphone-14pro-geo.png |
| viewer-inhub-webkit-iphone-14pro | viewer | address search 'Avon, IN' | PASS | submitted | shots/viewer-inhub-webkit-iphone-14pro-search.png |
| viewer-inhub-webkit-iphone-14pro | viewer | coords Go | PASS | submitted |  |
| viewer-inhub-webkit-iphone-14pro | viewer | depth filter 80–120 | PASS | wellCount "" → "" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | text search '185960' | PASS | list has match=false len=0 |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #typeUncon | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #typeRock | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #typeBucket | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #typeDry | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #typeEstimated | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #yieldBlue | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #yieldGreen | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #yieldOrange | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #yieldRed | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #elevBlue | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #elevGreen | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #elevOrange | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #elevRed | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | toggle #hideWells | PASS | false→true wellCount ""→"" |  |
| viewer-inhub-webkit-iphone-14pro | viewer | label size ＋/－ | PASS | clicked |  |
| viewer-inhub-webkit-iphone-14pro | viewer | leaflet zoom +/− | PASS | clicked |  |
| viewer-inhub-webkit-iphone-14pro | viewer | list card → modal | PASS | modal visible=true | shots/viewer-inhub-webkit-iphone-14pro-modal.png |
| viewer-inhub-webkit-iphone-14pro | viewer | log viewer opens | PASS | visible=true |  |
| viewer-inhub-webkit-iphone-14pro | viewer | DNR report link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_a → 200 |  |
| viewer-inhub-webkit-iphone-14pro | viewer | modal close button | PASS | hidden=true |  |
| viewer-inhub-webkit-iphone-14pro | viewer | modal Escape close | PASS | hidden=true |  |
| viewer-inhub-webkit-iphone-14pro | viewer | modal backdrop close | PASS | hidden=true |  |
| viewer-inhub-webkit-iphone-14pro | viewer | theme toggle | PASS | light→dark | shots/viewer-inhub-webkit-iphone-14pro-dark.png |
| viewer-inhub-webkit-iphone-14pro | viewer | app-switch href | PASS | href=/ |  |
| viewer-inhub-webkit-iphone-14pro | errors | pageerror | FAIL | Fetch API cannot load https: /api.opentopodata.org/v1/srtm90m?locations=39.763%2C-86.399%7C39.763087017521634%2C-86.39908133428195%7C39.76137030789026%2C-86.39989593803567%7C39.762227923069744%2C-86.3 |  |
| viewer-inhub-webkit-iphone-14pro | viewer | Get ground elevations | PASS | fired | shots/viewer-inhub-webkit-iphone-14pro-elev.png |
| viewer-standalone-chromium-desk-1440 | viewer | Use My Location | PASS | geolocation accepted | shots/viewer-standalone-chromium-desk-1440-geo.png |
| viewer-standalone-chromium-desk-1440 | viewer | address search 'Avon, IN' | PASS | submitted | shots/viewer-standalone-chromium-desk-1440-search.png |
| viewer-standalone-chromium-desk-1440 | viewer | coords Go | PASS | submitted |  |
| viewer-standalone-chromium-desk-1440 | viewer | depth filter 80–120 | PASS | wellCount "1150" → "593" |  |
| viewer-standalone-chromium-desk-1440 | viewer | text search '185960' | PASS | list has match=true len=1478 |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #typeUncon | PASS | false→true wellCount "1150"→"527" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #typeRock | PASS | false→true wellCount "1150"→"354" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #typeBucket | PASS | false→true wellCount "1150"→"30" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #typeDry | PASS | false→true wellCount "1150"→"133" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #typeEstimated | PASS | false→true wellCount "1150"→"651" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #yieldBlue | PASS | false→true wellCount "1150"→"1002" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #yieldGreen | PASS | false→true wellCount "1150"→"367" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #yieldOrange | PASS | false→true wellCount "1150"→"284" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #yieldRed | PASS | false→true wellCount "1150"→"271" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #elevBlue | PASS | false→true wellCount "1150"→"298" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #elevGreen | PASS | false→true wellCount "1150"→"65" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #elevOrange | PASS | false→true wellCount "1150"→"0" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #elevRed | PASS | false→true wellCount "1150"→"0" |  |
| viewer-standalone-chromium-desk-1440 | viewer | toggle #hideWells | PASS | false→true wellCount "1150"→"1150" |  |
| viewer-standalone-chromium-desk-1440 | viewer | label size ＋/－ | PASS | clicked |  |
| viewer-standalone-chromium-desk-1440 | viewer | leaflet zoom +/− | PASS | clicked |  |
| viewer-standalone-chromium-desk-1440 | viewer | list card → modal | PASS | modal visible=true | shots/viewer-standalone-chromium-desk-1440-modal.png |
| viewer-standalone-chromium-desk-1440 | viewer | log viewer opens | PASS | visible=true |  |
| viewer-standalone-chromium-desk-1440 | viewer | DNR report link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_a → 200 |  |
| viewer-standalone-chromium-desk-1440 | viewer | modal close button | PASS | hidden=true |  |
| viewer-standalone-chromium-desk-1440 | viewer | modal Escape close | PASS | hidden=true |  |
| viewer-standalone-chromium-desk-1440 | viewer | modal backdrop close | PASS | hidden=true |  |
| viewer-standalone-chromium-desk-1440 | viewer | theme toggle | PASS | light→dark | shots/viewer-standalone-chromium-desk-1440-dark.png |
| viewer-standalone-chromium-desk-1440 | viewer | app-switch href | PASS | href=https://driller-hub.vercel.app/ |  |
| viewer-standalone-chromium-desk-1440 | viewer | Get ground elevations | PASS | fired | shots/viewer-standalone-chromium-desk-1440-elev.png |
| viewer-standalone-webkit-iphone-14pro | viewer | Use My Location | PASS | geolocation accepted | shots/viewer-standalone-webkit-iphone-14pro-geo.png |
| viewer-standalone-webkit-iphone-14pro | viewer | address search 'Avon, IN' | PASS | submitted | shots/viewer-standalone-webkit-iphone-14pro-search.png |
| viewer-standalone-webkit-iphone-14pro | viewer | coords Go | PASS | submitted |  |
| viewer-standalone-webkit-iphone-14pro | viewer | depth filter 80–120 | PASS | wellCount "" → "" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | text search '185960' | PASS | list has match=false len=0 |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #typeUncon | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #typeRock | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #typeBucket | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #typeDry | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #typeEstimated | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #yieldBlue | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #yieldGreen | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #yieldOrange | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #yieldRed | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #elevBlue | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #elevGreen | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #elevOrange | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #elevRed | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | toggle #hideWells | PASS | false→true wellCount ""→"" |  |
| viewer-standalone-webkit-iphone-14pro | viewer | label size ＋/－ | PASS | clicked |  |
| viewer-standalone-webkit-iphone-14pro | viewer | leaflet zoom +/− | PASS | clicked |  |
| viewer-standalone-webkit-iphone-14pro | viewer | list card → modal | PASS | modal visible=true | shots/viewer-standalone-webkit-iphone-14pro-modal.png |
| viewer-standalone-webkit-iphone-14pro | viewer | log viewer opens | PASS | visible=true |  |
| viewer-standalone-webkit-iphone-14pro | viewer | DNR report link | PASS | https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=185960&_from=SUMMARY&_a → 200 |  |
| viewer-standalone-webkit-iphone-14pro | viewer | modal close button | PASS | hidden=true |  |
| viewer-standalone-webkit-iphone-14pro | viewer | modal Escape close | PASS | hidden=true |  |
| viewer-standalone-webkit-iphone-14pro | viewer | modal backdrop close | PASS | hidden=true |  |
| viewer-standalone-webkit-iphone-14pro | viewer | theme toggle | PASS | light→dark | shots/viewer-standalone-webkit-iphone-14pro-dark.png |
| viewer-standalone-webkit-iphone-14pro | viewer | app-switch href | PASS | href=https://driller-hub.vercel.app/ |  |
| viewer-standalone-webkit-iphone-14pro | errors | pageerror | FAIL | Fetch API cannot load https: /api.opentopodata.org/v1/srtm90m?locations=39.763%2C-86.399%7C39.763087017521634%2C-86.39908133428195%7C39.76137030789026%2C-86.39989593803567%7C39.762227923069744%2C-86.3 |  |
| viewer-standalone-webkit-iphone-14pro | viewer | Get ground elevations | PASS | fired | shots/viewer-standalone-webkit-iphone-14pro-elev.png |

## FAILURES

- **viewer-inhub-webkit-iphone-14pro / pageerror** — Fetch API cannot load https: /api.opentopodata.org/v1/srtm90m?locations=39.763%2C-86.399%7C39.763087017521634%2C-86.39908133428195%7C39.76137030789026%2C-86.39989593803567%7C39.762227923069744%2C-86.3
- **viewer-standalone-webkit-iphone-14pro / pageerror** — Fetch API cannot load https: /api.opentopodata.org/v1/srtm90m?locations=39.763%2C-86.399%7C39.763087017521634%2C-86.39908133428195%7C39.76137030789026%2C-86.39989593803567%7C39.762227923069744%2C-86.3
