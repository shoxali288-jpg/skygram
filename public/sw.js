const CACHE = 'skygram-v2';
const API_CACHE = 'skygram-api-v2';
const MSG_QUEUE = 'skygram-msg-queue';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/login',
        '/register',
      ]).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') {
    if (request.method === 'POST' && url.pathname.startsWith('/api/messages/')) {
      return queueMessage(event);
    }
    return;
  }

  // API GET: network-first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Navigation: network-first, fallback to cached /
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/) || url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, clone));
    }
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
}

function queueMessage(event) {
  event.respondWith(
    (async () => {
      try {
        const clone = event.request.clone();
        const res = await fetch(clone);
        return res;
      } catch {
        const body = await event.request.clone().json();
        const db = await openDB();
        await db.put('queue', { id: Date.now(), ...body, url: event.request.url });
        return new Response(JSON.stringify({ queued: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
    })()
  );
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MSG_QUEUE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('queue', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
