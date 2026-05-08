// Midqar Foundation · Service Worker v1.0
const CACHE_NAME = 'midqar-v1';
const ASSETS = [
  '/midqar-holdings/',
  '/midqar-holdings/index.html',
  '/midqar-holdings/manifest.json',
  '/midqar-holdings/assets/logo-miqdar.png',
  '/midqar-holdings/assets/villa-palm.jpg',
  '/midqar-holdings/assets/castillo.jpg'
];

// Install — cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET and external requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.includes('midqar-holdings')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache fresh responses
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request)
          .then(cached => cached || caches.match('/midqar-holdings/index.html'));
      })
  );
});
