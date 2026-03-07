
const CACHE_NAME = 'nuxus-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.webmanifest',
  'https://picsum.photos/seed/nuxus-prime-core-v5/192/192',
  'https://picsum.photos/seed/nuxus-prime-core-v5/512/512'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
