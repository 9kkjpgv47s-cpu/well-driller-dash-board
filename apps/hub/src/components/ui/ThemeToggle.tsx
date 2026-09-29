"use client";

import { useEffect, useState } from "react";

const KEY = "cj-theme";
const NEXT: Record<string, string> = { light: "dark", dark: "light" };

/** Cycles light → dark; the glyph morph is pure CSS (.tt-* rules). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "light");
  }, []);

  const onClick = () => {
    const doc = document.documentElement;
    const cur = doc.dataset.theme && NEXT[doc.dataset.theme] ? doc.dataset.theme : "light";
    const next = NEXT[cur];
    doc.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  };

  const label = theme ? `Theme: ${theme} — switch to ${NEXT[theme]}` : "Switch theme";
  return (
    <button type="button" className="theme-toggle" onClick={onClick} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle className="tt-sun" cx="12" cy="12" r="4" />
        <g className="tt-rays">
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </g>
        <path className="tt-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    </button>
  );
}
