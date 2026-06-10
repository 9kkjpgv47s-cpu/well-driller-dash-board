import { NextResponse } from "next/server";
import { getDnrWellsServerCached } from "@/lib/dnr-wells-server-cache";
import {
  computeOptimizationFromWells,
  computeOptimizationMock,
  parseOptimizationSearchParams,
} from "@/lib/optimization";

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
        error:
          "Missing or invalid query. Required: lat, lon, radiusMiles (or radius). Optional: priority=depth|yield|balanced.",
      },
      { status: 400 },
    );
  }

  let body;
  try {
    const wells = await getDnrWellsServerCached();
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
