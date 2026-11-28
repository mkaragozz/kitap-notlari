// 📖 E-kitap / makale okuyucu: PDF, Word (.docx), metin (.txt), EPUB.
// - Akışkan metin (EPUB, Word, TXT ve PDF "metin görünümü"): CSS sütunlarıyla sayfalara bölünür; yazı tipi,
//   boyut, satır aralığı, kenar boşluğu, zemin rengi değiştirilebilir. Sayfa numarası ekrana göre hesaplanır.
// - PDF "orijinal görünüm": pdf.js ile sayfa sayfa çizilir; zemin rengi ve yakınlaştırma; sayfa numarası kitapla aynı.
// - Metni seçip "Alıntılarıma aktar": kitabın Alıntılar bölümüne, renkli vurguyla; orijinal dosyadaki yeri
//   (PDF/Word/TXT/EPUB, sayfa ya da konum) kaynak/dipnot olarak alıntıya yazılır.
// - Sayfaya "tekrar oku" işareti ve sayfa yorumu; kaldığı yerden devam.
import * as DB from './db.js?v=3.5.4';
import { $, esc, view, toast, openSheet, closeSheet, confirmDialog, go, fmtDateTime } from './ui.js?v=3.5.4';

export const hooks = { openQuoteEditor: null };

const LIBS = {
  // pdf.js 4.10.38 (legacy derleme, ES modülü): GHSA-wgrm-67xf-hhpq 4.2.67'de kapandı; isEvalSupported:false yine de verilir
  pdf: 'lib/pdf.min.js?v=4.10.38',
  pdfWorker: 'lib/pdf.worker.min.js?v=4.10.38',
  mammoth: 'lib/mammoth.browser.min.js?v=1.13.0',
  jszip: 'lib/jszip.min.js?v=3.10.1',
};
const loaded = {};
function loadScript(src) {
  loaded[src] = loaded[src] || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => { delete loaded[src]; reject(new Error('Okuyucu bileşeni yüklenemedi')); };
    document.head.appendChild(s);
  });
  return loaded[src];
}
async function pdfLib() {
  const L = window.pdfjsLib || await import(new URL(LIBS.pdf, location.href).href);
  L.GlobalWorkerOptions.workerSrc = new URL(LIBS.pdfWorker, location.href).href;
  window.pdfjsLib = L;
  return L;
}

export const HL_COLORS = { yellow: '#FFE45C', green: '#9BE59B', blue: '#9CCBFF', pink: '#FFA8D2', orange: '#FFC078', purple: '#CDB4FF' };
export const HL_NAMES = { yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', pink: 'Pembe', orange: 'Turuncu', purple: 'Mor' };
export const BG_PRESETS = [
  ['#FFFFFF', '#222222', 'Beyaz'], ['#FBF5E6', '#2B2B2B', 'Krem'], ['#F4ECD8', '#3B2F20', 'Sepya'],
  ['#E9F3E6', '#24331F', 'Açık yeşil'], ['#E8EEF6', '#1F2A38', 'Açık mavi'], ['#EDEDED', '#222222', 'Gri'], ['#1E1E1E', '#D8D8D8', 'Gece'],
];
export const FONTS = [
  ['Literata', 'Literata (önerilen, ekranda en rahat okunan)', "'Literata', Georgia, serif"],
  ['Merriweather', 'Merriweather', "'Merriweather', Georgia, serif"],
  ['Lora', 'Lora', "'Lora', Georgia, serif"],
  ['Noto Serif', 'Noto Serif', "'Noto Serif', Georgia, serif"],
  ['Atkinson Hyperlegible', 'Atkinson Hyperlegible (çok okunaklı)', "'Atkinson Hyperlegible', Verdana, sans-serif"],
  ['Noto Sans', 'Noto Sans', "'Noto Sans', Arial, sans-serif"],
  ['system', 'Telefonun yazı tipi', "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"],
];
let fontsLinked = false;
function linkFonts() {
  if (fontsLinked) return; fontsLinked = true;
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Noto+Sans:wght@400;600&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
  document.head.appendChild(l);
}
export function readerPrefs() { return { ...DB.getSettings().reader }; }
function savePrefs(p) { DB.setSettings({ reader: p }); }
export const fontCss = (name) => (FONTS.find((f) => f[0] === name) || FONTS[0])[2];
function lum(hex) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return 1; const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
export const autoFg = (bg) => (lum(bg) < 0.45 ? '#DADADA' : '#262626');

// ---------- Dosya türü ve üst bilgiler ----------
export function fileKind(name, type) {
  const n = String(name || '').toLowerCase();
  if (n.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
  if (n.endsWith('.epub') || type === 'application/epub+zip') return 'epub';
  if (n.endsWith('.docx') || /officedocument\.wordprocessingml/.test(type || '')) return 'docx';
  if (n.endsWith('.txt') || n.endsWith('.md') || /^text\//.test(type || '')) return 'txt';
  if (n.endsWith('.doc')) return 'doc';
  return null;
}
export const KIND_LABEL = { pdf: 'PDF', epub: 'EPUB', docx: 'Word', txt: 'Metin' };

/** Yüklenen dosyadan başlık/yazar gibi bilgileri çıkarır (formu doldurmak için) */
export async function readMeta(file) {
  const kind = fileKind(file.name, file.type);
  const base = { title: file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() };
  try {
    if (kind === 'pdf') {
      const L = await pdfLib();
      const doc = await L.getDocument({ isEvalSupported: false, data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const md = await doc.getMetadata().catch(() => null);
      const info = (md && md.info) || {};
      const out = { ...base, pages: doc.numPages };
      if (info.Title && String(info.Title).trim().length > 2) out.title = String(info.Title).trim();
      if (info.Author) out.author = String(info.Author).trim();
      doc.destroy();
      return out;
    }
    if (kind === 'epub' || kind === 'docx') {
      await loadScript(LIBS.jszip);
      const zip = await window.JSZip.loadAsync(file);
      if (kind === 'docx') {
        const core = zip.file('docProps/core.xml');
        if (!core) return base;
        const x = new DOMParser().parseFromString(await core.async('text'), 'application/xml');
        const t = x.getElementsByTagNameNS('*', 'title')[0], c = x.getElementsByTagNameNS('*', 'creator')[0];
        return { ...base, ...(t && t.textContent.trim() ? { title: t.textContent.trim() } : {}), ...(c && c.textContent.trim() ? { author: c.textContent.trim() } : {}) };
      }
      const { opf } = await epubOpf(zip);
      const g = (tag) => { const e = opf.getElementsByTagNameNS('*', tag)[0]; return e ? e.textContent.trim() : ''; };
      return { ...base, title: g('title') || base.title, author: g('creator'), publisher: g('publisher'), year: (g('date').match(/\d{4}/) || [''])[0], language: g('language') };
    }
  } catch (e) { /* bilgi okunamadı */ }
  return base;
}

// ---------- İçerik hazırlama ----------
const KEEP = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUB', 'SUP', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'HR', 'FIGURE', 'FIGCAPTION', 'SPAN', 'DIV', 'SECTION', 'ARTICLE', 'SMALL', 'CENTER', 'DL', 'DT', 'DD']);
function sanitize(root, imgMap = null) {
  const walk = (el) => {
    [...el.children].forEach((c) => {
      const tag = c.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'NOSCRIPT', 'HEAD', 'TITLE', 'SVG', 'VIDEO', 'AUDIO', 'CANVAS'].includes(tag)) {
        if (tag === 'SVG' && imgMap) { const im = c.querySelector('image'); if (im) { const src = imgMap(im.getAttribute('xlink:href') || im.getAttribute('href')); if (src) { const n = document.createElement('img'); n.src = src; c.replaceWith(n); return; } } }
        c.remove(); return;
      }
      if (!KEEP.has(tag)) { const frag = document.createDocumentFragment(); while (c.firstChild) frag.appendChild(c.firstChild); c.replaceWith(frag); walk(el); return; }
      [...c.attributes].forEach((a) => { const n = a.name.toLowerCase(); if (!(n === 'href' && tag === 'A') && !(n === 'src' && tag === 'IMG') && !(n === 'colspan' || n === 'rowspan')) c.removeAttribute(a.name); });
      if (tag === 'A') { const h = c.getAttribute('href') || ''; if (/^https?:/i.test(h)) { c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); } else c.removeAttribute('href'); }
      if (tag === 'IMG') { const src = c.getAttribute('src') || ''; const m = imgMap ? imgMap(src) : null; if (m) c.setAttribute('src', m); else if (!/^(data:|blob:)/.test(src)) c.remove(); }
      walk(c);
    });
  };
  walk(root);
  return root;
}
const INERT = document.implementation.createHTMLDocument('');
function htmlToFrag(html, imgMap) { const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html'); return sanitize(d.body, imgMap).innerHTML; }
function textToHtml(text) {
  return String(text).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}
async function decodeText(buf) {
  let t = new TextDecoder('utf-8').decode(buf);
  if ((t.match(/�/g) || []).length > 5) { try { t = new TextDecoder('windows-1254').decode(buf); } catch (e) { /* utf-8 kalsın */ } }
  return t;
}
async function epubOpf(zip) {
  const cont = await zip.file('META-INF/container.xml').async('text');
  const cx = new DOMParser().parseFromString(cont, 'application/xml');
  const opfPath = cx.getElementsByTagName('rootfile')[0].getAttribute('full-path');
  const opf = new DOMParser().parseFromString(await zip.file(opfPath).async('text'), 'application/xml');
  return { opf, opfPath, dir: opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '' };
}
function resolvePath(base, rel) {
  if (!rel) return '';
  rel = decodeURIComponent(rel.split('#')[0]);
  const parts = (base + rel).split('/'); const out = [];
  parts.forEach((p) => { if (p === '..') out.pop(); else if (p !== '.') out.push(p); });
  return out.join('/');
}
const objectUrls = [];
async function epubToHtml(blob, onProgress) {
  await loadScript(LIBS.jszip);
  const zip = await window.JSZip.loadAsync(blob);
  const { opf, dir } = await epubOpf(zip);
  const man = {};
  [...opf.getElementsByTagNameNS('*', 'item')].forEach((i) => { man[i.getAttribute('id')] = { href: i.getAttribute('href'), type: i.getAttribute('media-type') }; });
  const spine = [...opf.getElementsByTagNameNS('*', 'itemref')].map((r) => man[r.getAttribute('idref')]).filter(Boolean);
  let html = '';
  for (let i = 0; i < spine.length; i++) {
    const it = spine[i];
    const path = resolvePath(dir, it.href);
    const f = zip.file(path); if (!f) continue;
    if (onProgress) onProgress(`Bölüm ${i + 1}/${spine.length} hazırlanıyor…`);
    const doc = new DOMParser().parseFromString(await f.async('text'), /xhtml|xml/.test(it.type || '') ? 'application/xhtml+xml' : 'text/html');
    const body = doc.body || doc.getElementsByTagName('body')[0];
    if (!body) continue;
    const chDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
    const imgs = {};
    for (const im of [...body.querySelectorAll('img'), ...body.querySelectorAll('image')]) {
      const src = im.getAttribute('src') || im.getAttribute('xlink:href') || im.getAttribute('href');
      const p = resolvePath(chDir, src); const zf = zip.file(p);
      if (zf && !imgs[src]) { const u = URL.createObjectURL(await zf.async('blob')); objectUrls.push(u); imgs[src] = u; }
    }
    // Güvenlik: içerik önce "etkisiz" bir belgede çözülür (resim yüklenmez, olay işleyicisi çalışmaz), sonra temizlenir
    const tmp = INERT.createElement('div');
    tmp.innerHTML = new XMLSerializer().serializeToString(body).replace(/^<body[^>]*>|<\/body>$/g, '');
    sanitize(tmp, (src) => imgs[src] || null);
    html += `<section class="rd-chap">${tmp.innerHTML}</section>`;
  }
  return html;
}
async function pdfToHtml(pdf, onProgress) {
  let html = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    if (onProgress && p % 5 === 1) onProgress(`Metin çıkarılıyor: sayfa ${p}/${pdf.numPages}…`);
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    let lines = [], cur = '';
    tc.items.forEach((it) => { cur += it.str; if (it.hasEOL) { lines.push(cur); cur = ''; } });
    if (cur) lines.push(cur);
    lines = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const paras = []; let buf = '';
    lines.forEach((l, i) => {
      if (buf.endsWith('-') && !buf.endsWith(' -')) buf = buf.slice(0, -1) + l; else buf += (buf ? ' ' : '') + l;
      const next = lines[i + 1] || '';
      if (/[.!?:"”»]$/.test(l) && (!next || /^[A-ZÇĞİÖŞÜ0-9“"«(–-]/.test(next)) && l.length < 90) { paras.push(buf); buf = ''; }
    });
    if (buf) paras.push(buf);
    html += `<span class="rd-pdfpage" data-pdfpage="${p}">s. ${p}</span>` + paras.map((x) => `<p>${esc(x)}</p>`).join('');
  }
  return html;
}

// Okuma içeriği önbelleği (bellekte, kitap başına)
const docCache = new Map();
async function loadContent(book, mode, onProgress) {
  const key = `${book.id}:${book.fileId}:${mode}`;
  if (docCache.has(key)) return docCache.get(key);
  const rec = await DB.getFile(book.fileId);
  if (!rec || !rec.blob) throw new Error('Kitabın dosyası bu cihazda bulunamadı. (Başka cihazdan yedekle geldiyse “E-kitapları da yedekle” seçeneğiyle alınmış yedek gerekir.)');
  const kind = book.fileType || fileKind(rec.name, rec.type);
  let out;
  if (kind === 'pdf') {
    const L = await pdfLib();
    const pdf = await L.getDocument({ isEvalSupported: false, data: new Uint8Array(await rec.blob.arrayBuffer()) }).promise;
    if (mode === 'text') {
      let html = rec.textHtml;
      if (!html) { html = await pdfToHtml(pdf, onProgress); rec.textHtml = html; DB.putFile(rec).catch(() => {}); }
      out = { kind: 'flow', html, pdf };
    } else out = { kind: 'pdf', pdf };
  } else if (kind === 'epub') out = { kind: 'flow', html: await epubToHtml(rec.blob, onProgress) };
  else if (kind === 'docx') {
    await loadScript(LIBS.mammoth);
    const r = await window.mammoth.convertToHtml({ arrayBuffer: await rec.blob.arrayBuffer() }, { convertImage: window.mammoth.images.imgElement((img) => img.read('base64').then((b) => ({ src: `data:${img.contentType};base64,${b}` }))) });
    out = { kind: 'flow', html: htmlToFrag(r.value) };
  } else if (kind === 'txt') out = { kind: 'flow', html: textToHtml(await decodeText(await rec.blob.arrayBuffer())) };
  else throw new Error('Bu dosya türü desteklenmiyor. PDF, Word (.docx), TXT ya da EPUB yükleyin.');
  docCache.set(key, out);
  return out;
}

// ---------- Okuyucu ekranı ----------
let R = null; // etkin okuyucu durumu

export async function renderReader(bookId, params) {
  const book = DB.getBook(bookId);
  if (!book) { view.innerHTML = `<div class="empty"><div class="e">🔍</div><h3>Kayıt bulunamadı</h3><a class="btn" href="#/">Geri dön</a></div>`; return; }
  if (!book.fileId) { go('#/book/' + bookId); return; }
  linkFonts();
  const prefs = readerPrefs();
  const isPdf = (book.fileType || '') === 'pdf';
  const mode = isPdf ? (book.readMode || 'orig') : 'flow';
  if (R && R.cleanup) R.cleanup();
  R = { book, mode, prefs, page: 0, pages: 1, isPdf };
  document.body.classList.add('reading');
  view.innerHTML = `<div class="reader" id="reader">
    <div class="rd-top">
      <button class="rd-ic" data-r="back" aria-label="Geri">‹</button>
      <div class="rd-title">${esc(book.title)}</div>
      ${isPdf ? `<button class="rd-ic" data-r="mode" title="${mode === 'orig' ? 'Metin görünümüne geç' : 'Orijinal görünüme geç'}">${mode === 'orig' ? '📝' : '📄'}</button>` : ''}
      <button class="rd-ic" data-r="reread" title="Bu sayfayı tekrar okunacaklara ekle">🔖</button>
      <button class="rd-ic" data-r="comment" title="Bu sayfaya yorum ekle">💬</button>
      <button class="rd-ic" data-r="marks" title="İşaretler ve alıntılar">📑</button>
      <button class="rd-ic" data-r="prefs" title="Okuma ayarları">Aa</button>
    </div>
    <div class="rd-stage" id="rd-stage"><div class="loading-box"><div class="spinner"></div><div id="rd-load">Kitap açılıyor…</div></div></div>
    <div class="rd-sel" id="rd-sel" hidden><button class="btn primary" data-r="save-sel">📥 Alıntılarıma aktar</button></div>
    <div class="rd-bottom">
      <button class="rd-ic" data-r="prev" aria-label="Önceki sayfa">‹</button>
      <button class="rd-page" data-r="goto" id="rd-page">…</button>
      <button class="rd-ic" data-r="next" aria-label="Sonraki sayfa">›</button>
    </div>
  </div>`;
  applyTheme();
  const stage = $('#rd-stage');
  try {
    const content = await loadContent(book, mode === 'text' ? 'text' : mode === 'orig' ? 'orig' : 'flow', (m) => { const l = $('#rd-load'); if (l) l.textContent = m; });
    if (!R || R.book.id !== book.id) return;
    R.content = content;
    if (content.kind === 'pdf') await setupPdf(stage, content.pdf, params);
    else await setupFlow(stage, content.html, params);
  } catch (err) {
    stage.innerHTML = `<div class="empty"><div class="e">⚠️</div><h3>Kitap açılamadı</h3><p>${esc(err.message)}</p><a class="btn" href="#/book/${book.id}">Kitap sayfasına dön</a></div>`;
    return;
  }
  bindReader();
}

function applyTheme() {
  const p = R.prefs, el = $('#reader'); if (!el) return;
  el.style.setProperty('--rd-bg', p.bg);
  el.style.setProperty('--rd-fg', p.fg || autoFg(p.bg));
  el.style.setProperty('--rd-font', fontCss(p.font));
  el.style.setProperty('--rd-size', p.size + 'px');
  el.style.setProperty('--rd-line', p.line);
  el.style.setProperty('--rd-margin', p.margin + 'px');
  el.classList.toggle('dark', lum(p.bg) < 0.45);
}

// ----- Akışkan metin -----
async function setupFlow(stage, html, params) {
  stage.innerHTML = `<div class="rd-view" id="rd-view"><div class="rd-flow" id="rd-flow">${html}</div></div>`;
  R.flow = $('#rd-flow'); R.viewEl = $('#rd-view');
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  applyHighlights();
  layoutFlow();
  const pos = params && params.get('pos') != null ? parseFloat(params.get('pos')) : (R.book.readPos && R.book.readPos.mode === R.mode ? R.book.readPos.frac : null);
  const pp = params && params.get('pdfpage');
  const qid = params && params.get('q');
  if (qid) { const mk = R.flow.querySelector(`mark[data-q="${qid}"]`); if (mk) { gotoPage(pageOfNode(mk), false); flash(mk); return; } }
  if (pp && R.mode === 'text') { const m = R.flow.querySelector(`[data-pdfpage="${pp}"]`); if (m) { gotoPage(pageOfNode(m), false); return; } }
  gotoPage(pos != null ? Math.round(pos * Math.max(0, R.pages - 1)) : 0, false);
}
function layoutFlow() {
  const v = R.viewEl; if (!v) return;
  const W = v.clientWidth, H = v.clientHeight, m = R.prefs.margin;
  const f = R.flow;
  f.style.height = H + 'px';
  f.style.columnWidth = (W - 2 * m) + 'px';
  f.style.columnGap = (2 * m) + 'px';
  f.style.padding = `0 ${m}px`;
  f.style.width = W + 'px';
  R.W = W;
  R.pages = Math.max(1, Math.round(f.scrollWidth / W));
}
function pageOfNode(node) {
  const r = node.getBoundingClientRect(), fr = R.flow.getBoundingClientRect();
  return Math.max(0, Math.min(R.pages - 1, Math.floor((r.left - fr.left + 2) / R.W)));
}
function textNodes(root) {
  const out = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest('.rd-pdfpage') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  let n; while ((n = w.nextNode())) out.push(n); return out;
}
function offsetOf(container, offset) {
  let pos = 0;
  for (const n of textNodes(R.flow)) { if (n === container) return pos + offset; pos += n.data.length; }
  // seçim bir öğenin içindeyse (metin düğümü değil)
  if (container.nodeType === 1) { const r = document.createRange(); r.setStart(R.flow, 0); r.setEnd(container, offset); return r.toString().length; }
  return pos;
}
function applyHighlights() {
  if (!R.flow) return;
  R.flow.querySelectorAll('mark.hl').forEach((m) => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); m.remove(); p.normalize(); });
  DB.quotesOf(R.book.id).forEach((q) => {
    const a = q.anchor;
    if (!a || a.kind !== 'flow' || a.mode !== R.mode) return;
    wrapRangeSafe(a.start, a.end, HL_COLORS[q.color] || HL_COLORS.yellow, q.id);
  });
}
function wrapRangeSafe(start, end, color, qid) {
  // Aynı aralığı tek seferde, düğümleri sırayla sararak işaretle
  const segs = []; let pos = 0;
  for (const n of textNodes(R.flow)) { const len = n.data.length; const s = Math.max(start, pos), e = Math.min(end, pos + len); if (s < e) segs.push([n, s - pos, e - pos]); pos += len; if (pos >= end) break; }
  segs.forEach(([n, s, e]) => {
    const r = document.createRange(); r.setStart(n, s); r.setEnd(n, e);
    const mk = document.createElement('mark'); mk.className = 'hl'; mk.style.background = color; mk.dataset.q = qid;
    try { r.surroundContents(mk); } catch (err) { /* atla */ }
  });
}

function flash(el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800); }

// ----- PDF orijinal görünüm -----
async function setupPdf(stage, pdf, params) {
  R.pdf = pdf; R.pages = pdf.numPages;
  stage.innerHTML = `<div class="rd-view pdf" id="rd-view"><div class="rd-pdf" id="rd-pdf"></div></div>`;
  R.viewEl = $('#rd-view');
  R.zoom = R.zoom || 1;
  let pp = params && params.get('pdfpage');
  const qid = params && params.get('q');
  if (qid) { const q = DB.getQuote(qid); if (q && q.anchor && q.anchor.kind === 'pdf') pp = q.anchor.page; }
  const start = pp ? parseInt(pp, 10) - 1 : (R.book.readPos && R.book.readPos.pdfPage ? R.book.readPos.pdfPage - 1 : 0);
  await gotoPage(Math.max(0, Math.min(R.pages - 1, start)), false);
}
let pdfRenderSeq = 0;
async function renderPdfPage(n) {
  const seq = ++pdfRenderSeq;
  const L = window.pdfjsLib;
  const page = await R.pdf.getPage(n + 1);
  if (seq !== pdfRenderSeq) return;
  const W = R.viewEl.clientWidth - 8;
  const base = page.getViewport({ scale: 1 });
  const scale = (W / base.width) * (R.zoom || 1);
  const vp = page.getViewport({ scale });
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const holder = $('#rd-pdf');
  holder.innerHTML = `<div class="rd-pdfpage-box" style="width:${vp.width}px;height:${vp.height}px;--scale-factor:${scale}"><canvas></canvas><div class="textLayer"></div><div class="hl-layer"></div></div>`;
  const box = holder.firstChild, canvas = box.querySelector('canvas');
  canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
  canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
  if (seq !== pdfRenderSeq) return;
  const tc = await page.getTextContent();
  const tl = box.querySelector('.textLayer');
  await new L.TextLayer({ textContentSource: tc, container: tl, viewport: vp }).render();
  drawPdfHighlights(n + 1);
  R.viewEl.scrollTop = 0;
}
function pdfLayerText(tl) { const nodes = textNodes(tl); return { nodes, text: nodes.map((x) => x.data).join('') }; }
function drawPdfHighlights(pageNo) {
  const box = $('.rd-pdfpage-box'); if (!box) return;
  const tl = box.querySelector('.textLayer'), layer = box.querySelector('.hl-layer');
  layer.innerHTML = '';
  const { nodes, text } = pdfLayerText(tl);
  const norm = (s) => s.replace(/\s+/g, ' ');
  const brect = box.getBoundingClientRect();
  DB.quotesOf(R.book.id).forEach((q) => {
    const a = q.anchor;
    if (!a || a.kind !== 'pdf' || a.page !== pageNo) return;
    let start = a.start, end = a.end;
    if (text.slice(start, end) !== a.text) { const i = norm(text).indexOf(norm(a.text)); if (i < 0) return; start = i; end = i + a.text.length; }
    const r = document.createRange(); let pos = 0, set = false;
    for (const n of nodes) {
      const len = n.data.length;
      if (!set && start < pos + len) { r.setStart(n, start - pos); set = true; }
      if (set && end <= pos + len) { r.setEnd(n, end - pos); break; }
      pos += len;
    }
    [...r.getClientRects()].forEach((c) => {
      const d = document.createElement('div'); d.className = 'pdf-hl'; d.dataset.q = q.id;
      d.style.cssText = `left:${c.left - brect.left}px;top:${c.top - brect.top}px;width:${c.width}px;height:${c.height}px;background:${HL_COLORS[q.color] || HL_COLORS.yellow}`;
      layer.appendChild(d);
    });
  });
}

// ----- Okuma süresi kaydı (Raporlar için) -----
// Sayfa çevirdikçe son etkinlikten bu yana geçen süre (en fazla 5 dk) okuma süresine eklenir.
let lastTick = 0, pendingMin = 0, pendingPages = 0, logTimer = null, logBookId = null;
function tickReading(pagesForward = 0) {
  if (R) logBookId = R.book.id;
  const now = Date.now();
  if (lastTick) pendingMin += Math.min(5, (now - lastTick) / 60000);
  lastTick = now;
  pendingPages += Math.max(0, pagesForward);
  clearTimeout(logTimer);
  logTimer = setTimeout(flushReading, 4000);
}
async function flushReading() {
  if (!logBookId || (pendingMin < 0.05 && !pendingPages)) return;
  const d = new Date(); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const id = `${date}_${logBookId}`;
  const cur = DB.S.readlog.get(id);
  const rec = cur && !cur.deleted ? { ...cur } : { id, date, bookId: logBookId, minutes: 0, pages: 0 };
  rec.minutes = Math.round((rec.minutes + pendingMin) * 10) / 10;
  rec.pages += pendingPages;
  pendingMin = 0; pendingPages = 0;
  await DB.save('readlog', rec);
}

// ----- Sayfa değiştirme -----
let saveTimer = null;
async function gotoPage(n, animate = true, dir = 0) {
  n = Math.max(0, Math.min(R.pages - 1, n));
  tickReading(n > R.page ? n - R.page : 0);
  const book = R.prefs.turn === 'book' && animate;
  const v = R.viewEl;
  if (book && v) { v.classList.remove('flip-next', 'flip-prev'); void v.offsetWidth; v.classList.add(dir < 0 ? 'flip-prev' : 'flip-next'); }
  R.page = n;
  if (R.mode === 'orig') await renderPdfPage(n);
  else {
    R.flow.style.transition = animate && R.prefs.turn !== 'book' ? 'transform .28s ease' : 'none';
    R.flow.style.transform = `translateX(${-n * R.W}px)`;
  }
  updatePageLabel();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePos, 700);
}
function currentPdfPage() {
  if (R.mode === 'orig') return R.page + 1;
  if (R.mode !== 'text') return null;
  let best = null;
  R.flow.querySelectorAll('.rd-pdfpage').forEach((m) => { if (pageOfNode(m) <= R.page) best = parseInt(m.dataset.pdfpage, 10); });
  return best || 1;
}
function updatePageLabel() {
  const el = $('#rd-page'); if (!el) return;
  const pct = R.pages > 1 ? Math.round((R.page / (R.pages - 1)) * 100) : 100;
  const pdfp = R.mode === 'text' ? currentPdfPage() : null;
  el.innerHTML = `${R.page + 1} / ${R.pages}${R.mode === 'orig' ? '' : ` · %${pct}`}${pdfp ? ` <small>(PDF s. ${pdfp})</small>` : ''}`;
  const marks = DB.pagemarksOf(R.book.id).filter((m) => samePage(m));
  const rr = $('[data-r="reread"]'); if (rr) rr.classList.toggle('on', marks.some((m) => m.kind === 'reread' && !m.done));
  const cm = $('[data-r="comment"]'); if (cm) cm.classList.toggle('on', marks.some((m) => m.kind === 'comment'));
}
function posNow() {
  return { mode: R.mode, frac: R.pages > 1 ? R.page / (R.pages - 1) : 0, page: R.page + 1, pdfPage: currentPdfPage() };
}
function samePage(m) {
  if (!m.pos) return false;
  if (R.mode === 'orig' || R.mode === 'text') return m.pos.pdfPage && m.pos.pdfPage === currentPdfPage() && (R.mode === 'orig' || Math.abs((m.pos.frac || 0) * (R.pages - 1) - R.page) < 0.5 || m.pos.mode === 'orig');
  return m.pos.mode === R.mode && Math.round((m.pos.frac || 0) * Math.max(0, R.pages - 1)) === R.page;
}
async function savePos() {
  if (!R) return;
  const b = DB.getBook(R.book.id); if (!b) return;
  b.readPos = posNow();
  b.lastReadAt = new Date().toISOString();
  if (R.mode === 'orig') { b.currentPage = R.page + 1; b.pages = b.pages || R.pages; }
  if (['okunacak', 'none'].includes(b.status || 'okunacak')) { b.status = 'okunuyor'; b.startDate = b.startDate || new Date().toISOString().slice(0, 10); }
  await DB.saveBook(b);
}

// ----- Seçim ve kaydetme -----
function currentSelection() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  const text = sel.toString().replace(/\s+\n/g, '\n').trim();
  if (!text) return null;
  if (R.mode === 'orig') {
    const tl = document.querySelector('.rd-pdfpage-box .textLayer');
    if (!tl || !tl.contains(r.commonAncestorContainer)) return null;
    const { nodes } = pdfLayerText(tl);
    let pos = 0, start = null, end = null;
    for (const n of nodes) { if (n === r.startContainer) start = pos + r.startOffset; if (n === r.endContainer) end = pos + r.endOffset; pos += n.data.length; }
    const raw = nodes.map((x) => x.data).join('');
    if (start == null || end == null) { const i = raw.indexOf(sel.toString()); start = i; end = i + sel.toString().length; }
    return { text, anchor: { kind: 'pdf', page: R.page + 1, start, end, text: raw.slice(start, end) }, page: String(R.page + 1) };
  }
  if (!R.flow || !R.flow.contains(r.commonAncestorContainer)) return null;
  const start = offsetOf(r.startContainer, r.startOffset), end = offsetOf(r.endContainer, r.endOffset);
  // Sayfa: seçimin başladığı yer (ekran sayfası); PDF metin görünümünde seçimden önceki son PDF sayfa işareti
  const rr = r.getClientRects()[0] || r.getBoundingClientRect(), fr = R.flow.getBoundingClientRect();
  const screenPage = Math.max(0, Math.min(R.pages - 1, Math.floor((rr.left - fr.left + 2) / R.W))) + 1;
  let pdfp = null;
  if (R.mode === 'text') {
    R.flow.querySelectorAll('.rd-pdfpage').forEach((m) => { if (m.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) pdfp = parseInt(m.dataset.pdfpage, 10); });
  }
  return { text, anchor: { kind: 'flow', mode: R.mode, start, end }, page: String(pdfp || screenPage) };
}
function saveSelection() {
  const s = currentSelection();
  if (!s) { toast('Önce kaydetmek istediğiniz metni seçin'); return; }
  window.getSelection().removeAllRanges();
  $('#rd-sel').hidden = true;
  if (!hooks.openQuoteEditor) return;
  // Kaynak / dipnot: orijinal dosyanın türü ve içindeki yer
  const kind = R.book.fileType || fileKind(R.book.fileName || '', '');
  const where = kind === 'pdf' ? `PDF s. ${s.anchor.kind === 'pdf' ? s.anchor.page : s.page}`
    : `${KIND_LABEL[kind] || 'Dosya'} ${R.pages > 1 ? `ekran s. ${s.page} / ${R.pages} (%${Math.round(((parseInt(s.page, 10) || 1) - 1) / Math.max(1, R.pages - 1) * 100)})` : ''}`.trim();
  const src = { kind, where, file: R.book.fileName || '', at: new Date().toISOString() };
  hooks.openQuoteEditor(null, R.book.id, { text: s.text, page: s.page, anchor: s.anchor, color: 'yellow', src, fromReader: true }, () => refreshMarks());
}
function refreshMarks() {
  if (!R) return;
  if (R.mode === 'orig') drawPdfHighlights(R.page + 1);
  else { const p = R.page; applyHighlights(); layoutFlow(); gotoPage(p, false); }
  updatePageLabel();
}

// ----- Sayfa işaretleri ve yorumları -----
async function toggleReread() {
  const marks = DB.pagemarksOf(R.book.id).filter((m) => m.kind === 'reread' && !m.done && samePage(m));
  if (marks.length) { for (const m of marks) await DB.remove('pagemarks', m.id); toast('Tekrar oku işareti kaldırıldı'); }
  else { await DB.save('pagemarks', { bookId: R.book.id, kind: 'reread', pos: posNow(), done: false }); toast('🔖 Bu sayfa Tekrar Oku listesine eklendi'); }
  updatePageLabel();
}
function pageComment(existing = null) {
  const s = openSheet({
    title: existing ? '💬 Sayfa yorumunu düzenle' : `💬 Sayfa ${(existing ? existing.pos.page : R.page + 1)} için yorum`,
    body: `<label class="field"><textarea id="pc-text" class="serif" rows="6" placeholder="Bu sayfa hakkında düşünceniz…">${esc(existing ? existing.text : '')}</textarea></label>
      ${existing ? `<p class="hint">Yazılış: ${esc(fmtDateTime(existing.createdAt))}</p>` : ''}`,
    foot: `${existing ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  $('[data-x="save"]', s).onclick = async () => {
    const text = $('#pc-text', s).value.trim(); if (!text) { toast('Yorum yazın'); return; }
    await DB.save('pagemarks', existing ? { ...existing, text } : { bookId: R.book.id, kind: 'comment', pos: posNow(), text });
    await closeSheet(); toast('Yorum kaydedildi ✓'); updatePageLabel();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => { if (await confirmDialog('Bu yorum silinsin mi?', 'Sil')) { await DB.remove('pagemarks', existing.id); updatePageLabel(); } };
  setTimeout(() => $('#pc-text', s).focus(), 250);
}
function commentClick() {
  const here = DB.pagemarksOf(R.book.id).filter((m) => m.kind === 'comment' && samePage(m));
  if (here.length) pageComment(here[0]); else pageComment();
}
function jumpTo(pos) {
  if (!pos) return;
  if (R.mode === 'orig') { if (pos.pdfPage) gotoPage(pos.pdfPage - 1, false); return; }
  if (R.mode === 'text' && pos.pdfPage && pos.mode !== 'text') { const m = R.flow.querySelector(`[data-pdfpage="${pos.pdfPage}"]`); if (m) { gotoPage(pageOfNode(m), false); return; } }
  gotoPage(Math.round((pos.frac || 0) * Math.max(0, R.pages - 1)), false);
}
function quotePos(q) {
  const a = q.anchor || {};
  if (a.kind === 'pdf') return { pdfPage: a.page, mode: 'orig' };
  if (a.kind === 'flow' && R.flow && a.mode === R.mode) {
    const mk = R.flow.querySelector(`mark[data-q="${q.id}"]`); if (mk) return { node: mk };
  }
  return null;
}
function openMarks() {
  const qs = DB.quotesOf(R.book.id).filter((q) => q.anchor).sort((a, b) => (parseInt(a.page, 10) || 0) - (parseInt(b.page, 10) || 0));
  const pms = DB.pagemarksOf(R.book.id).sort((a, b) => (a.pos?.frac || 0) - (b.pos?.frac || 0));
  const s = openSheet({
    title: '📑 İşaretler ve alıntılar',
    body: `${!qs.length && !pms.length ? '<p class="muted">Henüz işaret yok. Metin seçip “Alıntılarıma aktar”a basın; 🔖 ile sayfa işaretleyin; 💬 ile sayfaya yorum yazın.</p>' : ''}
      ${qs.length ? `<div class="group-head">✍️ Alıntılar <span class="count">${qs.length}</span></div>${qs.map((q) => `<div class="mk-item" data-q="${q.id}"><span class="mk-dot" style="background:${HL_COLORS[q.color] || HL_COLORS.yellow}"></span><div><div class="mk-text">${esc((q.text || q.comment || '').slice(0, 160))}</div><small class="muted">s. ${esc(q.page || '?')}${q.stars ? ' · ' + '⭐'.repeat(q.stars) : ''}${q.comment && q.text ? ' · 💭' : ''}</small></div></div>`).join('')}` : ''}
      ${pms.length ? `<div class="group-head">📌 Sayfa işaretleri <span class="count">${pms.length}</span></div>${pms.map((m) => `<div class="mk-item" data-pm="${m.id}"><span>${m.kind === 'reread' ? (m.done ? '✅' : '🔖') : '💬'}</span><div><div class="mk-text">${m.kind === 'reread' ? 'Tekrar okunacak sayfa' : esc(m.text.slice(0, 160))}</div><small class="muted">s. ${esc(m.pos?.pdfPage || m.pos?.page || '?')} · ${esc(fmtDateTime(m.createdAt))}</small></div></div>`).join('')}` : ''}`,
  });
  s.addEventListener('click', async (e) => {
    const qi = e.target.closest('[data-q]'), pi = e.target.closest('[data-pm]');
    if (qi) { const q = DB.getQuote(qi.dataset.q); await closeSheet(); const p = quotePos(q); if (p && p.node) gotoPage(pageOfNode(p.node), false); else if (p) jumpTo(p); }
    if (pi) { const m = DB.S.pagemarks.get(pi.dataset.pm); await closeSheet(); jumpTo(m.pos); }
  });
}

// ----- Okuma ayarları paneli -----
function openPrefs() {
  const p = R.prefs;
  const s = openSheet({
    title: 'Aa Okuma ayarları',
    body: `<div class="field"><span>Zemin rengi</span><div class="bg-row">${BG_PRESETS.map(([bg, fg, l]) => `<button type="button" class="bg-sw ${p.bg.toLowerCase() === bg.toLowerCase() ? 'on' : ''}" data-bg="${bg}" data-fg="${fg}" style="background:${bg};color:${fg}" title="${l}">Aa</button>`).join('')}
        <label class="bg-sw pick" title="İstediğiniz renk">🎨<input type="color" id="rp-color" value="${esc(p.bg)}"></label></div></div>
      <label class="field"><span>Yazı tipi</span><select id="rp-font">${FONTS.map(([k, l]) => `<option value="${k}" ${p.font === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="field"><span>Yazı boyutu: <b id="rp-size-v">${p.size}</b></span><input type="range" id="rp-size" min="13" max="34" value="${p.size}"></div>
      <div class="field"><span>Satır aralığı: <b id="rp-line-v">${p.line}</b></span><input type="range" id="rp-line" min="1.2" max="2.2" step="0.1" value="${p.line}"></div>
      <div class="field"><span>Kenar boşluğu: <b id="rp-margin-v">${p.margin}</b></span><input type="range" id="rp-margin" min="8" max="60" value="${p.margin}"></div>
      <div class="field"><span>Sayfa çevirme</span><div class="seg"><button type="button" class="${p.turn !== 'book' ? 'on' : ''}" data-turn="slide">↔ Kaydırma</button><button type="button" class="${p.turn === 'book' ? 'on' : ''}" data-turn="book">📖 Kitap gibi</button></div></div>
      ${R.mode === 'orig' ? `<div class="field"><span>Yakınlaştırma</span><div class="row-actions"><button type="button" class="btn sm" data-z="-1">－</button><button type="button" class="btn sm" data-z="0">Sığdır</button><button type="button" class="btn sm" data-z="1">＋</button></div><p class="hint">PDF orijinal görünümde yazı tipi değiştirilemez; 📝 ile metin görünümüne geçebilirsiniz.</p></div>` : ''}
      <p class="hint">Bu ayarlar tüm kitaplarda geçerli olur. Ayarlar → 📖 Okuma görünümü'nden de değiştirebilirsiniz.</p>`,
  });
  const apply = (patch, relayout = true) => {
    Object.assign(R.prefs, patch); savePrefs(R.prefs); applyTheme();
    if (R.mode === 'orig') { if (patch.bg) renderPdfPage(R.page); return; }
    if (relayout) { const frac = R.pages > 1 ? R.page / (R.pages - 1) : 0; layoutFlow(); gotoPage(Math.round(frac * Math.max(0, R.pages - 1)), false); }
  };
  s.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bg]');
    if (b) { s.querySelectorAll('.bg-sw').forEach((x) => x.classList.toggle('on', x === b)); apply({ bg: b.dataset.bg, fg: b.dataset.fg }, false); }
    const t = e.target.closest('[data-turn]');
    if (t) { s.querySelectorAll('[data-turn]').forEach((x) => x.classList.toggle('on', x === t)); apply({ turn: t.dataset.turn }, false); }
    const z = e.target.closest('[data-z]');
    if (z) { const d = parseInt(z.dataset.z, 10); R.zoom = d === 0 ? 1 : Math.max(0.6, Math.min(3, (R.zoom || 1) + d * 0.25)); renderPdfPage(R.page); }
  });
  $('#rp-color', s).oninput = (e) => apply({ bg: e.target.value, fg: autoFg(e.target.value) }, false);
  $('#rp-font', s).onchange = (e) => apply({ font: e.target.value });
  [['size', 'rp-size', parseInt], ['line', 'rp-line', parseFloat], ['margin', 'rp-margin', parseInt]].forEach(([k, id, fn]) => {
    const inp = $('#' + id, s);
    inp.oninput = () => { $('#' + id + '-v', s).textContent = inp.value; };
    inp.onchange = () => apply({ [k]: fn(inp.value, 10) });
  });
}

function gotoDialog() {
  const s = openSheet({
    title: 'Sayfaya git',
    body: `<label class="field"><span>Sayfa numarası (1–${R.pages})${R.mode === 'text' ? ' · ekran sayfası' : ''}</span><input id="go-n" type="number" inputmode="numeric" min="1" max="${R.pages}" value="${R.page + 1}"></label>
      ${R.mode === 'text' ? `<label class="field"><span>ya da PDF sayfa numarası</span><input id="go-p" type="number" inputmode="numeric" min="1" placeholder="ör. 45"></label>` : ''}
      <input type="range" id="go-r" min="1" max="${R.pages}" value="${R.page + 1}" style="width:100%">`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="go">Git</button>`,
  });
  const n = $('#go-n', s), r = $('#go-r', s);
  r.oninput = () => { n.value = r.value; };
  n.oninput = () => { r.value = n.value; };
  $('[data-x="go"]', s).onclick = async () => {
    const p = $('#go-p', s);
    await closeSheet();
    if (p && p.value) { const m = R.flow.querySelector(`[data-pdfpage="${parseInt(p.value, 10)}"]`); if (m) { gotoPage(pageOfNode(m), false); return; } }
    gotoPage((parseInt(n.value, 10) || 1) - 1, false);
  };
  setTimeout(() => { n.focus(); n.select(); }, 200);
}

// ----- Olaylar -----
function bindReader() {
  const root = $('#reader'); if (!root) return;
  const onClick = async (e) => {
    const b = e.target.closest('[data-r]');
    if (b) {
      const a = b.dataset.r;
      if (a === 'back') { history.length > 1 ? history.back() : go('#/book/' + R.book.id); }
      if (a === 'prev') gotoPage(R.page - 1, true, -1);
      if (a === 'next') gotoPage(R.page + 1, true, 1);
      if (a === 'goto') gotoDialog();
      if (a === 'prefs') openPrefs();
      if (a === 'marks') openMarks();
      if (a === 'reread') toggleReread();
      if (a === 'comment') commentClick();
      if (a === 'save-sel') saveSelection();
      if (a === 'mode') { const bk = DB.getBook(R.book.id); bk.readMode = R.mode === 'orig' ? 'text' : 'orig'; await DB.saveBook(bk); renderReader(bk.id, new URLSearchParams(`pdfpage=${currentPdfPage() || 1}`)); }
      return;
    }
    const mk = e.target.closest('mark.hl, .pdf-hl');
    if (mk && hooks.openQuoteEditor && window.getSelection().isCollapsed) { hooks.openQuoteEditor(mk.dataset.q, null, null, () => refreshMarks()); return; }
    // Kenarlara dokununca sayfa çevir
    const stage = e.target.closest('#rd-stage');
    if (stage && window.getSelection().isCollapsed && R.mode !== 'orig') {
      const x = e.clientX / window.innerWidth;
      if (x < 0.22) gotoPage(R.page - 1, true, -1); else if (x > 0.78) gotoPage(R.page + 1, true, 1);
    }
  };
  root.addEventListener('click', onClick);
  // Kaydırma (başparmakla sağa/sola)
  let sx = 0, sy = 0, st = 0;
  const stage = $('#rd-stage');
  stage.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (!window.getSelection().isCollapsed) return;
    if (R.mode === 'orig' && (R.zoom || 1) > 1.05) return; // yakınlaştırılmışken kaydırma sayfa içinde gezinmek içindir
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st < 800) { if (dx < 0) gotoPage(R.page + 1, true, 1); else gotoPage(R.page - 1, true, -1); }
  }, { passive: true });
  const onKey = (e) => {
    if (document.querySelector('.modal-bg')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') gotoPage(R.page + 1, true, 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') gotoPage(R.page - 1, true, -1);
  };
  document.addEventListener('keydown', onKey);
  const onSel = () => { const el = $('#rd-sel'); if (!el) return; el.hidden = !currentSelection(); };
  document.addEventListener('selectionchange', onSel);
  let rt = null;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (!R) return; if (R.mode === 'orig') renderPdfPage(R.page); else { const frac = R.pages > 1 ? R.page / (R.pages - 1) : 0; layoutFlow(); gotoPage(Math.round(frac * Math.max(0, R.pages - 1)), false); } }, 250); };
  window.addEventListener('resize', onResize);
  lastTick = Date.now();
  R.cleanup = () => {
    tickReading(0); flushReading();
    document.removeEventListener('keydown', onKey); document.removeEventListener('selectionchange', onSel); window.removeEventListener('resize', onResize);
    document.body.classList.remove('reading');
    if (R.mode !== 'orig') savePos();
  };
}

/** Okuyucudan çıkılınca (başka sayfaya gidilince) çağrılır */
export function leaveReader() { if (R && R.cleanup) { R.cleanup(); } R = null; }
/** Kaydedilen alıntı okuyucudaysa vurguları yenile */
export function readerRefresh() { if (R) refreshMarks(); }
