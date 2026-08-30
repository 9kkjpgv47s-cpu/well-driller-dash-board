"use client";

import { useEffect } from "react";

/**
 * Registers the Driller Hub service worker for offline/PWA support.
 * Mounted once in the root layout; no-op in dev (SW only helps production
 * where static assets are content-hashed and cacheable).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Silent fail — SW is a progressive enhancement, not critical path.
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
