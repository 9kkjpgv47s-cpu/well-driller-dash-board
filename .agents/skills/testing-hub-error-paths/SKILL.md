---
name: testing-hub-error-paths
description: How to run and adversarially test the apps/hub Next.js field dashboard locally — dev server setup, routing quirks, and reliable ways to force upstream/browser-API failures (DNR, elevation, localStorage, clipboard).
---

# Testing the hub (apps/hub) and forcing its error paths

## Running it

```bash
. ~/.nvm/nvm.sh && nvm use 22.12.0        # node 20 breaks vitest/dev config
cd apps/hub && npm install
setsid nohup npm run dev > /tmp/dev.log 2>&1 < /dev/null &   # detach: a later pkill can kill your shell
```

Serves on http://localhost:3000. First page load after a restart can take 20-40s
(chunk loading), so wait before concluding something is broken.

**Memory:** the dev server has OOM'd (`Reached heap limit`) on a 8 GB box while
serving the well-chunk routes. If requests start returning `ERR_CONNECTION_REFUSED`,
check the dev log for a V8 OOM trace and restart with
`NODE_OPTIONS="--max-old-space-size=8192"`.

## Routing quirks

- `/drilling`, `/optimization`, `/driller-job`, `/well-viewer` are **all `redirect("/")`**.
  The entire field workspace is `DrillingHubClient` on `/`. Don't expect separate pages.
- Set a jobsite either by pasting a dispatch into "Dispatch input" → "Generate job brief",
  or by deep-linking `/?lat=39.7684&lon=-86.1581`.
- Scrolling with the cursor over the Leaflet map zooms the map instead of scrolling the
  page — scroll at x≈80 (left gutter).
- `/api/area-insights` may return a structured `503 {"error":"DNR chunk load timed out …",
  "fallback":"client-chunks"}` on a slow box. This is a graceful degradation (the client
  falls back to browser-side chunks and wells still render), not necessarily a regression.

## Forcing failures (no app-source edits)

| Target | How |
|---|---|
| DNR report (`/api/dnr-report`) | Blackhole `secure.in.gov` in `/etc/hosts`, restart dev server. Note the vendor handler (`vendor/dnr-report-local/index.cjs`) catches its own fetch errors and returns its own `502 {"error":"fetch failed"}`, so the UI banner shows the terse `fetch failed`, not a route-level descriptive message. |
| Elevation (`/api/elevation`) | Blackhole **both** `api.opentopodata.org` and `api.open-elevation.com`; expect `502 {"error":"Elevation lookup failed — OpenTopoData: …; Open-Elevation: …."}`. |
| localStorage | Chrome → `chrome://settings/content/siteData` → "Not allowed to save data on your device" → Add `localhost:3000`. `localStorage` then throws `SecurityError`, exercising `lib/browser-storage.ts`. Wells still load (memory-cached), so the app stays usable. |
| Clipboard **write** | ⚠️ `chrome://settings/content/clipboard` only governs clipboard *reads* — `navigator.clipboard.writeText()` still succeeds, so this will NOT trigger a write-failure fallback. Instead load the app over an **insecure origin** (`http://<LAN-IP>:3000`, get the IP from `hostname -I`). `navigator.clipboard` is `undefined` there, so the write throws and the `window.prompt` fallback fires. This also mirrors a real field tablet hitting the box by IP. |

Always back up and restore `/etc/hosts` (`sudo cp /etc/hosts /tmp/hosts.bak`) and remove
any Chrome site exceptions afterwards. Chrome exceptions live in
`~/.browser_data_dir/Default/Preferences` under
`profile.content_settings.exceptions.*` and can be pruned with a small python script if
the browser dies before you can undo them in the UI.

## Environment fragility

The Xvfb/Chrome GUI session has died mid-run (taking the screen recording with it, ffmpeg
`received signal 15`). Recording segments are still written incrementally to
`~/screencasts/<id>/*-edited-NNN.mp4`; stitch them with
`ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4` to salvage a usable video.
Take screenshots at every assertion so evidence survives a recording loss.

## Devin Secrets Needed

None — everything runs locally against public upstreams.
