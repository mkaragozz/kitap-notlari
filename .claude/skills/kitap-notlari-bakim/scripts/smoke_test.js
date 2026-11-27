// Duman testi: tüm ana rotaları telefon boyutunda gezer, sayfa hatalarını raporlar, ekran görüntüsü alır.
// Kullanım: node smoke_test.js <çıktı-klasörü>   (önce depo kökünde: python3 -m http.server 8765)
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
const BASE = process.env.BASE || 'http://localhost:8765/';
const ROUTES = ['', '#/library', '#/wish', '#/favorites', '#/private', '#/ebooks', '#/ebooks/private', '#/articles',
  '#/blog', '#/notes', '#/shopping', '#/thoughts', '#/journal', '#/search?q=a', '#/reread', '#/tags', '#/reports',
  '#/books/reading', '#/books/toread', '#/books/read', '#/new-book', '#/new-article', '#/new-post', '#/more',
  '#/settings', '#/settings/menu', '#/settings/lock', '#/settings/backup', '#/settings/guide', '#/privacy'];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`${p.url()} :: ${e.message}`));
  p.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) errs.push(`${p.url()} :: CSP: ${m.text().slice(0, 160)}`); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/openlibrary|googleapis|crossref/, (r) => r.fulfill({ contentType: 'application/json', body: '{}' }));
  for (const r of ROUTES) {
    await p.goto(BASE + r);
    await p.waitForTimeout(400);
    const blank = await p.evaluate(() => !(document.querySelector('#view') || document.body).innerText.trim());
    if (blank) errs.push(`${r || '#/'} :: boş sayfa`);
  }
  await p.goto(BASE); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/smoke-home.png` });
  await p.goto(BASE + '#/more'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/smoke-more.png` });
  const ver = await p.evaluate(() => (document.body.innerText.match(/sürüm ([\d.]+)/) || [])[1]);
  console.log('sürüm:', ver, '| rota:', ROUTES.length, '| hata:', errs.length);
  errs.forEach((e) => console.log('  ✗', e));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
