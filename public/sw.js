const CACHE_NAME = 'lunas-diary-v1';
const MEDIA_CACHE_NAME = 'lunas-media-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.json'
];

// URLs to intercept and cache-first
const MEDIA_PATTERNS = [
    'drive.google.com/thumbnail',
    'docs.google.com/uc'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activate');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== MEDIA_CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // 1. Skip non-GET requests (like API posts to Apps Script)
    if (event.request.method !== 'GET') return;

    // 2. Media Caching Strategy: Cache-First
    const isMedia = MEDIA_PATTERNS.some(p => url.includes(p));
    if (isMedia) {
        event.respondWith(
            caches.open(MEDIA_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) return response; // Return from cache
                    
                    // Otherwise fetch and save to cache
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => {
                        // If network fails and not in cache, we could return a placeholder icon
                        return null; 
                    });
                });
            })
        );
        return;
    }

    // 3. App Shell Strategy: Stale-While-Revalidate
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Fail silently, we already gave the cached response if available
                });
                
                return cachedResponse || fetchPromise;
            });
        })
    );
});
