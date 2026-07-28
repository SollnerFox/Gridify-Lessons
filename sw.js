// sw.js - ПОВНА ВИПРАВЛЕНА ВЕРСІЯ
const CACHE_VERSION = 'v1.0.14'; // має відповідати window.APP_VERSION в index.html
const CACHE_NAME = `gridify-cache-${CACHE_VERSION}`;
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
    self.skipWaiting();
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
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ✅ Firebase та зовнішні сервіси — пропускаємо Service Worker
    if (url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        // Дозволяємо браузеру обробити запит нормально, без Service Worker
        event.respondWith(fetch(event.request));
        return;
    }

    // ✅ Для локальних файлів використовуємо кеш
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