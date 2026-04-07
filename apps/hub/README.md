# Driller Dashboard — hub (`apps/hub`)

Next.js **single-page driller brief**: paste dispatch text → parsed location, Leaflet map (Search job site), mock nearby wells, and deep links to Google / Apple Maps / Waze directions.

## Vercel

1. **Root Directory:** **`apps/hub`** (Settings → General). Vercel only detects Next.js in the folder that contains `package.json` + `app/`.
2. **Framework preset:** Next.js (or rely on `vercel.json` in this folder).
3. Production branch: **`main`**.

If you see “No Next.js version detected,” the Root Directory is almost always still **`.`** — change it to **`apps/hub`** and redeploy.

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
