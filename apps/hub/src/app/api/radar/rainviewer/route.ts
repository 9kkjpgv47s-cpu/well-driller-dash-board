import { cachedJson, jsonError } from "@/lib/api/responses";
import { errorMessage, logError } from "@/lib/errors";

const UPSTREAM = "https://api.rainviewer.com/public/weather-maps.json";

/** Proxies RainViewer’s public map index so the hub can load frames without browser CORS surprises. */
export async function GET() {
  let data: unknown;
  try {
    const res = await fetch(UPSTREAM, { next: { revalidate: 60 } });
    if (!res.ok) {
      return jsonError(
        `RainViewer map index unavailable (HTTP ${res.status})`,
        502,
      );
    }
    data = await res.json();
  } catch (e) {
    logError("api/radar/rainviewer", e);
    return jsonError(
      `RainViewer map index unreachable — ${errorMessage(e, "network or parse failure")}.`,
      502,
    );
  }
  return cachedJson(data, 60);
}
