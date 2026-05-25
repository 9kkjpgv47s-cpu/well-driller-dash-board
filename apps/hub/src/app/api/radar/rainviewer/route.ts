import { NextResponse } from "next/server";

const UPSTREAM = "https://api.rainviewer.com/public/weather-maps.json";

/** Proxies RainViewer’s public map index so the hub can load frames without browser CORS surprises. */
export async function GET() {
  const res = await fetch(UPSTREAM, { next: { revalidate: 60 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "RainViewer map index unavailable" },
      { status: 502 },
    );
  }
  const data: unknown = await res.json();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
