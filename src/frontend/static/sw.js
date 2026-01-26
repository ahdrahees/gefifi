// @ts-nocheck
/// <reference lib="webworker" />
// GEFIFI Service Worker
/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

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
sw.addEventListener('install', (/** @type {ExtendableEvent} */ event) => {
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
	sw.skipWaiting();
});

// Activate event - clean up old caches
sw.addEventListener('activate', (/** @type {ExtendableEvent} */ event) => {
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
	sw.clients.claim();
});

// Fetch event - serve from cache with improved strategies
sw.addEventListener('fetch', (/** @type {FetchEvent} */ event) => {
	// Skip non-GET requests and API requests
	if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
		return;
	}

	// Skip external services and development endpoints
	if (
		event.request.url.includes('firebaseapp.com') ||
		event.request.url.includes('googleapis.com') ||
		event.request.url.includes('gstatic.com') ||
		event.request.url.includes('cloudfunctions.net') ||
		event.request.url.includes('localhost:3000/api') ||
		event.request.url.includes('127.0.0.1:3000/api')
	) {
		return;
	}

	// Network First for navigation requests (HTML pages)
	// This ensures users always get the latest version on refresh if online
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					// Update cache with the latest version
					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});
					return response;
				})
				.catch(async () => {
					// Fallback to cache if offline
					const cachedResponse = await caches.match(event.request);
					if (cachedResponse) return cachedResponse;
					const offlinePage = await caches.match('/offline.html');
					return offlinePage || new Response('Offline', { status: 503 });
				})
		);
		return;
	}

	// Stale-While-Revalidate for other static assets
	// Serve immediately from cache, update cache from network in background
	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			const fetchedResponse = fetch(event.request)
				.then((networkResponse) => {
					// Only cache successful basic responses
					if (
						networkResponse &&
						networkResponse.status === 200 &&
						networkResponse.type === 'basic'
					) {
						const responseToCache = networkResponse.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
					}
					return networkResponse;
				})
				.catch((err) => {
					console.error('[SW] Fetch failed for:', event.request.url, err);
					// If fetch fails and there's no cache, we must return a Response
					return new Response('Network Error', { status: 408 });
				});

			return cachedResponse || fetchedResponse;
		})
	);
});

// Handle background sync for offline actions
sw.addEventListener('sync', (/** @type {any} */ event) => {
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
