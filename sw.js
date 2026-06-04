/* ============================================================
   Chattlle — Service Worker
   - Pages (navigation): network-first (content stays fresh),
     falls back to cache then offline page when offline.
   - Static same-origin assets (css/js/img/fonts): stale-while-revalidate.
   - Cross-origin requests (Supabase API, Google, CDNs): never cached,
     always pass through to the network.
   Bump CACHE_VERSION whenever you want to force a refresh of caches.
   ============================================================ */
const CACHE_VERSION = "chattlle-v2";
const CORE = [
  "/",
  "/index.html",
  "/assets/styles.css",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // cache core files; ignore any that fail so install never breaks
      Promise.allSettled(CORE.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin; let Supabase/Google/other origins pass through.
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) -> network-first.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // Static same-origin assets -> stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
