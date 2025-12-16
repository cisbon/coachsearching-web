// sw.js
const CACHE_NAME = 'coachsearching-v3';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './js/app.js',
    './js/vendor/react.js',
    './js/vendor/react-dom.js',
    './js/vendor/htm.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
