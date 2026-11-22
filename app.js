import * as DB from './db.js';
import * as EX from './export.js';
import * as Lock from './lock.js';
import * as Scan from './scanner.js';
import { $, $$, esc, view, nav, toast, openSheet, closeSheet, confirmDialog, modal, today, fmtDate, norm, highlight,
  pickFiles, fileToDataUrl, copyText, starPickerHtml, bindStarPicker, longDate, fmtTime } from './ui.js';
import { pageNum, sortQuotes, allTags, quoteCard, thoughtCard, thoughtText, openRelated, starFilterHtml, applyStarFilter,
  tagInputHtml, bindTagInput } from './cards.js';
import { renderThoughts, renderThought, THOUGHT_ACTIONS } from './thoughts.js';
import { renderJournal, renderJournalCal, JOURNAL_ACTIONS, PROMPTS } from './journal.js';

const APP_VERSION = '2.0';
const COLORS = [['#7C5CFF', '#FF5DA2'], ['#FF6B57', '#FFB020'], ['#10B8A6', '#2F9BFF'], ['#FF5DA2', '#FFB020'], ['#2F9BFF', '#7C5CFF'], ['#10B8A6', '#7CD957'], ['#FF8A3D', '#FF5D7A']];
const TAG_COLORS = ['#7C5CFF', '#FF5DA2', '#10B8A6', '#FF6B57', '#2F9BFF', '#FFB020', '#8E5CF7', '#13A88F'];
const STATUS = { okunuyor: '📖 Okunuyor', okunacak: '🕮 Okunacak', bitti: '✅ Bitti' };

function hashStr(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function coverHtml(b) {
  if (b.cover) return `<div class="cover"><img src="${esc(b.cover)}" alt="" onerror="this.remove()"></div>`;
  const [a, c] = COLORS[hashStr(b.title) % COLORS.length];
  return `<div class="cover" style="background:linear-gradient(150deg,${a},${c})"><span>${esc(b.title)}</span></div>`;
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
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');

// ================= Yönlendirme =================
let lastPath = null;
function parseHash() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(qs || ''), path };
}
const NAV_OF = { book: 'home', 'new-book': 'home', thoughts: 'thoughts', thought: 'thoughts', journal: 'journal', 'journal-cal': 'journal', search: 'search', reread: 'reread', tags: 'tags', tag: 'tags', settings: 'settings', more: 'more', privacy: 'more' };
function route() {
  const { parts, params, path } = parseHash();
  const key = parts.length ? NAV_OF[parts[0]] || 'home' : 'home';
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === key || (a.dataset.nav === 'more' && ['reread', 'tags', 'settings', 'more'].includes(key))));
  try {
    if (!parts.length) renderHome();
    else if (parts[0] === 'book' && parts[2] === 'edit') renderBookForm(parts[1]);
    else if (parts[0] === 'book') renderBook(parts[1]);
    else if (parts[0] === 'new-book') renderBookForm(null, params.get('scan') === '1');
    else if (parts[0] === 'thoughts') renderThoughts();
    else if (parts[0] === 'thought') renderThought(parts[1]);
    else if (parts[0] === 'journal') renderJournal(parts[1]);
    else if (parts[0] === 'journal-cal') renderJournalCal(parts[1]);
    else if (parts[0] === 'search') renderSearch(params.get('q') || '');
    else if (parts[0] === 'reread') renderReread();
    else if (parts[0] === 'tags') renderTags();
    else if (parts[0] === 'tag') renderTag(parts[1]);
    else if (parts[0] === 'settings') renderSettings();
    else if (parts[0] === 'more') renderMore();
    else if (parts[0] === 'privacy') renderPrivacy();
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
nav.go = go; nav.rerender = rerender;
function updateBadge() {
  const n = dueCount();
  $$('.nav-badge').forEach((b) => { b.hidden = !n; b.textContent = n; });
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
  const s = DB.getSettings();
  let h = `<section class="hero"><h1>📚 Kitap Notlarım</h1><p>Aklınıza gelen bir fikri yazın; hangi kitabın hangi sayfasında olduğunu bulalım.</p>
    <form class="searchbar" id="home-search"><input name="q" placeholder="Konu, cümle, yazar…" autocomplete="off" enterkeyhint="search"><button>Ara</button></form></section>
    <div class="quick-links"><a href="#/thoughts" class="ql c5">💡<span>Düşünce yaz</span></a><a href="#/journal" class="ql c3">📔<span>Bugünün günlüğü</span></a><a href="#/new-book?scan=1" class="ql c4">📷<span>Barkodla kitap ekle</span></a></div>`;
  if (!bs.length) {
    h += `<div class="empty"><div class="e">📖</div><h3>Henüz kitap yok</h3><p>İlk kitabınızı ekleyin. Arka kapaktaki barkodu okutursanız kitap bilgileri kendiliğinden dolar.</p>
      <a class="btn primary" href="#/new-book?scan=1">📷 Barkodla ilk kitabı ekle</a> <a class="btn" href="#/new-book">✍️ Elle ekle</a></div>
      <div class="card small"><b>Nasıl çalışır?</b><ol class="muted" style="padding-left:18px;margin:6px 0 0">
      <li>Kitabı ekleyin: barkodu okutun ya da bilgileri elle yazın.</li>
      <li>Okurken altını çizdiğiniz yerleri sayfa numarasıyla alıntı olarak kaydedin, altına kendi yorumunuzu yazın.</li>
      <li>Önemli alıntılara ⭐ verin, konu etiketleri ekleyin; aynı etiketteki alıntılar birbirine bağlanır.</li>
      <li>Kitap bitince PDF, Word ya da Excel olarak alın.</li></ol></div>`;
    view.innerHTML = h;
    bindHomeSearch();
    return;
  }
  h += `<div class="stats"><div class="stat"><b>${bs.length}</b><span>Kitap</span></div><div class="stat"><b>${qs.length}</b><span>Alıntı</span></div><div class="stat"><b>${bs.filter((b) => b.status === 'okunuyor').length}</b><span>Okunuyor</span></div></div>`;
  const due = dueCount();
  if (due) h += `<a class="banner coral" href="#/reread" style="text-decoration:none;color:inherit"><span style="font-size:22px">🔖</span><span class="grow">Bugün tekrar okumanız gereken <b>${due}</b> bölüm var.</span><span>›</span></a>`;
  const total = qs.length + DB.thoughts().length + DB.moments().length;
  const daysSince = s.lastBackup ? Math.floor((Date.now() - new Date(s.lastBackup).getTime()) / 864e5) : null;
  if (total >= 5 && (daysSince === null || daysSince >= 14)) {
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
const quoteSort = {};

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
  else if (tab === 'summary') h += bookSummaryTab(b);
  else h += bookInfoTab(b);
  h += `<button class="fab" data-act="add-quote" data-book="${id}">＋ Alıntı</button>`;
  view.innerHTML = h;
  view.dataset.book = id;
  bindInfoTab(b);
  const ss = $('#q-sort');
  if (ss) ss.onchange = () => { quoteSort[id] = ss.value; rerender(); };
}

function bookQuotesTab(b, qs) {
  const f = quoteFilter[b.id] || 'all';
  const sort = quoteSort[b.id] || 'page';
  const filtered = sortQuotes(applyStarFilter(qs, f), sort);
  let h = '';
  if (qs.length) {
    h += `<div class="row-actions">${starFilterHtml(f, 'qfilter')}
      <select class="input sm-input" id="q-sort" style="width:auto">${[['page', 'Sayfa sırası'], ['stars', 'Önem derecesi'], ['new', 'En yeni']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn sm teal" data-act="export-book" data-book="${b.id}">⬇️ Dışa aktar</button></div>`;
  }
  if (!qs.length) {
    h += `<div class="empty"><div class="e">✍️</div><h3>Henüz alıntı yok</h3><p>Altını çizdiğiniz yeri sayfa numarasıyla yazın, altına kendi yorumunuzu ekleyin.</p>
      <button class="btn primary" data-act="add-quote" data-book="${b.id}">＋ Alıntı ekle</button></div>`;
  } else if (!filtered.length) h += `<p class="muted">Bu filtrede kayıt yok.</p>`;
  else h += filtered.map((q) => quoteCard(q)).join('');
  return h;
}

function bookTocTab(b, qs) {
  const toc = b.toc || [];
  let h = '';
  if (!toc.length) {
    h += `<div class="card"><p style="margin-top:0">${b.isNovel ? 'Romanlarda içindekiler genelde gerekmez, ama isterseniz ekleyebilirsiniz.' : 'İçindekiler başlıklarını sayfa numaralarıyla yazın. Alıntılarınız hangi bölümde olduğunu otomatik bilir.'}</p>
      <button class="btn primary block" data-act="toc-edit">⌨️ İçindekileri yaz</button></div>`;
    return h;
  }
  const pages = toc.map((t) => pageNum(t.page));
  h += `<div class="row-actions"><button class="btn sm" data-act="toc-edit">✏️ Düzenle</button></div><div class="card"><ul class="toc-list">`;
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

function bookSummaryTab(b) {
  if (!b.summary) {
    return `<div class="card"><p style="margin-top:0">Kitabı kendi cümlelerinizle özetleyin. Özeti istediğiniz zaman düzenleyebilir, PDF ya da Word olarak alabilirsiniz.</p>
      <button class="btn primary block" data-act="summary-edit">✍️ Özet yaz</button></div>`;
  }
  return `<div class="row-actions"><button class="btn sm" data-act="summary-edit">✏️ Düzenle</button><button class="btn sm teal" data-act="export-book" data-book="${b.id}">⬇️ Dışa aktar</button></div>
    <div class="card summary">${EX.mdToHtml(b.summary)}</div>${b.summaryAt ? `<p class="hint">Son güncelleme: ${fmtDate(b.summaryAt)}</p>` : ''}`;
}

function bookInfoTab(b) {
  const rows = [['Kitap', b.title], ['Alt başlık', b.subtitle], ['Yazar', b.author], ['Çevirmen', b.translator], ['Yayınevi', b.publisher], ['Basım yeri', b.city], ['Basım yılı', b.year], ['Baskı', b.edition && b.edition + '. baskı'], ['ISBN', b.isbn], ['Sayfa sayısı', b.pages], ['Konu / tür', b.categories], ['Tür', b.isNovel ? 'Roman / kurgu' : 'Kurgu dışı'], ['Başlama', fmtDate(b.startDate)], ['Bitiş', fmtDate(b.endDate)]].filter((r) => r[1]);
  return `<div class="card"><b>📖 Okuma takibi</b>
      <div class="seg mt" id="st-seg">${Object.entries(STATUS).map(([k, l]) => `<button class="${(b.status || 'okunacak') === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="grid2 mt"><label class="field"><span>Kaldığım sayfa</span><input type="number" inputmode="numeric" id="cur-page" value="${esc(b.currentPage || '')}" min="0"></label>
      <label class="field"><span>Toplam sayfa</span><input type="number" inputmode="numeric" id="tot-page" value="${esc(b.pages || '')}" min="0"></label></div>
      <span class="small muted" style="font-weight:800">Puanım</span><div class="stars" id="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="${(b.rating || 0) >= i ? 'on' : ''}" data-r="${i}" aria-label="${i} yıldız">⭐</button>`).join('')}</div>
    </div>
    <div class="card"><dl class="info-list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${b.description ? `<p class="mt small"><b>Tanıtım:</b> ${esc(b.description)}</p>` : ''}
      ${b.notes ? `<p class="mt">${esc(b.notes)}</p>` : ''}</div>
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
    if (b.status === 'bitti') toast('Tebrikler! 🎉 Özetinizi yazabilir, notlarınızı dışa aktarabilirsiniz.', 4000);
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
const BOOK_FIELDS = ['title', 'subtitle', 'author', 'translator', 'publisher', 'city', 'year', 'edition', 'pages', 'isbn', 'categories', 'description'];

function renderBookForm(id, autoScan = false) {
  const b = id ? DB.getBook(id) : { status: 'okunacak', isNovel: false };
  if (!b) { go('#/'); return; }
  const v = (k) => esc(b[k] || '');
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${id ? 'Kitabı düzenle' : 'Yeni kitap'}</h1></div>
  <form id="book-form" autocomplete="off">
    <div class="card scan-card">
      <b>📷 Barkodla hızlı doldur</b><p class="hint">Kitabın arka kapağındaki barkodu okutun; adı, yazarı, yayınevi, yılı, sayfa sayısı ve kapağı kendiliğinden dolsun.</p>
      <button type="button" class="btn primary block" data-act="scan">📷 Barkod okut</button>
      <div class="or"><span>ya da ISBN'i yazın</span></div>
      <div style="display:flex;gap:8px"><input class="input" name="isbn" placeholder="ISBN (ör. 9789750719387)" value="${v('isbn')}" inputmode="numeric" style="flex:1"><button type="button" class="btn sun" data-act="isbn-lookup">🔍 Bul</button></div>
      <div id="lookup-msg"></div>
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
      <label class="field"><span>Konu / tür</span><input name="categories" value="${v('categories')}" placeholder="ör. Felsefe, Tarih"></label>
      <label class="field"><span>Tanıtım yazısı</span><textarea name="description" rows="3">${v('description')}</textarea></label>
      <label class="check"><input type="checkbox" name="isNovel" ${b.isNovel ? 'checked' : ''}> Roman / öykü (içindekiler gerekmez)</label>
    </div>
    <div class="card">
      <span class="small muted" style="font-weight:800">Durum</span>
      <div class="seg mt" id="form-st">${Object.entries(STATUS).map(([k, l]) => `<button type="button" class="${(b.status || 'okunacak') === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="grid2 mt"><label class="field"><span>Başlama tarihi</span><input type="date" name="startDate" value="${v('startDate')}"></label>
      <label class="field"><span>Bitiş tarihi</span><input type="date" name="endDate" value="${v('endDate')}"></label></div>
      <div style="display:flex;gap:12px;align-items:center"><div id="cover-prev" style="width:70px">${b.title || b.cover ? coverHtml({ title: b.title || '?', cover: b.cover }) : ''}</div>
      <div><button type="button" class="btn sm" data-act="cover-pick">🖼️ Kapak görseli</button> <button type="button" class="btn sm ghost" data-act="cover-remove" ${b.cover ? '' : 'hidden'}>Kaldır</button></div></div>
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
  const fill = (info) => {
    let n = 0;
    BOOK_FIELDS.forEach((k) => {
      const val = info[k] != null ? String(info[k]).trim() : '';
      if (val && !form[k].value.trim()) { form[k].value = val; n++; }
    });
    return n;
  };
  const setCover = (url) => { cover = url; $('#cover-prev').innerHTML = coverHtml({ title: form.title.value || '?', cover }); $('[data-act="cover-remove"]').hidden = !cover; };
  const msg = (html, cls = 'teal') => { $('#lookup-msg').innerHTML = html ? `<div class="banner ${cls} small mt">${html}</div>` : ''; };
  const dupCheck = (isbn) => {
    const c = Scan.cleanIsbn(isbn);
    const d = DB.books().find((x) => x.id !== b.id && x.isbn && Scan.cleanIsbn(x.isbn) === c);
    return d ? `<br>⚠️ Bu ISBN ile <a href="#/book/${d.id}">“${esc(d.title)}”</a> zaten kayıtlı.` : '';
  };
  const applyInfo = async (isbn, info) => {
    form.isbn.value = isbn;
    if (!info) {
      msg(`Bu ISBN ile kitap bulunamadı (${esc(isbn)}). Bilgileri aşağıya elle yazın.${dupCheck(isbn)}`, 'sun');
      form.title.focus();
      return;
    }
    const n = fill(info);
    if (!cover && info.coverUrls && info.coverUrls.length) setCover(await Scan.fetchCover(info.coverUrls));
    msg(`✓ ${n ? `${n} alan dolduruldu.` : 'Bilgiler zaten dolu.'} Lütfen kontrol edin; eksik olanları (çevirmen, baskı gibi) elle tamamlayın.${dupCheck(isbn)}`);
  };
  const doScan = async () => {
    const r = await Scan.scanAndLookup();
    if (r) await applyInfo(r.isbn, r.info);
  };

  form.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'scan') doScan();
    if (a === 'isbn-lookup') {
      const isbn = Scan.cleanIsbn(form.isbn.value);
      if (!isbn) { toast('ISBN yazın ya da barkodu okutun'); form.isbn.focus(); return; }
      if (!Scan.validIsbn(isbn)) { msg('Bu ISBN geçersiz görünüyor. Rakamları kontrol edin.', 'coral'); return; }
      act.disabled = true; act.textContent = '…';
      try { await applyInfo(isbn, await Scan.lookupIsbn(isbn)); } catch (err) { msg(esc(err.message), 'coral'); }
      act.disabled = false; act.textContent = '🔍 Bul';
    }
    if (a === 'cover-pick') {
      const [f] = await pickFiles();
      if (f) setCover(await fileToDataUrl(f, 480, 0.85));
    }
    if (a === 'cover-remove') setCover('');
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const isNew = !b.id;
    [...BOOK_FIELDS, 'startDate', 'endDate', 'notes'].forEach((k) => { b[k] = String(fd.get(k) || '').trim(); });
    b.pages = parseInt(fd.get('pages'), 10) || '';
    b.isNovel = !!fd.get('isNovel');
    b.status = status;
    b.cover = cover;
    if (!b.title) { toast('Kitap adı gerekli'); form.title.focus(); return; }
    await DB.saveBook(b);
    toast(isNew ? 'Kitap eklendi ✓' : 'Kaydedildi ✓');
    if (isNew) location.replace('#/book/' + b.id); else go('#/book/' + b.id);
  };
  if (autoScan && !id) setTimeout(doScan, 200);
}

// ================= Alıntı düzenleyici =================
function openQuoteEditor(qid, bookId) {
  const existing = qid ? DB.getQuote(qid) : null;
  const q = existing ? { ...existing } : { bookId, text: '', page: '', pageEnd: '', chapter: '', tags: [], comment: '', stars: 0, reread: null };
  const book = DB.getBook(q.bookId);
  if (!book) return;
  const s = openSheet({
    title: existing ? 'Alıntıyı düzenle' : `✍️ Yeni alıntı · ${book.title}`,
    body: `<label class="field"><span>Alıntı metni</span><textarea class="serif" rows="6" id="q-text" placeholder="Kitaptan almak istediğiniz cümleyi yazın">${esc(q.text)}</textarea></label>
      <div class="grid2"><label class="field"><span>Sayfa</span><input id="q-page" inputmode="numeric" value="${esc(q.page)}" placeholder="45"></label>
      <label class="field"><span>Bitiş sayfası (isteğe bağlı)</span><input id="q-page2" inputmode="numeric" value="${esc(q.pageEnd)}" placeholder="47"></label></div>
      <label class="field"><span>💭 Yorumum</span><textarea id="q-comment" rows="3" placeholder="Bu alıntı bana ne düşündürdü? (Alıntı yazmadan yalnızca yorum da yazabilirsiniz)">${esc(q.comment)}</textarea></label>
      <div class="field"><span>Önem derecesi</span>${starPickerHtml(q.stars)}</div>
      <label class="field"><span>Bölüm</span><input id="q-chapter" value="${esc(q.chapter)}" placeholder="${(book.toc || []).length ? 'Sayfa yazınca otomatik dolar' : 'ör. 3. Bölüm'}"></label>
      <div class="field"><span>Etiketler (konu)</span>${tagInputHtml(q.tags || [])}</div>
      <label class="check"><input type="checkbox" id="q-rr" ${q.reread ? 'checked' : ''}> 🔖 Tekrar okunacaklar listesine ekle</label>
      <div id="rr-box" ${q.reread ? '' : 'hidden'}><label class="field"><span>Hatırlatma tarihi (isteğe bağlı)</span><input type="date" id="q-due" value="${esc((q.reread && q.reread.due) || '')}"></label>
        <div class="row-actions">${[['1 hafta', 7], ['1 ay', 30], ['3 ay', 90]].map(([l, d]) => `<button type="button" class="btn sm" data-days="${d}">${l} sonra</button>`).join('')}</div></div>`,
    foot: `${existing ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  const tags = bindTagInput(s, q.tags || []);
  const stars = bindStarPicker(s);
  const pageIn = $('#q-page', s), chIn = $('#q-chapter', s);
  let autoCh = !q.chapter;
  chIn.addEventListener('input', () => { autoCh = !chIn.value; });
  pageIn.addEventListener('input', () => { if (autoCh) chIn.value = chapterFor(book, pageIn.value); });
  $('#q-rr', s).onchange = (e) => { $('#rr-box', s).hidden = !e.target.checked; };
  s.addEventListener('click', (e) => {
    const d = e.target.closest('[data-days]'); if (!d) return;
    const dt = new Date(); dt.setDate(dt.getDate() + parseInt(d.dataset.days, 10));
    $('#q-due', s).value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  $('[data-x="save"]', s).onclick = async () => {
    const text = $('#q-text', s).value.trim();
    const comment = $('#q-comment', s).value.trim();
    if (!text && !comment) { toast('Alıntı ya da yorum yazın'); $('#q-text', s).focus(); return; }
    const rr = $('#q-rr', s).checked;
    const due = $('#q-due', s).value;
    Object.assign(q, {
      text, comment, page: pageIn.value.trim(), pageEnd: $('#q-page2', s).value.trim(), chapter: chIn.value.trim(), tags: tags.get(), stars: stars.get(),
      reread: rr ? { due, done: q.reread ? !!q.reread.done && q.reread.due === due : false } : null,
    });
    await DB.saveQuote(q);
    await closeSheet();
    if (!existing) bookTab[q.bookId] = 'quotes';
    toast('Kaydedildi ✓');
    rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => {
    if (await confirmDialog('Bu alıntı silinsin mi?', 'Sil')) { await DB.deleteQuote(q.id); toast('Silindi'); rerender(); }
  };
  if (!existing) setTimeout(() => $('#q-text', s).focus(), 250);
}

// ================= İçindekiler ve özet =================
function openTocEditor(book) {
  const s = openSheet({
    title: '📑 İçindekiler',
    body: `<p class="hint">Her satıra bir başlık. Sayfa numarasını <b>|</b> ile ayırın. Alt başlıklar için satır başına 2 boşluk koyun.<br>Örnek: <code>1. Bölüm | 15</code> ve <code>&nbsp;&nbsp;Giriş | 17</code></p>
      <label class="field"><textarea id="toc-text" rows="16" style="font-family:ui-monospace,Consolas,monospace;font-size:14px">${esc(tocToText(book.toc || []))}</textarea></label>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  $('[data-x="save"]', s).onclick = async () => {
    book.toc = textToToc($('#toc-text', s).value);
    await DB.saveBook(book);
    for (const q of DB.quotesOf(book.id)) {
      if (!q.chapter && q.page) { const ch = chapterFor(book, q.page); if (ch) { q.chapter = ch; await DB.saveQuote(q); } }
    }
    await closeSheet();
    toast('İçindekiler kaydedildi ✓');
    rerender();
  };
}
function editSummary(book) {
  const s = openSheet({
    title: '🧾 Özet',
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
  const s = openSheet({
    title: single ? `⬇️ Dışa aktar: ${single.title}` : '⬇️ Tüm kitap notlarını dışa aktar',
    body: `<div class="card" style="padding:10px 14px">
      ${[['summary', 'Özet', true], ['toc', 'İçindekiler', true], ['comments', '💭 Yorumlarım', true], ['tags', 'Etiketler', true], ['rereadOnly', 'Yalnızca tekrar okunacaklar', false]]
        .map(([k, l, on]) => `<label class="check"><input type="checkbox" data-o="${k}" ${on ? 'checked' : ''}> ${l}</label>`).join('')}
    </div>
    <label class="field"><span>Hangi alıntılar?</span><select id="ex-st"><option value="0">Hepsi</option><option value="1">⭐ Önemli ve üstü</option><option value="2">⭐⭐ Çok önemli ve üstü</option><option value="3">⭐⭐⭐ Yalnızca müthiş tespitler</option></select></label>
    <label class="check"><input type="checkbox" id="ex-fn"> Word’de ayrıca sayfa altına dipnot ekle</label>
    <div class="choice-grid mt" style="grid-template-columns:1fr 1fr 1fr">
      <button class="choice c6" data-f="pdf"><span class="e">🖨️</span>PDF / Yazdır</button>
      <button class="choice c2" data-f="docx"><span class="e">📝</span>Word</button>
      <button class="choice c4" data-f="xlsx"><span class="e">📊</span>Excel</button>
    </div>
    <p class="hint mt">Alıntıların altında sayfa numarası yazar; belgenin sonunda “Yazar, <i>Kitap</i>” şeklinde kaynak bulunur. PDF için yazdırma ekranında <b>“PDF olarak kaydet”</b>i seçin.</p>`,
  });
  s.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const opt = { minStars: parseInt($('#ex-st', s).value, 10), footnotes: $('#ex-fn', s).checked };
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
const searchFilter = { stars: 'all' };
function renderSearch(q) {
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 0);
  let h = `<div class="topbar"><h1>🔎 Ara</h1></div>
    <form class="searchbar card" id="search-form" style="padding:6px 6px 6px 14px"><input name="q" value="${esc(q)}" placeholder="Konu, fikir, cümle, yazar…" autocomplete="off" enterkeyhint="search"><button>Ara</button></form>`;
  const open = Lock.isOpen();
  const lockNote = !open ? `<div class="banner sun small">🔒 Düşünceler ve günlük kilitli olduğu için aramaya dahil edilmedi. <a href="#/thoughts">Kilidi açın</a>, sonra yeniden arayın.</div>` : '';
  if (!q) {
    h += `<div class="empty"><div class="e">💡</div><h3>Aklınıza ne geldi?</h3><p>Bir kelime, konu ya da hatırladığınız bir cümle yazın. Alıntılarda, yorumlarınızda, etiketlerde, içindekiler başlıklarında${open ? ', düşüncelerinizde ve günlüğünüzde' : ''} aranır.</p></div>${lockNote}`;
    view.innerHTML = h; bindSearch(); return;
  }
  const match = (hay) => { const n = norm(hay); return terms.every((t) => n.includes(t)); };
  const bs = DB.books();
  const bookHits = bs.filter((b) => match([b.title, b.subtitle, b.author, b.publisher, b.translator, b.categories].join(' ')));
  const tocHits = [];
  bs.forEach((b) => (b.toc || []).forEach((t) => { if (match(t.title)) tocHits.push({ b, t }); }));
  let qHits = DB.allQuotes().filter((x) => { const b = DB.getBook(x.bookId); return match([x.text, x.comment, (x.tags || []).join(' '), x.chapter, b.title, b.author].join(' ')); });
  qHits = applyStarFilter(qHits, searchFilter.stars).sort((a, c) => {
    const sa = terms.filter((t) => norm(a.text).includes(t)).length, sc = terms.filter((t) => norm(c.text).includes(t)).length;
    return sc - sa || (c.stars || 0) - (a.stars || 0) || (c.updatedAt || '').localeCompare(a.updatedAt || '');
  });
  const tHits = open ? DB.thoughts().filter((t) => match([t.title, thoughtText(t), (t.tags || []).join(' ')].join(' '))) : [];
  const mHits = open ? DB.moments().filter((m) => match(m.text)).sort((a, b) => (b.at || '').localeCompare(a.at || '')) : [];

  h += lockNote;
  if (!bookHits.length && !tocHits.length && !qHits.length && !tHits.length && !mHits.length) h += `<div class="empty"><div class="e">🤔</div><h3>Sonuç bulunamadı</h3><p>Daha kısa ya da farklı bir kelime deneyin.</p></div>`;
  if (bookHits.length) h += `<div class="section-title">📘 Kitaplar <span class="count">${bookHits.length}</span></div><div class="book-grid">${bookHits.map(bookCard).join('')}</div>`;
  if (tocHits.length) {
    h += `<div class="section-title">📑 İçindekiler’de geçiyor <span class="count">${tocHits.length}</span></div><div class="card"><ul class="toc-list">`;
    tocHits.slice(0, 40).forEach(({ b, t }) => { h += `<li><span><a href="#/book/${b.id}" class="q-book" data-act="open-toc" data-book="${b.id}">${esc(b.title)}</a> — ${highlight(t.title, terms)}</span><span class="pg">${t.page ? 's. ' + esc(t.page) : ''}</span></li>`; });
    h += `</ul></div>`;
  }
  if (qHits.length || searchFilter.stars !== 'all') {
    h += `<div class="section-title">✍️ Alıntılar <span class="count">${qHits.length}</span></div><div class="row-actions">${starFilterHtml(searchFilter.stars, 'search-sfilter')}</div>`;
    h += qHits.slice(0, 100).map((x) => quoteCard(x, { showBook: true, terms })).join('') || '<p class="muted">Bu filtrede alıntı yok.</p>';
  }
  if (tHits.length) h += `<div class="section-title">💡 Düşünceler <span class="count">${tHits.length}</span></div>${tHits.slice(0, 60).map((t) => thoughtCard(t, { terms })).join('')}`;
  if (mHits.length) {
    h += `<div class="section-title">📔 Günlük <span class="count">${mHits.length}</span></div>`;
    mHits.slice(0, 60).forEach((m) => {
      const p = PROMPTS.find((x) => x.id === m.prompt) || PROMPTS[PROMPTS.length - 1];
      h += `<a class="card m-hit" href="#/journal/${m.date}"><div class="small muted"><b>${esc(longDate(m.date))}</b> · ${esc(fmtTime(m.at))} · ${p.e} ${esc(p.l)}</div><div class="m-text clamp3">${highlight(m.text, terms)}</div></a>`;
    });
  }
  view.innerHTML = h;
  bindSearch();
}
function bindSearch() {
  const f = $('#search-form');
  f.onsubmit = (e) => { e.preventDefault(); const q = f.q.value.trim(); location.replace('#/search?q=' + encodeURIComponent(q)); };
  if (!f.q.value) setTimeout(() => f.q.focus(), 50);
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
  let h = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>🔖 Tekrar Oku</h1></div>`;
  if (!items.length) {
    h += `<div class="empty"><div class="e">🔖</div><h3>Liste boş</h3><p>Bir alıntı eklerken ya da düzenlerken <b>🔖 Tekrar okunacaklar listesine ekle</b> kutucuğunu işaretleyin. İsterseniz hatırlatma tarihi de verebilirsiniz.</p></div>`;
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
    <div class="q-ref"><a class="q-book" href="#/book/${b.id}">📘 ${esc(b.title)}</a>${pl ? `<span class="badge page">s. ${esc(pl)}</span>` : ''}${q.reread.due ? `<span class="badge kind-tekrar">📅 ${fmtDate(q.reread.due)}</span>` : ''}${q.stars ? `<span class="badge stars-b">${'⭐'.repeat(q.stars)}</span>` : ''}</div>
    ${q.chapter ? `<div class="small muted mt">${esc(q.chapter)}</div>` : ''}
    ${q.text ? `<div class="q-text clamp mt" data-act="expand" style="font-size:15px">${esc(q.text)}</div>` : ''}
    ${q.comment ? `<div class="q-comment"><b>💭 Yorumum</b> ${esc(q.comment)}</div>` : ''}
    <div class="q-actions"><button data-act="edit-quote" data-id="${q.id}">✏️ Düzenle</button>
    <button data-act="reread-done" data-id="${q.id}" style="color:${q.reread.done ? 'var(--muted)' : 'var(--teal)'}">${q.reread.done ? '↩️ Geri al' : '✅ Okudum'}</button></div></article>`;
}

// ================= Etiketler =================
function renderTags() {
  const tags = allTags();
  let h = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>🏷️ Etiketler</h1></div>`;
  if (!tags.length) h += `<div class="empty"><div class="e">🏷️</div><h3>Henüz etiket yok</h3><p>Alıntılarınıza ve düşüncelerinize “özgürlük”, “liderlik”, “zaman” gibi konu etiketleri ekleyin. Aynı konunun farklı kitaplarda ve düşüncelerinizde nerelerde geçtiğini burada görürsünüz.</p></div>`;
  else {
    const max = tags[0][1];
    h += `<p class="hint">Bir etikete dokunduğunuzda o konunun geçtiği tüm alıntılar${Lock.isOpen() ? ' ve düşünceler' : ''} listelenir.</p><div class="tag-cloud">${tags.map(([t, n], i) => `<a href="#/tag/${encodeURIComponent(t)}" style="background:${TAG_COLORS[i % TAG_COLORS.length]};font-size:${13 + Math.round((n / max) * 7)}px">#${esc(t)} <small style="opacity:.85">${n}</small></a>`).join('')}</div>`;
  }
  view.innerHTML = h;
}
function renderTag(tag) {
  const qs = DB.allQuotes().filter((q) => (q.tags || []).includes(tag));
  const ts = DB.thoughts().filter((t) => (t.tags || []).includes(tag));
  const open = Lock.isOpen();
  const byBook = new Map();
  qs.forEach((q) => { if (!byBook.has(q.bookId)) byBook.set(q.bookId, []); byBook.get(q.bookId).push(q); });
  let h = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>#${esc(tag)}</h1></div>
    <div class="banner teal">🔗 Bu konu <b>${byBook.size}</b> kitapta, <b>${qs.length}</b> alıntıda${open && ts.length ? `, <b>${ts.length}</b> düşüncede` : ''} geçiyor.</div>`;
  if (open && ts.length) h += `<div class="group-head">💡 Düşüncelerim</div>${ts.map((t) => thoughtCard(t)).join('')}`;
  else if (!open && ts.length) h += `<div class="banner sun small">🔒 Bu etiketle ${ts.length} düşünceniz var; görmek için <a href="#/thoughts">kilidi açın</a>.</div>`;
  [...byBook.entries()].forEach(([bid, list]) => {
    const b = DB.getBook(bid);
    h += `<div class="group-head"><a href="#/book/${bid}">📘 ${esc(b.title)}</a> <span class="small muted">${esc(b.author || '')}</span></div>${sortQuotes(list, 'stars').map((q) => quoteCard(q)).join('')}`;
  });
  view.innerHTML = h;
}

// ================= Diğer, Ayarlar, Gizlilik =================
function renderMore() {
  const n = dueCount();
  view.innerHTML = `<div class="topbar"><h1>☰ Diğer</h1></div>
    <div class="more-list">
      <a href="#/reread"><span>🔖</span><b>Tekrar Oku</b>${n ? `<i class="nav-badge" style="position:static">${n}</i>` : ''}<em>›</em></a>
      <a href="#/tags"><span>🏷️</span><b>Etiketler</b><em>›</em></a>
      <a href="#/settings"><span>⚙️</span><b>Ayarlar</b><small>PIN kilidi, yedekleme, yükleme</small><em>›</em></a>
      <button data-act="share-app"><span>📤</span><b>Uygulamayı paylaş</b><em>›</em></button>
      <a href="#/privacy"><span>🔐</span><b>Gizlilik politikası</b><em>›</em></a>
    </div>
    <p class="hint" style="text-align:center">Kitap Notlarım · sürüm ${APP_VERSION}</p>`;
}

let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (parseHash().parts[0] === 'settings') rerender(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('Uygulama yüklendi ✓'); });

function installCardHtml() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return `<div class="card"><b>📲 Uygulama</b><p class="hint">Uygulama bu cihazda yüklü olarak çalışıyor ✓</p><button class="btn block" data-act="share-app">📤 Uygulamayı paylaş</button></div>`;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let how;
  if (installEvt) how = `<p class="hint">Bu cihaza uygulama olarak yükleyin; ana ekranınızda / masaüstünüzde simgesi olsun, ayrı pencerede açılsın.</p><button class="btn primary block" data-act="install">📲 Uygulamayı yükle</button>`;
  else if (ios) how = `<ol class="hint steps"><li><b>Safari</b>'de alttaki <b>Paylaş</b> (□↑) düğmesine dokunun.</li><li><b>“Ana Ekrana Ekle”</b>yi seçin.</li><li>Sağ üstteki <b>Ekle</b>'ye dokunun.</li></ol>`;
  else if (/Android/i.test(ua)) how = `<ol class="hint steps"><li>Chrome'da sağ üstteki <b>⋮</b> menüsüne dokunun.</li><li><b>“Uygulamayı yükle”</b> ya da <b>“Ana ekrana ekle”</b>yi seçin.</li></ol>`;
  else how = `<ol class="hint steps"><li><b>Chrome</b> ya da <b>Edge</b> kullanın.</li><li>Adres çubuğunun sağındaki <b>⊕ Yükle</b> simgesine tıklayın (ya da menü → <b>“Uygulamayı yükle”</b>).</li><li>Masaüstünde ve Başlat menüsünde simgesi oluşur.</li></ol>`;
  return `<div class="card"><b>📲 Uygulama olarak yükle</b>${how}<button class="btn block mt" data-act="share-app">📤 Uygulamayı paylaş</button></div>`;
}

async function renderSettings() {
  const s = DB.getSettings();
  let persisted = null;
  try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { /* yok */ }
  const pinOn = Lock.enabled();
  const counts = `${DB.books().length} kitap, ${DB.allQuotes().length} alıntı, ${DB.thoughts().length} düşünce, ${DB.moments().length} günlük yazısı`;
  view.innerHTML = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>⚙️ Ayarlar</h1></div>
  ${installCardHtml()}
  <div class="card"><b>🔒 PIN kilidi</b>
    <p class="hint">Açıkken <b>💡 Düşünceler</b> ve <b>📔 Günlük</b> bölümlerine girerken 4 haneli PIN sorulur. Kitaplar serbest kalır. Uygulamayı 5 dakika kullanmazsanız ya da kapatırsanız kilit yeniden devreye girer.</p>
    ${pinOn ? `<p class="small">Durum: <b style="color:var(--teal)">Açık</b></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="pin-change" style="flex:1">🔁 PIN'i değiştir</button><button class="btn danger" data-act="pin-off" style="flex:1">Kilidi kapat</button></div>`
      : `<p class="small">Durum: <b>Kapalı</b></p><button class="btn primary block" data-act="pin-on">🔒 PIN kilidini aç</button>`}
    <p class="hint mt">Bu kilit, telefonunuzu eline alan birinin bu bölümleri açmasını engeller; verileriniz cihazda şifrelenmiş değildir.</p></div>
  <div class="card"><b>💾 Yedekleme ve telefon ↔ bilgisayar aktarımı</b>
    <p class="hint">Verileriniz yalnızca bu cihazda saklanır (${counts}). Başka bir cihaza taşımak için: bu cihazda <b>Yedek al</b> → dosyayı diğer cihaza gönderin (Drive, WhatsApp, e-posta, USB) → orada <b>Yedeği içe aktar</b>. Kayıtlar birleştirilir; aynı kayıt varsa en son düzenlenen kalır. Yedek dosyası düşünceleri, günlüğü ve fotoğrafları da içerir; güvendiğiniz yerlere gönderin.</p>
    <p class="small">Son yedek: <b>${s.lastBackup ? fmtDate(s.lastBackup) : 'hiç alınmadı'}</b>${persisted === true ? ' · 🔒 Kalıcı depolama açık' : ''}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn teal" data-act="backup" style="flex:1">📤 Yedek al</button><button class="btn" data-act="restore" style="flex:1">📥 Yedeği içe aktar</button></div></div>
  <div class="card"><b>⬇️ Tüm kitap notlarını dışa aktar</b>
    <p class="hint">Tüm kitapların alıntılarını tek bir PDF, Word ya da Excel dosyası olarak alın. Düşünceler ve günlük kendi sayfalarından dışa aktarılır.</p>
    <button class="btn block" data-act="export-all">📦 Tüm notlar</button></div>
  <div class="card"><b>🔐 Gizlilik</b><p class="hint">Uygulama hiçbir sunucuya veri göndermez; hesap, reklam ya da takip yoktur.</p><a class="btn block" href="#/privacy">Gizlilik politikasını oku</a></div>
  <div class="card"><b>⚠️ Tehlikeli bölge</b><p class="hint">Bu cihazdaki tüm kitap, alıntı, düşünce ve günlük kayıtlarını siler. Önce yedek alın.</p><button class="btn danger block" data-act="wipe">🗑️ Tüm verileri sil</button></div>
  <p class="hint" style="text-align:center">Kitap Notlarım · sürüm ${APP_VERSION}</p>`;
}

function renderPrivacy() {
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>🔐 Gizlilik</h1></div>
    <div class="card prose">${PRIVACY_HTML}</div>`;
}
const PRIVACY_HTML = `<h3>Kitap Notlarım gizlilik politikası</h3>
  <p><b>Kısaca:</b> Yazdığınız her şey yalnızca sizin cihazınızda saklanır. Uygulama hiçbir sunucuya veri göndermez, hesap açtırmaz, reklam ya da takip aracı içermez.</p>
  <h4>Hangi veriler saklanır?</h4>
  <p>Eklediğiniz kitaplar, alıntılar, yorumlar, düşünceler, günlük yazıları ve fotoğraflar, cihazınızdaki tarayıcı depolamasında (IndexedDB) tutulur. Bu verilere yalnızca siz erişebilirsiniz.</p>
  <h4>İnternete ne gönderilir?</h4>
  <p>Yalnızca barkod okuttuğunuzda ya da ISBN aradığınızda, kitap bilgisini bulmak için <b>ISBN numarası</b> Open Library (openlibrary.org) ve Google Books (googleapis.com) servislerine gönderilir. Bu isteklerde kişisel bilginiz yer almaz. Yazı tipleri Google Fonts'tan, Word ve Excel kütüphaneleri dışa aktarma sırasında jsDelivr ve cdnjs'den yüklenir.</p>
  <h4>Kamera</h4>
  <p>Kamera yalnızca barkod okuturken ve günlüğe fotoğraf eklerken, sizin izninizle kullanılır. Görüntüler cihazdan dışarı gönderilmez.</p>
  <h4>PIN kilidi</h4>
  <p>PIN'iniz cihazda açık metin olarak değil, tek yönlü özet (SHA-256) olarak saklanır.</p>
  <h4>Yedekler</h4>
  <p>“Yedek al” ile oluşturduğunuz dosya tüm verilerinizi içerir ve nereye göndereceğinize siz karar verirsiniz.</p>
  <h4>Verilerin silinmesi</h4>
  <p>Ayarlar → “Tüm verileri sil” ile ya da uygulamayı kaldırıp tarayıcı verilerini temizleyerek tüm kayıtlarınızı silebilirsiniz.</p>
  <h4>Çocuklar</h4><p>Uygulama kişisel veri toplamadığı için yaş sınırlaması gerektiren bir veri işleme yapmaz.</p>`;

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
    toast(`Aktarıldı ✓ ${st.added} yeni kayıt, ${st.updated} güncelleme`, 5000);
    rerender();
  } catch (err) { toast(err.message || 'Dosya okunamadı', 5000); }
}
async function shareApp() {
  const data = { title: 'Kitap Notlarım', text: 'Kitaplardan alıntılarınızı sayfa numarasıyla saklayın; düşünce ve günlük tutun.', url: appUrl() };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  copyText(data.url);
}

// ================= Olaylar =================
const ACTIONS = {
  ...THOUGHT_ACTIONS,
  ...JOURNAL_ACTIONS,
  'close-sheet': () => closeSheet(),
  back: () => { if (history.length > 1) history.back(); else go('#/'); },
  tab: (el) => { bookTab[view.dataset.book] = el.dataset.tab; rerender(); },
  qfilter: (el) => { quoteFilter[view.dataset.book] = el.dataset.f; rerender(); },
  'search-sfilter': (el) => { searchFilter.stars = el.dataset.f; rerender(); },
  'add-quote': (el) => openQuoteEditor(null, el.dataset.book),
  'edit-quote': async (el) => { const id = el.dataset.id; if (modal.open) await closeSheet(); openQuoteEditor(id); },
  related: (el) => openRelated(el.dataset.kind || 'quote', el.dataset.id),
  expand: (el) => el.classList.toggle('clamp'),
  'copy-quote': (el) => {
    const q = DB.getQuote(el.dataset.id); const b = DB.getBook(q.bookId);
    const body = q.text ? `“${q.text}”` : q.comment;
    copyText(`${body}\n— ${EX.citationText(b, EX.pageLabel(q))}${q.text && q.comment ? `\n\n💭 ${q.comment}` : ''}`);
  },
  'export-book': (el) => openExport(el.dataset.book),
  'export-all': () => openExport(null),
  'del-book': async (el) => {
    const b = DB.getBook(el.dataset.book);
    if (await confirmDialog(`“${b.title}” ve içindeki ${DB.quotesOf(b.id).length} alıntı silinsin mi?`, 'Sil')) { await DB.deleteBook(b.id); toast('Kitap silindi'); location.replace('#/'); }
  },
  'toc-edit': () => openTocEditor(DB.getBook(view.dataset.book)),
  'open-toc': (el, e) => { e.preventDefault(); bookTab[el.dataset.book] = 'toc'; go('#/book/' + el.dataset.book); },
  'summary-edit': () => editSummary(DB.getBook(view.dataset.book)),
  'reread-done': async (el) => {
    const q = DB.getQuote(el.dataset.id);
    q.reread = { ...q.reread, done: !q.reread.done, doneAt: q.reread.done ? '' : new Date().toISOString() };
    await DB.saveQuote(q); toast(q.reread.done ? 'Harika! ✅' : 'Listeye geri alındı'); rerender();
  },
  install: async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; rerender(); },
  'share-app': () => shareApp(),
  'pin-on': () => Lock.setPinFlow(),
  'pin-off': () => Lock.disablePin(),
  'pin-change': () => Lock.changePin(),
  'lock-now': () => { Lock.lock(); toast('Kilitlendi 🔒'); rerender(); },
  backup: () => doBackup(),
  restore: () => doRestore(),
  wipe: async () => {
    if (!(await confirmDialog('Bu cihazdaki TÜM kitaplar, alıntılar, düşünceler ve günlük kalıcı olarak silinecek. Geri alınamaz.', 'Devam'))) return;
    if (!(await confirmDialog('Son kez soruyorum: her şey silinsin mi?', 'Evet, hepsini sil'))) return;
    await DB.wipeAll(); toast('Tüm veriler silindi'); go('#/');
  },
  'reload-app': () => {
    const w = swReg && swReg.waiting;
    if (w) w.postMessage('skip-waiting'); else location.reload();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACTIONS[el.dataset.act]) return;
  if (el.closest('#book-form') && ['scan', 'isbn-lookup', 'cover-pick', 'cover-remove'].includes(el.dataset.act)) return;
  ACTIONS[el.dataset.act](el, e);
});

// ================= Güncelleme ve başlatma =================
let swReg = null;
function showUpdateBar() {
  if ($('#update-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'update-bar';
  bar.innerHTML = `<span>✨ Yeni sürüm hazır.</span><button class="btn sm primary" data-act="reload-app">Yenile</button><button class="x" aria-label="Kapat" onclick="this.parentNode.remove()">✕</button>`;
  document.body.appendChild(bar);
}
function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    swReg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar();
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(); });
    });
    const check = () => reg.update().catch(() => { /* çevrimdışı */ });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    setInterval(check, 60 * 60 * 1000);
  }).catch(() => { /* çevrimdışı desteği yok */ });
}

async function start() {
  try { await DB.load(); } catch (err) {
    view.innerHTML = `<div class="empty"><div class="e">⚠️</div><h3>Veritabanı açılamadı</h3><p>${esc(err.message)}</p><p class="small">Gizli sekmede olabilirsiniz ya da tarayıcı depolamayı engelliyor olabilir.</p></div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  setupServiceWorker();
}
start();
