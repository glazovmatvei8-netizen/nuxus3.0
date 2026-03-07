
/**
 * Nuxus Core Service Worker v1.0
 * Обязательный файл для генерации APK.
 */

const CACHE_NAME = 'nuxus-v1';
const ASSETS = [
  '/',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Для мессенджера используем стратегию Network First
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
