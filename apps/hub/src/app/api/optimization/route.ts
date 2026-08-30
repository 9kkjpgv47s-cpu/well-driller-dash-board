import { cachedJson, jsonError } from "@/lib/api/responses";
import { getDnrWellsFullCachedForApi } from "@/lib/dnr-wells-server-cache";
import { errorMessage, logError } from "@/lib/errors";
import {
  computeOptimizationFromWells,
  computeOptimizationMock,
  parseOptimizationSearchParams,
} from "@/lib/optimization";

export const runtime = "nodejs";
/** Must exceed getDnrWellsServerLoadTimeoutMs() on Vercel so mock fallback can respond. */
export const maxDuration = 15;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const input = parseOptimizationSearchParams(raw);
  if (!input) {
    return jsonError(
      "Missing or invalid query. Required: lat, lon, radiusMiles (or radius). Optional: priority=depth|yield|balanced.",
      400,
    );
  }

  let body;
  try {
    const wells = await getDnrWellsFullCachedForApi();
    body = computeOptimizationFromWells(input, wells);
  } catch (e) {
    logError("api/optimization", e);
    body = computeOptimizationMock(
      input,
      errorMessage(e, "Registry chunk load failed on the server."),
    );
  }

  return cachedJson(body, 60);
}
