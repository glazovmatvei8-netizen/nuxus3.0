const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/32/32'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});