const CACHE = "60sfm-v6";

// Bestanden die altijd offline beschikbaar zijn. Next.js build-assets hebben
// gehashte bestandsnamen, dus die cachen we runtime (zie de fetch-handler
// hieronder) in plaats van hier hard te coderen.
const PRECACHE = ["/", "/logo.png", "/coin.webp", "/icons/icon-192.png"];

// Installatie: precache de kern-assets
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

// Activatie: verwijder oude caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch: network-first voor API/audio, cache-first voor assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase en audio-streams altijd via netwerk — nooit cachen
  if (url.hostname.includes("supabase") || request.destination === "audio") {
    return;
  }

  // Navigatieverzoeken (pagina's): network-first met cache-fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Statische assets (CSS, JS, afbeeldingen): cache-first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
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
