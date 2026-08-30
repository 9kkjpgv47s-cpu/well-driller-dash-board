import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorMessage, logError, logWarning } from "@/lib/errors";
// Local CommonJS bundle (Indiana DNR HTML parser) — see vendor/dnr-report-local
import handler from "dnr-report-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const runHandler = handler as (
  req: { method: string; query: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (k: string, v: string) => void;
    status: (c: number) => DnrRes;
    json: (b: unknown) => void;
    end: () => void;
  },
) => Promise<void>;

type DnrRes = {
  _code?: number;
  setHeader: () => void;
  status: (c: number) => DnrRes;
  json: (b: unknown) => void;
  end: () => void;
};

export async function GET(request: NextRequest) {
  const refNo =
    request.nextUrl.searchParams.get("refNo") ??
    request.nextUrl.searchParams.get("refno");

  const req = {
    method: "GET",
    query: { refNo: refNo ?? "" },
  };

  let response: NextResponse;
  try {
    response = await runVendorHandler(req);
  } catch (e) {
    logError("api/dnr-report", e);
    response = NextResponse.json(
      {
        error: `DNR report lookup failed — ${errorMessage(e, "upstream parser error")}.`,
        refNo: refNo ?? null,
      },
      { status: 502 },
    );
  }

  const allowOrigin = allowedOrigin(request.headers.get("origin"));
  if (allowOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowOrigin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/**
 * The vendor bundle answers its own upstream failures with terse bodies like
 * `{ error: "fetch failed" }`; expand them so the modal alert says what broke.
 */
function describeVendorError(body: unknown, code: number): unknown {
  if (code < 400) return body;
  const raw =
    body && typeof body === "object"
      ? (body as { error?: unknown }).error
      : undefined;
  const detail =
    typeof raw === "string" && raw.trim() ? raw.trim() : `HTTP ${code}`;
  logWarning("api/dnr-report", `vendor handler returned ${code}: ${detail}`);
  return {
    ...(body && typeof body === "object" ? body : {}),
    error: `DNR report lookup failed — ${detail}.`,
  };
}

function runVendorHandler(req: {
  method: string;
  query: Record<string, string | string[] | undefined>;
}): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve, reject) => {
    let settled = false;
    const res: DnrRes = {
      setHeader() {},
      status(code: number) {
        res._code = code;
        return res;
      },
      json(body: unknown) {
        if (settled) return;
        settled = true;
        const code = res._code ?? 200;
        resolve(NextResponse.json(describeVendorError(body, code), { status: code }));
      },
      end() {
        if (settled) return;
        settled = true;
        const code = res._code ?? 204;
        resolve(new NextResponse(null, { status: code }));
      },
    };
    void runHandler(req, res).catch((e: Error) => {
      if (settled) return;
      settled = true;
      reject(e);
    });
  });
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
