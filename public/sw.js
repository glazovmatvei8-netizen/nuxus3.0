const CACHE_NAME = 'nuxus-cache-v25';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/32/32',
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

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nuxus', body: 'Новое сообщение' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png'
    })
  );
});