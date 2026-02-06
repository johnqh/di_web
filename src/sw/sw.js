/**
 * Shared Service Worker for Sudobility Web Apps
 * Implements caching strategies with TTL-based expiration and size limits
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `sudobility-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `sudobility-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `sudobility-images-${CACHE_VERSION}`;

// TTL per cache type
const CACHE_TTL = {
  [STATIC_CACHE]: 7 * 24 * 60 * 60 * 1000, // 7 days
  [DYNAMIC_CACHE]: 24 * 60 * 60 * 1000, // 1 day
  [IMAGE_CACHE]: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Cache size limits
const CACHE_LIMITS = {
  [STATIC_CACHE]: 100,
  [DYNAMIC_CACHE]: 50,
  [IMAGE_CACHE]: 30,
};

// Files to precache on install
const PRECACHE_URLS = ['/', '/manifest.json'];

// CDN domains allowed for caching
const ALLOWED_CDN_DOMAINS = ['cdn.jsdelivr.net', 'unpkg.com'];

// Install event - precache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const CURRENT_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  const LEGACY_PREFIXES = ['web3mail-', 'shapeshyft-'];

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              // Remove old sudobility caches
              if (name.startsWith('sudobility-') && !CURRENT_CACHES.includes(name)) {
                return true;
              }
              // Remove legacy app-specific caches
              return LEGACY_PREFIXES.some(prefix => name.startsWith(prefix));
            })
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Trim cache to limit size
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

// Check if a cached response has expired
function isExpired(response, cacheName) {
  const maxAge = CACHE_TTL[cacheName];
  if (!maxAge) return false;

  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;

  return Date.now() - new Date(dateHeader).getTime() > maxAge;
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Google Fonts - they have their own caching and SW intercept causes CSP issues
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // Skip non-same-origin requests unless on CDN allowlist
  if (
    url.origin !== location.origin &&
    !ALLOWED_CDN_DOMAINS.some(domain => url.hostname.includes(domain))
  ) {
    return;
  }

  // Skip API requests
  if (url.pathname.startsWith('/api/') || url.hostname.startsWith('api.')) return;

  // Strategy: Cache First for static assets (JS, CSS, fonts)
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy: Cache First for images
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    event.waitUntil(trimCache(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]));
    return;
  }

  // Strategy: Stale While Revalidate for locale files
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Strategy: Network First for HTML pages
  if (
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    !url.pathname.includes('.')
  ) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    event.waitUntil(trimCache(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Cache First strategy - with TTL expiration
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached, cacheName)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    return caches.match('/');
  }
}

// Network First strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/');
    }
    throw error;
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();

  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch (error) {
      // Will retry on next sync
    }
  }
}

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, data: notificationData } = data;

    event.waitUntil(
      self.registration.showNotification(title || 'Notification', {
        body,
        icon: icon || '/favicon-192.png',
        badge: badge || '/favicon-96.png',
        data: notificationData,
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      })
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
