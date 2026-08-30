import { cachedJson, jsonError } from "@/lib/api/responses";

const UPSTREAM = "https://api.rainviewer.com/public/weather-maps.json";

/** Proxies RainViewer’s public map index so the hub can load frames without browser CORS surprises. */
export async function GET() {
  const res = await fetch(UPSTREAM, { next: { revalidate: 60 } });
  if (!res.ok) {
    return jsonError("RainViewer map index unavailable", 502);
  }
  const data: unknown = await res.json();
  return cachedJson(data, 60);
}
