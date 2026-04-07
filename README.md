# Driller Dashboard

Pre-departure hub for water-well drillers: location context, nearby well intelligence, and (later) community notes.

**Start here:** [`PROJECT_OUTLINE.md`](./PROJECT_OUTLINE.md) — product vision, architecture, data pipeline, and build milestones.

## Hub (Next.js — Vercel)

The **driller brief** app lives at the **repository root** (`package.json`, `src/app/`, …) so Vercel’s default **Root Directory** **`.`** installs dependencies and runs `next build` correctly.

**Local dev:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Vercel:** Leave **Root Directory** empty or **`.`**. Framework: Next.js (or use `vercel.json`). Production branch: **`main`**.

If you previously set Root Directory to `apps/hub`, **clear it** after this layout change.
