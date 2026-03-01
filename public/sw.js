
/**
 * Nuxus Core Service Worker v5.0
 * Обеспечивает работу Android APK и фоновые уведомления.
 */

const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/192/192',
  'https://picsum.photos/seed/nuxus/512/512'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Для Android APK важно, чтобы SW обрабатывал запросы
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      return fetch(event.request);
    })
  );
});

// Обработка клика по уведомлению в фоне
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
