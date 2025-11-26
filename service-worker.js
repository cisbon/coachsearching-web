/**
 * Service Worker for CoachSearching PWA
 * 
 * Features:
 * - Offline support with caching strategy
 * - Background sync for offline actions
 * - Push notifications
 * - Resource caching for faster loads
 */

const CACHE_VERSION = 'coachsearching-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
    '/',
    '/index.html',
    '/offline.html',
    '/css/styles.css',
    '/css/admin.css',
    '/css/analytics-dashboard.css',
    '/css/advanced-search.css',
    '/css/onboarding.css',
    '/css/portfolio-builder.css',
    '/css/progress-dashboard.css',
    '/css/loading-animations.css',
    '/js/app.js',
    '/js/api-client.js',
    '/js/admin.js',
    '/js/analytics-dashboard.js',
    '/js/advanced-search.js',
    '/js/onboarding.js',
    '/js/portfolio-builder.js',
    '/js/progress-dashboard.js',
    '/js/referrals.js',
    '/js/promoCode.js',
    '/js/toast.js',
    '/manifest.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[Service Worker] Precaching resources');
                return cache.addAll(PRECACHE_RESOURCES);
            })
            .then(() => {
                console.log('[Service Worker] Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName.startsWith('coachsearching-') && 
                                   cacheName !== CACHE_VERSION;
                        })
                        .map((cacheName) => {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // API requests - Network First strategy
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone and cache successful responses
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version if available
                    return caches.match(request);
                })
        );
        return;
    }

    // Static resources - Cache First strategy
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then((response) => {
                        // Cache successful responses
                        if (response && response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_VERSION).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Background Sync - retry failed requests when back online
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);
    
    if (event.tag === 'sync-bookings') {
        event.waitUntil(syncBookings());
    }
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

// Push Notifications
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'CoachSearching';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: data.url || '/',
        actions: [
            {
                action: 'open',
                title: 'View'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ],
        vibrate: [200, 100, 200],
        tag: data.tag || 'general',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'open' || event.action === '') {
        const urlToOpen = event.notification.data || '/';
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Check if window is already open
                    for (let client of clientList) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Open new window
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// Helper: Sync bookings
async function syncBookings() {
    try {
        const pendingBookings = await getPendingBookings();
        
        for (const booking of pendingBookings) {
            try {
                await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(booking)
                });
                await removePendingBooking(booking.id);
            } catch (error) {
                console.error('[Service Worker] Failed to sync booking:', error);
            }
        }
    } catch (error) {
        console.error('[Service Worker] Background sync failed:', error);
        throw error;
    }
}

// Helper: Sync messages
async function syncMessages() {
    try {
        const pendingMessages = await getPendingMessages();
        
        for (const message of pendingMessages) {
            try {
                await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });
                await removePendingMessage(message.id);
            } catch (error) {
                console.error('[Service Worker] Failed to sync message:', error);
            }
        }
    } catch (error) {
        console.error('[Service Worker] Message sync failed:', error);
        throw error;
    }
}

// IndexedDB helpers (placeholder - implement with actual IndexedDB)
async function getPendingBookings() {
    // TODO: Implement IndexedDB read
    return [];
}

async function removePendingBooking(id) {
    // TODO: Implement IndexedDB delete
}

async function getPendingMessages() {
    // TODO: Implement IndexedDB read
    return [];
}

async function removePendingMessage(id) {
    // TODO: Implement IndexedDB delete
}

console.log('[Service Worker] Service worker loaded');
