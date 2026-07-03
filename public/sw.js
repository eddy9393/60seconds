const CACHE = "60sfm-v7";

// Alleen echt statische, ongeversieerde bestanden precachen. Next.js
// build-chunks (/_next/static/...) hebben al eeuwige/immutable cache-headers
// van Next.js zelf — die NIET zelf cachen, want de bestandsnamen veranderen
// bij elke deploy en een oude cache zou dan naar niet meer bestaande
// bestanden verwijzen (404's na een nieuwe deploy).
const PRECACHE = ["/logo.png", "/coin.webp", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase, audio-streams en alle Next.js build-assets altijd via het
  // netwerk — nooit zelf cachen (voorkomt stale-chunk 404's na een deploy).
  if (
    url.hostname.includes("supabase") ||
    request.destination === "audio" ||
    url.pathname.startsWith("/_next/")
  ) {
    return;
  }

  // Navigatie (pagina's): altijd netwerk. Geen cache-fallback meer — een
  // oude gecachte pagina kan naar chunk-bestanden verwijzen die na een
  // nieuwe deploy niet meer bestaan.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // Alleen de expliciet geprecachete, ongeversioneerde assets: cache-first.
  if (PRECACHE.some((path) => url.pathname === path)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  }
});
