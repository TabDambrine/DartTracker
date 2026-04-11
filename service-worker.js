/**
 * Service Worker
 * Pour supporter l'offline et la mise en cache
 */

const CACHE_NAME = 'dart-stats-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/storage.js',
    '/js/rules.js',
    '/js/players.js',
    '/js/games.js',
    '/js/ui.js',
    '/manifest.json'
];

// Installation
self.addEventListener('install', event => {
    console.log('[SW] Installation...');
    self.skipWaiting();
});

// Activation
self.addEventListener('activate', event => {
    console.log('[SW] Activation...');
    self.clients.claim();
});

// Fetch
self.addEventListener('fetch', event => {
    // Pour les requêtes GET
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }

                // En local (file://), ne pas essayer de fetch
                if (event.request.url.startsWith('file://')) {
                    return response || new Response('Not found', { status: 404 });
                }

                // En HTTP/HTTPS, tenter la requête réseau
                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                        return response;
                    })
                    .catch(() => {
                        // Retourner une réponse offline si disponible
                        return caches.match('/index.html').then(response => {
                            return response || new Response('Offline', { status: 503 });
                        });
                    });
            })
        );
    }
});

