// BrainBoard Service Worker · v0.81.0
// STALE-WHILE-REVALIDATE · instant offline load · silent background updates
// works fully WITHOUT WIFI after first install
const VERSION = 'brainboard-v0.82.0';

// CORE pre-cache · everything needed for offline standalone launch
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './version.json',
];

// Pre-cache CORE on install · skip waiting so new SW takes over immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE).catch(err => {
        // Don't fail install if one file 404s · partial cache is better than no cache
        console.warn('SW install partial cache fail:', err);
        return Promise.all(CORE.map(url =>
          fetch(url).then(r => c.put(url, r)).catch(()=>{})
        ));
      }))
      .then(() => self.skipWaiting())
  );
});

// Clean old caches · take control of all open clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// STALE-WHILE-REVALIDATE strategy:
// 1. Try cache FIRST (instant offline load · works without wifi)
// 2. Simultaneously fetch network in background to refresh cache
// 3. If cache miss · fall back to network
// 4. If both fail · show fallback or error gracefully
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only handle GET requests · skip POST/PUT/etc
  if(e.request.method !== 'GET') return;
  // Only handle same-origin OR github pages
  if(url.origin !== self.location.origin && !url.hostname.endsWith('snailgamedev.github.io')) return;
  // Skip non-cacheable cross-origin and chrome-extension URLs
  if(!url.protocol.startsWith('http')) return;

  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(e.request);

      // Network fetch with 8s timeout · update cache when it comes back
      const networkPromise = (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const resp = await fetch(e.request, {signal: controller.signal});
          clearTimeout(timeoutId);
          if(resp && resp.status === 200 && resp.type === 'basic'){
            // Update cache for next time
            cache.put(e.request, resp.clone()).catch(()=>{});
          }
          return resp;
        } catch(err) {
          // Network failed · that's fine if we have cache
          return null;
        }
      })();

      // If we have cached version · return it INSTANTLY · let network update in background
      if(cached){
        // Let network promise run silently to refresh cache (don't await)
        networkPromise.catch(()=>{});
        return cached;
      }

      // No cache · MUST wait for network
      const networkResp = await networkPromise;
      if(networkResp) return networkResp;

      // Both cache and network failed · return offline fallback (the cached index)
      const fallback = await cache.match('./index.html');
      if(fallback) return fallback;

      // Last resort
      return new Response('offline · please reconnect to load BrainBoard for the first time', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {'Content-Type': 'text/plain'}
      });
    })
  );
});

// Manual cache nuke from app
self.addEventListener('message', e => {
  if(e.data === 'CLEAR_CACHE'){
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
  if(e.data === 'CHECK_OFFLINE'){
    // Respond to client asking "am I offline-ready?"
    caches.open(VERSION).then(cache => cache.match('./index.html')).then(match => {
      e.source?.postMessage({type:'OFFLINE_READY', ready: !!match});
    });
  }
});
