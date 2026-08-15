import { NextResponse } from "next/server";
import { getDnrWellsServerCachedForApi } from "@/lib/dnr-wells-server-cache";
import {
  computeOptimizationFromWells,
  computeOptimizationMock,
  MAX_OPTIMIZATION_RADIUS_MILES,
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
    return NextResponse.json(
      {
        error: `Missing or invalid query. Required: lat in [-90, 90], lon in [-180, 180], radiusMiles (or radius) in (0, ${MAX_OPTIMIZATION_RADIUS_MILES}]. Optional: priority=depth|yield|balanced.`,
      },
      { status: 400 },
    );
  }

  let body;
  try {
    const wells = await getDnrWellsServerCachedForApi();
    body = computeOptimizationFromWells(input, wells);
  } catch {
    body = computeOptimizationMock(input);
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
