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
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(() => {
                // Continuer même si certains assets ne peuvent pas être cachés
                console.log('Certains assets n\'ont pas pu être cachés');
            });
        })
    );
    self.skipWaiting();
});

// Activation
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch
self.addEventListener('fetch', event => {
    // Pour les requêtes GET
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) {
                    // Retourner du cache
                    return response;
                }

                // Sinon, tenter la requête réseau
                return fetch(event.request)
                    .then(response => {
                        // Ne pas cacher les réponses non-2xx
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Cloner la réponse
                        const responseToCache = response.clone();

                        // Cacher la nouvelle réponse
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                        return response;
                    })
                    .catch(() => {
                        // Retourner une réponse offline si disponible
                        return caches.match('/index.html');
                    });
            })
        );
    }
});
