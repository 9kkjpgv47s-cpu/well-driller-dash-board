import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side forward geocode (Nominatim). Indiana jobsites — no browser CORS.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: "Query `q` must be at least 3 characters." },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, Indiana, USA`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "DrillerDashboardHub/1.0 (field planning; contact: local)",
      Accept: "application/json",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Geocoder returned ${res.status}` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name?: string;
  }[];

  const results = data.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    label: r.display_name ?? `${r.lat}, ${r.lon}`,
  }));

  return NextResponse.json({ results });
}
