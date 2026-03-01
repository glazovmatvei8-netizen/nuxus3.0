
/**
 * Nuxus Service Worker v1.0.0
 * Обеспечивает работу PWA и фоновых уведомлений.
 */

const CACHE_NAME = 'nuxus-cache-v1';
const OFFLINE_URL = '/';

// Базовое кэширование для соответствия стандартам PWA
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // На Android Chrome требует обработчик fetch для разрешения установки
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Слушатель для входящих PUSH-уведомлений (будет использоваться сервером)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://picsum.photos/seed/nuxus/192/192',
      badge: 'https://picsum.photos/seed/nuxus/96/96',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Nuxus', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
