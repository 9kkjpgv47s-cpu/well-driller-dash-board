/**
 * Driller Hub Service Worker
 *
 * Caching strategy:
 * - App shell (HTML/JS/CSS): stale-while-revalidate — instant load from cache,
 *   update in background
 * - DNR chunk CSVs (.csv.gz): cache-first — immutable ETL artifacts, never
 *   change in place. Once cached, served instantly with no network round-trip.
 * - API routes: network-first, fall back to cache — keeps data fresh when
 *   online, works offline with last-known response.
 * - Weather/geocode APIs: network-only — external data, no offline value.
 */

const SW_VERSION = "driller-hub-v1";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const CHUNK_CACHE = `${SW_VERSION}-chunks`;
const API_CACHE = `${SW_VERSION}-api`;

// App shell assets to pre-cache on install (Next.js static + fonts).
const SHELL_ASSETS = [
  "/",
  "/favicon.ico",
];

// Routes that are safe to cache (our own API endpoints).
const CACHEABLE_API_PATTERNS = [
  /^\/api\/wells-nearby/,
  /^\/api\/area-insights/,
  /^\/api\/optimization/,
];

// Routes that should always go to network (external/real-time data).
const NETWORK_ONLY_PATTERNS = [
  /^\/api\/weather/,
  /^\/api\/geocode/,
  /^\/api\/elevation/,
  /^\/api\/radar/,
  /^\/api\/dnr-report/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(SW_VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests on same origin
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // 1. DNR chunk files — cache-first (immutable ETL artifacts)
  if (url.pathname.match(/\/well-viewer\/dnr_wells_.*chunk_.*\.csv\.gz$/)) {
    event.respondWith(cacheFirst(req, CHUNK_CACHE));
    return;
  }

  // 2. Next.js static assets — cache-first (content-hashed, immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // 3. Cacheable API routes — network-first with cache fallback
  if (CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirstWithCache(req, API_CACHE));
    return;
  }

  // 5. Network-only APIs — pass through
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname))) {
    return;
  }

  // 6. Navigation requests (HTML pages) — stale-while-revalidate
  if (req.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }

  // 7. Everything else — try cache, fall back to network
  event.respondWith(cacheFirst(req, SHELL_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithCache(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    return cached || new Response(
      JSON.stringify({ error: "Offline — no cached response", fallback: "client-chunks" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
