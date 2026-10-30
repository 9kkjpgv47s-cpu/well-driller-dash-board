import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchDnrReport } from "@/lib/dnr-report-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const refNo =
    request.nextUrl.searchParams.get("refNo") ??
    request.nextUrl.searchParams.get("refno");

  const { status, body } = await fetchDnrReport(refNo ?? "");
  const response =
    body === null
      ? new NextResponse(null, { status })
      : NextResponse.json(body, { status });

  const allowOrigin = allowedOrigin(request.headers.get("origin"));
  if (allowOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowOrigin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/**
 * Same-origin callers need no CORS header at all; extra origins (e.g. a
 * separately hosted copy of the static well viewer) must be listed in
 * DNR_REPORT_ALLOWED_ORIGINS as a comma-separated allowlist.
 */
function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowlist = (process.env.DNR_REPORT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(origin) ? origin : null;
}
