// Local CommonJS bundle (Indiana DNR HTML parser) — see vendor/dnr-report-local
import handler from "dnr-report-local";

type DnrRes = {
  _code?: number;
  setHeader: () => void;
  status: (c: number) => DnrRes;
  json: (b: unknown) => void;
  end: () => void;
};

const runHandler = handler as (
  req: { method: string; query: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (k: string, v: string) => void;
    status: (c: number) => DnrRes;
    json: (b: unknown) => void;
    end: () => void;
  },
) => Promise<void>;

export type DnrReportFetchResult = {
  status: number;
  /** `null` when the upstream handler ended the response with no body. */
  body: unknown | null;
};

/**
 * Drives the vendored DNR report handler with a promise shim, capturing its
 * status code and JSON body. Shared by `/api/dnr-report` and the MCP
 * `dnr_well_record` tool.
 */
export async function fetchDnrReport(
  refNo: string,
): Promise<DnrReportFetchResult> {
  const req = {
    method: "GET",
    query: { refNo },
  };

  return new Promise<DnrReportFetchResult>((resolve, reject) => {
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
        resolve({ status: res._code ?? 200, body });
      },
      end() {
        if (settled) return;
        settled = true;
        resolve({ status: res._code ?? 204, body: null });
      },
    };
    void runHandler(req, res).catch((e: Error) => {
      if (settled) return;
      settled = true;
      reject(e);
    });
  });
}
