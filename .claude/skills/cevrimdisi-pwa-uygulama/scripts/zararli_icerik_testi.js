// Zararlı içerik testi (şablon): yedekten gelen zararlı blog/günlük kaydı uygulama içinde kod çalıştıramamalı.
// Kullanım: node zararli_icerik_testi.js http://localhost:8765/ <sürüm-eki>      (NOCSP=1 → CSP'yi kaldırarak dene)
// UYARLA: içe aktarma fonksiyonu, depo adları, kayıt şekilleri ve gezilecek ekranlar uygulamaya göre değişir.
// Not: page.evaluate içindeki kod CSP'ye takılmaz (Playwright/CDP). CSP'nin eval'i engellediğini sınamak için
// aynı kökenden bir .js dosyasını <script src> ile yükleyip içinde new Function deneyin.
// Beklenen: her satırda "kod çalıştı: hayır". Eski sürümde "EVET" görmek açığın gerçek olduğunu kanıtlar.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8765/';
const V = process.argv[3] || '1.0';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ serviceWorkers: 'block' });
  if (process.env.NOCSP) {
    await ctx.route(new RegExp(BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '(index\\.html)?(\\?.*)?$'), async (r) => {
      const res = await r.fetch();
      r.fulfill({ response: res, body: (await res.text()).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '') });
    });
  }
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(600);
  const now = new Date().toISOString(), later = new Date(Date.now() + 1e6).toISOString();
  // Saldırı yükleri: her biri window.__pwned'e farklı sayı yazmaya çalışır
  const PAY = {
    html: '<p>Merhaba</p><img src="x" onerror="window.__pwned=1"><a href="javascript:window.__pwned=2">tık</a><script>window.__pwned=3</script><svg onload="window.__pwned=6"></svg>',
    attr: 'x" onerror="window.__pwned=4',
  };
  const r = await p.evaluate(async ({ V, PAY, now, later }) => {
    const out = {};
    const DB = await import('./db.js?v=' + V);
    // UYARLA: uygulamanın yedek biçimi
    const evil = { app: DB.APP_ID || 'uygulamam', books: [], quotes: [],
      notes: [{ id: 'evil-note', title: PAY.html, text: PAY.html, createdAt: now, updatedAt: later }] };
    try { out.import = await DB.importBackup(evil); } catch (e) { out.import = 'HATA ' + e.message; }
    return out;
  }, { V, PAY, now, later });
  console.log('içe aktarma:', JSON.stringify(r.import));
  // UYARLA: zararlı kaydın göründüğü tüm ekranlar
  for (const h of ['#/', '#/note/evil-note', '#/search?q=Merhaba']) {
    await p.goto(BASE + h); await p.waitForTimeout(800);
    for (const a of await p.$$('#view a')) { const href = await a.getAttribute('href'); if (href && href.startsWith('javascript:')) await a.click().catch(() => {}); }
    const pwned = await p.evaluate(() => window.__pwned || 0);
    const attrs = await p.evaluate(() => document.querySelectorAll('[onerror],[onclick],[onload]').length);
    console.log(h, '→ kod çalıştı:', pwned ? `EVET (${pwned})` : 'hayır', '| olay öznitelikli öğe:', attrs);
  }
  console.log('sayfa hataları:', errs);
  await b.close();
})();
