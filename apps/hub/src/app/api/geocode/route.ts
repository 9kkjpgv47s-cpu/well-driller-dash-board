import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { geocodeIndiana } from "@/lib/geocode-server";

/**
 * Server-side forward geocode (Nominatim). Indiana jobsites — no browser CORS.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3 || q.length > 200) {
    return jsonError("Query `q` must be 3–200 characters.", 400);
  }

  let results;
  try {
    results = await geocodeIndiana(q);
  } catch (e) {
    // Non-OK Nominatim status → 502 with the same message as before.
    if (e instanceof Error && e.message.startsWith("Geocoder returned ")) {
      return jsonError(e.message, 502);
    }
    throw e;
  }

  return NextResponse.json({ results });
}
