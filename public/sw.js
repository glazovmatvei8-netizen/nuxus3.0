
const CACHE_NAME = 'nuxus-kernel-v1';
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
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        return caches.match('/');
      });
    })
  );
});

// Фоновая синхронизация (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('Nuxus Kernel: Background Sync Initiated');
  }
});

// Периодическая фоновая синхронизация (Periodic Background Sync)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'get-latest-chats') {
    console.log('Nuxus Kernel: Periodic Sync Initiated');
  }
});

// Push-уведомления (Placeholder)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nuxus', body: 'Новое уведомление' };
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
