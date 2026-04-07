"use client";

import { useCallback, useMemo, useState } from "react";
import { parseDispatchEmail } from "@/lib/dispatch-parse";
import type { DispatchParseResult } from "@/lib/dispatch-parse";
import { JobBriefView } from "@/components/JobBriefView";

const EXAMPLE = `Dispatch
4/6 8:00 AM
Megan Despain
Near 7935 Private Road 435 West, Edinburgh, IN 46124 USA
Foundation phase as of 3/30

39.407951,-85.862947

1/2 HP
180ft off drive
Back fill is around the flag but we can access it

Use coordinates address for getting to job site

(812) 350-0851`;

export function DrillerBriefApp() {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<DispatchParseResult | null>(null);

  const generate = useCallback(() => {
    setParsed(parseDispatchEmail(raw));
  }, [raw]);

  const fillExample = useCallback(() => {
    setRaw(EXAMPLE);
    setParsed(parseDispatchEmail(EXAMPLE));
  }, []);

  const brief = useMemo(() => {
    if (!parsed) return null;
    return <JobBriefView parsed={parsed} />;
  }, [parsed]);

  return (
    <div className="space-y-10">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Dispatch input
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              Paste the body of your dispatch email (or any text that includes
              an address and/or latitude and longitude
              ). We extract location heuristically — no API keys required for
              this MVP.
            </p>
          </div>
          <button type="button" onClick={fillExample} className="btn-ghost text-sm">
            Load example
          </button>
        </div>

        <label className="mt-6 block">
          <span className="sr-only">Dispatch text</span>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste dispatch email here…"
            rows={12}
            className="input-field min-h-[200px] resize-y font-mono text-sm leading-relaxed"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={generate} className="btn-primary">
            Generate job brief
          </button>
        </div>

        <details className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-[var(--foreground)]">
            Tips for reliable parsing
          </summary>
          <ul className="mt-3 list-inside list-disc space-y-2 text-[var(--muted)]">
            <li>
              Coordinates can be tight on the comma:{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                39.407951,-85.862947
              </code>
            </li>
            <li>
              Addresses can start with{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Near …
              </code>{" "}
              or include{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Private Road
              </code>
              .
            </li>
            <li>
              Or label them:{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Lat: 39.97 Lon: -86.12
              </code>
            </li>
            <li>
              For address-only pastes, include a line like{" "}
              <code className="rounded bg-[var(--surface-solid)] px-1 py-0.5 font-mono text-xs">
                Address: 123 Main St, City, ST 12345
              </code>{" "}
              — mock wells then use a stub point until geocoding is enabled.
            </li>
          </ul>
        </details>
      </section>

      {brief}
    </div>
  );
}
