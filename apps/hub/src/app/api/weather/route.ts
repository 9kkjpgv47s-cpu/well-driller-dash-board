import { cachedJson, jsonError } from "@/lib/api/responses";
import { INVALID_LAT_LON_ERROR, isValidLatLon } from "@/lib/api/geo-query";
import { getWeatherBundle } from "@/lib/weather/bundle";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (!isValidLatLon(lat, lon)) {
    return jsonError(INVALID_LAT_LON_ERROR, 400);
  }

  const result = await getWeatherBundle(
    lat,
    lon,
    searchParams.get("timezone"),
    searchParams.get("date"),
  );

  if (!result.ok) {
    return jsonError(result.error, 502);
  }

  return cachedJson(result.response, 900);
}
