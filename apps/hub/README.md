# Driller Dashboard — hub (`apps/hub`)

Next.js app for the field hub: scheduling, optimization demos, and job-scoped weather.

## Scheduling + weather

- **Crews:** 1–5 active (default 3), **weekdays only**, **1 or 2 jobs per crew per day** (no clock time slots).
- **Horizons:** week grid and **month agenda** (far-out jobs).
- **Emergency jobs:** quick insert; planner heuristics call out conflicts (e.g. emergency + long off-drive access).
- **Weather:** `/api/weather` blends **Open-Meteo** (GFS + ECMWF runs) and **US NWS** hourly when the point is in the US. Responses are cached ~15 minutes server-side so revisiting morning vs afternoon can show fresher data.
- **Job panel:** select any job for **hour-by-hour** precip probability, clouds, wind, WMO-style conditions, source list, and **“Things to consider”** driven by distance off the drive (30+ ft threshold), wind, POP, and emergency context.

Timezone defaults to `America/Indiana/Indianapolis`; override via `JobWeatherPanel` later if you add a setting.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
