---
name: testing-hub-error-paths
description: How to run and adversarially test the apps/hub Next.js field dashboard locally — dev server setup, routing quirks, and reliable ways to force upstream/browser-API failures (DNR, elevation, geocode, localStorage, clipboard).
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
| Geocode (`/api/geocode`) | Blackhole `nominatim.openstreetmap.org`; expect `502 {"error":"Geocoder unreachable — fetch failed."}`. **No dev-server restart needed** — the toggle takes effect on the next request, so you can flip failure→success live inside one UI session. |

### Blackhole IP choice controls the failure *shape*

- `127.0.0.1 <host>` → connection refused **instantly**. Best for crisp error-message
  assertions, but in-flight/loading states (`Geocoding…`, spinners) flash by too fast to screenshot.
- `10.255.255.1 <host>` → packets are dropped, so the TCP connect **hangs ~10s** before undici
  gives up (still surfaces as `fetch failed`). Use this when you must capture a disabled/busy
  button or loading state on camera.

### Next.js fetch-cache trap when toggling upstreams live

Some routes fetch with `next: { revalidate: 86400 }` (e.g. `/api/geocode`). A **successful**
response for a given query is cached for 24h, so if you verify the happy path first, the
subsequent "forced failure" will be silently served from cache and your failure test will
look broken. Therefore: **run the failure case first, then restore the upstream.** Failed
responses are not cached, so failure→success works fine. To sanity-check an upstream's real
answer without poisoning the cache, query the upstream **directly** (e.g. curl Nominatim with
a `User-Agent`) rather than through the app.

## Getting exact parser fixtures before writing assertions

`src/lib/dispatch-parse.ts` is a **standalone module (no `@/` imports)**, so you can run the
real parser directly instead of guessing what a paste will produce:

```bash
cd apps/hub && npx tsx -e 'import {parseDispatchEmail} from "./src/lib/dispatch-parse.ts"; console.log(parseDispatchEmail("..."))'
```

Non-obvious behaviours this reveals:

- `extractAddress` can swallow an **entire prose line** ("Service call at 1200 W 10th St … Call Bob"),
  which then becomes the geocoder query and won't match. Use a dedicated `Address:` line so the
  extracted address is just the street/city/zip.
- An address-only paste is **not** location-less: `locationSource: "address_only"` and the parsed
  brief is filled with **deterministic stub lat/lon** derived from the address string
  (`stubCoordsFromString`). This is invaluable for asserting a *real* geocode happened — capture the
  stub coords first, then assert they change to the genuine ones (don't just assert "coords exist").
- The parent `DrillingHubClient.center` (passed to `FieldDispatchPanel` as `jobsiteCoords`) starts
  `null` and is only set by explicit actions; the map panel renders its own default view, so a
  visible map does **not** imply a jobsite is set. "No jobsite" shows the "Get the field map started"
  card and hides the `MAP & VIEWS` section.
- Clear leftover state between cases with the **"Clear saved dispatch"** button (a saved dispatch in
  `localStorage` rehydrates a jobsite on load and can suppress address-only/geocode UI).

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
