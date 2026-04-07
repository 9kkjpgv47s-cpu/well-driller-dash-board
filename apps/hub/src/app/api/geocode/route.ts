import { NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: "Query too short" },
      { status: 400 },
    );
  }

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "DrillerDashboardHub/1.0 (field briefing MVP; contact: ops@local)",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Geocoder unavailable" },
      { status: 502 },
    );
  }

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const first = data[0];
  if (!first) {
    return NextResponse.json({ error: "No results" }, { status: 404 });
  }

  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Bad geocoder response" }, { status: 502 });
  }

  return NextResponse.json({
    lat,
    lon,
    displayName: first.display_name ?? q,
  });
}
