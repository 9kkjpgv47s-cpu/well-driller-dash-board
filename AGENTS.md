# Agent instructions

1. Read **`PROJECT_OUTLINE.md`** before changing architecture, data shapes, or milestones.
2. Respect the separation between **official/state data** and **community-sourced notes** (outline §1–2).
3. Data refresh: see **`data/README.md`** and `scripts/` for sync and canonical JSONL builds.
4. Prefer small, reviewable changes that match the milestone you are implementing; update `PROJECT_OUTLINE.md` if scope shifts.

## Cursor Cloud specific instructions

### Services

The only runnable service is the **Next.js hub** in `apps/hub/`. There is no database, no Docker, and no auth. External weather APIs (Open-Meteo, NWS) are free and keyless.

### Common commands

| Task | Command | Working dir |
|------|---------|-------------|
| Install deps | `npm install` | `apps/hub/` |
| Dev server | `npm run dev` | `apps/hub/` → http://localhost:3000 |
| Lint | `npm run lint` | `apps/hub/` |
| Build | `npm run build` | `apps/hub/` |

### Notes

- The optimization API (`/api/optimization`) returns deterministic mock data seeded by lat/lon; it is not wired to real analytics yet.
- The weather API (`/api/weather`) requires the `date` query param (`YYYY-MM-DD`) in addition to `lat` and `lon`.
- ESLint has two pre-existing warnings (missing React Hook dep in `JobWeatherPanel.tsx`, unused var in `job-advice.ts`); these are not errors and do not block the build.
- The data pipeline scripts (`scripts/`) require a sibling `DNR_Well_Viewer_Full_Demo` repo or `DNR_VIEWER_ROOT` env var and are optional for development.
