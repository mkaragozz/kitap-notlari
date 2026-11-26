// Eski adres: bu service worker kendini kaldırır (uygulama https://mkaragozz.github.io/vadeli/ adresine taşındı).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const k = await caches.keys();
    await Promise.all(k.filter((x) => x.startsWith("vadeli-")).map((x) => caches.delete(x)));
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: "window" })) c.navigate("https://mkaragozz.github.io/vadeli/");
  })());
});
