/* Service worker, generated at build time by vite-plugins/serviceWorker.ts.
 * Precaches the whole app so it opens offline. A new build installs in the background and
 * takes over when the user taps "Reload" (the page posts SKIP_WAITING).
 * Google Sheet API calls are cross-origin and always go straight to the network.
 */
const CACHE_NAME = "ledger-app-__CACHE_VERSION__";
const PRECACHE = __PRECACHE_LIST__;
const INDEX_URL = "./index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ledger-") && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ignoreVary: module scripts send an Origin header; a server's "Vary: Origin" must not cause a miss offline.
const MATCH = { ignoreSearch: true, ignoreVary: true };

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(caches.match(INDEX_URL, MATCH).then((cached) => cached || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, MATCH).then((cached) => cached || fetch(req)));
});
