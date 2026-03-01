
// Nuxus Service Worker v22.0.0
// Позволяет приложению работать в фоне и принимать Push-уведомления

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
    icon: 'https://picsum.photos/seed/nuxus/192/192',
    badge: 'https://picsum.photos/seed/nuxus/192/192',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
