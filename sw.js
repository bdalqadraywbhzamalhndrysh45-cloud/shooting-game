const CACHE_NAME = "archery-range-3d-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./game3d.js",
  "./manifest.webmanifest",
  "./icons/archery.svg"
];
const THREE_MODULE = "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    try {
      const response = await fetch(THREE_MODULE, { mode: "cors" });
      if (response.ok) await cache.put(THREE_MODULE, response);
    } catch (error) {
      console.warn("Three.js will be cached after the first online load", error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.href === THREE_MODULE) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(THREE_MODULE);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(THREE_MODULE, response.clone());
      return response;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => {
      if (event.request.mode === "navigate") return caches.match("./index.html");
      return new Response("", { status: 503, statusText: "Offline" });
    });
  }));
});
