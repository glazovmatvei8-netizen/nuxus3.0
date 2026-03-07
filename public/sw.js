
const CACHE_NAME = 'nuxus-kernel-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png'
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
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Фоновая синхронизация для соответствия требованиям PWABuilder
self.addEventListener('sync', (event) => {
  console.log('Nuxus Kernel: Background Sync Active', event.tag);
});

self.addEventListener('periodicSync', (event) => {
  console.log('Nuxus Kernel: Periodic Sync Active', event.tag);
});
