
// Nuxus Kernel Service Worker
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "nuxus-offline-cache-v1";
const offlineFallbackPage = "offline.html";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;
        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});

// Background Sync & Push placeholder
self.addEventListener('sync', (event) => {
  console.log('Nuxus Kernel: Background Sync Active');
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'Новое сообщение в Nuxus';
  event.waitUntil(
    self.registration.showNotification('Nuxus', {
      body: data,
      icon: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=192&h=192&fit=crop&fm=png'
    })
  );
});
