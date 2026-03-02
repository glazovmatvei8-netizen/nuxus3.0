
/**
 * Nuxus Ghost Protocol Service Worker v1.0
 * Обеспечивает работу мессенджера в условиях полной блокировки внешних ресурсов.
 */

const CACHE_NAME = 'nuxus-ghost-v1';
const OFFLINE_URL = '/';

// Ресурсы для предварительного кэширования
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/180/180'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Удаление старых кэшей
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Стратегия: Сначала сеть, если сбой — кэш. 
  // Но для файлов стилей и скриптов — Кэш, потом сеть (для скорости в "белых списках")
  
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Кэшируем новые запросы на лету
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Оффлайн без кэша — просто возвращаем пустоту или дефолтную иконку
      });
    })
  );
});
