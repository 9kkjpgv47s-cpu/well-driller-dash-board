import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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

  const response = await new Promise<NextResponse>((resolve, reject) => {
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
        resolve(NextResponse.json(body, { status: code }));
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

  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}
