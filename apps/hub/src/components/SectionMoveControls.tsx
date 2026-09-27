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
        className="btn btn-ghost btn-sm"
        onClick={() => onMove(id, -1)}
      >
        Up
      </button>
      <button
        type="button"
        aria-label="Move section down"
        disabled={i < 0 || i >= order.length - 1}
        className="btn btn-ghost btn-sm"
        onClick={() => onMove(id, 1)}
      >
        Down
      </button>
    </div>
  );
}
