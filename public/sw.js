
/**
 * Nuxus Kernel Service Worker v1.2.0
 * Оптимизирован для офлайн-работы и фоновых задач.
 */

const CACHE_NAME = 'nuxus-cache-v1';
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
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Обработка фоновой синхронизации (для PWABuilder)
self.addEventListener('sync', (event) => {
  console.log('Nuxus Kernel: Background Sync triggered', event.tag);
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nuxus', body: 'Новое сообщение' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png'
    })
  );
});
