/**
 * Service Worker: G-Monitor Diskoperindag Kabupaten Banyuasin
 * Menyediakan kapabilitas Progressive Web App (PWA) & Offline-First caching
 */

const CACHE_NAME = 'gmonitor-banyuasin-v1.1.0';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './404.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable.png',
  './icons/icon-maskable.svg'
];

// 1. Install Event: Precaching App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell assets...');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some non-critical precache assets failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Smart routing & caching
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan cache POST request atau panggilan ke Google Apps Script backend
  if (request.method !== 'GET' || url.href.includes('script.google.com') || url.pathname.includes('/api/')) {
    return;
  }

  // Permintaan navigasi halaman HTML: Network-First dengan Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[SW] Offline mode: Serving index.html from cache');
          return caches.match('./index.html').then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // Aset statis (CDN, Gambar, Font, CSS, JS): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline dan aset tidak ada di cache, abaikan saja
        });

      return cachedResponse || fetchPromise;
    })
  );
});
