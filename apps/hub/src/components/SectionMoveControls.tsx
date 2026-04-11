"use client";

type Props<S extends string> = {
  id: S;
  order: readonly S[];
  onMove: (id: S, delta: -1 | 1) => void;
};

/** Reusable Up / Down controls for reordering stacked workspace sections. */
export function SectionMoveControls<S extends string>({
  id,
  order,
  onMove,
}: Props<S>) {
  const i = order.indexOf(id);
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        aria-label="Move section up"
        disabled={i <= 0}
        className="rounded border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-muted)] disabled:opacity-40"
        onClick={() => onMove(id, -1)}
      >
        Up
      </button>
      <button
        type="button"
        aria-label="Move section down"
        disabled={i < 0 || i >= order.length - 1}
        className="rounded border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-muted)] disabled:opacity-40"
        onClick={() => onMove(id, 1)}
      >
        Down
      </button>
    </div>
  );
}
