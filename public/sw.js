/*
 * Service worker for the hosted atlas.
 *
 * Deliberately conservative, because a bad service worker is worse than none:
 * it can pin a stale application that is hard to shift. The rules are
 *
 *   - navigations go to the network first, so an online reader never gets a
 *     stale app, and fall back to the cache only when the network fails;
 *   - build assets are content-hashed, so they are cache-first and immutable;
 *   - nothing cross-origin is touched at all. The cloud forecast, the DSS2
 *     survey images and the ESA/NASA photographs pass straight through. A
 *     forecast must never be served from a stale cache, and the survey images
 *     are large and somebody else's bandwidth;
 *   - skipWaiting is NOT called. Old caches are cleared on activate, and
 *     activating early would delete assets from under a page that is still
 *     running. The new worker takes over on the next visit instead.
 *
 * It is not included in the portable release: service workers require an
 * http(s) origin, and that build is opened straight from a file.
 */
const VERSION = "v1";
const SHELL = `atlas-shell-${VERSION}`;
const ASSETS = `atlas-assets-${VERSION}`;
const KEEP = new Set([SHELL, ASSETS]);

const SHELL_URLS = ["/", "/morfologia", "/favicon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Individually, so one missing URL cannot fail the whole installation.
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(new Request(url))));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => (KEEP.has(name) ? null : caches.delete(name))));
      await self.clients.claim();
    })(),
  );
});

/** Content-hashed build output, safe to treat as immutable. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.[0-9a-f]{8,}\.(js|css|woff2?|png|svg|jpg|webp)$/i.test(url.pathname)
  );
}

function isStaticish(url) {
  return /\.(js|css|woff2?|png|svg|jpg|jpeg|webp|ico|txt|json)$/i.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  // Only store complete, same-origin successes. A 206 or an opaque response
  // would poison the cache.
  if (response.ok && response.type === "basic") cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = (await cache.match(request)) || (await cache.match("/"));
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  // Range requests must not be answered from the cache.
  if (request.headers.has("range")) return;

  const url = new URL(request.url);
  // Everything cross-origin is left entirely alone.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL));
    return;
  }
  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (isStaticish(url)) {
    event.respondWith(networkFirst(request, ASSETS));
  }
});
