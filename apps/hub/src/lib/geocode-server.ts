import { upstreamJsonHeaders } from "@/lib/http/upstream";

export type GeocodeIndianaResult = {
  lat: number;
  lon: number;
  label: string;
};

/**
 * Server-side forward geocode (Nominatim), Indiana-biased. Shared by
 * `/api/geocode` and the MCP `geocode_address` tool.
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * Throws `Error("Geocoder returned <status>")` on a non-OK upstream response.
 */
export async function geocodeIndiana(
  q: string,
): Promise<GeocodeIndianaResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, Indiana, USA`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString(), {
    headers: upstreamJsonHeaders(),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Geocoder returned ${res.status}`);
  }

  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name?: string;
  }[];

  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    label: r.display_name ?? `${r.lat}, ${r.lon}`,
  }));
}
