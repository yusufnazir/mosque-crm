const CACHE_NAME = 'mosque-crm-v1';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/offline',
  '/icons/icon-72x72.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Install event — pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls — always go to network
  if (request.url.includes('/api/')) return;

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (request.url.includes('/_next/static/') || request.url.includes('/icons/'))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        // For navigation requests, show offline page
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match('/offline');
          if (offlineResponse) return offlineResponse;
        }

        // Return a basic offline response
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});
