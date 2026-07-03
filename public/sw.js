/**
 * Nuxus Kernel Service Worker v25.2.0
 * Обеспечивает работу мессенджера без интернета.
 */
const CACHE_NAME = 'nuxus-cache-v25.2.0';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  'https://i.ibb.co/sd2MqGz2/Icon.png?v=45'
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
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Игнорируем запросы к Firebase и внешним API, их кэширует сам SDK
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('ipwho.is')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Если совсем нет сети и файла нет в кэше, отдаем главную страницу (Shell)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
