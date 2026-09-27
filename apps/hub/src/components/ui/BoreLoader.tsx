import { BrandMark } from "./BrandMark";

/** C&J bore loader — a 1px bore line drills past depth ticks on a 1.6s loop. */
export function BoreLoader({ status = "Drilling", className = "" }: { status?: string; className?: string }) {
  return (
    <div className={`cj-bore${className ? ` ${className}` : ""}`} role="status" aria-live="polite">
      <BrandMark className="cj-bore__mark" />
      <div className="cj-bore__track" aria-hidden="true">
        <span className="cj-bore__tick">0 FT</span>
        <span className="cj-bore__tick">50 FT</span>
        <span className="cj-bore__tick">100 FT</span>
        <span className="cj-bore__line" />
        <span className="cj-bore__bit" />
      </div>
      <p className="cj-bore__status">{status}</p>
      <span className="visually-hidden">Loading</span>
    </div>
  );
}
