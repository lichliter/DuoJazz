/* A release is installed atomically. Updates wait for old tabs to close. */
importScripts('./precache.js');
const PREFIX = `duojazz-app:${self.registration.scope}:`;
const CACHE = PREFIX + PRECACHE_VERSION;
const urls = new Set(PRECACHE_URLS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...urls].map(url => new Request(url, { cache: 'reload' })));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Never cache auth or API responses.
  url.search = ''; url.hash = '';
  const base = new URL(self.registration.scope);
  if (request.mode === 'navigate' && url.pathname === base.pathname) {
    url.pathname += 'index.html';
  }
  if (!urls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(url.href) || fetch(request);
  })());
});
