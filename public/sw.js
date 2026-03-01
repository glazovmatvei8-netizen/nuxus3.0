
/**
 * Nuxus Service Worker v23.0.0
 * Поддержка фоновых уведомлений.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NuxusChat';
  const options = {
    body: data.body || 'Новое сообщение',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.url
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
