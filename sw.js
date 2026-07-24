// sw.js - ВИПРАВЛЕНА ВЕРСІЯ
const CACHE_VERSION = 'v1.0.1'; // ← ЗМІНЮЙ ЦЕ ЧИСЛО при кожному оновленні
const CACHE_NAME = `gridify-cache-${CACHE_VERSION}`;

const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/config.js',
    '/state.js',
    '/storage.js',
    '/auth.js',
    '/calendar.js',
    '/settings.js',
    '/modals.js',
    '/notifications.js',
    '/main.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Видаляємо старі версії кешу
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});