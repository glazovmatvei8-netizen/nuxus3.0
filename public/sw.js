
// Nuxus Core Service Worker v24.1.0
const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/192/192',
  'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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
