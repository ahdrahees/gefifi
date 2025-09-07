// GEFIFI Service Worker
const CACHE_NAME = 'gefifi-v1';
const STATIC_CACHE_URLS = [
	'/',
	'/chat',
	'/my-requests',
	'/find-professionals',
	'/contracts',
	'/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker');
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log('[SW] Caching static assets');
				return cache.addAll(STATIC_CACHE_URLS);
			})
			.catch((error) => {
				console.error('[SW] Failed to cache static assets:', error);
			})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker');
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log('[SW] Deleting old cache:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// Skip Firebase and external API requests
	if (
		event.request.url.includes('firebaseapp.com') ||
		event.request.url.includes('googleapis.com') ||
		event.request.url.includes('gstatic.com') ||
		event.request.url.includes('cloudfunctions.net')
	) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((response) => {
			// Return cached version if available
			if (response) {
				return response;
			}

			// Otherwise, fetch from network
			return fetch(event.request)
				.then((response) => {
					// Don't cache non-successful responses
					if (!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}

					// Clone the response for caching
					const responseToCache = response.clone();

					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				})
				.catch(() => {
					// Return offline page for navigation requests
					if (event.request.mode === 'navigate') {
						return caches.match('/offline.html');
					}
				});
		})
	);
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
	console.log('[SW] Background sync:', event.tag);

	if (event.tag === 'background-sync') {
		event.waitUntil(
			// Handle offline actions when back online
			handleBackgroundSync()
		);
	}
});

async function handleBackgroundSync() {
	// Implement offline message queue sync here
	console.log('[SW] Handling background sync');
}
