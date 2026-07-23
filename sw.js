const CACHE_NAME = 'gridify-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './config.js',
    './state.js',
    './storage.js',
    './auth.js',
    './settings.js',
    './modals.js',
    './calendar.js',
    './notifications.js',
    './main.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Ігноруємо не-GET запити (POST, PUT тощо) та зовнішні домени (Firebase, Firestore API)
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});