// BrainBoard Service Worker · v0.15.0
const VERSION = 'brainboard-v0.15.0';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  // Only handle our own origin
  if(url.origin !== self.location.origin && !url.hostname.endsWith('snailgamedev.github.io')) return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(resp=>{
        if(resp && resp.status===200 && resp.type==='basic'){
          const copy = resp.clone();
          caches.open(VERSION).then(c=>c.put(e.request, copy)).catch(()=>{});
        }
        return resp;
      }).catch(()=>cached); // offline fallback
    })
  );
});
