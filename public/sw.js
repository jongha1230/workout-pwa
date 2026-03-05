const CACHE_VERSION = "v2";
const CORE_CACHE_NAME = `workout-pwa-core-${CACHE_VERSION}`;
const PAGE_CACHE_NAME = `workout-pwa-pages-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `workout-pwa-static-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";
const SESSION_SHELL_FALLBACK_URL =
  "/session/11111111-1111-1111-1111-111111111111";

const PRECACHE_URLS = [
  "/",
  "/routines",
  OFFLINE_URL,
  SESSION_SHELL_FALLBACK_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const CACHE_NAMES = [CORE_CACHE_NAME, PAGE_CACHE_NAME, STATIC_CACHE_NAME];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
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
            .filter((key) => !CACHE_NAMES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const getOfflineFallbackResponse = async (request) => {
  const cachedPage = await caches.match(request, { ignoreSearch: false });
  if (cachedPage) {
    return cachedPage;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.pathname.startsWith("/session/")) {
    const cachedSessionPage = await caches.match(requestUrl.pathname, {
      ignoreSearch: true,
    });
    if (cachedSessionPage) {
      return cachedSessionPage;
    }

    const cachedSessionShell = await caches.match(SESSION_SHELL_FALLBACK_URL, {
      ignoreSearch: true,
    });
    if (cachedSessionShell) {
      return cachedSessionShell;
    }
  }

  const cachedOfflinePage = await caches.match(OFFLINE_URL);
  return cachedOfflinePage || Response.error();
};

const handleNavigateRequest = async (request) => {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse?.ok) {
      const pageCache = await caches.open(PAGE_CACHE_NAME);
      await pageCache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    return getOfflineFallbackResponse(request);
  }
};

const handleStaticAssetRequest = async (request) => {
  const staticCache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await staticCache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse?.ok) {
        void staticCache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    void networkPromise;
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  return networkResponse || Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigateRequest(request));
    return;
  }

  const url = new URL(request.url);
  const isStaticAssetRequest =
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/");

  if (isStaticAssetRequest) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});
