/**
 * Nuxus PWA Service Worker
 * Обеспечивает работу приложения в офлайне и выполнение требований Google для создания APK.
 */

const CACHE_NAME = 'nuxus-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
];

// Установка: кешируем базовые ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Активация
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

// Перехват запросов
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      // Можно вернуть оффлайн-страницу здесь
    })
  );
});
