const CACHE_NAME = 'nuxus-ghost-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  'https://picsum.photos/seed/nuxus/180/180',
];

// Установка: Кэшируем всё необходимое для запуска
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Активация: Очищаем старые версии
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

// Перехват запросов: Сначала КЭШ, потом СЕТЬ (Стратегия для обхода блокировок)
self.addEventListener('fetch', (event) => {
  // Игнорируем запросы к Firestore (они обрабатываются самим SDK)
  if (event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Кэшируем новые статические файлы на лету
        if (
          event.request.url.startsWith(self.location.origin) &&
          (event.request.url.includes('/_next/static/') || event.request.url.includes('/fonts/'))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Если сети нет и файла нет в кэше, для навигации возвращаем корень (оффлайн-приложение)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
