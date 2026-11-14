import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Could not parse push notification payload:', error);
  }
  const resultUrl = new URL(payload.url || '/', self.location.origin);
  const url = resultUrl.origin === self.location.origin ? resultUrl.href : self.location.origin;

  event.waitUntil(self.registration.showNotification(payload.title || 'Campus Buddies', {
    body: payload.body || 'Your Campus Buddy is ready!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  }).then(clients => {
    for (const client of clients) {
      if (client.url === url && 'focus' in client) {
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
