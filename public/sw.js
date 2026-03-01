
/**
 * Nuxus Service Worker v24.0.0
 * Обеспечивает работу уведомлений и оффлайн-режима для Android/iOS.
 */

const CACHE_NAME = 'nuxus-v24';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
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

// Слушатель пуш-уведомлений
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NuxusChat';
  const options = {
    body: data.body || 'Новое сообщение',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
