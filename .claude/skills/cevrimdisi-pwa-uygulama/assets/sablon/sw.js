// Çevrimdışı önbellek. SÜRÜM DEĞİŞTİRİRKEN: V'yi ve tüm "?v=..." eklerini birlikte değiştirin
// (python3 bump_version.py X.Y). Yeni bir .js modülü eklerseniz MODS listesine de ekleyin.
const V = '1.0';
const VERSION = 'app-v' + V;
const MODS = ['app', 'ui', 'db'].map((m) => `${m}.js?v=${V}`);
const SHELL = ['./', 'index.html', `styles.css?v=${V}`, ...MODS, 'manifest.webmanifest', 'icon.svg', 'privacy.html'];

self.addEventListener('install', (e) => {
  // cache: 'reload' → tarayıcının HTTP önbelleğini atla; GitHub Pages eski dosya vermesin
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // harici servisler (API'ler) her zaman ağdan
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const nav = req.mode === 'navigate';
    const hit = nav ? await c.match('index.html') : await c.match(req);
    if (hit) return hit;
    try { return await fetch(req); } catch (err) { return nav ? c.match('index.html') : Response.error(); }
  }));
});
