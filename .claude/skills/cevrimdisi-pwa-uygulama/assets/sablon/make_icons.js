// node make_icons.js  (Playwright hazırsa)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  const svg = fs.readFileSync('icon.svg', 'utf8');
  for (const [n, s, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.12]]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<body style="margin:0;background:#7C5CFF"><div style="padding:${s * pad}px">${svg.replace('<svg', `<svg width="${s * (1 - 2 * pad)}" height="${s * (1 - 2 * pad)}"`)}</div></body>`);
    await p.screenshot({ path: n });
  } await b.close(); })();
