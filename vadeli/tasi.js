// Eski adresteki service worker'ı ve önbelleği temizle, yeni adrese git.
(async () => {
  try {
    const kayitlar = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(kayitlar.filter((k) => k.scope.includes("/kitap-notlari/vadeli/")).map((k) => k.unregister()));
    const anahtarlar = await caches?.keys?.() || [];
    await Promise.all(anahtarlar.filter((k) => k.startsWith("vadeli-")).map((k) => caches.delete(k)));
  } catch { /* yok */ }
  location.replace("https://mkaragozz.github.io/vadeli/" + location.hash);
})();
