// sw.js - ВИПРАВЛЕНА ВЕРСІЯ ДЛЯ GITHUB PAGES
const CACHE_VERSION = 'v1.0.2'; // ← ЗМІНЮЙ ЦЕ ЧИСЛО при кожному оновленні
const CACHE_NAME = `gridify-cache-${CACHE_VERSION}`;

// Визначаємо базовий шлях (для GitHub Pages)
const BASE_PATH = '/Gridify-Lessons';

const urlsToCache = [
    BASE_PATH + '/',
    BASE_PATH + '/index.html',
    BASE_PATH + '/styles.css',
    BASE_PATH + '/config.js',
    BASE_PATH + '/state.js',
    BASE_PATH + '/storage.js',
    BASE_PATH + '/auth.js',
    BASE_PATH + '/calendar.js',
    BASE_PATH + '/settings.js',
    BASE_PATH + '/modals.js',
    BASE_PATH + '/notifications.js',
    BASE_PATH + '/main.js',
    BASE_PATH + '/manifest.json'
];

self.addEventListener('install', (event) => {
    console.log(`[SW] Installing ${CACHE_NAME}`);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`[SW] Caching ${urlsToCache.length} files`);
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // ← Активуй новий SW одразу
});

self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating ${CACHE_NAME}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // ← Контролюй всіх клієнтів одразу
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(() => {
                console.log(`[SW] Fetch failed: ${event.request.url}`);
            });
        })
    );
});