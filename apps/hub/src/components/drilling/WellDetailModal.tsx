"use client";

import { useEffect, useRef, useState } from "react";
import type { WellRecord } from "@/lib/area-well-analytics";
import { getLithLayers } from "@/lib/area-well-analytics";
import { fetchJsonOrFallback } from "@/lib/http/fetch-json";
import { resolveWellRefNo } from "@/lib/well-identity";
import { getWellDisplayDepthFtViewer } from "@/lib/viewer-well-map";
import { Icon } from "@/components/ui/Icon";

type DnrApi = {
  loading?: boolean;
  testRateGpm?: string;
  bailTestRateGpm?: string;
  staticWaterFt?: string;
  testMethod?: string;
  drillRigType?: string;
  lithology?: { top?: unknown; bottom?: unknown; formation?: unknown }[];
};

function firstVal(w: WellRecord, keys: string[]): string {
  for (const k of keys) {
    const v = w[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "—";
}

function lithoFormation(layer: unknown): string {
  if (!layer || typeof layer !== "object") return "";
  const o = layer as Record<string, unknown>;
  return String(
    o.formation ?? o.Formation ?? o.material ?? o.strata ?? "",
  ).trim();
}

function parseGpmNumber(raw: string | null | undefined): number | null {
  if (raw == null || raw === "—") return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

function formatGpmNum(n: number): string {
  const s =
    Math.abs(n - Math.round(n)) < 1e-4 ? String(Math.round(n)) : String(n);
  return `${s} gpm`;
}

function mergeDnr(base: DnrApi, api: DnrApi): DnrApi {
  const o = { ...base };
  if (api.testRateGpm) o.testRateGpm = api.testRateGpm;
  if (api.bailTestRateGpm) o.bailTestRateGpm = api.bailTestRateGpm;
  if (api.staticWaterFt) o.staticWaterFt = api.staticWaterFt;
  if (api.testMethod) o.testMethod = api.testMethod;
  if (api.drillRigType) o.drillRigType = api.drillRigType;
  if ((!o.lithology || !o.lithology.length) && api.lithology?.length)
    o.lithology = api.lithology.slice();
  return o;
}

type Props = {
  well: WellRecord | null;
  onClose: () => void;
  onAddToJob: (w: WellRecord) => void;
};

export function WellDetailModal({ well, onClose, onAddToJob }: Props) {
  const [dnr, setDnr] = useState<DnrApi>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape-to-close + focus trap while the dialog is open; restores the
  // previously focused element (usually the map marker trigger) on close.
  useEffect(() => {
    if (!well) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [well]);

  useEffect(() => {
    if (!well) {
      setDnr({});
      return;
    }
    const refNo = String(resolveWellRefNo(well) ?? "").replace(/\.0+$/, "").trim();
    if (!refNo) {
      setDnr({ loading: false });
      return;
    }
    const hasLithCsv = (() => {
      try {
        const j = getLithLayers(well);
        return j.length > 0;
      } catch {
        return false;
      }
    })();

    setDnr({ loading: true });
    const api = `/api/dnr-report?refNo=${encodeURIComponent(refNo)}`;

    /** Wells without CSV lithology fall back to an empty lithology list. */
    const base: DnrApi = hasLithCsv ? {} : { lithology: [] };

    fetchJsonOrFallback<DnrApi>(api, {})
      .then((apiDnr) => {
        setDnr({ ...mergeDnr(base, apiDnr), loading: false });
      })
      .catch(() => setDnr({ ...base, loading: false }));
  }, [well]);

  if (!well) return null;

  const depthFt =
    getWellDisplayDepthFtViewer(well) != null
      ? String(getWellDisplayDepthFtViewer(well))
      : "—";

  const logRows = (() => {
    const fromWell = getLithLayers(well);
    if (fromWell.length) return fromWell;
    if (dnr.lithology?.length) return dnr.lithology;
    return [];
  })();

  const pumpRaw = firstVal(well, [
    "pump_rate",
    "gpm",
    "yield_gpm",
    "yield",
    "test_yield",
    "gallons_per_minute",
    "pump_capacity",
  ]);
  const bailRaw = firstVal(well, [
    "bailer_rate",
    "bail_rate",
    "dblbailerrt",
    "bailer_rt",
  ]);
  const regPump = parseGpmNumber(pumpRaw === "—" ? null : pumpRaw);
  const regBail = parseGpmNumber(bailRaw === "—" ? null : bailRaw);
  const apiPump = parseGpmNumber(dnr.testRateGpm);
  const apiBail = parseGpmNumber(dnr.bailTestRateGpm);
  const pumpN = apiPump != null ? apiPump : regPump;
  const bailN = apiBail != null ? apiBail : regBail;
  let gpmLine = "—";
  if (pumpN != null && bailN != null) {
    gpmLine =
      Math.abs(pumpN - bailN) < 0.021
        ? formatGpmNum(pumpN)
        : `Pump/test: ${formatGpmNum(pumpN)} · Bailer: ${formatGpmNum(bailN)}`;
  } else if (pumpN != null) gpmLine = formatGpmNum(pumpN);
  else if (bailN != null) gpmLine = `Bailer: ${formatGpmNum(bailN)}`;
  if (dnr.staticWaterFt) {
    if (gpmLine !== "—") gpmLine += ` · Static WL: ${dnr.staticWaterFt} ft`;
    else gpmLine = `Static water: ${dnr.staticWaterFt} ft`;
  }
  if (dnr.loading && pumpN == null && bailN == null && gpmLine === "—")
    gpmLine = "Loading from DNR…";

  const screenD = firstVal(well, ["screen_diam", "screen_diameter"]);
  const screenL = firstVal(well, ["screen_length"]);
  let screenSize = "—";
  if (screenD !== "—" && screenL !== "—")
    screenSize = `${screenD} in × ${screenL} ft`;
  else if (screenD !== "—") screenSize = `${screenD} in`;
  else if (screenL !== "—") screenSize = `${screenL} ft`;

  let testMethod = firstVal(well, [
    "test_method",
    "method_of_testing",
    "pump_test_method",
    "test_type",
  ]);
  if (dnr.testMethod) testMethod = dnr.testMethod;
  if (testMethod === "—" && (pumpN != null || bailN != null)) {
    if (pumpN != null && bailN != null) {
      testMethod =
        Math.abs(pumpN - bailN) < 0.021
          ? "Pumping and bailer rates listed; same value for both."
          : "Pumping test and bailer test.";
    } else if (pumpN != null)
      testMethod = "Pumping / capacity test.";
    else testMethod = "Bailer test.";
  }

  let drillRig = firstVal(well, [
    "drill_rig_type",
    "drill_rig",
    "rig_type",
    "drill_type",
    "drilling_method",
    "rig",
  ]);
  if (dnr.drillRigType) drillRig = dnr.drillRigType;
  const resolvedRefNo = resolveWellRefNo(well);

  const rep =
    String(well.report ?? "").trim() ||
    (resolvedRefNo
      ? `https://secure.in.gov/apps/dnr/water/dnr_waterwell?refNo=${resolvedRefNo}&_from=SUMMARY&_action=Details`
      : "");

  return (
    <div
      className="modal-backdrop z-[2000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="well-modal-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="modal-dialog w-full p-0"
        style={{ width: "min(42rem, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head sticky top-0 z-10 mb-0 border-b border-line bg-surface px-5 py-4">
          <h2 id="well-modal-title">
            {String(well.id ?? well.refno ?? "Well")}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close well details"
            className="btn btn-ghost btn-sm"
          >
            <Icon name="close" />
            Close
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm text-ink-2">
          <div>
            <strong>Well depth (ft):</strong> {depthFt}
          </div>
          <div>
            <strong className="mb-1 block">
              Material drilled through — Well Log (Top, Bottom, Formation)
            </strong>
            {logRows.length > 0 ? (
              <div
                className="mt-1 max-h-72 overflow-auto rounded-lg border border-line"
                tabIndex={0}
              >
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="sticky top-0 bg-bg-2">
                      <th className="border-b border-line p-2 text-left">
                        Top
                      </th>
                      <th className="border-b border-line p-2 text-left">
                        Bottom
                      </th>
                      <th className="border-b border-line p-2 text-left">
                        Formation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-line"
                      >
                        <td className="p-2 align-top">
                          {String((row as Record<string, unknown>).top ?? "")}
                        </td>
                        <td className="p-2 align-top">
                          {String((row as Record<string, unknown>).bottom ?? "")}
                        </td>
                        <td className="p-2 align-top">
                          {lithoFormation(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : dnr.loading ? (
              <span className="text-ink-4">Loading Well Log…</span>
            ) : (
              <div className="callout is-warn p-3 text-xs">
                <div className="font-semibold">
                  Well Log rows aren&apos;t in this chunk row.
                </div>
                <p className="mt-1">
                  The hub loads registry chunks; optional DNR API may add
                  intervals above when available.
                </p>
                {rep ? (
                  <a
                    href={rep}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-accent-ink underline"
                  >
                    Open official DNR record
                  </a>
                ) : null}
              </div>
            )}
          </div>
          <div>
            <strong>Screen size:</strong> {screenSize}
          </div>
          <div>
            <strong>Yield / test rates:</strong> {gpmLine}
          </div>
          <div>
            <strong>Method of testing:</strong> {testMethod}
          </div>
          <div>
            <strong>Drill rig type:</strong> {drillRig}
          </div>
          {rep ? (
            <a
              href={rep}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-accent-ink underline"
            >
              Official DNR well record
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line p-5">
          <button
            type="button"
            onClick={() => onAddToJob(well)}
            className="btn btn-accent"
          >
            Add to job queue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
