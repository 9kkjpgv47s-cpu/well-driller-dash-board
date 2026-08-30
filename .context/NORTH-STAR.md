# North star — Driller Dashboard

## Goal

**Pre-departure hub** for water-well drillers: customizable dashboard answering **“what should I expect here?”** before leaving for the job.

Source: `PROJECT_OUTLINE.md`, `README.md`.

## Core experience (vision)

- **Trip context:** weather, traffic, drive/route framing, jobsite location  
- **Local well intelligence:** nearby registry wells — ranges, outliers, area stats (depth, construction, GPM, static, casing/screen, gravel/vein-style lithology signals)  
- **Community notes (later):** drillers’ tips separate from official data trust model  

## Principles

- Correct, rich results over shipping fast; don’t block customizable dashboard later  
- Official/state facts vs crowd notes **structurally separate**  
- Field-ready: lean payloads, optional offline/PWA, precomputed summaries  

## Current hub MVP (implemented surface)

From `README.md` + `apps/hub/README.md`:

- Single page on `/` — paste dispatch email → job brief  
- DNR wells map, job-scoped weather, area drilling analysis unlock around jobsite  
- Legacy routes redirect to `/`  
- Next.js 15 / React 19 / Tailwind v4 in `apps/hub`

## Non-goals / boundaries

- This repo does **not** auto-find the DNR viewer checkout (`AGENTS.md`)  
- Heavy ArcGIS fetch / chunk generation lives in **separate** DNR viewer repo  
- Community notes / auth / PostGIS are later milestones (`PROJECT_OUTLINE.md`)  

## Ship score gate

UNDECIDED in repo. Lithology track has explicit numeric gates (see ACCEPTANCE / statewide report): real parsed ≥ 90%, parseable JSON 100%.
