/**
 * Service Worker
 * Pour supporter l'offline, la mise en cache et le rechargement automatique
 */

const CACHE_NAME = 'dart-stats-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/css/variables.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/players.css',
    '/css/game.css',
    '/css/throws.css',
    '/css/matches.css',
    '/css/stats.css',
    '/css/utils.css',
    '/css/responsive.css',
    '/js/storage.js',
    '/js/rules.js',
    '/js/players.js',
    '/js/games.js',
    '/js/stats.js',
    '/js/finishes.js',
    '/js/throws-input.js',
    '/js/export.js',
    '/js/ui.js',
    '/js/app.js',
    '/manifest.json',
    '/favicon.ico'
];

// Message types pour la communication avec les clients
const MESSAGE_TYPES = {
    NEW_VERSION_AVAILABLE: 'NEW_VERSION_AVAILABLE',
    REFRESH_PAGE: 'REFRESH_PAGE'
};

// Installation
self.addEventListener('install', event => {
    console.log('[SW] Installation...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Mise en cache des assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('[SW] Assets mis en cache');
                // Passer directement à l'activation pour éviter l'ancien SW
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Erreur lors de l\'installation:', err);
            })
    );
});

// Activation
self.addEventListener('activate', event => {
    console.log('[SW] Activation...');
    
    event.waitUntil(
        // Supprimer les anciens caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Suppression du cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] Cache nettoyé');
            // Prendre le contrôle des clients immédiatement
            return self.clients.claim();
        })
    );
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

// Message listener pour recevoir des messages des clients
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Détection des nouvelles versions
// Quand un nouveau SW est installé, il envoie un message aux clients
self.addEventListener('install', event => {
    // Déjà géré ci-dessus, mais on peut ajouter une logique supplémentaire
});

// Fonction pour notifier les clients qu'une nouvelle version est disponible
const notifyClientsAboutUpdate = async () => {
    const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    });
    
    clients.forEach(client => {
        client.postMessage({
            type: MESSAGE_TYPES.NEW_VERSION_AVAILABLE,
            message: 'Une nouvelle version est disponible. Recharger la page pour l\'appliquer.'
        });
    });
};

// Appeler la notification quand le SW est activé (après installation)
self.addEventListener('activate', event => {
    // Déjà géré ci-dessus, mais on peut ajouter la notification
    event.waitUntil(
        Promise.all([
            // Nettoyage du cache
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Notifier les clients
            notifyClientsAboutUpdate(),
            self.clients.claim()
        ])
    );
});
