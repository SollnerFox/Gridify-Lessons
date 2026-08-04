// sw.js - ПОВНА ВИПРАВЛЕНА ВЕРСІЯ
// Версія береться з query-параметра ?v=APP_VERSION, який передається при реєстрації
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') || '1.0.24';
const CACHE_NAME = `gridify-cache-v${CACHE_VERSION}`;
// BASE_PATH визначається динамічно зі scope SW, щоб працювати під будь-яким deployment-шляхом
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');

const urlsToCache = [
    BASE_PATH + '/',
    BASE_PATH + '/index.html',
    BASE_PATH + '/assets/styles.css',
    BASE_PATH + '/src/config.js',
    BASE_PATH + '/src/state.js',
    BASE_PATH + '/src/utils/dates.js',
    BASE_PATH + '/src/utils/time-utils.js',
    BASE_PATH + '/src/services/storage.js',
    BASE_PATH + '/src/services/auth.js',
    BASE_PATH + '/src/core/calendar.js',
    BASE_PATH + '/src/core/calendar-renderer.js',
    BASE_PATH + '/src/core/modals.js',
    BASE_PATH + '/src/ui/settings.js',
    BASE_PATH + '/src/ui/color-picker.js',
    BASE_PATH + '/src/notifications/notifications.js',
    BASE_PATH + '/src/main.js',
    BASE_PATH + '/manifest.json'
];

self.addEventListener('install', (event) => {
    console.log(`[SW] Installing ${CACHE_NAME}`);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`[SW] Caching ${urlsToCache.length} files`);
            return Promise.all(
                urlsToCache.map(url =>
                    fetch(url, { cache: 'no-cache' }).then(r => {
                        if (r.ok) return cache.put(url, r);
                        console.log(`[SW] Failed to cache ${url}`);
                    })
                )
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating ${CACHE_NAME}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            const oldCaches = cacheNames.filter(c => c !== CACHE_NAME);
            return Promise.all(
                oldCaches.map(c => caches.delete(c))
            ).then(() => oldCaches.length > 0);
        }).then((hadOldCaches) => {
            self.clients.claim();
            if (hadOldCaches) {
                return self.clients.matchAll({ type: 'window' }).then(clients => {
                    clients.forEach(c => c.navigate(c.url));
                });
            }
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(() => {
                console.log(`[SW] Fetch failed: ${event.request.url}`);
            });
        })
    );
});
