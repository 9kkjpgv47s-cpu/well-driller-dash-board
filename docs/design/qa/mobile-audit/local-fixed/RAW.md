# Mobile audit — RAW

## Kept screenshots

Curated "after" evidence kept in `shots/`; the rest was moved to `/tmp/driller-audit/mobile-shots-archive/local-fixed/`.

| File | Proves |
|---|---|
| `viewer-hub-pin-se-light-modal.png` | Viewer modal on iPhone SE — scroll preserved on close (A=C), footer buttons wrap without overflow |
| `viewer-sa-se-light-modal.png` | Standalone viewer modal footer at 375px — both buttons fit, no horizontal overflow |
| `hub-job-px7-light-modal.png` | Hub well-detail dialog on Pixel 7 — no background scroll leak |
| `viewer-hub-i14-land-light-map.png` | Viewer landscape-phone map capped at 263px in a 343px viewport (below the 64px topbar — no trap) |
| `viewer-hub-ipadmini-light-map.png` | Viewer iPad portrait map capped at ~min(400px, viewport) |
| `hub-job-i14-light-view.png` | Hub job flow on iPhone 14 Pro — layout + 44px zoom controls |
| `viewer-sa-i14-light-view.png` | Standalone viewer on iPhone 14 Pro |
| `viewer-hub-se-light-map.png` | Bottom bar fix at 375px — both toggle labels fully visible, zoom stack lifted clear |
| `viewer-hub-px7-light-map.png` | Bottom bar fix at 412px — labels unclipped, no bar/stack overlap |
| `viewer-hub-px7-light-gesture-hint.png` | "Use two fingers" hint overlay on Pixel 7 (embedded viewer) during one-finger drag |
| `hub-job-px7-light-gesture-hint.png` | Hint overlay on Pixel 7 (hub map) during one-finger drag |

- base: http://localhost:3005
- standalone: http://localhost:8795
- run at: 2026-10-10T15:32:42.477Z
- rows: 494

## Summary per check

| Check | PASS | FAIL |
|---|---|---|
| overflow | 50 | 0 |
| tap-targets | 50 | 0 |
| text-size | 0 | 50 |
| input-zoom | 50 | 0 |
| meta | 50 | 0 |
| fixed-sticky | 50 | 0 |
| sw | 20 | 0 |
| console-errors | 47 | 3 |
| map-geometry | 40 | 0 |
| modal-scroll-restore | 9 | 0 |
| gesture | 42 | 0 |
| toggle-text-tap | 8 | 0 |
| bottom-bar | 24 | 0 |
| gesture-hint-visual | 1 | 0 |

## All rows

| Target | Device | Theme | Check | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| hub-empty | se | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| hub-empty | se | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | se | light | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | se | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | se | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | se | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | se | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | se | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | se | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| hub-empty | se | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | se | dark | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | se | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | se | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | se | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | se | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | se | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | i14 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| hub-empty | i14 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | i14 | light | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | i14 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | i14 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | i14 | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | i14 | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | i14 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | i14 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| hub-empty | i14 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | i14 | dark | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | i14 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | i14 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | i14 | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | i14 | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | i14 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | i14-land | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| hub-empty | i14-land | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | i14-land | light | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | i14-land | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | i14-land | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | i14-land | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | i14-land | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | i14-land | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | i14-land | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| hub-empty | i14-land | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | i14-land | dark | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | i14-land | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | i14-land | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | i14-land | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | i14-land | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | i14-land | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | px7 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| hub-empty | px7 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | px7 | light | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | px7 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | px7 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | px7 | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | px7 | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | px7 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | px7 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| hub-empty | px7 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | px7 | dark | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | px7 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | px7 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | px7 | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | px7 | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | px7 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | ipadmini | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| hub-empty | ipadmini | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | ipadmini | light | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | ipadmini | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | ipadmini | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | ipadmini | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | ipadmini | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | ipadmini | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-empty | ipadmini | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| hub-empty | ipadmini | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=6 lt44=0 lt24=0 | PASS |
| hub-empty | ipadmini | dark | text-size | 0 text nodes <12px | under12=2 small12-13=0 | FAIL |
| hub-empty | ipadmini | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-empty | ipadmini | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-empty | ipadmini | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| hub-empty | ipadmini | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-empty | ipadmini | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | se | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| hub-job | se | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | se | light | text-size | 0 text nodes <12px | under12=69 small12-13=398 | FAIL |
| hub-job | se | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | se | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | se | light | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | se | light | map-geometry | trap_risk=false | mapH=366.8 vh=667 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | se | light | modal-scroll-restore | |C-A|<=40 && fits && no bg leak | A=2048 B=0 C=2048 | PASS |
| hub-job | se | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| hub-job | se | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | se | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | se | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| hub-job | se | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | se | dark | text-size | 0 text nodes <12px | under12=69 small12-13=398 | FAIL |
| hub-job | se | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | se | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | se | dark | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | se | dark | map-geometry | trap_risk=false | mapH=366.8 vh=667 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | se | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| hub-job | se | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | se | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | i14 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| hub-job | i14 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | i14 | light | text-size | 0 text nodes <12px | under12=69 small12-13=398 | FAIL |
| hub-job | i14 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | i14 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | i14 | light | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | i14 | light | map-geometry | trap_risk=false | mapH=363 vh=660 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | i14 | light | modal-scroll-restore | |C-A|<=40 && fits && no bg leak | A=2048 B=0 C=2048 | PASS |
| hub-job | i14 | light | toggle-text-tap | text tap toggles | toggled=true before=true->after=false "Unconsolidated / Gravel" swRect={"w":277,"h":44} | PASS |
| hub-job | i14 | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| hub-job | i14 | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | i14 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | i14 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| hub-job | i14 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | i14 | dark | text-size | 0 text nodes <12px | under12=69 small12-13=398 | FAIL |
| hub-job | i14 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | i14 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | i14 | dark | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | i14 | dark | map-geometry | trap_risk=false | mapH=363 vh=660 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | i14 | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| hub-job | i14 | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | i14 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | i14-land | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| hub-job | i14-land | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | i14-land | light | text-size | 0 text nodes <12px | under12=76 small12-13=398 | FAIL |
| hub-job | i14-land | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | i14-land | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | i14-land | light | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | i14-land | light | map-geometry | trap_risk=false | mapH=188.6 vh=343 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | i14-land | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| hub-job | i14-land | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | i14-land | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | i14-land | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| hub-job | i14-land | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | i14-land | dark | text-size | 0 text nodes <12px | under12=76 small12-13=398 | FAIL |
| hub-job | i14-land | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | i14-land | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | i14-land | dark | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | i14-land | dark | map-geometry | trap_risk=false | mapH=188.6 vh=343 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | i14-land | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| hub-job | i14-land | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | i14-land | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | px7 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| hub-job | px7 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | px7 | light | text-size | 0 text nodes <12px | under12=69 small12-13=398 | FAIL |
| hub-job | px7 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | px7 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | px7 | light | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | px7 | light | map-geometry | trap_risk=false | mapH=461.4 vh=839 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | px7 | light | modal-scroll-restore | |C-A|<=40 && fits && no bg leak | A=1929 B=0 C=1929 | PASS |
| hub-job | px7 | light | toggle-text-tap | text tap toggles | toggled=true before=true->after=false "Unconsolidated / Gravel" swRect={"w":296,"h":44} | PASS |
| hub-job | px7 | light | gesture | coarse-stub: no touch-drag + hint + 1F still + 2F pans | coarse=false touchAction=pan-x pan-y touchDrag=false / stub:{coarse=true drag=false hint=true} cdpScroll=185 cdpPan=0m / 1F: pan=0m hint=true / 2F: pan=1770m dY=0 | PASS |
| hub-job | px7 | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | px7 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | px7 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| hub-job | px7 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | px7 | dark | text-size | 0 text nodes <12px | under12=69 small12-13=398 | FAIL |
| hub-job | px7 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | px7 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | px7 | dark | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | px7 | dark | map-geometry | trap_risk=false | mapH=461.4 vh=839 ratio=0.55 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | px7 | dark | gesture | informational (raw emulation) | coarse=false touchAction=pan-x pan-y touchDrag=false | PASS |
| hub-job | px7 | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | px7 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | ipadmini | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| hub-job | ipadmini | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | ipadmini | light | text-size | 0 text nodes <12px | under12=76 small12-13=398 | FAIL |
| hub-job | ipadmini | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | ipadmini | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | ipadmini | light | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | ipadmini | light | map-geometry | trap_risk=false | mapH=520 vh=1024 ratio=0.508 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | ipadmini | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| hub-job | ipadmini | light | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | ipadmini | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | ipadmini | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| hub-job | ipadmini | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=64 lt44=10 lt24=0 | PASS |
| hub-job | ipadmini | dark | text-size | 0 text nodes <12px | under12=76 small12-13=398 | FAIL |
| hub-job | ipadmini | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| hub-job | ipadmini | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=none appleIcon=false mwaCapable=false | PASS |
| hub-job | ipadmini | dark | fixed-sticky | informational | 3 fixed/sticky els | PASS |
| hub-job | ipadmini | dark | map-geometry | trap_risk=false | mapH=520 vh=1024 ratio=0.508 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| hub-job | ipadmini | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| hub-job | ipadmini | dark | sw | informational | {"supported":true,"scope":"http://localhost:3005/","state":"activated"} | PASS |
| hub-job | ipadmini | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | se | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| viewer-hub | se | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | se | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | se | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | se | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | se | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | se | light | map-geometry | trap_risk=false | mapH=426.9 vh=667 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | se | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub | se | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub | se | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | se | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| viewer-hub | se | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | se | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | se | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | se | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | se | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | se | dark | map-geometry | trap_risk=false | mapH=426.9 vh=667 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | se | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub | se | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub | se | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | i14 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| viewer-hub | i14 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | i14 | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | i14 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | i14 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | i14 | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | i14 | light | map-geometry | trap_risk=false | mapH=422.4 vh=660 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | i14 | light | toggle-text-tap | text tap toggles | toggled=true before=false->after=true "● Bedrock / Rock" swRect={"w":44,"h":24} | PASS |
| viewer-hub | i14 | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub | i14 | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub | i14 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | i14 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| viewer-hub | i14 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | i14 | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | i14 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | i14 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | i14 | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | i14 | dark | map-geometry | trap_risk=false | mapH=422.4 vh=660 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | i14 | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub | i14 | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub | i14 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | i14-land | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| viewer-hub | i14-land | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | i14-land | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | i14-land | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | i14-land | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | i14-land | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | i14-land | light | map-geometry | trap_risk=false | mapH=263 vh=343 ratio=0.767 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | i14-land | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub | i14-land | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:110/110, Hide well labels:91/91 intersect=false | PASS |
| viewer-hub | i14-land | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | i14-land | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| viewer-hub | i14-land | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | i14-land | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | i14-land | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | i14-land | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | i14-land | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | i14-land | dark | map-geometry | trap_risk=false | mapH=263 vh=343 ratio=0.767 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | i14-land | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub | i14-land | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:110/110, Hide well labels:91/91 intersect=false | PASS |
| viewer-hub | i14-land | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | px7 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| viewer-hub | px7 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | px7 | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | px7 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | px7 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | px7 | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | px7 | light | map-geometry | trap_risk=false | mapH=537 vh=839 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | px7 | light | toggle-text-tap | text tap toggles | toggled=true before=false->after=true "● Bedrock / Rock" swRect={"w":44,"h":24} | PASS |
| viewer-hub | px7 | light | gesture | coarse-stub: no touch-drag + hint + 1F still + 2F pans | coarse=false touchAction=none touchDrag=false / stub:{coarse=true drag=false hint=true} cdpScroll=185 cdpPan=0m / 1F: pan=0m hint=true / 2F: pan=7055m dY=0 | PASS |
| viewer-hub | px7 | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub | px7 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | px7 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| viewer-hub | px7 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-hub | px7 | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-hub | px7 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | px7 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | px7 | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub | px7 | dark | map-geometry | trap_risk=false | mapH=537 vh=839 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | px7 | dark | gesture | informational (raw emulation) | coarse=false touchAction=none touchDrag=false | PASS |
| viewer-hub | px7 | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub | px7 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | ipadmini | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| viewer-hub | ipadmini | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=40 lt24=0 | PASS |
| viewer-hub | ipadmini | light | text-size | 0 text nodes <12px | under12=10 small12-13=35 | FAIL |
| viewer-hub | ipadmini | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | ipadmini | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | ipadmini | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| viewer-hub | ipadmini | light | map-geometry | trap_risk=false | mapH=928 vh=1024 ratio=0.906 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | ipadmini | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub | ipadmini | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub | ipadmini | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| viewer-hub | ipadmini | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=40 lt24=0 | PASS |
| viewer-hub | ipadmini | dark | text-size | 0 text nodes <12px | under12=10 small12-13=35 | FAIL |
| viewer-hub | ipadmini | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub | ipadmini | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub | ipadmini | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| viewer-hub | ipadmini | dark | map-geometry | trap_risk=false | mapH=928 vh=1024 ratio=0.906 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub | ipadmini | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub | ipadmini | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | se | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| viewer-hub-pin | se | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | se | light | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | se | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | se | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | se | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | se | light | map-geometry | trap_risk=false | mapH=426.9 vh=667 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | se | light | modal-scroll-restore | |C-A|<=40 | A=1243 B=0 C=1243 | PASS |
| viewer-hub-pin | se | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub-pin | se | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub-pin | se | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | se | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| viewer-hub-pin | se | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | se | dark | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | se | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | se | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | se | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | se | dark | map-geometry | trap_risk=false | mapH=426.9 vh=667 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | se | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub-pin | se | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub-pin | se | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | i14 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| viewer-hub-pin | i14 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | i14 | light | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | i14 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | i14 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | i14 | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | i14 | light | map-geometry | trap_risk=false | mapH=422.4 vh=660 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | i14 | light | modal-scroll-restore | |C-A|<=40 | A=1241 B=0 C=1241 | PASS |
| viewer-hub-pin | i14 | light | toggle-text-tap | text tap toggles | toggled=true before=false->after=true "● Bedrock / Rock" swRect={"w":44,"h":24} | PASS |
| viewer-hub-pin | i14 | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub-pin | i14 | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub-pin | i14 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | i14 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| viewer-hub-pin | i14 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | i14 | dark | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | i14 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | i14 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | i14 | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | i14 | dark | map-geometry | trap_risk=false | mapH=422.4 vh=660 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | i14 | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub-pin | i14 | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub-pin | i14 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | i14-land | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| viewer-hub-pin | i14-land | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | i14-land | light | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | i14-land | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | i14-land | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | i14-land | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | i14-land | light | map-geometry | trap_risk=false | mapH=263 vh=343 ratio=0.767 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | i14-land | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub-pin | i14-land | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:110/110, Hide well labels:91/91 intersect=false | PASS |
| viewer-hub-pin | i14-land | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | i14-land | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| viewer-hub-pin | i14-land | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | i14-land | dark | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | i14-land | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | i14-land | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | i14-land | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | i14-land | dark | map-geometry | trap_risk=false | mapH=263 vh=343 ratio=0.767 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | i14-land | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub-pin | i14-land | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:110/110, Hide well labels:91/91 intersect=false | PASS |
| viewer-hub-pin | i14-land | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | px7 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| viewer-hub-pin | px7 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | px7 | light | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | px7 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | px7 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | px7 | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | px7 | light | map-geometry | trap_risk=false | mapH=537 vh=839 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | px7 | light | modal-scroll-restore | |C-A|<=40 | A=1266 B=0 C=1266 | PASS |
| viewer-hub-pin | px7 | light | toggle-text-tap | text tap toggles | toggled=true before=false->after=true "● Bedrock / Rock" swRect={"w":44,"h":24} | PASS |
| viewer-hub-pin | px7 | light | gesture | coarse-stub: no touch-drag + hint + 1F still + 2F pans | coarse=false touchAction=none touchDrag=false / stub:{coarse=true drag=false hint=true} cdpScroll=185 cdpPan=0m / 1F: pan=0m hint=true / 2F: pan=1772m dY=0 | PASS |
| viewer-hub-pin | px7 | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub-pin | px7 | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | px7 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| viewer-hub-pin | px7 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | px7 | dark | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | px7 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | px7 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | px7 | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-hub-pin | px7 | dark | map-geometry | trap_risk=false | mapH=537 vh=839 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | px7 | dark | gesture | informational (raw emulation) | coarse=false touchAction=none touchDrag=false | PASS |
| viewer-hub-pin | px7 | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-hub-pin | px7 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | ipadmini | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| viewer-hub-pin | ipadmini | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | ipadmini | light | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | ipadmini | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | ipadmini | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | ipadmini | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| viewer-hub-pin | ipadmini | light | map-geometry | trap_risk=false | mapH=928 vh=1024 ratio=0.906 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | ipadmini | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-hub-pin | ipadmini | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-hub-pin | ipadmini | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| viewer-hub-pin | ipadmini | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=15 lt24=0 | PASS |
| viewer-hub-pin | ipadmini | dark | text-size | 0 text nodes <12px | under12=9 small12-13=42 | FAIL |
| viewer-hub-pin | ipadmini | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-hub-pin | ipadmini | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:3005/well-viewer/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-hub-pin | ipadmini | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| viewer-hub-pin | ipadmini | dark | map-geometry | trap_risk=false | mapH=928 vh=1024 ratio=0.906 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-hub-pin | ipadmini | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-hub-pin | ipadmini | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | se | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| viewer-sa | se | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | se | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | se | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | se | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | se | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | se | light | map-geometry | trap_risk=false | mapH=426.9 vh=667 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | se | light | modal-scroll-restore | |C-A|<=40 | A=1243 B=0 C=1243 | PASS |
| viewer-sa | se | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-sa | se | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-sa | se | light | console-errors | 0 app errors | 1 app / 1 total | FAIL |
| viewer-sa | se | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=375 vw=375) | PASS |
| viewer-sa | se | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | se | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | se | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | se | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | se | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | se | dark | map-geometry | trap_risk=false | mapH=426.9 vh=667 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | se | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-sa | se | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-sa | se | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | i14 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| viewer-sa | i14 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | i14 | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | i14 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | i14 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | i14 | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | i14 | light | map-geometry | trap_risk=false | mapH=422.4 vh=660 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | i14 | light | modal-scroll-restore | |C-A|<=40 | A=1241 B=0 C=1241 | PASS |
| viewer-sa | i14 | light | toggle-text-tap | text tap toggles | toggled=true before=false->after=true "● Bedrock / Rock" swRect={"w":44,"h":24} | PASS |
| viewer-sa | i14 | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-sa | i14 | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-sa | i14 | light | console-errors | 0 app errors | 1 app / 1 total | FAIL |
| viewer-sa | i14 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=393 vw=393) | PASS |
| viewer-sa | i14 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | i14 | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | i14 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | i14 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | i14 | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | i14 | dark | map-geometry | trap_risk=false | mapH=422.4 vh=660 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | i14 | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-sa | i14 | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-sa | i14 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | i14-land | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| viewer-sa | i14-land | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | i14-land | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | i14-land | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | i14-land | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | i14-land | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | i14-land | light | map-geometry | trap_risk=false | mapH=263 vh=343 ratio=0.767 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | i14-land | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-sa | i14-land | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:110/110, Hide well labels:91/91 intersect=false | PASS |
| viewer-sa | i14-land | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | i14-land | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=734 vw=734) | PASS |
| viewer-sa | i14-land | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | i14-land | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | i14-land | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | i14-land | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | i14-land | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | i14-land | dark | map-geometry | trap_risk=false | mapH=263 vh=343 ratio=0.767 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | i14-land | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-sa | i14-land | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:110/110, Hide well labels:91/91 intersect=false | PASS |
| viewer-sa | i14-land | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | px7 | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| viewer-sa | px7 | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | px7 | light | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | px7 | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | px7 | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | px7 | light | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | px7 | light | map-geometry | trap_risk=false | mapH=537 vh=839 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | px7 | light | modal-scroll-restore | |C-A|<=40 | A=1266 B=0 C=1266 | PASS |
| viewer-sa | px7 | light | toggle-text-tap | text tap toggles | toggled=true before=false->after=true "● Bedrock / Rock" swRect={"w":44,"h":24} | PASS |
| viewer-sa | px7 | light | gesture | coarse-stub: no touch-drag + hint + 1F still + 2F pans | coarse=true touchAction=pan-x pan-y touchDrag=false / stub:{coarse=true drag=false hint=true} cdpScroll=185 cdpPan=0m / 1F: pan=0m hint=true / 2F: pan=1772m dY=0 | PASS |
| viewer-sa | px7 | light | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-sa | px7 | light | console-errors | 0 app errors | 1 app / 1 total | FAIL |
| viewer-sa | px7 | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=412 vw=412) | PASS |
| viewer-sa | px7 | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=33 lt44=15 lt24=0 | PASS |
| viewer-sa | px7 | dark | text-size | 0 text nodes <12px | under12=10 small12-13=17 | FAIL |
| viewer-sa | px7 | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | px7 | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | px7 | dark | fixed-sticky | informational | 1 fixed/sticky els | PASS |
| viewer-sa | px7 | dark | map-geometry | trap_risk=false | mapH=537 vh=839 ratio=0.64 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | px7 | dark | gesture | informational (raw emulation) | coarse=false touchAction=none touchDrag=false | PASS |
| viewer-sa | px7 | dark | bottom-bar | labels unclipped + bar/stack disjoint | labels=Show wells on map:101/101, Hide well labels:83/83 intersect=false | PASS |
| viewer-sa | px7 | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | ipadmini | light | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| viewer-sa | ipadmini | light | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=40 lt24=0 | PASS |
| viewer-sa | ipadmini | light | text-size | 0 text nodes <12px | under12=10 small12-13=35 | FAIL |
| viewer-sa | ipadmini | light | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | ipadmini | light | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | ipadmini | light | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| viewer-sa | ipadmini | light | map-geometry | trap_risk=false | mapH=928 vh=1024 ratio=0.906 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | ipadmini | light | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false / synthetic-touch=unsupported | PASS |
| viewer-sa | ipadmini | light | console-errors | 0 app errors | 0 app / 0 total | PASS |
| viewer-sa | ipadmini | dark | overflow | scrollWidth-innerWidth<=1 | diff=0 (scrollW=768 vw=768) | PASS |
| viewer-sa | ipadmini | dark | tap-targets | 0 targets <24px (AA 2.5.8) | total=58 lt44=40 lt24=0 | PASS |
| viewer-sa | ipadmini | dark | text-size | 0 text nodes <12px | under12=10 small12-13=35 | FAIL |
| viewer-sa | ipadmini | dark | input-zoom | all visible inputs >=16px | offenders=0 | PASS |
| viewer-sa | ipadmini | dark | meta | informational | viewport="width=device-width, initial-scale=1, viewport-fit=cover" fitCover=true themeColor=2 manifest=http://localhost:8795/manifest.json appleIcon=true mwaCapable=false | PASS |
| viewer-sa | ipadmini | dark | fixed-sticky | informational | 2 fixed/sticky els | PASS |
| viewer-sa | ipadmini | dark | map-geometry | trap_risk=false | mapH=928 vh=1024 ratio=0.906 touchAction=pan-x pan-y topbarH=64 trap_risk=false | PASS |
| viewer-sa | ipadmini | dark | gesture | coarse + pan-x pan-y + !touchDrag + synthetic drags | coarse=true touchAction=pan-x pan-y touchDrag=false | PASS |
| viewer-sa | ipadmini | dark | console-errors | 0 app errors | 0 app / 0 total | PASS |
| hub-job | desk | light | gesture | desktop mouse drag pans (dragging on) | coarse=false mapMoved=2211m waitTimeout=false | PASS |
| viewer-hub | desk | light | gesture | desktop mouse drag pans (dragging on) | coarse=false mapMoved=9460m waitTimeout=false | PASS |
| viewer-hub | i14w | light | gesture-hint-visual | is-gesture-hint on synthetic one-finger drag at 393px | hintShown=true | PASS |

## Details (JSON, failed + informational checks)

```json
[
 {
  "t": "hub-empty",
  "d": "se",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 667
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 667
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "se",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 660
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 660
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "i14",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 343
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 343
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "i14-land",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 839
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 839
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "px7",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 1024
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    }
   ],
   "small": []
  }
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 1024
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   }
  ]
 },
 {
  "t": "hub-empty",
  "d": "ipadmini",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "14"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.59 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "15"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.62 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "16"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.64 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "17"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 667
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 46,
    "y": 2970,
    "w": 620,
    "h": 33
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "14"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.59 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "15"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.62 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "16"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.64 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "17"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 667
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 46,
    "y": 2970,
    "w": 620,
    "h": 33
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "se",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "14"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.59 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "15"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.62 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "16"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.64 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "17"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 660
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 46,
    "y": 2966,
    "w": 620,
    "h": 32
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "14"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.59 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "15"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.62 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "16"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.64 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "17"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 660
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 46,
    "y": 2966,
    "w": 620,
    "h": 32
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "i14",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "ft"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Depth"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "gpm"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Yield"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Bedrock"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Estimated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Unconsolidated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 343
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 64,
    "y": 2463,
    "w": 620,
    "h": 32
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "ft"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Depth"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "gpm"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Yield"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Bedrock"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Estimated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Unconsolidated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 343
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 64,
    "y": 2463,
    "w": 620,
    "h": 32
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "i14-land",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "14"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.59 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "15"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.62 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "16"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.64 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "17"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 839
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 46,
    "y": 2800,
    "w": 620,
    "h": 33
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Well viewer"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "14"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.59 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "15"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.62 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "16"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.64 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "17"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 839
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 46,
    "y": 2800,
    "w": 620,
    "h": 33
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "px7",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "ft"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Depth"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "gpm"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Yield"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Bedrock"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Estimated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Unconsolidated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 1024
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 65,
    "y": 2775,
    "w": 638,
    "h": 33
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "light",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body > div.cj-shell > a.skip-link",
     "px": 11.52,
     "text": "Skip to content"
    },
    {
     "sel": "div.cj-shell > header.cj-topbar > a.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Driller Hub"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "Map & views ("
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": "2 MI"
    },
    {
     "sel": "h2#drill-map-h",
     "px": 11.52,
     "text": ")"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Map"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Depth"
    },
    {
     "sel": "div.flex.min-w-0 > div.flex.min-w-0 > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "ASL"
    },
    {
     "sel": "div.card.min-w-0 > div.flex.min-w-0 > div.flex.min-w-0 > button.btn.btn-accent",
     "px": 11.52,
     "text": "Ground elevation"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.min-w-0 > p.eyebrow.plain",
     "px": 11.52,
     "text": "Registry wells"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "Closest"
    },
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > div.seg.seg-sm > button",
     "px": 11.52,
     "text": "By depth"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.flex-wrap > div.flex.flex-wrap > span.min-w-0.max-w-full",
     "px": 10,
     "text": "25 shown · scroll · tap for detail"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-g > span.text-[10px].font-bold",
     "px": 10,
     "text": "G"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "gravel/aquifer"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-s > span.text-[10px].font-bold",
     "px": 10,
     "text": "S"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "dry sand"
    },
    {
     "sel": "div.flex.items-center > span.inline-flex.items-center > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.well-list.rounded-lg > div.flex.items-center > span.inline-flex.items-center > span",
     "px": 10,
     "text": "rock top"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "01"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.00 mi"
    },
    {
     "sel": "button.well-card > span.flex.min-h-[22px] > span.well-tag.well-tag-r > span.text-[10px].font-bold",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "ft"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Depth"
    },
    {
     "sel": "span.well-card-stats.flex > span.flex.flex-col > span.font-mono.text-[13px] > span.text-[10px].font-normal",
     "px": 10,
     "text": "gpm"
    },
    {
     "sel": "button.well-card > span.well-card-stats.flex > span.flex.flex-col > span.well-card-microlabel",
     "px": 8,
     "text": "Yield"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Bedrock"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "02"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.02 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "03"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.08 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "04"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "05"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.16 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "06"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.25 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Estimated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "07"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.well-card-meta.flex > span.truncate.text-[10px]",
     "px": 10,
     "text": "Unconsolidated"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "08"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.26 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "09"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.54 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "10"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.56 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "11"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.57 mi"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "12"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.font-mono.text-[10px]",
     "px": 10,
     "text": "13"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.ml-auto.whitespace-nowrap",
     "px": 10,
     "text": "0.58 mi"
    }
   ],
   "small": [
    {
     "sel": "div.flex.flex-wrap > div.flex.flex-wrap > label.flex.items-center > span",
     "px": 12,
     "text": "Radius"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184649"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184659"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184639"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184654"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184644"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-340424"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-3435"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-371001"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184619"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184713"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392872"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-392873"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-184694"
    },
    {
     "sel": "div.well-list-grid > button.well-card > span.flex.min-w-0 > span.truncate.font-mono",
     "px": 12,
     "text": "DNR-343748"
    }
   ]
  }
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": null,
   "appleTouchIcon": false,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body > div.cj-shell > div.bg-layer",
    "pos": "fixed",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 1024
   },
   {
    "sel": "body > div.cj-shell > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   },
   {
    "sel": "div.space-y-3 > div.max-h-72.overflow-auto > table.w-full.min-w-[620px] > thead.sticky.top-0",
    "pos": "sticky",
    "x": 65,
    "y": 2775,
    "w": 638,
    "h": 33
   }
  ]
 },
 {
  "t": "hub-job",
  "d": "ipadmini",
  "th": "dark",
  "check": "sw",
  "detail": {
   "supported": true,
   "scope": "http://localhost:3005/",
   "state": "activated"
  }
 },
 {
  "t": "viewer-hub",
  "d": "se",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "se",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "se",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "se",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "se",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "se",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "i14",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "i14",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "i14-land",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14-land",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14-land",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "i14-land",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14-land",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "i14-land",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "px7",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "px7",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "px7",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "px7",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "px7",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "px7",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "ipadmini",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "80 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "729 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "35 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "105 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "85 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "141 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "112 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "ipadmini",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "ipadmini",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   },
   {
    "sel": "main > div.grid.grid-cols-1 > div.order-2.lg:col-start-5 > div.map-shell",
    "pos": "sticky",
    "x": 333,
    "y": 523,
    "w": 419,
    "h": 928
   }
  ]
 },
 {
  "t": "viewer-hub",
  "d": "ipadmini",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "80 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "729 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "35 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "105 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "85 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "141 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "112 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub",
  "d": "ipadmini",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub",
  "d": "ipadmini",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   },
   {
    "sel": "main > div.grid.grid-cols-1 > div.order-2.lg:col-start-5 > div.map-shell",
    "pos": "sticky",
    "x": 333,
    "y": 523,
    "w": 419,
    "h": 928
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "se",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "se",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "se",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "se",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "se",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "se",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14-land",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14-land",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14-land",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14-land",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14-land",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "i14-land",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "px7",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "px7",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "px7",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "px7",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "px7",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "px7",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "ipadmini",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "ipadmini",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "ipadmini",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   },
   {
    "sel": "main > div.grid.grid-cols-1 > div.order-2.lg:col-start-5 > div.map-shell",
    "pos": "sticky",
    "x": 333,
    "y": 216,
    "w": 419,
    "h": 928
   }
  ]
 },
 {
  "t": "viewer-hub-pin",
  "d": "ipadmini",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "R"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-[10px].text-gray-600",
     "px": 10,
     "text": "Ground elev: Ref …, well …"
    },
    {
     "sel": "div.min-w-0.flex-1 > div.text-sm.font-extrabold > span.cj-data.inline-flex > span",
     "px": 10,
     "text": "G1"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "414,953"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "Tap"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Get ground elevations"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "to compare with wells."
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Wells within 2 mi"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "—"
    },
    {
     "sel": "div#locationBanner > strong",
     "px": 12,
     "text": "Nearest:"
    },
    {
     "sel": "div#locationBanner",
     "px": 12,
     "text": "0.0 mi"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "82 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "101 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "155 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "140 ft"
    },
    {
     "sel": "div.card.bg-gray-50 > div.flex.justify-between > div.min-w-0.flex-1 > div.text-xs.text-gray-500",
     "px": 12,
     "text": "100 ft"
    }
   ]
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "ipadmini",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:3005/well-viewer/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-hub-pin",
  "d": "ipadmini",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 768,
    "h": 64
   },
   {
    "sel": "main > div.grid.grid-cols-1 > div.order-2.lg:col-start-5 > div.map-shell",
    "pos": "sticky",
    "x": 333,
    "y": 216,
    "w": 419,
    "h": 928
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "light",
  "check": "console-errors",
  "detail": [
   {
    "kind": "console",
    "text": "Failed to load resource: the server responded with a status of 404 (File not found)",
    "url": "http://localhost:8795/api/dnr-report?refNo=184649"
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "se",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 375,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "light",
  "check": "console-errors",
  "detail": [
   {
    "kind": "console",
    "text": "Failed to load resource: the server responded with a status of 404 (File not found)",
    "url": "http://localhost:8795/api/dnr-report?refNo=184649"
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 393,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "i14-land",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14-land",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14-land",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "i14-land",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > span.cj-brand > span.cj-tag",
     "px": 11.52,
     "text": "Well Viewer"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14-land",
  "th": "dark",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "i14-land",
  "th": "dark",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 734,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "px7",
  "th": "light",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
 {
  "t": "viewer-sa",
  "d": "px7",
  "th": "light",
  "check": "meta",
  "detail": {
   "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
   "viewportFitCover": true,
   "themeColorCount": 2,
   "manifest": "http://localhost:8795/manifest.json",
   "appleTouchIcon": true,
   "mobileWebAppCapable": false
  }
 },
 {
  "t": "viewer-sa",
  "d": "px7",
  "th": "light",
  "check": "fixed-sticky",
  "detail": [
   {
    "sel": "body.cj-viewer.p-4 > header.cj-topbar",
    "pos": "sticky",
    "x": 0,
    "y": 0,
    "w": 412,
    "h": 64
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "px7",
  "th": "light",
  "check": "console-errors",
  "detail": [
   {
    "kind": "console",
    "text": "Failed to load resource: the server responded with a status of 404 (File not found)",
    "url": "http://localhost:8795/api/dnr-report?refNo=184649"
   }
  ]
 },
 {
  "t": "viewer-sa",
  "d": "px7",
  "th": "dark",
  "check": "text-size",
  "detail": {
   "under12": [
    {
     "sel": "body.cj-viewer.p-4 > header.cj-topbar > div.cj-top-actions > a.cj-app-switch",
     "px": 0,
     "text": "Driller hub"
    },
    {
     "sel": "body.cj-viewer.p-4 > main > div.cj-page-head > p.eyebrow",
     "px": 11.52,
     "text": "Indiana DNR Registry"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "0 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "50 FT"
    },
    {
     "sel": "div#loadingDnrPanel > div.cj-bore > div.cj-bore__track > span.cj-bore__tick",
     "px": 11.52,
     "text": "100 FT"
    },
    {
     "sel": "span#loadingDnrStatus",
     "px": 11.52,
     "text": "Loading 10 DNR chunks in parallel…"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-1.lg:col-start-1 > div.mb-6.cj-card-plain > div.eyebrow.plain",
     "px": 11.52,
     "text": "Well Depth Search (ft)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Bottom Elevation (ft ASL)"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Yield / GPM"
    },
    {
     "sel": "div.grid.grid-cols-1 > div.order-4.lg:col-start-1 > div.cj-filter-card > p.eyebrow.plain",
     "px": 11.52,
     "text": "Well Type Filter"
    }
   ],
   "small": [
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "Total loaded in memory:"
    },
    {
     "sel": "span#totalWells",
     "px": 12,
     "text": "65"
    },
    {
     "sel": "main > div.grid.grid-cols-1 > div.order-3.lg:col-start-1 > p.text-xs.text-gray-500",
     "px": 12,
     "text": "— use location search or filters below"
    },
    {
     "sel": "div.cj-filter-card > div.toggle-wrap > div > label.toggle-label",
     "px": 12.8,
     "text": "●"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "700+ ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "600–699 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "500–599 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Below 500 ft"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "0.01–10 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "10.01–25 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "25.01–50 GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "50.01+ GPM"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Unconsolidated / Gravel"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bedrock / Rock"
    },
    {
     "sel": "div.toggle-wrap > div > label.toggle-label > span.cj-datalbl",
     "px": 12.8,
     "text": "Bucket / Hand Dug"
    }
   ]
  }
 },
```
