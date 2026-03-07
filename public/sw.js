// Nuxus Kernel Service Worker v1.0
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const CACHE_NAME = 'nuxus-cache-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/',
        '/manifest.json'
      ]);
    })
  );
});

// Периодическая фоновая синхронизация (для PWABuilder)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('Nuxus Kernel: Periodic sync triggered');
  }
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('Nuxus Kernel: Background sync triggered');
  }
});

// Обработка навигации и офлайн-режима
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.match(OFFLINE_URL);
        });
      })
    );
  }
});

// Push-уведомления
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nuxus', body: 'Новое уведомление' };
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.url
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});