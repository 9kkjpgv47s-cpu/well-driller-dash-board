# Driller Dashboard — hub (`apps/hub`)

Next.js **single-page driller brief**: paste dispatch text → parsed location, Leaflet map (Search job site), mock nearby wells, and deep links to Google / Apple Maps / Waze directions.

## Vercel

The repo root includes a **`package.json` with `next` in `dependencies`** and a **`vercel.json`** so the default **Root Directory** (`.`) works: install + build run from the repo root and delegate to `apps/hub`.

Optional: you can still set **Root Directory** to `apps/hub` and clear the root `buildCommand` override if you prefer.

Production branch: **`main`**. **Preview** deploys follow the branch you push.

`GET /api/geocode` calls OpenStreetMap Nominatim from the server; ensure outbound HTTPS is allowed (default on Vercel).

## Local dev

```bash
cd apps/hub
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

Bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
