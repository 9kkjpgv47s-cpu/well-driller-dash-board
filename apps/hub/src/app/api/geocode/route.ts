import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { upstreamJsonHeaders } from "@/lib/http/upstream";

/**
 * Server-side forward geocode (Nominatim). Indiana jobsites — no browser CORS.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return jsonError("Query `q` must be at least 3 characters.", 400);
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, Indiana, USA`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString(), {
    headers: upstreamJsonHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return jsonError(`Geocoder returned ${res.status}`, 502);
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
