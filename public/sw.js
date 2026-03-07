// Nuxus Kernel Service Worker v1.0
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "nuxus-cache-v1";
const offlineFallbackPage = "offline.html";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;
        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});

// Background Sync - Для отправки сообщений при восстановлении связи
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('Nuxus: Background sync triggered');
  }
});

// Periodic Background Sync - Для обновления ленты в фоне
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-feed') {
    console.log('Nuxus: Periodic background sync triggered');
  }
});

// Push Notifications - Обработка пуш-уведомлений
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nuxus', body: 'Новое сообщение' };
  const options = {
    body: data.body,
    icon: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png',
    badge: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
