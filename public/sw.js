
// Nuxus Service Worker v25.3.0
const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/180/180'
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
