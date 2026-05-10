// BrainBoard Service Worker · v0.53.0
// NETWORK-FIRST · updates land instantly · cache is offline fallback only
const VERSION = 'brainboard-v0.53.0';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// NETWORK-FIRST: try the network · update cache · fall back to cache offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin && !url.hostname.endsWith('snailgamedev.github.io')) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request)) // offline fallback
  );
});

// Allow manual cache nuke from the app
self.addEventListener('message', e => {
  if (e.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
