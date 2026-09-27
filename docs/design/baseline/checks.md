# Baseline checks — `design/cj-universal` (pre-restyle)

- Commit: `9d6cd436bfad3aebf2b7fe875d74d1e0e7482d93` (branched from `main` HEAD)
- App: `apps/hub` — Next.js 15.5.23, Node v22.23.1, npm 10.9.8
- `npm install` run first (package-lock was newer than `node_modules/.package-lock.json`; 2 added / 1 removed / 18 changed — lockfile sync only, no manifest edits)
- Full raw log: `/tmp/hub-baseline-checks.log` was captured at run time; summarized verbatim below.

## Results

| Command | Result | Counts |
|---|---|---|
| `npm test` (vitest run) | PASS (exit 0) | 19 test files, 151 tests passed, 0 failed. Duration ~0.5s |
| `npm run lint` (eslint) | PASS (exit 0) | 15 problems — **0 errors, 15 warnings** (all pre-existing; list below) |
| `npx tsc --noEmit` | PASS (exit 0) | no output |
| `npm run build` (next build) | PASS (exit 0) | 17 static pages generated; `/` 59.1 kB (166 kB first load) |

## Pre-existing lint warnings (verbatim)

```
/Users/dominiceasterling/Projects/well-driller-dash-board/apps/hub/public/well-viewer/archive/classify-v1-snippets-from-index.html.js
  42:18  warning  'wellTypeColor' is defined but never used     @typescript-eslint/no-unused-vars
  52:18  warning  'wellTypeLabel' is defined but never used     @typescript-eslint/no-unused-vars
  62:18  warning  'passesTypeFilter' is defined but never used  @typescript-eslint/no-unused-vars

/Users/dominiceasterling/Projects/well-driller-dash-board/apps/hub/public/well-viewer/formation-class-v3.js
    56:14  warning  'e' is defined but never used                          @typescript-eslint/no-unused-vars
    60:14  warning  'e2' is defined but never used                         @typescript-eslint/no-unused-vars
   243:12  warning  'veinBottomsFromLayers' is defined but never used      @typescript-eslint/no-unused-vars
   324:12  warning  'veinSetLabelFromIntervals' is defined but never used  @typescript-eslint/no-unused-vars
   386:14  warning  'e' is defined but never used                          @typescript-eslint/no-unused-vars
  1073:14  warning  'e' is defined but never used                          @typescript-eslint/no-unused-vars
  1089:14  warning  'e2' is defined but never used                         @typescript-eslint/no-unused-vars

/Users/dominiceasterling/Projects/well-driller-dash-board/apps/hub/public/well-viewer/lithology_v2/lithology-v2-loader.js
  20:18  warning  'e' is defined but never used  @typescript-eslint/no-unused-vars
  33:22  warning  'e' is defined but never used  @typescript-eslint/no-unused-vars

/Users/dominiceasterling/Projects/well-driller-dash-board/apps/hub/src/lib/dnr-chunk-browser.ts
  117:7  warning  'IDB_CHUNK_COUNT_KEY' is assigned a value but never used     @typescript-eslint/no-unused-vars
  118:7  warning  'IDB_CHUNK_COUNT_TTL_MS' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/dominiceasterling/Projects/well-driller-dash-board/apps/hub/src/lib/formation-class.ts
  635:41  warning  '_bottoms' is defined but never used  @typescript-eslint/no-unused-vars

✖ 15 problems (0 errors, 15 warnings)
```

## Other notes

- vitest prints a non-fatal config notice: `ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1)` — pre-existing, unrelated.
- Build emits the same 3 `src/` unused-var warnings as lint (vendored `public/well-viewer` files are eslint-ignored in build).
- Dev server note: port **3000 is already bound** on this machine by a `css-os` Next server (`next-server` PID 8496, cwd `~/Projects/css-os/apps/os`). Left untouched per isolation rules; hub dev runs on **port 3001** instead.
