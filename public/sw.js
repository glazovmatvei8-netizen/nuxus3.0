
/**
 * Nuxus PWA Service Worker v1.0
 * Обеспечивает работу приложения в режиме Standalone и оффлайн-кэширование.
 */

const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      return fetch(event.request);
    })
  );
});
