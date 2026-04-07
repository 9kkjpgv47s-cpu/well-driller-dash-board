# Driller Dashboard — hub (`apps/hub`)

Next.js **single-page driller brief**: paste dispatch text → parsed location, Leaflet map (Search job site), mock nearby wells, and deep links to Google / Apple Maps / Waze directions.

## Vercel

1. Import this Git repository.
2. Set **Root Directory** to `apps/hub` (the Next.js app is not at the repo root).
3. Production branch: **`main`** (merge feature work into `main` so Production deploys pick it up).
4. **Preview** deploys use the branch you push; **Production** uses the production branch only.

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
