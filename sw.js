// Çevrimdışı çalışma için önbellek. Sürüm değişince eski önbellek silinir.
// Yeni sürüm hemen devreye girer; açık sayfa kendini yeniler ve "Uygulama güncellendi" der.
//
// SÜRÜM DEĞİŞTİRİRKEN: aşağıdaki V değerini ve tüm dosyalardaki "?v=..." eklerini birlikte değiştirin
// (index.html, *.js içindeki import satırları). Sürüm eki her dosyaya yeni bir adres verir; böylece
// GitHub'ın önbelleği eski dosyayı veremez ve eski/yeni dosyalar karışmaz.
const V = '3.5.2';
const VERSION = 'kn-v' + V;
const MODS = ['app', 'ui', 'db', 'cards', 'lock', 'scanner', 'thoughts', 'journal', 'export', 'notes', 'guide', 'lists', 'reader', 'tts', 'articles', 'blog', 'reports'].map((m) => `${m}.js?v=${V}`);
const SHELL = ['./', 'index.html', `styles.css?v=${V}`, ...MODS, 'lib/html5-qrcode.min.js?v=2.3.8', 'lib/pdf.min.js?v=4.10.38', 'lib/pdf.worker.min.js?v=4.10.38', 'lib/mammoth.browser.min.js?v=1.13.0', 'lib/jszip.min.js?v=3.10.1',
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'privacy.html'];
// Kullanıcının indirdiği sesli okuma dosyaları (lib/tts, voices/): sürümden bağımsız önbellek, güncellemede silinmez
const VOICES = 'kn-voices';
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VOICES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Aynı sitedeki ayrı uygulama (Vadeli Tarayıcı, /vadeli/): kendi service worker'ı yönetir, burada hiç karışma.
  if (url.origin === location.origin && url.pathname.includes('/vadeli/')) return;
  // Uygulama dosyaları: bu sürümün önbelleğinden (hızlı ve internetsiz açılır).
  // Güncelleme: uygulama dosyaları değiştiğinde yukarıdaki VERSION değeri de değiştirilmelidir;
  // tarayıcı yeni sw.js'i görünce bütün dosyaları birlikte yeniden indirir.
  if (url.origin === location.origin && (url.pathname.includes('/lib/tts/') || url.pathname.includes('/voices/'))) {
    // Yalnızca kullanıcı "İndir" deyince uygulama tarafından önbelleğe yazılır; burada otomatik indirilmez
    e.respondWith(caches.open(VOICES).then(async (c) => (await c.match(req, { ignoreSearch: true })) || fetch(req)));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const nav = req.mode === 'navigate';
        // Sayfa adresi "?r=..." gibi ekler taşıyabilir; uygulama dosyalarında ise sürüm eki birebir eşleşmeli.
        const hit = nav ? await c.match('index.html') : await c.match(req);
        if (hit) return hit;
        if (url.pathname.includes('/lib/')) { try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; } catch (err) { return Response.error(); } }
        try { return await fetch(req); } catch (err) { return nav ? c.match('index.html') : Response.error(); }
      })
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
