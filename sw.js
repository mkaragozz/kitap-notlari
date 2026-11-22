// Çevrimdışı çalışma için önbellek. Sürüm değişince eski önbellek silinir.
const VERSION = 'kn-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'db.js', 'ai.js', 'export.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Uygulama dosyaları: önce ağ (güncel kalsın), yoksa önbellek
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
    );
    return;
  }
  // Kütüphaneler ve yazı tipleri: önce önbellek
  if (CDN.test(req.url)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Diğerleri (Claude API, ISBN servisleri) her zaman ağdan
});
