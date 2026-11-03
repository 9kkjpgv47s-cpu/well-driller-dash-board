# Driller Dashboard — hub (`apps/hub`)

Next.js 15 / React 19 / Tailwind v4 **mono-page field hub** for water-well drillers.

Everything lives on **`/`** (rendered by `src/components/drilling/DrillingHubClient.tsx`):

1. **Dispatch input** — paste a dispatch email; we heuristically extract title, contact, phone, schedule, rig path, address, and GPS coordinates. If only an address is found, a **Geocode address** button resolves it via `GET /api/geocode` (Nominatim, server-side).
2. **Map & views** — Leaflet map of nearby DNR registry wells (with viewport culling and a deterministic nearest-800 marker cap), plus **Depth** (thermometer) and **ASL** (stratigraphy) views over the same data.
3. **Weather** — job-scoped forecast panel (`/api/weather` blends Open-Meteo and US NWS; cached ~15 min server-side).
4. **Area drilling analysis** — registry-backed insights (aquifer mix, sand/gravel intervals, yield buckets, depth medians) computed once per radius and shared across the page.

Sections are reorderable; radius, view, and ordering persist in `localStorage`.

## Routes

| Route | Behavior |
| --- | --- |
| `/` | The app. Optional `?lat=&lon=` deep link sets the jobsite center; `?job=` loads a shared job link. |
| `/drilling`, `/driller-job`, `/optimization`, `/well-viewer` | **Redirect to `/`** (legacy bookmarks; `/well-viewer` forwards `?lat=&lon=`). |
| `/api/area-insights?lat=&lon=&radius=` | Server-computed `AreaInsightsReport` JSON for a point + radius (miles). |
| `/api/optimization?lat=&lon=&radiusMiles=` | Depth/yield optimization summary from the same server chunk cache. |
| `/api/geocode?q=` | Forward geocode (Indiana-biased Nominatim). |
| `/api/elevation` | POST DEM ground elevations for a list of locations. |
| `/api/weather`, `/api/radar` | Forecast + radar proxies for the weather panel. |
| `/api/dnr-report?refNo=` | Official DNR record HTML parsing for the well detail modal (`vendor/dnr-report-local`). |
| `/api/mcp` | Hosted MCP server (Streamable HTTP) exposing the same registry to chatbots — bearer key required. |

There is no separate scheduling board, optimization page, or iframe well viewer anymore — those legacy components were removed; git history is the record.

## Connect a chatbot (MCP)

`/api/mcp` is a Streamable HTTP MCP server with nine Indiana-only tools, all
read-only and all advertised with an `outputSchema` for structured results:

| Tool | What it returns |
| --- | --- |
| `job_brief` | **Primary entry point.** Resolves a jobsite from lat/lon, an address/place name, or pasted dispatch text → field brief: area insights, nearest wells, shared-aquifer drill windows (ft below ground), ground elevation (ft ASL), and a short weather summary. |
| `parse_dispatch` | Structured fields from a pasted dispatch email (GPS, address, contact, phone, schedule, pump HP, distance off drive); geocodes the address when the paste lacks GPS. |
| `area_insights` | Registry-backed insight report for a point + radius (well counts, aquifer mix, gravel/vein signals, depth/yield buckets, confidence grade). |
| `wells_nearby` | Nearest registry wells with distance (mi), depth/static water (ft), pump rate (GPM), aquifer, county. |
| `ground_layers` | Lithology logs converted to feet ASL; shared water-bearing bands across ≥2 wells with a drill window at the jobsite DEM elevation. |
| `site_optimization` | Registry-backed site assessment: neighborhood stats, 0–100 scores, checklist. Never returns mock data — errors on cold start instead. |
| `job_weather` | Day summaries around an anchor date (Open-Meteo GFS/ECMWF + NWS): temps, POP %, precip inches, wind, thunderstorm hours. |
| `geocode_address` | Indiana-biased Nominatim forward geocode → lat/lon WGS84. |
| `dnr_well_record` | Official DNR record for a refno, plus a flat `summary` map of top-level scalar fields. |

The server also ships two prompts (`prep-drilling-job`, `compare-sites`) and two
resources (`driller-hub://glossary`, `driller-hub://data-coverage`) that explain
the field vocabulary and data coverage.

Units: depths, static water, and drill windows are feet below ground surface;
fields suffixed `_asl_ft` are feet above sea level; pump rates are GPM;
distances are miles; lat/lon are WGS84 degrees.

Auth is a bearer API key from the `DRILLER_MCP_API_KEYS` env var —
comma-separated `label:key` entries (`acme:dk_abc123,beta:dk_xyz`). Requests are
rate-limited per key (default 120/min; `MCP_RATE_LIMIT_PER_MIN` overrides). Set
`HUB_PUBLIC_URL` to override the map deep-link base (default
`https://driller-hub.vercel.app`).

OAuth 2.1 (for ChatGPT and other OAuth-only clients) is enabled by setting
`MCP_OAUTH_ISSUER` — e.g. `https://<tenant>.authkit.app` for WorkOS AuthKit.
Optional: `MCP_OAUTH_AUDIENCE` (defaults to `https://driller-hub.vercel.app/api/mcp`)
and `MCP_OAUTH_JWKS_URL` (defaults to RFC 8414 → OIDC discovery). The hub is the
resource server only; it verifies JWTs and serves RFC 9728 protected-resource
metadata at both `/.well-known/oauth-protected-resource` and
`/.well-known/oauth-protected-resource/api/mcp`. API keys keep working either
way.

**Scopes:** the hub advertises `openid profile email offline_access` in
`scopes_supported` (override with `MCP_OAUTH_SCOPES`, comma/space separated).
Do not advertise custom scopes such as `wells:read` — AuthKit's dynamically
registered clients can't be granted them and the IdP returns `invalid_scope`
at the authorize endpoint. `offline_access` is what makes AuthKit issue the
refresh token ChatGPT needs.

**Operator setup (WorkOS AuthKit)**

1. Create a WorkOS environment; note the AuthKit domain → `MCP_OAUTH_ISSUER`.
   Recommended: also set `MCP_OAUTH_JWKS_URL=https://<tenant>.authkit.app/oauth2/jwks`
   so verification doesn't depend on discovery.
2. Connect → Configuration: enable **Client ID Metadata Document** and
   **Dynamic Client Registration**.
3. Add a Resource Indicator exactly equal to
   `https://driller-hub.vercel.app/api/mcp` and set it as the default.
4. Set the env vars in Vercel and redeploy.
5. Run `npm run mcp:oauth-check` (defaults to prod) and fix any `FAIL` before
   trying ChatGPT.

**ChatGPT user** (requires Plus/Pro/Business/Enterprise/Edu): chatgpt.com/plugins
→ **+** → Add custom MCP server → name + URL
`https://driller-hub.vercel.app/api/mcp` → Authentication: **OAuth** (leave
client credentials blank) → accept the risk notice → Create as a plugin. First
use triggers the AuthKit sign-in; afterwards type `@Driller Hub` in chat.

Clients that speak Streamable HTTP directly (Cursor, Claude Code):

```json
{
  "driller-hub": {
    "url": "https://driller-hub.vercel.app/api/mcp",
    "headers": { "Authorization": "Bearer <key>" }
  }
}
```

Stdio-only clients go through `mcp-remote`:

```json
{
  "driller-hub": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://driller-hub.vercel.app/api/mcp",
             "--header", "Authorization: Bearer <key>"]
  }
}
```

Local smoke check: `DRILLER_MCP_API_KEY=<key> npm run mcp:smoke -- http://localhost:3000/api/mcp`

Golden-task eval (runs the task suite in `scripts/mcp-eval-tasks.json` against a
live server and writes a pass/fail report):

```bash
DRILLER_MCP_API_KEY=<key> npm run mcp:eval -- http://localhost:3000/api/mcp --out logs/mcp-eval.json
```

## How well data loads

- **Source files:** `public/well-viewer/dnr_wells_chunk_*.csv.gz` (~10 gzipped CSV chunks, tracked in git so a fresh clone works offline).
- **Browser:** once a jobsite center is set, `src/lib/dnr-chunk-browser.ts` fetches all existing chunks **concurrently** and decompresses + parses them in a small **Web Worker pool** (`dnr-chunk-worker.ts`), reporting per-chunk progress to a determinate progress bar. Rows are cached per session (`dnr-wells-cache.ts`).
- **Server (API routes):** `dnr-chunk-server.ts` + `dnr-wells-server-cache.ts` load the same chunks from disk once per process.
- **Queries:** `src/lib/well-spatial-index.ts` buckets wells into a 0.05° grid; radius and map-viewport queries go through it instead of scanning all ~415k rows. Lithology JSON is parsed once per record (`WeakMap` cache in `area-well-analytics.ts`).

When chunks are regenerated in the standalone DNR viewer repo, sync them in:

```bash
export WELL_VIEWER_ROOT="/absolute/path/to/dnr-viewer-repo"
./scripts/sync-well-viewer-into-hub.sh   # run from the monorepo root
```

## Develop, test, build

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest (src/**/*.test.ts)
npm run build
```

## Scripts

Python tooling is canonical at the **monorepo root `scripts/`** tree; hub npm scripts call it directly:

```bash
npm run verify:chunks                 # summarize chunk columns/coverage
npm run verify:lithology-kpi          # lithology source KPI report
npm run verify:viewer-hub-artifacts   # viewer/hub artifact parity check
npm run lithology:export-none         # export unresolved none-source wells → ../../data/out/
```

Statewide lithology ETL lanes (need `WELL_VIEWER_ROOT` pointing at the viewer checkout) remain hub-local under `apps/hub/scripts/`:

```bash
npm run lithology:statewide -- --mode cycle --window-max 5000 --delay-sec 0.2
npm run lithology:iterate-to-target -- --target-real-pct 90 --max-windows 8
npm run rebuild:viewer-data
```

**Canonical well JSONL** (hub analytics / `data/out/`) can be built **without** the viewer checkout by placing `dnr_wells_full.csv.gz` at the monorepo root and running `python3 scripts/build_canonical_jsonl.py --from-full` (see root `README.md` and `data/README.md`).
