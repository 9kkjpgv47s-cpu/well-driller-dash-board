# Driller Dashboard

Pre-departure hub for water-well drillers: location context, nearby well intelligence, and (later) community notes.

**Start here:** [`PROJECT_OUTLINE.md`](./PROJECT_OUTLINE.md) — product vision, architecture, data pipeline, and build milestones.

**Hub (MVP UI):** [`apps/hub/`](./apps/hub/) — single driller page: paste dispatch text → brief. Local dev: `cd apps/hub && npm install && npm run dev`.

**Vercel:** Set the project **Root Directory** to **`apps/hub`** (required so Next.js is detected). The app includes `apps/hub/vercel.json` with `"framework": "nextjs"`.
