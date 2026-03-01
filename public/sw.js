/**
 * Nuxus Service Worker v24.0.0
 * Обеспечивает работу приложения в оффлайн-режиме и поддержку уведомлений на Android/iOS.
 */

const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus-prime-core-v5/192/192',
  'https://picsum.photos/seed/nuxus-prime-core-v5/512/512'
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

// Слушатель для push-уведомлений
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'NuxusChat', body: 'Новое сообщение' };
  const options = {
    body: data.body,
    icon: 'https://picsum.photos/seed/nuxus-prime-core-v5/192/192',
    badge: 'https://picsum.photos/seed/nuxus-prime-core-v5/192/192',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
