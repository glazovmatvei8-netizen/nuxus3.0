
const CACHE_NAME = 'nuxus-ghost-v0.54.5';
const OFFLINE_URL = '/';

const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  'https://picsum.photos/seed/nuxus/180/180',
  'https://picsum.photos/seed/nuxus/32/32'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        if (event.request.url.startsWith('http') && fetchResponse.status === 200) {
          const cacheCopy = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Return empty response or specific fallback for blocked assets
      return new Response('', { status: 408, statusText: 'Ghost Timeout' });
    })
  );
});
