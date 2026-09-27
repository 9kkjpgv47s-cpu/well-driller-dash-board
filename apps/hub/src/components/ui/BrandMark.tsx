/** C&J BrandMark — yellow square behind, red square with "&" notch. */
export function BrandMark({ className = "cj-brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="5.4" width="32" height="32" fill="var(--accent-2)" stroke="#111" strokeWidth="0.7" />
      <rect x="3.8" y="3.8" width="22.9" height="22.9" fill="var(--accent)" stroke="#111" strokeWidth="0.7" />
      <rect x="14.2" y="10.9" width="12.5" height="8.2" fill="#fff" stroke="#111" strokeWidth="0.6" />
      <text x="20.45" y="15" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="8" fill="#111">&amp;</text>
    </svg>
  );
}
