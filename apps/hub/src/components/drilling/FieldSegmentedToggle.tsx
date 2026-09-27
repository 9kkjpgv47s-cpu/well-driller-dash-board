"use client";

import type { ReactNode } from "react";

/**
 * Field-mode segmented control + icon-only chip used across Driller Hub panels.
 * 44px min touch targets — single / dexterity-friendly controls.
 */
export const FIELD_TOOLBAR_BTN = "btn btn-ghost";

export type FieldToggleOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Optional leading icon — arrow / glyph only, keep small. */
  icon?: ReactNode;
  title?: string;
  ariaLabel?: string;
};

export function FieldSegmentedToggle<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  /** `md` = 44px touch height (field app), `sm` = compact table/toolbar rows. */
  size = "md",
}: {
  ariaLabel: string;
  options: readonly FieldToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "md" | "sm";
}) {
  const isSm = size === "sm";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={isSm ? "seg seg-sm" : "seg"}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon ? <span className="seg-icon">{opt.icon}</span> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
