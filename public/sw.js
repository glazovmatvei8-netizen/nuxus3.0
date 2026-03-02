
const CACHE_NAME = 'nuxus-core-v53';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/192/192',
  'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
];

// Установка: кешируем основные ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Активация: чистим старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов: сначала кеш, потом сеть
self.addEventListener('fetch', (event) => {
  // Для данных Firestore и Auth мы полагаемся на их встроенные механизмы
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Если это запрос страницы, возвращаем корень кеша
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
