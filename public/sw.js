
/**
 * Nuxus Ghost Core v0.54.6
 * Абсолютная автономность для обхода "белых списков".
 */

const CACHE_NAME = 'nuxus-cache-v0.54.6';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
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
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к Firebase и другим API для корректной работы онлайна
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Если есть в кэше — отдаем сразу (Ghost Strategy)
      if (response) {
        return response;
      }

      // Иначе идем в сеть и кэшируем результат для следующего раза
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Если сеть заблокирована (белые списки), отдаем главную страницу для запуска PWA
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
