declare module "dnr-report-local" {
  const handler: (
    req: { method: string; query: Record<string, string | string[] | undefined> },
    res: {
      setHeader: (k: string, v: string) => void;
      status: (c: number) => unknown;
      json: (b: unknown) => void;
      end: () => void;
    },
  ) => Promise<void>;
  export default handler;
}
