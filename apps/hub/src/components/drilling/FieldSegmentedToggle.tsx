"use client";

/** Shared toolbar button dimensions (matches segmented toggle segments). */
export const FIELD_TOOLBAR_BTN =
  "inline-flex min-h-[42px] min-w-[8.5rem] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  ariaLabel: string;
  size?: "md" | "sm";
};

export function FieldSegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
}: Props<T>) {
  const shell =
    size === "md"
      ? "inline-flex rounded-xl border border-zinc-200 bg-zinc-100/90 p-1 dark:border-zinc-600 dark:bg-zinc-900/60"
      : "inline-flex rounded-lg border border-zinc-200 bg-zinc-100/90 p-0.5 dark:border-zinc-600 dark:bg-zinc-900/60";
  const btn =
    size === "md"
      ? FIELD_TOOLBAR_BTN.replace(" disabled:opacity-50", "")
      : "min-w-[5.25rem] rounded-md px-3 py-1.5 text-xs font-semibold transition";
  const active =
    "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600";
  const idle =
    "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

  return (
    <div role="tablist" aria-label={ariaLabel} className={shell}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`${btn} ${value === opt.value ? active : idle}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
