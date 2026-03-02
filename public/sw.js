
const CACHE_NAME = 'nuxus-ghost-v54';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://picsum.photos/seed/nuxus/180/180',
  'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
];

// Установка: сохраняем всё в память
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Активация: чистим старые версии
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Перехват запросов: Стратегия "Сначала Кэш, потом Сеть"
// Это и есть обход "белых списков" - мы не идем в сеть, если файл есть в памяти
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к API Firebase (они сами умеют в оффлайн)
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebasestorage')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Если сети нет и в кэше нет (например, новая страница), отдаем главную
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
