import { useEffect } from "react";

/**
 * Locks document scroll while `active` (modal open). position:fixed on body
 * stops background scroll/chaining on touch devices; the negative top offset
 * keeps the visual position, restored on cleanup. Same model the standalone
 * well viewer uses (cjLockBodyScroll/cjUnlockBodyScroll).
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const y = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    Object.assign(body.style, {
      position: "fixed",
      top: `-${y}px`,
      left: "0",
      right: "0",
      width: "100%",
      overflow: "hidden",
    });
    return () => {
      Object.assign(body.style, prev);
      const sb = documentElement.style.scrollBehavior;
      documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      documentElement.style.scrollBehavior = sb;
    };
  }, [active]);
}
