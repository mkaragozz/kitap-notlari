// Çevrimdışı çalışma için önbellek. Sürüm değişince eski önbellek silinir.
// Yeni sürüm yüklendiğinde hemen devreye girmez; uygulama "Yeni sürüm hazır" uyarısı gösterir,
// kullanıcı "Yenile"ye basınca devreye girer.
const VERSION = 'kn-v2.1';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'ui.js', 'db.js', 'cards.js', 'lock.js', 'scanner.js', 'thoughts.js', 'journal.js', 'export.js',
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'privacy.html', 'lib/html5-qrcode.min.js'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  // İlk kurulumda bekleyen eski sürüm yoktur; hemen etkinleşir.
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Uygulama dosyaları: bu sürümün önbelleğinden (hızlı ve internetsiz açılır).
  // Güncelleme: uygulama dosyaları değiştiğinde yukarıdaki VERSION değeri de değiştirilmelidir;
  // tarayıcı yeni sw.js'i görünce bütün dosyaları birlikte yeniden indirir.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)
        .catch(() => (req.mode === 'navigate' ? c.match('index.html') : Response.error()))))
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
  // Diğerleri (ISBN servisleri) her zaman ağdan
});
