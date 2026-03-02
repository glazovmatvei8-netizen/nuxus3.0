
const CACHE_NAME = 'nuxus-ghost-v0.54.8';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/180/180',
  'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
];

// Установка воркера и пред-кэширование критических ресурсов
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Активация и удаление старых версий кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// СТРАТЕГИЯ: Cache-First для обхода "Белых списков"
// Если ресурс есть в памяти телефона — отдаем его мгновенно.
// Если нет — идем в сеть.
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к Firebase и внешним API (они работают через SDK)
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebaseinstallations')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Если сеть заблокирована (белые списки), отдаем главную страницу из кэша
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
