const CACHE_NAME = 'rofani-pos-offline-v2';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];

const isDevHost = () => {
  const host = self.location.hostname || '';
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('ais-dev-')
  );
};

const shouldBypassRequest = (url) => {
  if (url.origin !== self.location.origin) return true;
  if (isDevHost()) return true;
  const p = url.pathname;
  if (
    p.startsWith('/api/') ||
    p.startsWith('/src/') ||
    p.startsWith('/node_modules/') ||
    p.startsWith('/@vite') ||
    p.startsWith('/@react-refresh') ||
    p.startsWith('/@fs/') ||
    p.startsWith('/@id/')
  ) {
    return true;
  }
  if (url.searchParams.has('v') || url.searchParams.has('t') || url.searchParams.has('import')) {
    return true;
  }
  return false;
};

self.addEventListener('install', (event) => {
  if (!isDevHost()) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
    );
  }
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (isDevHost() || cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
          return Promise.resolve(false);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  if (shouldBypassRequest(url)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          const indexFallback = await caches.match('/index.html');
          if (indexFallback) {
            return indexFallback;
          }
        }
        return Response.error();
      })
  );
});
