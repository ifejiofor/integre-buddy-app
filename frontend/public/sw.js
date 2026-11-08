// Service Worker for Campus Buddies
// Handles push notifications and caching

const CACHE_NAME = 'campus-buddies-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/src/main.tsx',
  // Add more assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached assets
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  if (!event.data) {
    console.log('No data in push message');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const title = data.title || 'Campus Buddies';
    const options = {
      body: data.body || 'Your Campus Buddy is ready!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: {
        url: data.url || '/',
      },
      actions: [
        {
          action: 'view',
          title: 'View Results',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
      vibrate: [200, 100, 200],
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error processing push:', error);
    
    // Fallback notification
    const title = 'Campus Buddies';
    const options = {
      body: 'Your Campus Buddy is ready!',
      icon: '/favicon.svg',
      data: {
        url: '/',
      },
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then((clientList) => {
        // Check if there's already a window/tab open with this URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no matching window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Message event for communication with the app
self.addEventListener('message', (event) => {
  console.log('Message received:', event);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Campus Buddies Service Worker loaded');
