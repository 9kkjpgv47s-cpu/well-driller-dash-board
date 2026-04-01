import { NextResponse } from "next/server";
import {
  computeOptimization,
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

  const body = computeOptimization(input);

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
