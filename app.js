import * as DB from './db.js';
import * as AI from './ai.js';
import * as EX from './export.js';

const { esc } = EX;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view');
const modalRoot = $('#modal-root');

// ================= Yardımcılar =================
const COLORS = [['#7C5CFF', '#FF5DA2'], ['#FF6B57', '#FFB020'], ['#10B8A6', '#2F9BFF'], ['#FF5DA2', '#FFB020'], ['#2F9BFF', '#7C5CFF'], ['#10B8A6', '#7CD957'], ['#FF8A3D', '#FF5D7A']];
const TAG_COLORS = ['#7C5CFF', '#FF5DA2', '#10B8A6', '#FF6B57', '#2F9BFF', '#FFB020', '#8E5CF7', '#13A88F'];
const STATUS = { okunuyor: '📖 Okunuyor', okunacak: '🕮 Okunacak', bitti: '✅ Bitti' };
const KIND = { alinti: 'Alıntı', not: 'Not', tekrar: 'Tekrar okunacak' };
const STYLE_NAMES = { page: 'Sadece sayfa (s. 45)', apa: 'APA 7', mla: 'MLA 9', chicago: 'Chicago' };

function hashStr(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function coverHtml(b) {
  if (b.cover) return `<div class="cover"><img src="${esc(b.cover)}" alt=""></div>`;
  const [a, c] = COLORS[hashStr(b.title) % COLORS.length];
  return `<div class="cover" style="background:linear-gradient(150deg,${a},${c})"><span>${esc(b.title)}</span></div>`;
}
function today() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function fmtDate(s) { if (!s) return ''; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}.${m}.${y}`; }
function norm(s) {
  return String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }[c]));
}
function highlight(text, terms) {
  text = String(text || '');
  if (!terms || !terms.length) return esc(text);
  const n = norm(text);
  if (n.length !== text.length) return esc(text);
  const marks = new Array(text.length).fill(false);
  terms.forEach((t) => { if (!t) return; let i = n.indexOf(t); while (i >= 0) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = n.indexOf(t, i + t.length); } });
  let out = '', on = false;
  for (let i = 0; i < text.length; i++) {
    if (marks[i] && !on) { out += '<mark>'; on = true; }
    if (!marks[i] && on) { out += '</mark>'; on = false; }
    out += esc(text[i]);
  }
  return out + (on ? '</mark>' : '');
}
let toastTimer;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function pageNum(p) { const n = parseInt(p, 10); return isNaN(n) ? null : n; }
function sortQuotes(qs) { return [...qs].sort((a, b) => (pageNum(a.page) ?? 1e9) - (pageNum(b.page) ?? 1e9) || (a.createdAt || '').localeCompare(b.createdAt || '')); }
function allTags() {
  const m = new Map();
  DB.allQuotes().forEach((q) => (q.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
}
function rereadItems() { return DB.allQuotes().filter((q) => q.reread); }
function dueCount() { const t = today(); return rereadItems().filter((q) => !q.reread.done && (q.reread.due ? q.reread.due <= t : false)).length; }
function chapterFor(book, page) {
  const p = pageNum(page);
  const toc = book.toc || [];
  if (p == null || !toc.length) return '';
  let idx = -1;
  toc.forEach((t, i) => { const tp = pageNum(t.page); if (tp != null && tp <= p) idx = i; });
  if (idx < 0) return '';
  const item = toc[idx];
  for (let j = idx - 1; j >= 0; j--) {
    if ((toc[j].level || 1) < (item.level || 1)) return `${toc[j].title} › ${item.title}`;
  }
  return item.title;
}
function tocToText(toc) { return (toc || []).map((t) => '  '.repeat(Math.max(0, (t.level || 1) - 1)) + t.title + (t.page ? ' | ' + t.page : '')).join('\n'); }
function textToToc(text) {
  return String(text || '').split(/\r?\n/).map((raw) => {
    if (!raw.trim()) return null;
    const lead = raw.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length;
    const level = Math.min(3, Math.floor(lead / 2) + 1);
    let line = raw.trim(), page = '';
    const bar = line.lastIndexOf('|');
    if (bar >= 0) { page = line.slice(bar + 1).trim(); line = line.slice(0, bar).trim(); }
    else { const m = line.match(/^(.*?)(?:\s*[.…·]{2,}\s*|\t+|\s{3,})(\d{1,4})$/); if (m) { line = m[1].trim(); page = m[2]; } }
    return { title: line, page, level };
  }).filter(Boolean);
}
function fileToDataUrl(blob, maxSide = 360, quality = 0.82) {
  return AI.loadImage(blob).then((img) => {
    const s = Math.min(1, maxSide / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  });
}
function pickFiles({ accept = 'image/*', multiple = false, capture = false } = {}) {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
    if (capture) inp.setAttribute('capture', 'environment');
    inp.style.display = 'none';
    inp.onchange = () => { resolve([...(inp.files || [])]); inp.remove(); };
    document.body.appendChild(inp);
    inp.click();
  });
}
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); toast('Panoya kopyalandı'); }
  catch (e) { prompt('Kopyalayın:', s); }
}
function settings() { return DB.getSettings(); }

// ================= Modal (alt sayfa) =================
let modalOpen = false;
let modalOnClose = null;
let modalLocked = false;

function openSheet({ title, body, foot = '', onClose = null, locked = false }) {
  if (!modalOpen) { try { history.pushState({ kn: 'modal' }, ''); } catch (e) { /* yok say */ } }
  else if (modalOnClose) { const prev = modalOnClose; modalOnClose = null; prev(); }
  modalOpen = true; modalOnClose = onClose; modalLocked = locked;
  modalRoot.innerHTML = `<div class="modal-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><h3>${esc(title)}</h3>${locked ? '' : '<button class="x" data-act="close-sheet" aria-label="Kapat">✕</button>'}</div>
    <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div></div>`;
  const sheet = $('.sheet', modalRoot);
  $('.modal-bg', modalRoot).addEventListener('click', (e) => { if (e.target.classList.contains('modal-bg') && !modalLocked) closeSheet(); });
  return sheet;
}
function dropSheet() {
  modalOpen = false; modalLocked = false;
  modalRoot.innerHTML = '';
  const cb = modalOnClose; modalOnClose = null;
  if (cb) cb();
}
function closeSheet() {
  return new Promise((resolve) => {
    if (!modalOpen) return resolve();
    dropSheet();
    if (history.state && history.state.kn === 'modal') {
      const h = () => { window.removeEventListener('popstate', h); resolve(); };
      window.addEventListener('popstate', h);
      history.back();
    } else resolve();
  });
}
window.addEventListener('popstate', () => { if (modalOpen) dropSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen && !modalLocked) closeSheet(); });

function confirmDialog(msg, okLabel = 'Evet', danger = true) {
  return new Promise((resolve) => {
    let answered = false;
    const s = openSheet({
      title: 'Emin misiniz?',
      body: `<p>${esc(msg)}</p>`,
      foot: `<button class="btn" data-x="no">Vazgeç</button><button class="btn ${danger ? 'coral' : 'primary'}" data-x="yes">${esc(okLabel)}</button>`,
      onClose: () => { if (!answered) resolve(false); },
    });
    $('[data-x="no"]', s).onclick = () => { answered = true; closeSheet().then(() => resolve(false)); };
    $('[data-x="yes"]', s).onclick = () => { answered = true; closeSheet().then(() => resolve(true)); };
  });
}

function loadingSheet(msg) {
  openSheet({ title: 'Lütfen bekleyin', body: `<div class="loading-box"><div class="spinner"></div><div id="load-msg">${esc(msg)}</div></div>`, locked: true });
}
function setLoading(msg) { const el = $('#load-msg'); if (el) el.textContent = msg; }

// ================= Yönlendirme =================
let lastPath = null;
function parseHash() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(qs || ''), path };
}
function route() {
  const { parts, params, path } = parseHash();
  const navKey = !parts.length || parts[0] === 'book' || parts[0] === 'new-book' ? 'home' : parts[0] === 'tag' ? 'tags' : parts[0];
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));
  try {
    if (!parts.length) renderHome();
    else if (parts[0] === 'book' && parts[2] === 'edit') renderBookForm(parts[1]);
    else if (parts[0] === 'book') renderBook(parts[1]);
    else if (parts[0] === 'new-book') renderBookForm(null);
    else if (parts[0] === 'search') renderSearch(params.get('q') || '');
    else if (parts[0] === 'reread') renderReread();
    else if (parts[0] === 'tags') renderTags();
    else if (parts[0] === 'tag') renderTag(parts[1]);
    else if (parts[0] === 'settings') renderSettings();
    else renderHome();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><div class="e">😕</div><h3>Bir hata oluştu</h3><p>${esc(err.message)}</p></div>`;
  }
  if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; }
  updateBadge();
}
const rerender = () => route();
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function updateBadge() {
  const n = dueCount();
  const b = $('#reread-badge');
  b.hidden = !n; b.textContent = n;
}

// ================= Ana sayfa =================
function bookCard(b) {
  const qn = DB.quotesOf(b.id).length;
  const pct = b.pages && b.currentPage ? Math.min(100, Math.round((b.currentPage / b.pages) * 100)) : 0;
  return `<a class="book-card" href="#/book/${b.id}">${coverHtml(b)}<div class="bc-body">
    <div class="bc-title">${esc(b.title)}</div><div class="bc-author">${esc(b.author || '—')}</div>
    ${b.status === 'okunuyor' && pct ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ''}
    <div class="bc-foot"><span>✍️ ${qn}</span>${b.rating ? `<span>${'⭐'.repeat(b.rating)}</span>` : b.status === 'okunuyor' && pct ? `<span>%${pct}</span>` : ''}</div></div></a>`;
}

function renderHome() {
  const bs = DB.books();
  const qs = DB.allQuotes();
  const s = settings();
  let h = `<section class="hero"><h1>📚 Kitap Notlarım</h1><p>Aklınıza gelen bir fikri yazın; hangi kitabın hangi sayfasında olduğunu bulalım.</p>
    <form class="searchbar" id="home-search"><input name="q" placeholder="Konu, cümle, yazar…" autocomplete="off" enterkeyhint="search"><button>Ara</button></form></section>`;
  if (!bs.length) {
    h += `<div class="empty"><div class="e">📖</div><h3>Henüz kitap yok</h3><p>İlk kitabınızı ekleyin; sonra altını çizdiğiniz yerlerin fotoğrafını çekerek alıntı kaydedin.</p>
      <a class="btn primary" href="#/new-book">＋ İlk kitabı ekle</a></div>
      <div class="card small"><b>Nasıl çalışır?</b><ol class="muted" style="padding-left:18px;margin:6px 0 0">
      <li>Kitabı ekleyin (ISBN ya da künye sayfasının fotoğrafıyla otomatik doldurabilirsiniz).</li>
      <li>Roman değilse içindekiler sayfasının fotoğrafını yükleyin.</li>
      <li>Altını çizdiğiniz sayfanın fotoğrafını çekin, gerekirse kırpın; metin sayfa numarasıyla kaydedilir.</li>
      <li>Kitap bitince PDF, Word ya da Excel olarak alın; özet çıkarın.</li></ol></div>`;
    view.innerHTML = h;
    bindHomeSearch();
    return;
  }
  h += `<div class="stats"><div class="stat"><b>${bs.length}</b><span>Kitap</span></div><div class="stat"><b>${qs.length}</b><span>Alıntı/not</span></div><div class="stat"><b>${bs.filter((b) => b.status === 'okunuyor').length}</b><span>Okunuyor</span></div></div>`;
  const due = dueCount();
  if (due) h += `<a class="banner coral" href="#/reread" style="text-decoration:none;color:inherit"><span style="font-size:22px">🔖</span><span class="grow">Bugün tekrar okumanız gereken <b>${due}</b> bölüm var.</span><span>›</span></a>`;
  const daysSince = s.lastBackup ? Math.floor((Date.now() - new Date(s.lastBackup).getTime()) / 864e5) : null;
  if (qs.length >= 5 && (daysSince === null || daysSince >= 14)) {
    h += `<div class="banner sun"><span style="font-size:22px">💾</span><span class="grow">${daysSince === null ? 'Henüz yedek almadınız.' : `Son yedek ${daysSince} gün önce.`} Verileriniz yalnızca bu cihazda duruyor.</span><button class="btn sm sun" data-act="backup">Yedek al</button></div>`;
  }
  for (const st of ['okunuyor', 'okunacak', 'bitti']) {
    const list = bs.filter((b) => (b.status || 'okunacak') === st).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (!list.length) continue;
    h += `<div class="section-title">${STATUS[st]} <span class="count">${list.length}</span></div><div class="book-grid">${list.map(bookCard).join('')}</div>`;
  }
  h += `<a class="fab" href="#/new-book">＋ Kitap</a>`;
  view.innerHTML = h;
  bindHomeSearch();
}
function bindHomeSearch() {
  const f = $('#home-search');
  if (f) f.onsubmit = (e) => { e.preventDefault(); const q = f.q.value.trim(); go('#/search?q=' + encodeURIComponent(q)); };
}

// ================= Kitap detayı =================
const bookTab = {};
const quoteFilter = {};

function quoteCard(q, { showBook = false, terms = null, reason = '' } = {}) {
  const b = DB.getBook(q.bookId);
  const pl = EX.pageLabel(q);
  const long = (q.text || '').length > 420;
  return `<article class="q-card k-${q.kind}">
    ${q.text ? `<div class="q-text ${long ? 'clamp' : ''}" data-act="expand">${highlight(q.text, terms)}</div>` : ''}
    <div class="q-ref">
      ${showBook && b ? `<a class="q-book" href="#/book/${b.id}">📘 ${esc(b.title)}</a>` : ''}
      ${pl ? `<span class="badge page">s. ${esc(pl)}</span>` : ''}
      ${q.kind !== 'alinti' ? `<span class="badge kind-${q.kind}">${KIND[q.kind]}</span>` : ''}
      ${q.favorite ? '<span class="badge fav">★</span>' : ''}
      ${q.chapter ? `<span class="small">${esc(q.chapter)}</span>` : ''}
    </div>
    ${q.tags && q.tags.length ? `<div class="q-ref">${q.tags.map((t) => `<a class="chip" href="#/tag/${encodeURIComponent(t)}">#${highlight(t, terms)}</a>`).join('')}</div>` : ''}
    ${q.comment ? `<div class="q-comment">💭 ${highlight(q.comment, terms)}</div>` : ''}
    ${q.reread && !q.reread.done ? `<div class="q-ref"><span class="badge kind-tekrar">🔖 Tekrar oku${q.reread.due ? ' · ' + fmtDate(q.reread.due) : ''}</span></div>` : ''}
    ${reason ? `<div class="q-reason">🤖 ${esc(reason)}</div>` : ''}
    <div class="q-actions">
      <button data-act="related" data-id="${q.id}" title="Diğer kitaplardaki bağlantılı alıntılar">🔗 Bağlantılar</button>
      <button data-act="copy-quote" data-id="${q.id}" title="Kaynakla birlikte kopyala">📋</button>
      <button data-act="edit-quote" data-id="${q.id}">✏️ Düzenle</button>
    </div></article>`;
}

function renderBook(id) {
  const b = DB.getBook(id);
  if (!b) { view.innerHTML = `<div class="empty"><div class="e">🔍</div><h3>Kitap bulunamadı</h3><a class="btn" href="#/">Kitaplara dön</a></div>`; return; }
  const qs = DB.quotesOf(id);
  const tab = bookTab[id] || 'quotes';
  const pct = b.pages && b.currentPage ? Math.min(100, Math.round((b.currentPage / b.pages) * 100)) : 0;
  let h = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1></h1><a class="btn sm" href="#/book/${id}/edit">✏️ Düzenle</a></div>
    <div class="book-head">${coverHtml(b)}<div style="min-width:0;flex:1">
      <h2>${esc(b.title)}</h2>${b.subtitle ? `<div class="sub">${esc(b.subtitle)}</div>` : ''}
      <div class="sub"><b>${esc(b.author || '')}</b></div>
      <div class="meta">${esc([b.publisher, b.year, b.edition && b.edition + '. baskı'].filter(Boolean).join(' · '))}</div>
      <span class="status-pill st-${b.status || 'okunacak'}">${STATUS[b.status || 'okunacak']}</span>
      ${b.pages ? `<div class="progress"><i style="width:${pct}%"></i></div><div class="small muted">${b.currentPage || 0} / ${b.pages} sayfa</div>` : ''}
    </div></div>
    <div class="tabs">
      <button class="tab ${tab === 'quotes' ? 'active' : ''}" data-act="tab" data-tab="quotes">✍️ Alıntılar<span class="c">${qs.length}</span></button>
      <button class="tab ${tab === 'toc' ? 'active' : ''}" data-act="tab" data-tab="toc">📑 İçindekiler${b.toc && b.toc.length ? `<span class="c">${b.toc.length}</span>` : ''}</button>
      <button class="tab ${tab === 'summary' ? 'active' : ''}" data-act="tab" data-tab="summary">🧾 Özet${b.summary ? ' ✓' : ''}</button>
      <button class="tab ${tab === 'info' ? 'active' : ''}" data-act="tab" data-tab="info">ℹ️ Bilgiler</button>
    </div>`;
  if (tab === 'quotes') h += bookQuotesTab(b, qs);
  else if (tab === 'toc') h += bookTocTab(b, qs);
  else if (tab === 'summary') h += bookSummaryTab(b, qs);
  else h += bookInfoTab(b);
  h += `<button class="fab" data-act="add-quote" data-book="${id}">＋ Alıntı</button>`;
  view.innerHTML = h;
  view.dataset.book = id;
  bindInfoTab(b);
}

function bookQuotesTab(b, qs) {
  const f = quoteFilter[b.id] || 'all';
  const filtered = sortQuotes(qs.filter((q) => f === 'all' || (f === 'fav' ? q.favorite : q.kind === f)));
  let h = `<div class="row-actions">
    <div class="seg" style="flex:1;min-width:260px">
      ${[['all', 'Hepsi'], ['alinti', 'Alıntı'], ['not', 'Not'], ['tekrar', 'Tekrar'], ['fav', '★']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="qfilter" data-f="${k}">${l}</button>`).join('')}
    </div>
    <button class="btn sm teal" data-act="export-book" data-book="${b.id}">⬇️ Dışa aktar</button></div>`;
  if (!qs.length) {
    h += `<div class="empty"><div class="e">✍️</div><h3>Henüz alıntı yok</h3><p>Altını çizdiğiniz sayfanın fotoğrafını çekin ya da elle yazın.</p>
      <button class="btn primary" data-act="add-quote" data-book="${b.id}">＋ Alıntı ekle</button></div>`;
  } else if (!filtered.length) h += `<p class="muted">Bu filtrede kayıt yok.</p>`;
  else h += filtered.map((q) => quoteCard(q)).join('');
  return h;
}

function bookTocTab(b, qs) {
  const toc = b.toc || [];
  let h = '';
  if (!toc.length) {
    h += `<div class="card"><p style="margin-top:0">${b.isNovel ? 'Romanlarda içindekiler genelde gerekmez, ama isterseniz ekleyebilirsiniz.' : 'İçindekiler sayfasının fotoğrafını yükleyin; başlıklar ve sayfa numaraları yazıya çevrilsin. Alıntılarınız hangi bölümde olduğunu otomatik bilir, özet de bölüm bölüm çıkar.'}</p>
      <div class="choice-grid"><button class="choice c1" data-act="toc-photo"><span class="e">📷</span>Fotoğraftan oku<small>Birden fazla sayfa seçebilirsiniz</small></button>
      <button class="choice c3" data-act="toc-edit"><span class="e">⌨️</span>Elle yaz</button></div></div>`;
    return h;
  }
  const pages = toc.map((t) => pageNum(t.page));
  h += `<div class="row-actions"><button class="btn sm" data-act="toc-edit">✏️ Düzenle</button><button class="btn sm" data-act="toc-photo">📷 Fotoğraftan yeniden oku</button></div><div class="card"><ul class="toc-list">`;
  toc.forEach((t, i) => {
    const start = pages[i];
    let end = null;
    for (let j = i + 1; j < toc.length; j++) if (pages[j] != null) { end = pages[j] - 1; break; }
    const n = start == null ? 0 : qs.filter((q) => { const p = pageNum(q.page); return p != null && p >= start && (end == null || p <= end); }).length;
    h += `<li class="l${t.level || 1}" style="padding-left:${((t.level || 1) - 1) * 18 + 4}px"><span>${esc(t.title)}${n ? `<span class="qc">${n}</span>` : ''}</span><span class="pg">${esc(t.page || '')}</span></li>`;
  });
  h += `</ul></div><p class="hint">Kırmızı sayılar o bölümdeki alıntı sayısıdır.</p>`;
  return h;
}

function bookSummaryTab(b, qs) {
  if (!b.summary) {
    return `<div class="card"><p style="margin-top:0">Alıntılarınız, notlarınız ve içindekiler kullanılarak kitabın genel bir özeti çıkarılır. Özeti sonra düzenleyebilir, PDF ya da Word olarak alabilirsiniz.</p>
      <p class="small muted">Şu an: ${qs.length} alıntı/not · ${(b.toc || []).length} içindekiler satırı</p>
      <button class="btn primary block" data-act="summary-gen" ${!qs.length && !(b.toc || []).length ? 'disabled' : ''}>🤖 Özet oluştur</button>
      <button class="btn ghost block mt" data-act="summary-edit">✍️ Kendim yazmak istiyorum</button></div>`;
  }
  return `<div class="row-actions"><button class="btn sm" data-act="summary-edit">✏️ Düzenle</button><button class="btn sm" data-act="summary-gen">🔄 Yeniden oluştur</button><button class="btn sm teal" data-act="export-book" data-book="${b.id}">⬇️ Dışa aktar</button></div>
    <div class="card summary">${EX.mdToHtml(b.summary)}</div>${b.summaryAt ? `<p class="hint">Son güncelleme: ${fmtDate(b.summaryAt)}</p>` : ''}`;
}

function bookInfoTab(b) {
  const rows = [['Kitap', b.title], ['Alt başlık', b.subtitle], ['Yazar', b.author], ['Çevirmen', b.translator], ['Yayınevi', b.publisher], ['Basım yeri', b.city], ['Basım yılı', b.year], ['Baskı', b.edition && b.edition + '. baskı'], ['ISBN', b.isbn], ['Sayfa sayısı', b.pages], ['Tür', b.isNovel ? 'Roman / kurgu' : 'Kurgu dışı'], ['Başlama', fmtDate(b.startDate)], ['Bitiş', fmtDate(b.endDate)]].filter((r) => r[1]);
  return `<div class="card"><b>📖 Okuma takibi</b>
      <div class="seg mt" id="st-seg">${Object.entries(STATUS).map(([k, l]) => `<button class="${(b.status || 'okunacak') === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="grid2 mt"><label class="field"><span>Kaldığım sayfa</span><input type="number" inputmode="numeric" id="cur-page" value="${esc(b.currentPage || '')}" min="0"></label>
      <label class="field"><span>Toplam sayfa</span><input type="number" inputmode="numeric" id="tot-page" value="${esc(b.pages || '')}" min="0"></label></div>
      <span class="small muted" style="font-weight:800">Puanım</span><div class="stars" id="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${(b.rating || 0) >= i ? 'on' : ''}" data-r="${i}" aria-label="${i} yıldız">⭐</button>`).join('')}</div>
    </div>
    <div class="card"><dl class="info-list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${b.notes ? `<p class="mt">${esc(b.notes)}</p>` : ''}</div>
    <div class="card"><b>📚 Kaynakça gösterimi</b>${['apa', 'mla', 'chicago'].map((st) => `<div class="mt small"><span class="badge page">${STYLE_NAMES[st]}</span> <span>${EX.citationHtml(b, st)}</span> <button class="btn sm ghost" data-act="copy-cite" data-style="${st}">📋</button></div>`).join('')}</div>
    <button class="btn danger block" data-act="del-book" data-book="${b.id}">🗑️ Kitabı sil</button>`;
}

function bindInfoTab(b) {
  const seg = $('#st-seg');
  if (!seg) return;
  seg.onclick = async (e) => {
    const btn = e.target.closest('[data-st]'); if (!btn) return;
    b.status = btn.dataset.st;
    if (b.status === 'okunuyor' && !b.startDate) b.startDate = today();
    if (b.status === 'bitti') { if (!b.endDate) b.endDate = today(); if (b.pages) b.currentPage = b.pages; }
    await DB.saveBook(b); rerender();
    if (b.status === 'bitti') toast('Tebrikler! 🎉 Özet ve dışa aktarma için ilgili sekmelere bakın.', 4000);
  };
  const saveNum = async () => {
    b.currentPage = parseInt($('#cur-page').value, 10) || 0;
    b.pages = parseInt($('#tot-page').value, 10) || '';
    if (b.currentPage && (b.status || 'okunacak') === 'okunacak') { b.status = 'okunuyor'; b.startDate = b.startDate || today(); }
    await DB.saveBook(b); rerender(); toast('Kaydedildi');
  };
  $('#cur-page').onchange = saveNum; $('#tot-page').onchange = saveNum;
  $('#stars').onclick = async (e) => {
    const btn = e.target.closest('[data-r]'); if (!btn) return;
    const r = parseInt(btn.dataset.r, 10);
    b.rating = b.rating === r ? 0 : r;
    await DB.saveBook(b); rerender();
  };
}

// ================= Kitap formu =================
async function lookupIsbn(isbn) {
  const clean = String(isbn).replace(/[^0-9Xx]/g, '');
  if (clean.length < 10) throw new Error('ISBN 10 ya da 13 haneli olmalı.');
  try {
    const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`);
    const j = await r.json();
    const d = j[`ISBN:${clean}`];
    if (d) {
      return {
        title: d.title || '', subtitle: d.subtitle || '', author: (d.authors || []).map((a) => a.name).join(', '),
        publisher: (d.publishers || []).map((p) => p.name).join(', '), year: ((d.publish_date || '').match(/\d{4}/) || [''])[0],
        pages: d.number_of_pages || '', city: ((d.publish_places || [])[0] || {}).name || '', coverUrl: d.cover && (d.cover.medium || d.cover.small), isbn: clean,
      };
    }
  } catch (e) { /* diğer kaynağa geç */ }
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`);
    const j = await r.json();
    const v = j.items && j.items[0] && j.items[0].volumeInfo;
    if (v) {
      return {
        title: v.title || '', subtitle: v.subtitle || '', author: (v.authors || []).join(', '), publisher: v.publisher || '',
        year: ((v.publishedDate || '').match(/\d{4}/) || [''])[0], pages: v.pageCount || '', isbn: clean,
        coverUrl: v.imageLinks && (v.imageLinks.thumbnail || '').replace('http://', 'https://'),
      };
    }
  } catch (e) { /* yok */ }
  return null;
}

async function detectIsbnFromImage(blob) {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const det = new window.BarcodeDetector({ formats: ['ean_13'] });
    const img = await AI.loadImage(blob);
    const codes = await det.detect(img);
    const c = codes.find((x) => /^97[89]\d{10}$/.test(x.rawValue));
    return c ? c.rawValue : null;
  } catch (e) { return null; }
}

function renderBookForm(id) {
  const b = id ? DB.getBook(id) : { status: 'okunacak', isNovel: false };
  if (!b) { go('#/'); return; }
  const v = (k) => esc(b[k] || '');
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${id ? 'Kitabı düzenle' : 'Yeni kitap'}</h1></div>
  <form id="book-form" autocomplete="off">
    <div class="card">
      <b>⚡ Hızlı doldur</b><p class="hint">ISBN'i yazın ya da kapağın / künye sayfasının (yayın bilgilerinin yazdığı sayfa) fotoğrafını çekin.</p>
      <div style="display:flex;gap:8px"><input class="input" name="isbn" placeholder="ISBN (ör. 9789750719387)" value="${v('isbn')}" inputmode="numeric" style="flex:1"><button type="button" class="btn sun" data-act="isbn-lookup">🔍 Bul</button></div>
      <button type="button" class="btn block mt" data-act="photo-fill">📷 Kapak / künye fotoğrafından doldur</button>
    </div>
    <div class="card">
      <label class="field"><span>Kitap adı *</span><input name="title" required value="${v('title')}"></label>
      <label class="field"><span>Alt başlık</span><input name="subtitle" value="${v('subtitle')}"></label>
      <label class="field"><span>Yazar(lar)</span><input name="author" value="${v('author')}" placeholder="Birden çoksa virgülle ayırın"></label>
      <label class="field"><span>Çevirmen</span><input name="translator" value="${v('translator')}"></label>
      <div class="grid2"><label class="field"><span>Yayınevi</span><input name="publisher" value="${v('publisher')}"></label>
      <label class="field"><span>Basım yeri</span><input name="city" value="${v('city')}" placeholder="İstanbul"></label></div>
      <div class="grid3"><label class="field"><span>Basım yılı</span><input name="year" inputmode="numeric" value="${v('year')}"></label>
      <label class="field"><span>Baskı</span><input name="edition" inputmode="numeric" value="${v('edition')}" placeholder="ör. 5"></label>
      <label class="field"><span>Sayfa sayısı</span><input name="pages" inputmode="numeric" value="${v('pages')}"></label></div>
      <label class="check"><input type="checkbox" name="isNovel" ${b.isNovel ? 'checked' : ''}> Roman / öykü (içindekiler gerekmez)</label>
    </div>
    <div class="card">
      <span class="small muted" style="font-weight:800">Durum</span>
      <div class="seg mt" id="form-st">${Object.entries(STATUS).map(([k, l]) => `<button type="button" class="${(b.status || 'okunacak') === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="grid2 mt"><label class="field"><span>Başlama tarihi</span><input type="date" name="startDate" value="${v('startDate')}"></label>
      <label class="field"><span>Bitiş tarihi</span><input type="date" name="endDate" value="${v('endDate')}"></label></div>
      <div style="display:flex;gap:12px;align-items:center"><div id="cover-prev" style="width:70px">${b.title || b.cover ? coverHtml({ title: b.title || '?', cover: b.cover }) : ''}</div>
      <div><button type="button" class="btn sm" data-act="cover-pick">🖼️ Kapak görseli</button>${b.cover ? ' <button type="button" class="btn sm ghost" data-act="cover-remove">Kaldır</button>' : ''}</div></div>
      <label class="field mt"><span>Kitap hakkında notum</span><textarea name="notes" rows="2">${v('notes')}</textarea></label>
    </div>
    <button class="btn primary block" type="submit">💾 Kaydet</button>
  </form>`;

  const form = $('#book-form');
  let status = b.status || 'okunacak';
  let cover = b.cover || '';
  $('#form-st').onclick = (e) => {
    const btn = e.target.closest('[data-st]'); if (!btn) return;
    status = btn.dataset.st;
    $$('#form-st button').forEach((x) => x.classList.toggle('on', x === btn));
    if (status === 'okunuyor' && !form.startDate.value) form.startDate.value = today();
    if (status === 'bitti' && !form.endDate.value) form.endDate.value = today();
  };
  const fill = (info, overwrite = false) => {
    let n = 0;
    ['title', 'subtitle', 'author', 'translator', 'publisher', 'city', 'year', 'edition', 'pages', 'isbn'].forEach((k) => {
      const val = info[k] != null ? String(info[k]).trim() : '';
      if (val && (overwrite || !form[k].value.trim())) { form[k].value = val; n++; }
    });
    return n;
  };
  const setCover = (url) => { cover = url; $('#cover-prev').innerHTML = coverHtml({ title: form.title.value || '?', cover }); };

  form.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'isbn-lookup') {
      act.disabled = true; act.textContent = '…';
      try {
        const info = await lookupIsbn(form.isbn.value);
        if (!info) toast('Bu ISBN ile kayıt bulunamadı. Künye fotoğrafını deneyin.', 4000);
        else {
          const n = fill(info);
          if (info.coverUrl && !cover) {
            try { const r = await fetch(info.coverUrl); if (r.ok) setCover(await fileToDataUrl(await r.blob())); } catch (err) { /* kapak alınamadı */ }
          }
          toast(n ? `${n} alan dolduruldu ✓` : 'Bilgiler zaten dolu');
        }
      } catch (err) { toast(err.message, 4000); }
      act.disabled = false; act.textContent = '🔍 Bul';
    }
    if (act.dataset.act === 'photo-fill') {
      const files = await pickFiles({ multiple: true });
      if (!files.length) return;
      // Önce barkoddan ISBN dene (ücretsiz)
      let filled = false;
      for (const f of files) {
        const code = await detectIsbnFromImage(f);
        if (code) {
          form.isbn.value = code;
          const info = await lookupIsbn(code).catch(() => null);
          if (info) { fill(info); filled = true; toast('Barkoddan bulundu ✓'); }
          break;
        }
      }
      if (filled) return;
      if (!AI.hasKey()) { toast('Fotoğraftan doldurma için Ayarlar’dan API anahtarı girin.', 4500); return; }
      loadingSheet('Kitap bilgileri okunuyor…');
      try {
        const info = await AI.bookInfoFromImages(files);
        await closeSheet();
        const n = fill(info);
        if (!cover && files.length === 1) setCover(await fileToDataUrl(files[0]));
        toast(n ? `${n} alan dolduruldu ✓ Kontrol edin.` : 'Yeni bilgi bulunamadı');
      } catch (err) { await closeSheet(); toast(err.message, 5000); }
    }
    if (act.dataset.act === 'cover-pick') {
      const [f] = await pickFiles();
      if (f) setCover(await fileToDataUrl(f));
    }
    if (act.dataset.act === 'cover-remove') { cover = ''; $('#cover-prev').innerHTML = ''; act.remove(); }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const isNew = !b.id;
    ['title', 'subtitle', 'author', 'translator', 'publisher', 'city', 'year', 'edition', 'isbn', 'startDate', 'endDate', 'notes'].forEach((k) => { b[k] = String(fd.get(k) || '').trim(); });
    b.pages = parseInt(fd.get('pages'), 10) || '';
    b.isNovel = !!fd.get('isNovel');
    b.status = status;
    b.cover = cover;
    if (!b.title) { toast('Kitap adı gerekli'); return; }
    await DB.saveBook(b);
    if (isNew && !b.isNovel) { bookTab[b.id] = 'toc'; toast('Kitap eklendi. İsterseniz içindekileri şimdi ekleyin.', 4000); }
    else toast('Kaydedildi ✓');
    if (isNew) location.replace('#/book/' + b.id); else go('#/book/' + b.id);
  };
}

// ================= Görsel kırpma =================
const CROP_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css';
const CROP_JS = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js';
let cropLoad = null;
function loadCropper() {
  if (window.Cropper) return Promise.resolve();
  cropLoad = cropLoad || new Promise((resolve, reject) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CROP_CSS; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = CROP_JS; s.onload = resolve; s.onerror = () => { cropLoad = null; reject(new Error('Kırpma aracı yüklenemedi')); };
    document.head.appendChild(s);
  });
  return cropLoad;
}

/** Görseli kırpma ekranında açar. Döner: Blob (kırpılmış ya da tamamı) veya null (iptal) */
async function cropImage(file, idx, total) {
  try { await loadCropper(); } catch (e) { return file; }
  return new Promise((resolve) => {
    let done = false;
    const url = URL.createObjectURL(file);
    const s = openSheet({
      title: total > 1 ? `Kırp (${idx + 1}/${total})` : 'Önemli kısmı seçin',
      body: `<p class="hint">Çerçeveyi sürükleyip köşelerinden boyutlandırın. Tam sayfa için “Tamamı”na basın.</p><div class="crop-wrap"><img id="crop-img" src="${url}" alt=""></div>
        <div class="row-actions"><button class="btn sm" data-c="rotL">↺ Döndür</button><button class="btn sm" data-c="rotR">↻ Döndür</button></div>`,
      foot: `<button class="btn" data-c="full">Tamamı</button><button class="btn primary" data-c="crop">✂️ Kırp</button>`,
      onClose: () => { URL.revokeObjectURL(url); if (!done) { done = true; resolve(null); } },
    });
    const img = $('#crop-img', s);
    let cropper = null;
    const init = () => { cropper = new window.Cropper(img, { viewMode: 1, autoCropArea: 0.92, background: false, responsive: true, dragMode: 'move', checkOrientation: true }); };
    if (img.complete) init(); else img.onload = init;
    s.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b || !cropper) return;
      const c = b.dataset.c;
      if (c === 'rotL') cropper.rotate(-90);
      if (c === 'rotR') cropper.rotate(90);
      if (c === 'full' || c === 'crop') {
        if (c === 'full') { const d = cropper.getImageData(); cropper.setData({ x: 0, y: 0, width: d.naturalWidth, height: d.naturalHeight }); }
        const canvas = c === 'full' && !cropper.getData().rotate ? null : cropper.getCroppedCanvas({ maxWidth: 2600, maxHeight: 2600, fillColor: '#fff' });
        done = true;
        if (!canvas) { resolve(file); return; }
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.9);
      }
    });
  });
}

// ================= Alıntı ekleme akışı =================
function openAddQuote(bookId) {
  const book = DB.getBook(bookId);
  const s = openSheet({
    title: 'Yeni kayıt',
    body: `<div class="choice-grid">
      <button class="choice c1" data-a="camera"><span class="e">📷</span>Fotoğraf çek<small>Sayfayı çekin, önemli yeri kırpın</small></button>
      <button class="choice c2" data-a="gallery"><span class="e">🖼️</span>Galeriden seç<small>Birden çok sayfa seçebilirsiniz</small></button>
      <button class="choice c3" data-a="manual"><span class="e">✍️</span>Elle yaz<small>Alıntı ya da kendi notunuz</small></button>
      <button class="choice c6" data-a="reread"><span class="e">🔖</span>Tekrar okunacak<small>Sayfa aralığı işaretleyin</small></button>
    </div>
    <p class="hint mt">💡 Bilgisayarda: kopyaladığınız bir ekran görüntüsünü bu pencere açıkken <b>Ctrl+V</b> ile yapıştırabilirsiniz.</p>`,
    onClose: () => document.removeEventListener('paste', onPaste),
  });
  const onPaste = (e) => {
    const items = [...((e.clipboardData && e.clipboardData.items) || [])].filter((i) => i.type.startsWith('image/'));
    if (!items.length) return;
    e.preventDefault();
    const files = items.map((i) => i.getAsFile()).filter(Boolean);
    document.removeEventListener('paste', onPaste);
    processImages(book, files);
  };
  document.addEventListener('paste', onPaste);
  s.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'manual') return openQuoteEditor(null, bookId);
    if (a === 'reread') return openQuoteEditor(null, bookId, { kind: 'tekrar', reread: { due: '', done: false } });
    const files = await pickFiles({ multiple: a === 'gallery', capture: a === 'camera' });
    if (files.length) { document.removeEventListener('paste', onPaste); processImages(book, files); }
  });
}

async function processImages(book, files) {
  const blobs = [];
  for (let i = 0; i < files.length; i++) {
    const c = await cropImage(files[i], i, files.length);
    if (c) blobs.push(c);
  }
  if (!blobs.length) { if (modalOpen) await closeSheet(); return; }
  if (!AI.hasKey()) {
    const s = openSheet({
      title: 'Yazıya çevirme için anahtar gerekli',
      body: `<p>Fotoğraftaki yazıyı metne çevirmek için Ayarlar sayfasından Claude API anahtarınızı bir kez girmeniz gerekir.</p>`,
      foot: `<button class="btn" data-x="manual">Elle yazacağım</button><button class="btn primary" data-x="settings">Ayarlar’a git</button>`,
    });
    $('[data-x="manual"]', s).onclick = () => openQuoteEditor(null, book.id);
    $('[data-x="settings"]', s).onclick = async () => { await closeSheet(); go('#/settings'); };
    return;
  }
  const thumbs = blobs.map((b) => `<img src="${URL.createObjectURL(b)}" alt="">`).join('');
  const s = openSheet({
    title: 'Ne kaydedilsin?',
    body: `<div class="thumbs">${thumbs}</div>
      <div class="choice-grid mt">
        <button class="choice c5" data-m="marked"><span class="e">🖍️</span>Sadece altı çizili yerler<small>İşaretli satırlar ayrı ayrı alıntı olur</small></button>
        <button class="choice c4" data-m="all"><span class="e">📄</span>Tüm metin<small>Kırptığım alanın hepsi tek alıntı olur</small></button>
      </div>`,
  });
  s.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const mode = b.dataset.m;
    loadingSheet('Yazı okunuyor…');
    const passages = [];
    const errors = [];
    for (let i = 0; i < blobs.length; i++) {
      setLoading(blobs.length > 1 ? `Görsel ${i + 1}/${blobs.length} okunuyor…` : 'Yazı okunuyor…');
      try {
        const res = await AI.ocrPassages(blobs[i], mode);
        (res.passages || []).forEach((p) => { if (p.text && p.text.trim()) passages.push({ text: p.text.trim(), page: (p.page || '').replace(/[^\d]/g, '') }); });
        if (mode === 'marked' && res.marked === false) errors.push(`Görsel ${i + 1}: işaret bulunamadı, tüm metin alındı.`);
      } catch (err) { errors.push(`Görsel ${i + 1}: ${err.message}`); }
    }
    if (!passages.length) {
      openSheet({ title: 'Metin alınamadı', body: `<p>${errors.map(esc).join('<br>') || 'Görselde metin bulunamadı.'}</p>`, foot: `<button class="btn primary" data-act="close-sheet">Tamam</button>` });
      return;
    }
    reviewPassages(book, passages, errors);
  });
}

function reviewPassages(book, passages, notes = []) {
  const s = openSheet({
    title: `${passages.length} alıntı bulundu`,
    body: `${notes.length ? `<div class="banner sun small">${notes.map(esc).join('<br>')}</div>` : ''}
      <p class="hint">Metni kontrol edin, gerekirse düzeltin ve sayfa numarasını yazın.</p>
      <div id="pass-list">${passages.map((p, i) => `<div class="card" data-i="${i}">
        <label class="field"><span>Metin</span><textarea class="serif" rows="5" data-k="text">${esc(p.text)}</textarea></label>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <label class="field" style="flex:1;margin:0"><span>Sayfa</span><input data-k="page" inputmode="numeric" value="${esc(p.page)}" placeholder="ör. 45"></label>
          <label class="field" style="flex:1.3;margin:0"><span>Tür</span><select data-k="kind"><option value="alinti">Alıntı</option><option value="not">Not</option><option value="tekrar">Tekrar okunacak</option></select></label>
          <button class="btn sm danger" data-rm="${i}" title="Bu pasajı çıkar">🗑️</button>
        </div></div>`).join('')}</div>
      <div class="field"><span>Hepsine etiket ekle (isteğe bağlı)</span>${tagInputHtml([])}</div>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Hepsini kaydet</button>`,
  });
  const tags = bindTagInput(s, []);
  s.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { rm.closest('.card').remove(); if (!$$('#pass-list .card', s).length) closeSheet(); }
  });
  $('[data-x="save"]', s).onclick = async () => {
    const cards = $$('#pass-list .card', s);
    let n = 0;
    for (const c of cards) {
      const text = $('[data-k="text"]', c).value.trim();
      if (!text) continue;
      const page = $('[data-k="page"]', c).value.trim();
      const kind = $('[data-k="kind"]', c).value;
      await DB.saveQuote({
        bookId: book.id, kind, text, page, pageEnd: '', chapter: chapterFor(book, page), tags: tags.get(), comment: '', favorite: false,
        reread: kind === 'tekrar' ? { due: '', done: false } : null,
      });
      n++;
    }
    await closeSheet();
    bookTab[book.id] = 'quotes';
    toast(`${n} kayıt eklendi ✓`);
    rerender();
  };
}

// ================= Etiket girişi =================
function tagInputHtml(tags) {
  return `<div class="tag-input" data-tags>${tags.map((t) => `<button type="button" class="chip x" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}<input placeholder="etiket yazıp Enter’a basın" enterkeyhint="done"></div><div class="tag-sugg"></div>`;
}
function bindTagInput(root, initial) {
  const box = $('[data-tags]', root);
  const input = $('input', box);
  const sugg = box.nextElementSibling;
  const list = [...initial];
  const all = allTags().map(([t]) => t);
  const render = () => {
    $$('.chip', box).forEach((c) => c.remove());
    list.forEach((t) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip x'; c.dataset.tag = t; c.textContent = t; box.insertBefore(c, input); });
    const q = norm(input.value.trim());
    const opts = all.filter((t) => !list.includes(t) && (!q || norm(t).includes(q))).slice(0, 10);
    sugg.innerHTML = opts.map((t) => `<button type="button" class="chip" data-add="${esc(t)}">+ ${esc(t)}</button>`).join('');
  };
  const add = (raw) => {
    raw.split(',').map((t) => t.trim().replace(/^#/, '').toLocaleLowerCase('tr')).filter(Boolean).forEach((t) => { if (!list.includes(t)) list.push(t); });
    input.value = ''; render();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); }
    if (e.key === 'Backspace' && !input.value && list.length) { list.pop(); render(); }
  });
  input.addEventListener('input', () => { if (input.value.includes(',')) add(input.value); else render(); });
  input.addEventListener('blur', () => { if (input.value.trim()) add(input.value); });
  box.addEventListener('click', (e) => { const c = e.target.closest('[data-tag]'); if (c) { list.splice(list.indexOf(c.dataset.tag), 1); render(); } else input.focus(); });
  sugg.addEventListener('click', (e) => { const c = e.target.closest('[data-add]'); if (c) { list.push(c.dataset.add); render(); } });
  render();
  return { get: () => { if (input.value.trim()) add(input.value); return [...list]; } };
}

// ================= Alıntı düzenleyici =================
function openQuoteEditor(qid, bookId, preset = {}) {
  const existing = qid ? DB.S.quotes.get(qid) : null;
  const q = existing ? { ...existing } : { bookId, kind: 'alinti', text: '', page: '', pageEnd: '', chapter: '', tags: [], comment: '', favorite: false, reread: null, ...preset };
  const book = DB.getBook(q.bookId);
  let kind = q.kind;
  const s = openSheet({
    title: existing ? 'Kaydı düzenle' : 'Yeni kayıt',
    body: `<div class="seg" id="kind-seg" style="margin-bottom:12px">${Object.entries(KIND).map(([k, l]) => `<button type="button" class="${kind === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
      <label class="field"><span id="text-label">Metin</span><textarea class="serif" rows="6" id="q-text" placeholder="Alıntıyı ya da notunuzu yazın">${esc(q.text)}</textarea></label>
      <div class="grid2"><label class="field"><span>Sayfa</span><input id="q-page" inputmode="numeric" value="${esc(q.page)}" placeholder="45"></label>
      <label class="field"><span>Bitiş sayfası (isteğe bağlı)</span><input id="q-page2" inputmode="numeric" value="${esc(q.pageEnd)}" placeholder="47"></label></div>
      <label class="field"><span>Bölüm</span><input id="q-chapter" value="${esc(q.chapter)}" placeholder="${(book.toc || []).length ? 'Sayfa yazınca otomatik dolar' : 'ör. 3. Bölüm'}"></label>
      <div class="field"><span>Etiketler (konu)</span>${tagInputHtml(q.tags || [])}</div>
      <label class="field"><span>💭 Benim düşüncem / yorumum</span><textarea id="q-comment" rows="3" placeholder="Bu alıntı bana ne düşündürdü?">${esc(q.comment)}</textarea></label>
      <label class="check"><input type="checkbox" id="q-fav" ${q.favorite ? 'checked' : ''}> ★ Favori</label>
      <label class="check"><input type="checkbox" id="q-rr" ${q.reread ? 'checked' : ''}> 🔖 Tekrar okunacaklar listesine ekle</label>
      <div id="rr-box" ${q.reread ? '' : 'hidden'}><label class="field"><span>Hatırlatma tarihi (isteğe bağlı)</span><input type="date" id="q-due" value="${esc((q.reread && q.reread.due) || '')}"></label>
        <div class="row-actions">${[['1 hafta', 7], ['1 ay', 30], ['3 ay', 90]].map(([l, d]) => `<button type="button" class="btn sm" data-days="${d}">${l} sonra</button>`).join('')}</div></div>`,
    foot: `${existing ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  const tags = bindTagInput(s, q.tags || []);
  const pageIn = $('#q-page', s), chIn = $('#q-chapter', s);
  let autoCh = !q.chapter;
  chIn.addEventListener('input', () => { autoCh = !chIn.value; });
  pageIn.addEventListener('input', () => { if (autoCh) chIn.value = chapterFor(book, pageIn.value); });
  const setKindUI = () => {
    $('#text-label', s).textContent = kind === 'not' ? 'Notum' : kind === 'tekrar' ? 'Neden tekrar okumalıyım? (isteğe bağlı)' : 'Alıntı metni';
    if (kind === 'tekrar') { $('#q-rr', s).checked = true; $('#rr-box', s).hidden = false; }
  };
  setKindUI();
  $('#kind-seg', s).onclick = (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    kind = b.dataset.k;
    $$('#kind-seg button', s).forEach((x) => x.classList.toggle('on', x === b));
    setKindUI();
  };
  $('#q-rr', s).onchange = (e) => { $('#rr-box', s).hidden = !e.target.checked; };
  s.addEventListener('click', (e) => {
    const d = e.target.closest('[data-days]'); if (!d) return;
    const dt = new Date(); dt.setDate(dt.getDate() + parseInt(d.dataset.days, 10));
    $('#q-due', s).value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  $('[data-x="save"]', s).onclick = async () => {
    const text = $('#q-text', s).value.trim();
    const page = pageIn.value.trim();
    if (!text && kind !== 'tekrar') { toast('Metin boş olamaz'); return; }
    if (kind === 'tekrar' && !text && !page) { toast('Sayfa ya da açıklama yazın'); return; }
    const rr = $('#q-rr', s).checked;
    Object.assign(q, {
      kind, text, page, pageEnd: $('#q-page2', s).value.trim(), chapter: chIn.value.trim(), tags: tags.get(),
      comment: $('#q-comment', s).value.trim(), favorite: $('#q-fav', s).checked,
      reread: rr ? { due: $('#q-due', s).value, done: q.reread ? !!q.reread.done && q.reread.due === $('#q-due', s).value : false } : null,
    });
    await DB.saveQuote(q);
    await closeSheet();
    if (!existing) bookTab[q.bookId] = 'quotes';
    toast('Kaydedildi ✓');
    rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => {
    if (await confirmDialog('Bu kayıt silinsin mi?', 'Sil')) { await DB.deleteQuote(q.id); toast('Silindi'); rerender(); }
  };
  if (!existing) setTimeout(() => $('#q-text', s).focus(), 250);
}

// ================= Bağlantılı alıntılar =================
function openRelated(qid) {
  const q = DB.S.quotes.get(qid);
  if (!q) return;
  const tags = q.tags || [];
  const rel = DB.allQuotes().filter((x) => x.id !== q.id && (x.tags || []).some((t) => tags.includes(t)));
  const byBook = new Map();
  rel.forEach((x) => { if (!byBook.has(x.bookId)) byBook.set(x.bookId, []); byBook.get(x.bookId).push(x); });
  let body = tags.length ? `<p class="hint">Aynı etiketleri taşıyan kayıtlar: ${tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join(' ')}</p>` : '<p class="hint">Bu kaydın etiketi yok. Etiket eklerseniz aynı konudaki diğer alıntılar burada görünür.</p>';
  if (rel.length) {
    const sortedBooks = [...byBook.keys()].sort((a, b) => (a === q.bookId) - (b === q.bookId));
    sortedBooks.forEach((bid) => {
      const b = DB.getBook(bid);
      body += `<div class="group-head">📘 ${esc(b.title)}${bid === q.bookId ? ' <span class="small muted">(aynı kitap)</span>' : ''}</div>` + sortQuotes(byBook.get(bid)).map((x) => quoteCard(x)).join('');
    });
  } else if (tags.length) body += '<p class="muted">Henüz aynı etiketle başka kayıt yok.</p>';
  body += `<div id="ai-rel"></div><button class="btn block mt" data-x="ai">🤖 Anlamca benzer alıntıları bul</button>`;
  const s = openSheet({ title: '🔗 Bağlantılı alıntılar', body });
  $('[data-x="ai"]', s).onclick = async (e) => {
    const btn = e.currentTarget;
    if (!AI.hasKey()) { toast('Bu özellik için Ayarlar’dan API anahtarı girin.'); return; }
    btn.disabled = true; btn.textContent = 'Aranıyor…';
    try {
      const entries = DB.allQuotes().filter((x) => x.id !== q.id).map((x) => ({ id: x.id, line: quoteLine(x) }));
      const matches = await AI.semanticSearch(`Şu alıntıyla anlamca ilişkili kayıtlar: "${(q.text || q.comment || '').slice(0, 600)}"`, entries);
      const html = matches.map((m) => { const x = DB.S.quotes.get(m.id); return x && !x.deleted ? quoteCard(x, { showBook: true, reason: m.reason }) : ''; }).join('');
      $('#ai-rel', s).innerHTML = `<div class="group-head">🤖 Anlamca benzer</div>${html || '<p class="muted">Benzer kayıt bulunamadı.</p>'}`;
      btn.remove();
    } catch (err) { toast(err.message, 4500); btn.disabled = false; btn.textContent = '🤖 Anlamca benzer alıntıları bul'; }
  };
}
function quoteLine(x) {
  const b = DB.getBook(x.bookId);
  return `${b ? b.title : ''}${b && b.author ? ' (' + b.author + ')' : ''} — s.${x.page || '?'} — ${(x.text || '').replace(/\s+/g, ' ').slice(0, 380)}${x.tags && x.tags.length ? ' | etiket: ' + x.tags.join(', ') : ''}${x.comment ? ' | yorum: ' + x.comment.replace(/\s+/g, ' ').slice(0, 160) : ''}`;
}

// ================= İçindekiler =================
async function tocFromPhotos(book) {
  const files = await pickFiles({ multiple: true });
  if (!files.length) return;
  if (!AI.hasKey()) { toast('Fotoğraftan okuma için Ayarlar’dan API anahtarı girin.', 4500); return; }
  loadingSheet(`İçindekiler okunuyor (${files.length} sayfa)…`);
  try {
    const items = await AI.ocrToc(files);
    await closeSheet();
    if (!items.length) { toast('Başlık bulunamadı'); return; }
    openTocEditor(book, items);
  } catch (err) { await closeSheet(); toast(err.message, 5000); }
}
function openTocEditor(book, items) {
  const s = openSheet({
    title: '📑 İçindekiler',
    body: `<p class="hint">Her satıra bir başlık. Sayfa numarasını <b>|</b> ile ayırın. Alt başlıklar için satır başına 2 boşluk koyun.<br>Örnek: <code>1. Bölüm | 15</code> ve <code>&nbsp;&nbsp;Giriş | 17</code></p>
      <label class="field"><textarea id="toc-text" rows="16" style="font-family:ui-monospace,Consolas,monospace;font-size:14px">${esc(tocToText(items))}</textarea></label>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  $('[data-x="save"]', s).onclick = async () => {
    book.toc = textToToc($('#toc-text', s).value);
    await DB.saveBook(book);
    // Bölümü boş olan alıntılara bölüm ata
    for (const q of DB.quotesOf(book.id)) {
      if (!q.chapter && q.page) { const ch = chapterFor(book, q.page); if (ch) { q.chapter = ch; await DB.saveQuote(q); } }
    }
    await closeSheet();
    toast('İçindekiler kaydedildi ✓');
    rerender();
  };
}

// ================= Özet =================
async function generateSummary(book) {
  if (!AI.hasKey()) { toast('Özet için Ayarlar’dan API anahtarı girin.', 4500); return; }
  if (book.summary && !(await confirmDialog('Mevcut özet yenisiyle değiştirilecek. Devam edilsin mi?', 'Yeniden oluştur', false))) return;
  loadingSheet('Özet hazırlanıyor… Bu işlem bir dakika kadar sürebilir.');
  try {
    const text = await AI.summarize(book, book.toc || [], sortQuotes(DB.quotesOf(book.id)));
    book.summary = text; book.summaryAt = new Date().toISOString();
    await DB.saveBook(book);
    await closeSheet();
    bookTab[book.id] = 'summary';
    toast('Özet hazır ✓');
    rerender();
  } catch (err) { await closeSheet(); toast(err.message, 5000); }
}
function editSummary(book) {
  const s = openSheet({
    title: '🧾 Özeti düzenle',
    body: `<p class="hint">Başlık için satıra <code>## </code>, madde için <code>- </code>, kalın için <code>**metin**</code> yazabilirsiniz.</p><label class="field"><textarea id="sum-text" class="serif" rows="18">${esc(book.summary || '')}</textarea></label>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  $('[data-x="save"]', s).onclick = async () => {
    book.summary = $('#sum-text', s).value.trim(); book.summaryAt = new Date().toISOString();
    await DB.saveBook(book); await closeSheet(); toast('Kaydedildi ✓'); rerender();
  };
}

// ================= Dışa aktarma =================
function openExport(bookId) {
  const single = bookId ? DB.getBook(bookId) : null;
  const st = settings().citeStyle;
  const s = openSheet({
    title: single ? `⬇️ Dışa aktar: ${single.title}` : '⬇️ Tüm arşivi dışa aktar',
    body: `<div class="card" style="padding:10px 14px">
      ${[['summary', 'Özet', true], ['toc', 'İçindekiler', true], ['quotes', 'Alıntılar', true], ['notes', 'Notlarım', true], ['reread', 'Tekrar okunacaklar', false], ['comments', 'Alıntıların altındaki yorumlarım', true], ['tags', 'Etiketler', true]]
        .map(([k, l, on]) => `<label class="check"><input type="checkbox" data-o="${k}" ${on ? 'checked' : ''}> ${l}</label>`).join('')}
    </div>
    <label class="field"><span>Alıntının altındaki kaynak / sayfa gösterimi</span><select id="ex-style">${Object.entries(STYLE_NAMES).map(([k, l]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" id="ex-fn"> Word’de ayrıca sayfa altına gerçek dipnot ekle</label>
    <div class="choice-grid mt" style="grid-template-columns:1fr 1fr 1fr">
      <button class="choice c6" data-f="pdf"><span class="e">🖨️</span>PDF / Yazdır</button>
      <button class="choice c2" data-f="docx"><span class="e">📝</span>Word</button>
      <button class="choice c4" data-f="xlsx"><span class="e">📊</span>Excel</button>
    </div>
    <p class="hint mt">PDF için açılan yazdırma ekranında hedef olarak <b>“PDF olarak kaydet”</b>i seçin.</p>`,
  });
  s.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const opt = { style: $('#ex-style', s).value, footnotes: $('#ex-fn', s).checked };
    $$('[data-o]', s).forEach((c) => { opt[c.dataset.o] = c.checked; });
    const list = single ? [single] : DB.books().sort((a, c) => a.title.localeCompare(c.title, 'tr'));
    const sections = list.map((bk) => ({ book: bk, toc: bk.toc || [], quotes: DB.quotesOf(bk.id) }))
      .filter((sec) => single || sec.quotes.length || sec.book.summary);
    if (!sections.length) { toast('Dışa aktarılacak kayıt yok'); return; }
    const base = single ? EX.safeName(single.title) + ' - notlar' : 'Kitap Notlarım - ' + today();
    try {
      if (b.dataset.f === 'pdf') {
        await closeSheet();
        EX.printHtml(sections.map((sec) => EX.buildPrintHtml(sec.book, sec.toc, sec.quotes, opt)).join('<div style="break-after:page"></div>'));
        return;
      }
      b.disabled = true;
      const prev = b.innerHTML; b.innerHTML = '<span class="e">⏳</span>Hazırlanıyor';
      const blob = b.dataset.f === 'docx' ? await EX.buildDocx(sections, opt) : await EX.buildXlsx(sections, opt);
      const r = await EX.saveFile(blob, `${base}.${b.dataset.f}`);
      b.disabled = false; b.innerHTML = prev;
      if (r !== 'cancelled') toast(r === 'shared' ? 'Dosya paylaşıldı ✓' : 'Dosya indirildi ✓');
    } catch (err) { console.error(err); toast('Dışa aktarılamadı: ' + err.message, 5000); b.disabled = false; }
  });
}

// ================= Arama =================
let aiSearchCache = { q: '', matches: null };
function renderSearch(q) {
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 0);
  let h = `<div class="topbar"><h1>🔎 Ara</h1></div>
    <form class="searchbar card" id="search-form" style="padding:6px 6px 6px 14px"><input name="q" value="${esc(q)}" placeholder="Konu, fikir, cümle, yazar…" autocomplete="off" enterkeyhint="search"><button>Ara</button></form>`;
  if (!q) {
    h += `<div class="empty"><div class="e">💡</div><h3>Aklınıza ne geldi?</h3><p>Bir kelime, konu ya da hatırladığınız bir cümle yazın. Alıntılarda, yorumlarınızda, etiketlerde ve içindekiler başlıklarında aranır.</p><p class="small">Tam kelimeyi hatırlamıyorsanız <b>🤖 Anlamına göre ara</b>’yı kullanın.</p></div>`;
    view.innerHTML = h; bindSearch(); return;
  }
  const bs = DB.books();
  const bookHits = bs.filter((b) => terms.every((t) => norm([b.title, b.subtitle, b.author, b.publisher, b.translator].join(' ')).includes(t)));
  const tocHits = [];
  bs.forEach((b) => (b.toc || []).forEach((t) => { if (terms.every((x) => norm(t.title).includes(x))) tocHits.push({ b, t }); }));
  const qHits = DB.allQuotes().filter((x) => {
    const b = DB.getBook(x.bookId);
    const hay = norm([x.text, x.comment, (x.tags || []).join(' '), x.chapter, b.title, b.author].join(' '));
    return terms.every((t) => hay.includes(t));
  }).sort((a, c) => {
    const sa = terms.filter((t) => norm(a.text).includes(t)).length, sc = terms.filter((t) => norm(c.text).includes(t)).length;
    return sc - sa || (c.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  h += `<button class="btn block" data-act="ai-search" style="background:linear-gradient(130deg,#E1F8F5,#EFEAFF)">🤖 Anlamına göre ara <span class="small muted">(kelimeler birebir geçmese de bulur)</span></button><div id="ai-results"></div>`;
  if (!bookHits.length && !tocHits.length && !qHits.length) h += `<div class="empty"><div class="e">🤔</div><h3>Birebir eşleşme yok</h3><p>Yukarıdaki <b>Anlamına göre ara</b> düğmesini deneyin.</p></div>`;
  if (bookHits.length) h += `<div class="section-title">📘 Kitaplar <span class="count">${bookHits.length}</span></div><div class="book-grid">${bookHits.map(bookCard).join('')}</div>`;
  if (tocHits.length) {
    h += `<div class="section-title">📑 İçindekiler’de geçiyor <span class="count">${tocHits.length}</span></div><div class="card"><ul class="toc-list">`;
    tocHits.slice(0, 40).forEach(({ b, t }) => { h += `<li><span><a href="#/book/${b.id}" class="q-book" data-act="open-toc" data-book="${b.id}">${esc(b.title)}</a> — ${highlight(t.title, terms)}</span><span class="pg">${t.page ? 's. ' + esc(t.page) : ''}</span></li>`; });
    h += `</ul></div>`;
  }
  if (qHits.length) h += `<div class="section-title">✍️ Alıntı ve notlar <span class="count">${qHits.length}</span></div>${qHits.slice(0, 100).map((x) => quoteCard(x, { showBook: true, terms })).join('')}`;
  view.innerHTML = h;
  bindSearch();
  if (aiSearchCache.q === q && aiSearchCache.matches) showAiResults(aiSearchCache.matches);
}
function bindSearch() {
  const f = $('#search-form');
  f.onsubmit = (e) => { e.preventDefault(); const q = f.q.value.trim(); location.replace('#/search?q=' + encodeURIComponent(q)); };
  if (!f.q.value) setTimeout(() => f.q.focus(), 50);
}
async function runAiSearch() {
  const q = parseHash().params.get('q') || '';
  if (!q) return;
  if (!AI.hasKey()) { toast('Bu özellik için Ayarlar’dan API anahtarı girin.', 4500); return; }
  const box = $('#ai-results');
  box.innerHTML = '<div class="loading-box"><div class="spinner"></div>Anlamca ilgili kayıtlar aranıyor…</div>';
  const entries = [];
  DB.allQuotes().forEach((x) => entries.push({ id: x.id, line: quoteLine(x) }));
  DB.books().forEach((b) => {
    entries.push({ id: 'book:' + b.id, line: `KİTAP: ${b.title}${b.author ? ' — ' + b.author : ''}${b.summary ? ' — özet: ' + b.summary.replace(/\s+/g, ' ').slice(0, 400) : ''}` });
    (b.toc || []).forEach((t, i) => entries.push({ id: `toc:${b.id}:${i}`, line: `İÇİNDEKİLER BAŞLIĞI: ${b.title} — ${t.title}${t.page ? ' (s. ' + t.page + ')' : ''}` }));
  });
  if (!entries.length) { box.innerHTML = '<p class="muted">Arşiv boş.</p>'; return; }
  try {
    const matches = await AI.semanticSearch(q, entries);
    aiSearchCache = { q, matches };
    showAiResults(matches);
  } catch (err) { box.innerHTML = `<div class="banner coral">${esc(err.message)}</div>`; }
}
function showAiResults(matches) {
  const box = $('#ai-results');
  if (!box) return;
  if (!matches.length) { box.innerHTML = '<div class="banner sun">🤖 Anlamca ilgili kayıt bulunamadı.</div>'; return; }
  let h = `<div class="section-title">🤖 Anlamca ilgili <span class="count">${matches.length}</span></div>`;
  matches.forEach((m) => {
    if (m.id.startsWith('book:')) {
      const b = DB.getBook(m.id.slice(5));
      if (b) h += `<a class="card" href="#/book/${b.id}" style="display:block;text-decoration:none;color:inherit"><b>📘 ${esc(b.title)}</b> <span class="muted">${esc(b.author || '')}</span><div class="q-reason">🤖 ${esc(m.reason)}</div></a>`;
    } else if (m.id.startsWith('toc:')) {
      const [, bid, i] = m.id.split(':');
      const b = DB.getBook(bid); const t = b && (b.toc || [])[parseInt(i, 10)];
      if (t) h += `<div class="card"><a class="q-book" href="#/book/${b.id}" data-act="open-toc" data-book="${b.id}">📑 ${esc(b.title)}</a> — ${esc(t.title)} ${t.page ? `<span class="badge page">s. ${esc(t.page)}</span>` : ''}<div class="q-reason">🤖 ${esc(m.reason)}</div></div>`;
    } else {
      const x = DB.S.quotes.get(m.id);
      if (x && !x.deleted) h += quoteCard(x, { showBook: true, reason: m.reason });
    }
  });
  box.innerHTML = h;
}

// ================= Tekrar okunacaklar =================
function renderReread() {
  const items = rereadItems();
  const t = today();
  const groups = [
    ['⏰ Zamanı gelenler', items.filter((q) => !q.reread.done && q.reread.due && q.reread.due <= t)],
    ['📅 Yaklaşanlar', items.filter((q) => !q.reread.done && q.reread.due && q.reread.due > t).sort((a, b) => a.reread.due.localeCompare(b.reread.due))],
    ['🔖 Tarihsiz', items.filter((q) => !q.reread.done && !q.reread.due)],
  ];
  const done = items.filter((q) => q.reread.done);
  let h = `<div class="topbar"><h1>🔖 Tekrar Oku</h1></div>`;
  if (!items.length) {
    h += `<div class="empty"><div class="e">🔖</div><h3>Liste boş</h3><p>Bir kitabın sayfasında <b>＋ Alıntı → Tekrar okunacak</b> seçeneğiyle ya da herhangi bir alıntıyı düzenlerken işaretleyerek ekleyebilirsiniz.</p></div>`;
  }
  groups.forEach(([title, list]) => {
    if (!list.length) return;
    h += `<div class="section-title">${title} <span class="count">${list.length}</span></div>`;
    list.forEach((q) => { h += rereadCard(q); });
  });
  if (done.length) h += `<details class="mt"><summary class="section-title" style="cursor:pointer">✅ Tamamlananlar <span class="count">${done.length}</span></summary>${done.map(rereadCard).join('')}</details>`;
  view.innerHTML = h;
}
function rereadCard(q) {
  const b = DB.getBook(q.bookId);
  const pl = EX.pageLabel(q);
  return `<article class="q-card k-tekrar">
    <div class="q-ref"><a class="q-book" href="#/book/${b.id}">📘 ${esc(b.title)}</a>${pl ? `<span class="badge page">s. ${esc(pl)}</span>` : ''}${q.reread.due ? `<span class="badge kind-tekrar">📅 ${fmtDate(q.reread.due)}</span>` : ''}</div>
    ${q.chapter ? `<div class="small muted mt">${esc(q.chapter)}</div>` : ''}
    ${q.text ? `<div class="q-text clamp mt" data-act="expand" style="font-size:15px">${esc(q.text)}</div>` : ''}
    ${q.comment ? `<div class="q-comment">💭 ${esc(q.comment)}</div>` : ''}
    <div class="q-actions"><button data-act="edit-quote" data-id="${q.id}">✏️ Düzenle</button>
    <button data-act="reread-done" data-id="${q.id}" style="color:${q.reread.done ? 'var(--muted)' : 'var(--teal)'}">${q.reread.done ? '↩️ Geri al' : '✅ Okudum'}</button></div></article>`;
}

// ================= Etiketler =================
function renderTags() {
  const tags = allTags();
  let h = `<div class="topbar"><h1>🏷️ Etiketler</h1></div>`;
  if (!tags.length) h += `<div class="empty"><div class="e">🏷️</div><h3>Henüz etiket yok</h3><p>Alıntılarınıza “özgürlük”, “liderlik”, “zaman” gibi konu etiketleri ekleyin. Aynı konunun farklı kitaplarda nerelerde geçtiğini burada görürsünüz.</p></div>`;
  else {
    const max = tags[0][1];
    h += `<p class="hint">Bir etikete dokunduğunuzda o konunun geçtiği tüm kitaplar ve sayfalar listelenir.</p><div class="tag-cloud">${tags.map(([t, n], i) => `<a href="#/tag/${encodeURIComponent(t)}" style="background:${TAG_COLORS[i % TAG_COLORS.length]};font-size:${13 + Math.round((n / max) * 7)}px">#${esc(t)} <small style="opacity:.85">${n}</small></a>`).join('')}</div>`;
  }
  view.innerHTML = h;
}
function renderTag(tag) {
  const qs = DB.allQuotes().filter((q) => (q.tags || []).includes(tag));
  const byBook = new Map();
  qs.forEach((q) => { if (!byBook.has(q.bookId)) byBook.set(q.bookId, []); byBook.get(q.bookId).push(q); });
  let h = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>#${esc(tag)}</h1></div>
    <div class="banner teal">🔗 Bu konu <b>${byBook.size}</b> kitapta, <b>${qs.length}</b> kayıtta geçiyor.</div>`;
  [...byBook.entries()].forEach(([bid, list]) => {
    const b = DB.getBook(bid);
    h += `<div class="group-head"><a href="#/book/${bid}">📘 ${esc(b.title)}</a> <span class="small muted">${esc(b.author || '')}</span></div>${sortQuotes(list).map((q) => quoteCard(q)).join('')}`;
  });
  view.innerHTML = h;
}

// ================= Ayarlar =================
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (parseHash().parts[0] === 'settings') rerender(); });

async function renderSettings() {
  const s = settings();
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  let persisted = null;
  try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { /* yok */ }
  view.innerHTML = `<div class="topbar"><h1>⚙️ Ayarlar</h1></div>
  ${!standalone ? `<div class="card"><b>📲 Uygulama olarak yükle</b>
    ${installEvt ? `<p class="hint">Bu cihaza uygulama olarak yükleyin; masaüstünüzde / ana ekranınızda simgesi olsun.</p><button class="btn primary block" data-act="install">📲 Yükle</button>`
      : `<p class="hint"><b>Android (Chrome):</b> sağ üstteki ⋮ menüsü → <b>“Ana ekrana ekle”</b> ya da <b>“Uygulamayı yükle”</b>.<br><b>Bilgisayar (Chrome / Edge):</b> adres çubuğunun sağındaki <b>⊕ Yükle</b> simgesi ya da menü → <b>“Uygulamayı yükle”</b>.</p>`}</div>` : ''}
  <div class="card"><b>🤖 Yapay zekâ (Claude)</b>
    <p class="hint">Fotoğraftan yazıya çevirme, içindekiler okuma, anlamına göre arama ve özet için gerekir. Anahtar yalnızca bu cihazda saklanır; her cihaza ayrıca girmeniz gerekir. Anahtarı <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> adresinden alabilirsiniz.</p>
    <label class="field"><span>API anahtarı</span><div style="display:flex;gap:8px"><input class="input" type="password" id="api-key" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off" style="flex:1"><button class="btn sm" data-act="toggle-key">👁️</button></div></label>
    <label class="field"><span>Model</span><select id="model">
      <option value="claude-opus-5-5" ${s.model === 'claude-opus-5-5' ? 'selected' : ''}>Claude Opus 5.5: en iyi sonuç (önerilen)</option>
      <option value="claude-sonnet-5-5" ${s.model === 'claude-sonnet-5-5' ? 'selected' : ''}>Claude Sonnet 5.5: dengeli, yarı fiyatına</option>
      <option value="claude-haiku-5-5" ${s.model === 'claude-haiku-5-5' ? 'selected' : ''}>Claude Haiku 5.5: en hızlı ve en ucuz</option></select></label>
    <div style="display:flex;gap:8px"><button class="btn primary" data-act="save-key" style="flex:1">💾 Kaydet</button><button class="btn" data-act="test-key">🧪 Dene</button></div>
  </div>
  <div class="card"><b>📚 Varsayılan kaynak gösterimi</b>
    <label class="field mt"><select id="cite-style">${Object.entries(STYLE_NAMES).map(([k, l]) => `<option value="${k}" ${s.citeStyle === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="card"><b>💾 Yedekleme ve telefon ↔ bilgisayar aktarımı</b>
    <p class="hint">Verileriniz yalnızca bu cihazda saklanır. Telefondaki notları bilgisayara (ya da tersine) taşımak için: bu cihazda <b>Yedek al</b> → dosyayı diğer cihaza gönderin (Drive, WhatsApp, e-posta, USB) → orada <b>Yedeği içe aktar</b>. İki cihazdaki kayıtlar birleştirilir; aynı kayıt varsa en son düzenlenen kalır.</p>
    <p class="small">Son yedek: <b>${s.lastBackup ? fmtDate(s.lastBackup) : 'hiç alınmadı'}</b>${persisted === true ? ' · 🔒 Kalıcı depolama açık' : ''}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn teal" data-act="backup" style="flex:1">📤 Yedek al</button><button class="btn" data-act="restore" style="flex:1">📥 Yedeği içe aktar</button></div></div>
  <div class="card"><b>⬇️ Tüm arşivi dışa aktar</b>
    <p class="hint">Tüm kitapların alıntılarını tek bir PDF, Word ya da Excel dosyası olarak alın.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="export-all" style="flex:1">📦 Tüm notlar</button><button class="btn" data-act="biblio" style="flex:1">📚 Kaynakça (Word)</button></div></div>
  <div class="card"><b>⚠️ Tehlikeli bölge</b><p class="hint">Bu cihazdaki tüm kitap ve alıntıları siler. Önce yedek alın.</p><button class="btn danger block" data-act="wipe">🗑️ Tüm verileri sil</button></div>
  <p class="hint" style="text-align:center">Kitap Notlarım · sürüm 1.0</p>`;
}

async function doBackup() {
  const data = DB.exportBackup();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const r = await EX.saveFile(blob, `kitap-notlari-yedek-${today()}.json`);
  if (r !== 'cancelled') { DB.setSettings({ lastBackup: new Date().toISOString() }); toast('Yedek alındı ✓'); rerender(); }
}
async function doRestore() {
  const [f] = await pickFiles({ accept: '.json,application/json' });
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const st = await DB.importBackup(data);
    toast(`Aktarıldı ✓ ${st.booksAdded} yeni kitap, ${st.quotesAdded} yeni kayıt, ${st.booksUpdated + st.quotesUpdated} güncelleme`, 5000);
    rerender();
  } catch (err) { toast(err.message || 'Dosya okunamadı', 5000); }
}

// ================= Olaylar =================
const ACTIONS = {
  'close-sheet': () => closeSheet(),
  back: () => { if (history.length > 1) history.back(); else go('#/'); },
  tab: (el) => { bookTab[view.dataset.book] = el.dataset.tab; rerender(); },
  qfilter: (el) => { quoteFilter[view.dataset.book] = el.dataset.f; rerender(); },
  'add-quote': (el) => openAddQuote(el.dataset.book),
  'edit-quote': (el) => openQuoteEditor(el.dataset.id),
  related: (el) => openRelated(el.dataset.id),
  expand: (el) => el.classList.toggle('clamp'),
  'copy-quote': (el) => {
    const q = DB.S.quotes.get(el.dataset.id); const b = DB.getBook(q.bookId);
    const st = settings().citeStyle;
    copyText(`“${q.text}”\n— ${EX.citationText(b, st === 'page' ? 'short' : st, EX.pageLabel(q))}`);
  },
  'copy-cite': (el) => copyText(EX.citationText(DB.getBook(view.dataset.book), el.dataset.style)),
  'export-book': (el) => openExport(el.dataset.book),
  'export-all': () => openExport(null),
  'del-book': async (el) => {
    const b = DB.getBook(el.dataset.book);
    if (await confirmDialog(`“${b.title}” ve içindeki ${DB.quotesOf(b.id).length} kayıt silinsin mi?`, 'Sil')) { await DB.deleteBook(b.id); toast('Kitap silindi'); location.replace('#/'); }
  },
  'toc-photo': () => tocFromPhotos(DB.getBook(view.dataset.book)),
  'toc-edit': () => { const b = DB.getBook(view.dataset.book); openTocEditor(b, b.toc || []); },
  'open-toc': (el, e) => { e.preventDefault(); bookTab[el.dataset.book] = 'toc'; go('#/book/' + el.dataset.book); },
  'summary-gen': () => generateSummary(DB.getBook(view.dataset.book)),
  'summary-edit': () => editSummary(DB.getBook(view.dataset.book)),
  'reread-done': async (el) => {
    const q = DB.S.quotes.get(el.dataset.id);
    q.reread = { ...q.reread, done: !q.reread.done, doneAt: q.reread.done ? '' : new Date().toISOString() };
    await DB.saveQuote(q); toast(q.reread.done ? 'Harika! ✅' : 'Listeye geri alındı'); rerender();
  },
  'ai-search': () => runAiSearch(),
  install: async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; rerender(); },
  'toggle-key': () => { const i = $('#api-key'); i.type = i.type === 'password' ? 'text' : 'password'; },
  'save-key': () => { DB.setSettings({ apiKey: $('#api-key').value.trim(), model: $('#model').value }); toast('Kaydedildi ✓'); },
  'test-key': async (el) => {
    DB.setSettings({ apiKey: $('#api-key').value.trim(), model: $('#model').value });
    el.disabled = true; el.textContent = '…';
    try { await AI.testKey(); toast('Bağlantı başarılı ✓'); } catch (err) { toast(err.message, 5000); }
    el.disabled = false; el.textContent = '🧪 Dene';
  },
  backup: () => doBackup(),
  restore: () => doRestore(),
  biblio: async () => {
    const bs = DB.books();
    if (!bs.length) { toast('Kitap yok'); return; }
    const st = settings().citeStyle === 'page' ? 'apa' : settings().citeStyle;
    try { const blob = await EX.buildBibliographyDocx(bs, st); await EX.saveFile(blob, `Kaynakça - ${STYLE_NAMES[st]}.docx`); } catch (err) { toast(err.message, 5000); }
  },
  wipe: async () => {
    if (!(await confirmDialog('Bu cihazdaki TÜM kitaplar ve alıntılar kalıcı olarak silinecek. Geri alınamaz.', 'Devam'))) return;
    if (!(await confirmDialog('Son kez soruyorum: her şey silinsin mi?', 'Evet, hepsini sil'))) return;
    await DB.wipeAll(); toast('Tüm veriler silindi'); go('#/');
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACTIONS[el.dataset.act]) return;
  if (el.closest('#book-form') && ['isbn-lookup', 'photo-fill', 'cover-pick', 'cover-remove'].includes(el.dataset.act)) return;
  ACTIONS[el.dataset.act](el, e);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'cite-style') { DB.setSettings({ citeStyle: e.target.value }); toast('Kaydedildi ✓'); }
});

// ================= Başlat =================
async function start() {
  try { await DB.load(); } catch (err) {
    view.innerHTML = `<div class="empty"><div class="e">⚠️</div><h3>Veritabanı açılamadı</h3><p>${esc(err.message)}</p><p class="small">Gizli sekmede olabilirsiniz ya da tarayıcı depolamayı engelliyor olabilir.</p></div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* çevrimdışı desteği yok */ });
  }
}
start();
