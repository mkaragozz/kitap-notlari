import * as DB from './db.js?v=3.2';
import * as EX from './export.js?v=3.2';
import * as Lock from './lock.js?v=3.2';
import * as Scan from './scanner.js?v=3.2';
import { $, $$, esc, view, nav, toast, openSheet, closeSheet, confirmDialog, modal, today, fmtDate, norm, highlight,
  pickFiles, fileToDataUrl, copyText, starPickerHtml, bindStarPicker, longDate, fmtTime } from './ui.js?v=3.2';
import { pageNum, sortQuotes, allTags, quoteCard, thoughtCard, thoughtText, openRelated, starFilterHtml, applyStarFilter,
  tagInputHtml, bindTagInput } from './cards.js?v=3.2';
import { renderThoughts, renderThought, THOUGHT_ACTIONS } from './thoughts.js?v=3.2';
import { renderJournal, renderJournalCal, JOURNAL_ACTIONS, getPrompt, managePrompts } from './journal.js?v=3.2';
import { renderNotes, renderNotebook, renderShopping, noteCard, nbIsOpen, NOTE_ACTIONS, openNbookEditor, openShopcatEditor, moveOrder, lockKey } from './notes.js?v=3.2';
import { manageNotebooks as manageThoughtNotebooks } from './thoughts.js?v=3.2';
import { GUIDE } from './guide.js?v=3.2';
import { renderReports, REPORT_ACTIONS } from './reports.js?v=3.2';
import { LISTS, SECTION_ROUTES, PRIVATE_LOCK, privateLockOf, listHref, inList, renderListTab, bindListTab, LIST_ACTIONS, topicChips, topicPickerHtml, bindTopicPicker, openTopicEditor } from './lists.js?v=3.2';
import { renderReader, leaveReader, readerRefresh, hooks as readerHooks, readMeta, fileKind, KIND_LABEL, HL_COLORS, HL_NAMES, BG_PRESETS, FONTS, readerPrefs, autoFg } from './reader.js?v=3.2';
import { renderArticles, renderArticleForm, ARTICLE_ACTIONS } from './articles.js?v=3.2';
import { renderBlog, renderPost, renderPostEditor, BLOG_ACTIONS, postPlain } from './blog.js?v=3.2';

const APP_VERSION = '3.2';
window.__knStarted = true; // index.html'deki güvenlik ağı için: modüller sorunsuz yüklendi
const COLORS = [['#7C5CFF', '#FF5DA2'], ['#FF6B57', '#FFB020'], ['#10B8A6', '#2F9BFF'], ['#FF5DA2', '#FFB020'], ['#2F9BFF', '#7C5CFF'], ['#10B8A6', '#7CD957'], ['#FF8A3D', '#FF5D7A']];
const TAG_COLORS = ['#7C5CFF', '#FF5DA2', '#10B8A6', '#FF6B57', '#2F9BFF', '#FFB020', '#8E5CF7', '#13A88F'];
const STATUS = { okunuyor: '📖 Okunuyor', okunacak: '🕮 Okunacak', bitti: '✅ Okudum', none: '— Listede değil' };

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
const NAV_OF = { reports: 'reports', library: 'library', wish: 'wish', favorites: 'fav', private: 'private', ebooks: 'ebooks', book: 'home', books: 'home', read: 'home', 'new-book': 'home', articles: 'articles', 'new-article': 'articles', blog: 'blog', post: 'blog', 'new-post': 'blog', notes: 'notes', shopping: 'notes', thoughts: 'thoughts', thought: 'thoughts', journal: 'journal', 'journal-cal': 'journal', search: 'search', reread: 'reread', tags: 'tags', tag: 'tags', settings: 'settings', more: 'more', privacy: 'more' };

// ---- Menü: Ayarlar'dan seçilen bölümler ve sıraları ----
const NAV_ITEMS = {
  library: { e: '🏠', l: 'Kütüphanem', full: 'Kütüphanem', h: '#/library' },
  wish: { e: '🛒', l: 'Alınacak', full: 'Satın Alınacaklar', h: '#/wish' },
  fav: { e: '💎', l: 'Seçkin', full: 'Seçkin Kitaplar', h: '#/favorites' },
  private: { e: '🔒', l: 'Özel', full: 'Özel Kitaplar', h: '#/private' },
  ebooks: { e: '📱', l: 'E-kitaplar', full: 'E-kitaplar', h: '#/ebooks' },
  notes: { e: '📝', l: 'Notlar', full: 'Not Defteri', h: '#/notes' },
  thoughts: { e: '💡', l: 'Düşünceler', full: 'Düşüncelerim', h: '#/thoughts' },
  journal: { e: '📔', l: 'Günlük', full: 'Günlük', h: '#/journal' },
  search: { e: '🔎', l: 'Ara', full: 'Ara', h: '#/search' },
  reread: { e: '🔖', l: 'Tekrar Oku', full: 'Tekrar Oku', h: '#/reread' },
  tags: { e: '🏷️', l: 'Etiketler', full: 'Etiketler', h: '#/tags' },
  articles: { e: '📄', l: 'Makaleler', full: 'Makaleler', h: '#/articles' },
  reports: { e: '📊', l: 'Raporlar', full: 'Raporlar', h: '#/reports' },
  blog: { e: '✍️', l: 'Blog', full: 'Blog', h: '#/blog' },
};
function navOrder() { return (DB.getSettings().nav || []).filter((k) => NAV_ITEMS[k]); }
function buildNav() {
  const vis = navOrder();
  const rest = Object.keys(NAV_ITEMS).filter((k) => !vis.includes(k));
  const a = (k, cls = '') => `<a href="${NAV_ITEMS[k].h}" data-nav="${k}" class="${cls}"><span class="ni">${NAV_ITEMS[k].e}</span><span>${NAV_ITEMS[k].l}</span>${k === 'reread' ? '<b class="nav-badge" hidden></b>' : ''}</a>`;
  $('#nav').innerHTML = `<div class="nav-brand"><span class="logo">📚</span> Kitap & Notlarım</div>
    <a href="#/" data-nav="home"><span class="ni">📚</span><span>Kitaplar</span></a>
    ${vis.map((k) => a(k)).join('')}
    ${rest.map((k) => a(k, 'desk-only')).join('')}
    <a href="#/settings" data-nav="settings" class="desk-only"><span class="ni">⚙️</span><span>Ayarlar</span></a>
    <a href="#/more" data-nav="more" class="mob-only"><span class="ni">☰</span><span>Diğer</span><b class="nav-badge" hidden></b></a>`;
  $('#nav').classList.toggle('n7', vis.length >= 5);
}
function route() {
  const { parts, params, path } = parseHash();
  const key = parts.length ? NAV_OF[parts[0]] || 'home' : 'home';
  const vis = navOrder();
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === key || (a.dataset.nav === 'more' && !vis.includes(key) && key !== 'home' && window.innerWidth < 900)));
  if (parts[0] !== 'read') leaveReader();
  try {
    if (!parts.length) renderHome('all');
    else if (parts[0] === 'books') renderHome(LISTS[parts[1]] ? parts[1] : 'all');
    else if (parts[0] === 'ebooks' && parts[1] === 'private') renderHome('privateEbooks');
    else if (Object.values(SECTION_ROUTES).includes(parts[0])) renderHome(Object.keys(SECTION_ROUTES).find((k) => SECTION_ROUTES[k] === parts[0]));
    else if (parts[0] === 'read') renderReader(parts[1], params);
    else if (parts[0] === 'articles') renderArticles();
    else if (parts[0] === 'reports') renderReports();
    else if (parts[0] === 'new-article') renderArticleForm(null, params.get('private') === '1');
    else if (parts[0] === 'blog') renderBlog();
    else if (parts[0] === 'new-post') renderPostEditor(null);
    else if (parts[0] === 'post' && parts[2] === 'edit') renderPostEditor(parts[1]);
    else if (parts[0] === 'post') renderPost(parts[1]);
    else if (parts[0] === 'book' && parts[2] === 'edit' && (DB.getBookRaw(parts[1]) || {}).kind === 'article') renderArticleForm(parts[1]);
    else if (parts[0] === 'book' && parts[2] === 'edit') renderBookForm(parts[1]);
    else if (parts[0] === 'book') renderBook(parts[1]);
    else if (parts[0] === 'new-book') renderBookForm(null, params.get('scan') === '1', params.get('list') || '');
    else if (parts[0] === 'notes' && parts[1]) renderNotebook(parts[1]);
    else if (parts[0] === 'notes') renderNotes();
    else if (parts[0] === 'shopping') renderShopping();
    else if (parts[0] === 'thoughts') renderThoughts();
    else if (parts[0] === 'thought') renderThought(parts[1]);
    else if (parts[0] === 'journal') renderJournal(parts[1]);
    else if (parts[0] === 'journal-cal') renderJournalCal(parts[1]);
    else if (parts[0] === 'search') renderSearch(params.get('q') || '');
    else if (parts[0] === 'reread') renderReread();
    else if (parts[0] === 'tags') renderTags();
    else if (parts[0] === 'tag') renderTag(parts[1]);
    else if (parts[0] === 'settings') renderSettings(parts[1] || '');
    else if (parts[0] === 'more') renderMore();
    else if (parts[0] === 'privacy') renderPrivacy();
    else renderHome();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><div class="e">😕</div><h3>Bir hata oluştu</h3><p>${esc(err.message)}</p><p class="small mt">Uygulama yeni güncellendiyse eski dosyalar karışmış olabilir. Bu düğme yalnızca uygulama dosyalarını yeniden indirir, <b>notlarınız silinmez</b>.</p><button class="btn primary" onclick="window.__knRepair && window.__knRepair()">🔄 Onar ve yeniden aç</button></div>`;
  }
  if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; }
  updateBadge();
}
const rerender = () => { if (!document.querySelector('.sheet.full')) route(); };
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
nav.go = go; nav.rerender = rerender;
function updateBadge() {
  const n = dueCount();
  $$('.nav-badge').forEach((b) => { b.hidden = !n; b.textContent = n; });
}

// ================= Ana sayfa =================
function shelfCard(b) {
  const pct = b.pages && b.currentPage ? Math.min(100, Math.round((b.currentPage / b.pages) * 100)) : 0;
  return `<div class="shelf-item"><a href="${b.fileId && b.status === 'okunuyor' ? '#/read/' + b.id : '#/book/' + b.id}">${coverHtml(b)}
    <b>${esc(b.title)}</b><small>${esc(b.author || '')}</small>${b.status === 'okunuyor' && pct ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ''}</a>
    ${b.owned ? '<span class="own-badge" title="Kütüphanemde var">🏠</span>' : ''}
    <button class="move-btn" data-act="move-book" data-id="${b.id}" aria-label="Taşı" title="Taşı">⋯</button></div>`;
}
/** Ana sayfadaki kitabı başka bir yere taşı */
function openMoveSheet(id) {
  const b = DB.getBook(id); if (!b) return;
  const opts = [
    ['reading', '📖', 'Okuyorum', 'Okumakta olduklarım rafına'],
    ['toread', '🕮', 'Okuyacağım', 'Okuyacaklarım rafına'],
    ['read', '✅', 'Okudum', 'Okuduklarım rafına; bitiş tarihi bugün'],
    ['library', '🏠', 'Kütüphaneme taşı', 'Kütüphanem\'de durur, ana sayfadan kalkar'],
    ['fav', '💎', 'Seçkin Kitaplar\'a taşı', 'Seçkin\'de durur, ana sayfadan kalkar'],
    ['wish', '🛒', 'Satın Alınacaklar\'a taşı', 'Henüz almadığım kitap'],
    ['hide', '🙈', 'Ana sayfadan kaldır', 'Kitap silinmez; okundu bilgisi istatistiklerde kalır'],
  ];
  const s = openSheet({
    title: `Taşı: ${b.title}`,
    body: `<div class="move-list">${opts.map(([k, e, l, d]) => `<button data-mv="${k}"><span>${e}</span><b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <a class="btn block mt" href="#/book/${b.id}">📘 Kitabı aç</a>`,
  });
  s.addEventListener('click', async (e) => {
    const x = e.target.closest('[data-mv]'); if (!x) return;
    const k = x.dataset.mv;
    if (k === 'reading') { b.status = 'okunuyor'; b.startDate = b.startDate || today(); b.hideHome = false; }
    if (k === 'toread') { b.status = 'okunacak'; b.hideHome = false; }
    if (k === 'read') { b.status = 'bitti'; b.endDate = b.endDate || today(); if (b.pages) b.currentPage = b.pages; b.hideHome = false; }
    if (k === 'library') { b.owned = true; b.wish = false; b.hideHome = true; }
    if (k === 'fav') { b.favorite = true; b.hideHome = true; }
    if (k === 'wish') { b.wish = true; b.owned = false; b.hideHome = true; if (b.status !== 'bitti') b.status = 'none'; }
    if (k === 'hide') b.hideHome = true;
    await DB.saveBook(b); await closeSheet();
    const msg = { reading: 'Okuyorum rafına taşındı 📖', toread: 'Okuyacaklarım rafına taşındı', read: 'Okudum olarak işaretlendi ✅', library: 'Kütüphanem\'e taşındı 🏠', fav: 'Seçkin Kitaplar\'a taşındı 💎', wish: 'Satın Alınacaklar\'a taşındı 🛒', hide: 'Ana sayfadan kaldırıldı' };
    toast(msg[k]); rerender();
  });
}
function bookCard(b) {
  const qn = DB.quotesOf(b.id).length;
  const pct = b.pages && b.currentPage ? Math.min(100, Math.round((b.currentPage / b.pages) * 100)) : 0;
  return `<a class="book-card" href="#/book/${b.id}">${coverHtml(b)}<div class="bc-body">
    <div class="bc-title">${esc(b.title)}${b.fileId ? ' 📱' : ''}</div><div class="bc-author">${esc(b.author || '—')}</div>
    ${b.status === 'okunuyor' && pct ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ''}
    <div class="bc-foot"><span>✍️ ${qn}</span>${b.rating ? `<span>${'⭐'.repeat(b.rating)}</span>` : b.status === 'okunuyor' && pct ? `<span>%${pct}</span>` : ''}</div></div></a>`;
}

/** Ana sayfadaki bölüm kısayolları: Kütüphanem, Satın Alınacaklar, Seçkin, Özel Kitaplar, E-kitaplar */
function sectionLinksHtml() {
  const all = DB.books();
  return `<div class="sec-links">${Object.keys(SECTION_ROUTES).map((k) => {
    const locked = k === 'private' && Lock.enabled() && !Lock.isOpen('privateBooks');
    const n = locked ? '🔒' : all.filter((b) => inList(b, k)).length;
    return `<a class="sec-link s-${k}" href="${listHref(k)}"><span>${LISTS[k].e}</span><b>${LISTS[k].l}</b><small>${n}</small></a>`;
  }).join('')}<a class="sec-link s-articles" href="#/articles"><span>📄</span><b>Makalelerim</b><small>${DB.articles().filter((a) => !a.private).length}</small></a></div>`;
}
function renderHome(tab = 'all') {
  if (tab !== 'all') {
    const sec = !!SECTION_ROUTES[tab];
    const cnt = DB.books().filter((b) => inList(b, tab)).length;
    const locked = PRIVATE_LOCK[tab] && Lock.enabled() && !Lock.isOpen(PRIVATE_LOCK[tab]);
    const isEb = tab === 'ebooks' || tab === 'privateEbooks';
    const title = isEb ? LISTS.ebooks : LISTS[tab];
    const ebTabs = isEb ? (() => {
      const all = DB.books();
      const pl = Lock.enabled() && !Lock.isOpen('privateEbooks');
      return `<div class="sub-tabs"><a class="${tab === 'ebooks' ? 'on' : ''}" href="#/ebooks">📱 E-kitaplarım <small>${all.filter((b) => inList(b, 'ebooks')).length}</small></a><a class="${tab === 'privateEbooks' ? 'on' : ''}" href="#/ebooks/private">🔒 Özel E-kitaplarım${pl ? '' : ` <small>${all.filter((b) => inList(b, 'privateEbooks')).length}</small>`}</a></div>`;
    })() : '';
    view.innerHTML = `<div class="topbar"><button class="back${sec || isEb ? ' mob-only' : ''}" data-act="back" aria-label="Geri">‹</button><h1>${title.e} ${title.l}${cnt && !locked && !isEb ? ` <span class="h-count">${cnt}</span>` : ''}</h1>${tab === 'library' || tab === 'wish' ? `<a class="btn sm" href="#/new-book?list=${tab}&scan=1" title="Barkodla ekle">📷</a>` : ''}</div>${ebTabs}${renderListTab(tab)}`;
    bindListTab(tab);
    return;
  }
  const all0 = DB.books().filter((b) => !b.private);
  // Ana sayfa yalnızca okuma listeleri: Okuyorum, Okumak istediklerim, (son 3 ayda) Okuduklarım
  const bs = all0.filter((b) => ['okunuyor', 'okunacak', 'bitti'].includes(b.status || 'okunacak'));
  const qs = DB.allQuotes();
  const s = DB.getSettings();
  let h = `<section class="hero slim"><h1>📚 Kitap & Notlarım</h1>
    <form class="searchbar" id="home-search"><input name="q" placeholder="Kitap, alıntı, not, fikir ara…" autocomplete="off" enterkeyhint="search"><button>Ara</button><a class="scan-btn" href="#/new-book?scan=1" title="Barkod okut, kitap ekle" aria-label="Barkod okut">📷</a></form></section>
    ${sectionLinksHtml()}`;
  if (!all0.length) {
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
  const due = dueCount();
  if (due) h += `<a class="banner coral" href="#/reread" style="text-decoration:none;color:inherit"><span style="font-size:22px">🔖</span><span class="grow">Bugün tekrar okumanız gereken <b>${due}</b> bölüm var.</span><span>›</span></a>`;
  const total = qs.length + DB.thoughts().length + DB.moments().length;
  const daysSince = s.lastBackup ? Math.floor((Date.now() - new Date(s.lastBackup).getTime()) / 864e5) : null;
  if (total >= 5 && (daysSince === null || daysSince >= 14)) {
    h += `<div class="banner sun"><span style="font-size:22px">💾</span><span class="grow">${daysSince === null ? 'Henüz yedek almadınız.' : `Son yedek ${daysSince} gün önce.`} Verileriniz yalnızca bu cihazda duruyor.</span><button class="btn sm sun" data-act="backup">Yedek al</button></div>`;
  }
  const lastRead = bs.filter((b) => b.fileId && b.lastReadAt).sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt))[0];
  if (lastRead) h += `<a class="banner teal" href="#/read/${lastRead.id}" style="text-decoration:none;color:inherit"><span style="font-size:22px">📖</span><span class="grow">Okumaya devam et: <b>${esc(lastRead.title)}</b>${lastRead.readPos && lastRead.readPos.page ? ` · s. ${lastRead.readPos.pdfPage || lastRead.readPos.page}` : ''}</span><span>›</span></a>`;
  // Sayaçlar: bütün kitaplar (ana sayfadan kaldırılanlar dahil); raflar: ana sayfada duranlar
  const cntReading = all0.filter((b) => b.status === 'okunuyor').length;
  const cntToread = all0.filter((b) => (b.status || 'okunacak') === 'okunacak').length;
  const cntRead = all0.filter((b) => b.status === 'bitti').length;
  h += `<div class="counters"><a href="#/books/reading"><b>${cntReading}</b><span>📖 Okuyorum</span></a><a href="#/books/toread"><b>${cntToread}</b><span>🕮 Okuyacağım</span></a><a href="#/books/read"><b>${cntRead}</b><span>✅ Okudum</span></a></div>`;
  const onHome = bs.filter((b) => !b.hideHome);
  const groups = [
    ['reading', '📖 Okumakta olduklarım', onHome.filter((b) => b.status === 'okunuyor').sort((a, b) => (b.lastReadAt || b.updatedAt || '').localeCompare(a.lastReadAt || a.updatedAt || ''))],
    ['toread', '🕮 Okuyacaklarım', onHome.filter((b) => (b.status || 'okunacak') === 'okunacak').sort((a, b) => (a.toReadOrder ?? 1e9) - (b.toReadOrder ?? 1e9) || (b.updatedAt || '').localeCompare(a.updatedAt || ''))],
    ['read', '✅ Okuduklarım', onHome.filter((b) => b.status === 'bitti').sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''))],
  ];
  if (!onHome.length) h += `<div class="empty small"><div class="e">📖</div><h3>Ana sayfanız boş</h3><p>Bir kitabı <b>Okunacak</b> ya da <b>Okunuyor</b> olarak işaretleyince burada görünür.</p></div>`;
  groups.forEach(([k, title, list]) => {
    if (!list.length) return;
    h += `<div class="section-title">${title} <span class="count">${list.length}</span><a class="see-all" href="#/books/${k}">Tümü ›</a></div>`;
    h += `<div class="shelf">${list.map(shelfCard).join('')}</div>`;
  });
  if (onHome.length) h += `<p class="hint" style="text-align:center">Kitabın köşesindeki <b>⋯</b> ile başka bir yere taşıyabilir ya da ana sayfadan kaldırabilirsiniz.</p>`;
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
  const raw = DB.getBookRaw(id);
  if (!b && raw && raw.private) { const lk = privateLockOf(raw); Lock.renderLockScreen(view, lk === 'privateArticles' ? 'Özel Makalelerim' : lk === 'privateEbooks' ? 'Özel E-kitaplarım' : 'Özel Kitaplar'); return; }
  if (!b) { view.innerHTML = `<div class="empty"><div class="e">🔍</div><h3>Kitap bulunamadı</h3><a class="btn" href="#/">Kitaplara dön</a></div>`; return; }
  const qs = DB.quotesOf(id);
  const tab = bookTab[id] || 'quotes';
  const pct = b.pages && b.currentPage ? Math.min(100, Math.round((b.currentPage / b.pages) * 100)) : 0;
  let h = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1></h1><a class="btn sm" href="#/book/${id}/edit">✏️ Düzenle</a></div>
    <div class="book-head">${coverHtml(b)}<div style="min-width:0;flex:1">
      <h2>${esc(b.title)}</h2>${b.subtitle ? `<div class="sub">${esc(b.subtitle)}</div>` : ''}
      <div class="sub"><b>${esc(b.author || '')}</b></div>
      <div class="meta">${esc((b.kind === 'article' ? [b.journal, b.year, b.volume && 'C. ' + b.volume, b.issue && 'S. ' + b.issue] : [b.publisher, b.year, b.edition && b.edition + '. baskı']).filter(Boolean).join(' · '))}</div>
      <span class="status-pill st-${b.status || 'okunacak'}">${b.kind === 'article' ? '📄 Makale · ' : ''}${STATUS[b.status || 'okunacak']}</span>
      <div class="flag-row">${b.owned ? '<span class="chip own">🏠 Kütüphanemde</span>' : ''}${b.wish ? '<span class="chip">🛒 Alınacak</span>' : ''}${b.favorite ? '<span class="chip">💎 Seçkin</span>' : ''}${b.private ? '<span class="chip">🔒 Özel</span>' : ''}${topicChips(b)}</div>
      <div class="row-actions" style="margin:8px 0 0">${b.status === 'none' ? `<button class="btn sm" data-act="start-reading" data-id="${b.id}">📖 Okumaya başla</button>` : ''}</div>
      ${b.fileId ? `<a class="btn primary sm mt" href="#/read/${b.id}">📖 ${b.readPos ? 'Okumaya devam et' : 'Oku'}${b.readPos && (b.readPos.pdfPage || b.readPos.page) ? ` · s. ${b.readPos.pdfPage || b.readPos.page}` : ''}</a>` : ''}
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
    ${b.kind !== 'article' ? `<div class="card"><b>📚 Listeler</b><p class="hint">Kitabın hangi listelerde görüneceğini seçin.</p>
      ${[['owned', '🏠 Kütüphanemde var'], ['wish', '🛒 Satın almak istiyorum'], ['favorite', '💎 Seçkin (hayatıma dokundu)'], ['private', '🔒 Özel kitap (PIN ile kilitli bölümde)']].map(([k, l]) => `<label class="check"><input type="checkbox" data-flag="${k}" ${b[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <div class="mt">${topicChips(b) || '<span class="small muted">Kategori yok</span>'} <a class="btn sm ghost" href="#/book/${b.id}/edit">Kategorileri düzenle</a></div></div>` : ''}
    ${b.fileId ? `<div class="card"><b>📱 Dosya</b><p class="small">${esc(b.fileName || '')} · ${esc(KIND_LABEL[b.fileType] || '')}${b.fileSize ? ` · ${(b.fileSize / 1048576).toFixed(1)} MB` : ''}</p><a class="btn block" href="#/read/${b.id}">📖 Oku</a></div>` : ''}
    <button class="btn danger block" data-act="del-book" data-book="${b.id}">🗑️ ${b.kind === 'article' ? 'Makaleyi' : 'Kitabı'} sil</button>`;
}

function bindInfoTab(b) {
  view.querySelectorAll('[data-flag]').forEach((c) => {
    c.onchange = async () => {
      b[c.dataset.flag] = c.checked;
      if (c.dataset.flag === 'owned' && c.checked) b.wish = false;
      await DB.saveBook(b);
      toast(c.dataset.flag === 'private' && c.checked ? (Lock.enabled() ? 'Kitap Özel bölümüne taşındı 🔒' : 'Özel olarak işaretlendi. Kilit için Ayarlar → Kilit\'ten PIN belirleyin.') : 'Kaydedildi ✓', 3500);
      rerender();
    };
  });
  const seg = $('#st-seg');
  if (!seg) return;
  seg.onclick = async (e) => {
    const btn = e.target.closest('[data-st]'); if (!btn) return;
    b.status = btn.dataset.st;
    if (['okunuyor', 'okunacak'].includes(b.status)) b.hideHome = false;
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

function renderBookForm(id, autoScan = false, listKey = '') {
  const sectionAdd = ['library', 'wish', 'fav', 'private', 'ebooks', 'privateEbooks'].includes(listKey);
  const b = id ? DB.getBook(id) : { status: sectionAdd ? 'none' : listKey === 'reading' ? 'okunuyor' : 'okunacak', isNovel: false, owned: listKey === 'library', wish: listKey === 'wish', favorite: listKey === 'fav', private: listKey === 'private' || listKey === 'privateEbooks' };
  let newFile = null;
  if (!b) { go('#/'); return; }
  const v = (k) => esc(b[k] || '');
  const formTitle = id ? 'Kitabı düzenle' : listKey && LISTS[listKey] && SECTION_ROUTES[listKey] ? `${LISTS[listKey].e} ${listKey === 'ebooks' ? 'E-kitap yükle' : LISTS[listKey].l + ': kitap ekle'}` : 'Yeni kitap';
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${esc(formTitle)}</h1></div>
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
      <label class="field"><span>Tür (yayın bilgisi)</span><input name="categories" value="${v('categories')}" placeholder="ör. Roman, Deneme"></label>
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
    <div class="card"><b>📚 Bölümler ve kategoriler</b>
      ${[['owned', '🏠 Kütüphanemde var'], ['wish', '🛒 Satın almak istiyorum'], ['favorite', '💎 Seçkin (hayatıma dokundu)'], ['private', '🔒 Özel (PIN ile kilitli; e-kitapsa “Özel E-kitaplarım”da)']].map(([k, l]) => `<label class="check"><input type="checkbox" name="${k}" ${b[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <div class="field mt"><span>Kategoriler</span>${topicPickerHtml(b.topics || [])}</div></div>
    <div class="card ${listKey === 'ebooks' ? 'hl-card' : ''}"><b>📱 E-kitap dosyası</b><p class="hint">PDF, Word (.docx), metin (.txt) ya da EPUB yükleyin; uygulamanın içinde okuyun, metni seçip alıntı olarak kaydedin. Dosya yalnızca bu cihazda saklanır.</p>
      <div id="ebook-file">${b.fileId ? `<div class="file-pill">📄 ${esc(b.fileName || 'Dosya')} <small>${esc(KIND_LABEL[b.fileType] || '')}</small></div>` : ''}</div>
      <div class="row-actions"><button type="button" class="btn ${listKey === 'ebooks' ? 'primary' : ''}" data-act="ebook-pick" style="flex:1">${b.fileId ? '🔁 Dosyayı değiştir' : '📎 Dosya seç'}</button>${b.fileId ? '<button type="button" class="btn ghost" data-act="ebook-remove">Kaldır</button>' : ''}</div></div>
    <button class="btn primary block" type="submit">💾 Kaydet</button>
  </form>`;

  const form = $('#book-form');
  const topicSel = bindTopicPicker(form, b.topics || []);
  let removeFile = false;
  let status = b.status || 'okunacak';
  let cover = b.cover || '';
  let statusTouched = !!id;
  const setStatus = (st) => { status = st; form.querySelectorAll('#form-st button').forEach((x) => x.classList.toggle('on', x.dataset.st === st)); };
  // Yeni kitapta bir bölüm kutusu işaretlenince (ya da dosya seçilince) kitap okuma listesine düşmesin: Durum "Listede değil"
  const autoStatus = () => {
    if (statusTouched) return;
    const anySection = ['owned', 'wish', 'favorite', 'private'].some((k) => form[k] && form[k].checked) || !!newFile;
    setStatus(anySection ? 'none' : 'okunacak');
  };
  ['owned', 'wish', 'favorite', 'private'].forEach((k) => { if (form[k]) form[k].addEventListener('change', autoStatus); });
  $('#form-st').onclick = (e) => {
    const btn = e.target.closest('[data-st]'); if (!btn) return;
    statusTouched = true;
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
    const links = Scan.searchLinksHtml(isbn);
    if (!info) {
      msg(`Bu ISBN ile kitap bulunamadı (${esc(isbn)}). İnternette arayıp bilgileri aşağıya elle yazabilirsiniz; bir dahaki sefere bu ISBN okutulunca bilgiler kendiliğinden dolar.${dupCheck(isbn)}${links ? `<div class="row-actions" style="margin:8px 0 0">${links}</div>` : ''}`, 'sun');
      return;
    }
    const n = fill(info);
    if (!cover && info.cover) setCover(info.cover);
    if (!cover && info.coverUrls && info.coverUrls.length) setCover(await Scan.fetchCover(info.coverUrls));
    msg(`✓ ${info.fromMemo ? 'Daha önce kaydettiğiniz bilgilerden dolduruldu.' : n ? `${n} alan dolduruldu.` : 'Bilgiler zaten dolu.'} Lütfen kontrol edin; eksik olanları elle tamamlayın.${dupCheck(isbn)}${links && !info.fromMemo ? `<div class="row-actions" style="margin:8px 0 0">${links}</div>` : ''}`);
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
    if (a === 'ebook-pick') {
      const [f] = await pickFiles({ accept: '.pdf,.docx,.txt,.epub,.md,application/pdf,application/epub+zip,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      if (!f) return;
      const kind = fileKind(f.name, f.type);
      if (!kind || kind === 'doc') { toast(kind === 'doc' ? 'Eski .doc biçimi desteklenmiyor; Word\'de “.docx” olarak kaydedin.' : 'PDF, Word (.docx), TXT ya da EPUB seçin.', 4500); return; }
      newFile = f; removeFile = false; autoStatus();
      $('#ebook-file').innerHTML = `<div class="file-pill">📄 ${esc(f.name)} <small>${KIND_LABEL[kind]} · ${(f.size / 1048576).toFixed(1)} MB</small></div><div class="small muted">Bilgiler okunuyor…</div>`;
      const meta = await readMeta(f);
      const n = fill(meta);
      $('#ebook-file').innerHTML = `<div class="file-pill">📄 ${esc(f.name)} <small>${KIND_LABEL[kind]} · ${(f.size / 1048576).toFixed(1)} MB</small></div>${n ? `<div class="small" style="color:var(--teal)">✓ Dosyadan ${n} alan dolduruldu</div>` : ''}`;
    }
    if (a === 'ebook-remove') { removeFile = true; newFile = null; $('#ebook-file').innerHTML = '<div class="small muted">Dosya kaydedince kaldırılacak.</div>'; act.remove(); }
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
    ['owned', 'wish', 'favorite', 'private'].forEach((k) => { b[k] = !!fd.get(k); });
    if (b.owned) b.wish = false;
    b.topics = topicSel.get();
    if (removeFile && b.fileId) { await DB.deleteFile(b.fileId); ['fileId', 'fileName', 'fileType', 'fileSize', 'readPos', 'readMode'].forEach((k) => delete b[k]); }
    if (newFile) {
      if (b.fileId) await DB.deleteFile(b.fileId);
      const rec = await DB.putFile({ name: newFile.name, type: newFile.type, size: newFile.size, blob: newFile });
      Object.assign(b, { fileId: rec.id, fileName: newFile.name, fileType: fileKind(newFile.name, newFile.type), fileSize: newFile.size, readPos: null });
    }
    await DB.saveBook(b);
    Scan.rememberBook(b).catch(() => {});
    toast(isNew ? 'Kitap eklendi ✓' : 'Kaydedildi ✓');
    // Yeni kitap: işaretlenen bölüm açılsın (öncelik: Özel, Satın Alınacaklar, Kütüphanem, E-kitaplar, Seçkin)
    const dest = (sectionAdd && !(listKey === 'ebooks' && b.private)) ? (listKey === 'private' && b.fileId ? 'privateEbooks' : listKey) : b.private && b.fileId ? 'privateEbooks' : b.private ? 'private' : b.wish ? 'wish' : b.owned ? 'library' : b.fileId ? 'ebooks' : b.favorite ? 'fav' : '';
    if (isNew && dest) { location.replace(listHref(dest)); setTimeout(() => toast(`Kitap “${LISTS[dest].l}” bölümüne eklendi ✓`), 50); }
    else if (isNew) location.replace('#/book/' + b.id); else go('#/book/' + b.id);
  };
  if (autoScan && !id) setTimeout(doScan, 200);
  if (listKey === 'ebooks' && !id) setTimeout(() => { const btn = form.querySelector('[data-act="ebook-pick"]'); if (btn) btn.scrollIntoView({ block: 'center' }); }, 150);
}

// ================= Alıntı düzenleyici =================
function openQuoteEditor(qid, bookId, preset = null, onSaved = null) {
  const existing = qid ? DB.getQuote(qid) : null;
  const q = existing ? { ...existing } : { bookId, text: '', page: '', pageEnd: '', chapter: '', tags: [], comment: '', stars: 0, reread: null, ...(preset || {}) };
  delete q.fromReader;
  const book = DB.getBook(q.bookId);
  if (!book) return;
  const s = openSheet({
    title: existing ? 'Alıntıyı düzenle' : q.src ? `📥 Alıntılarıma aktar` : `✍️ Yeni alıntı · ${book.title}`,
    body: `${q.src ? `<div class="src-box"><b>📎 Kaynak / dipnot</b><span>${esc(EX.sourceText(book, q))}</span><button type="button" class="btn sm ghost" data-x="copy-src">📋</button></div>` : ''}<label class="field"><span>Alıntı metni</span><textarea class="serif" rows="6" id="q-text" placeholder="Kitaptan almak istediğiniz cümleyi yazın">${esc(q.text)}</textarea></label>
      <div class="grid2"><label class="field"><span>Sayfa</span><input id="q-page" inputmode="numeric" value="${esc(q.page)}" placeholder="45"></label>
      <label class="field"><span>Bitiş sayfası (isteğe bağlı)</span><input id="q-page2" inputmode="numeric" value="${esc(q.pageEnd)}" placeholder="47"></label></div>
      <label class="field"><span>💭 Yorumum</span><textarea id="q-comment" rows="3" placeholder="Bu alıntı bana ne düşündürdü? (Alıntı yazmadan yalnızca yorum da yazabilirsiniz)">${esc(q.comment)}</textarea></label>
      <div class="field"><span>Önem derecesi</span>${starPickerHtml(q.stars)}</div>
      <div class="field"><span>Renk</span><div class="color-pick" id="q-color">${['', ...Object.keys(HL_COLORS)].map((c) => `<button type="button" data-c="${c}" class="${(q.color || '') === c ? 'on' : ''}" style="background:${c ? HL_COLORS[c] : 'var(--card)'}" title="${c ? HL_NAMES[c] : 'Renksiz'}">${c ? '' : '∅'}</button>`).join('')}</div></div>
      <label class="field"><span>Bölüm</span><input id="q-chapter" value="${esc(q.chapter)}" placeholder="${(book.toc || []).length ? 'Sayfa yazınca otomatik dolar' : 'ör. 3. Bölüm'}"></label>
      <div class="field"><span>Etiketler (konu)</span>${tagInputHtml(q.tags || [])}</div>
      <label class="check"><input type="checkbox" id="q-rr" ${q.reread ? 'checked' : ''}> 🔖 Tekrar okunacaklar listesine ekle</label>
      <div id="rr-box" ${q.reread ? '' : 'hidden'}><label class="field"><span>Hatırlatma tarihi (isteğe bağlı)</span><input type="date" id="q-due" value="${esc((q.reread && q.reread.due) || '')}"></label>
        <div class="row-actions">${[['1 hafta', 7], ['1 ay', 30], ['3 ay', 90]].map(([l, d]) => `<button type="button" class="btn sm" data-days="${d}">${l} sonra</button>`).join('')}</div></div>`,
    foot: `${existing ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  const tags = bindTagInput(s, q.tags || []);
  const stars = bindStarPicker(s);
  let color = q.color || '';
  const cs = $('[data-x="copy-src"]', s);
  if (cs) cs.onclick = () => copyText(EX.sourceText(book, q));
  $('#q-color', s).onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; $('#q-color', s).querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
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
      text, comment, page: pageIn.value.trim(), pageEnd: $('#q-page2', s).value.trim(), chapter: chIn.value.trim(), tags: tags.get(), stars: stars.get(), color,
      reread: rr ? { due, done: q.reread ? !!q.reread.done && q.reread.due === due : false } : null,
    });
    await DB.saveQuote(q);
    await closeSheet();
    if (!existing) bookTab[q.bookId] = 'quotes';
    toast(onSaved ? 'Notlarınıza kaydedildi ✓' : 'Kaydedildi ✓');
    if (onSaved) onSaved(q); else rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => {
    if (await confirmDialog('Bu alıntı silinsin mi?', 'Sil')) { await DB.deleteQuote(q.id); toast('Silindi'); if (onSaved) onSaved(null); else rerender(); }
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
    const base = single ? EX.safeName(single.title) + ' - notlar' : 'Kitap & Notlarım - ' + today();
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
  const tOpen = Lock.isOpen('thoughts'), jOpen = Lock.isOpen('journal');
  const closedNbs = DB.nbooks().filter((n) => !nbIsOpen(n.id));
  const shut = [!tOpen && 'Düşünceler', !jOpen && 'Günlük', ...closedNbs.map((n) => n.name)].filter(Boolean);
  const open = !shut.length;
  const lockNote = shut.length ? `<div class="banner sun small">🔒 Kilitli bölümler aramaya dahil edilmedi: ${esc(shut.join(', '))}. <button class="btn sm" data-act="unlock-search">Kilidi aç</button></div>` : '';
  if (!q) {
    h += `<div class="empty"><div class="e">💡</div><h3>Aklınıza ne geldi?</h3><p>Bir kelime, konu ya da hatırladığınız bir cümle yazın. Kitaplarda, alıntılarda, yorumlarda, etiketlerde, notlarda${open ? ', düşüncelerinizde ve günlüğünüzde' : ''} aranır.</p></div>${lockNote}`;
    view.innerHTML = h; bindSearch(); return;
  }
  const match = (hay) => { const n = norm(hay); return terms.every((t) => n.includes(t)); };
  const bs = DB.books();
  const bookHits = bs.concat(DB.articles()).filter((b) => match([b.title, b.subtitle, b.author, b.publisher, b.translator, b.categories, b.journal, b.doi].join(' ')));
  const pHits = Lock.isOpen('blog') ? DB.posts().filter((x) => match([x.title, postPlain(x.body), x.category, (x.tags || []).join(' ')].join(' '))) : [];
  const tocHits = [];
  bs.forEach((b) => (b.toc || []).forEach((t) => { if (match(t.title)) tocHits.push({ b, t }); }));
  let qHits = DB.allQuotes().filter((x) => { const b = DB.getBook(x.bookId); return match([x.text, x.comment, (x.tags || []).join(' '), x.chapter, b.title, b.author].join(' ')); });
  qHits = applyStarFilter(qHits, searchFilter.stars).sort((a, c) => {
    const sa = terms.filter((t) => norm(a.text).includes(t)).length, sc = terms.filter((t) => norm(c.text).includes(t)).length;
    return sc - sa || (c.stars || 0) - (a.stars || 0) || (c.updatedAt || '').localeCompare(a.updatedAt || '');
  });
  const nHits = DB.allNotes().filter((n) => nbIsOpen(n.nbId) && match([n.title, n.text].join(' '))).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const tHits = tOpen ? DB.thoughts().filter((t) => match([t.title, thoughtText(t), (t.tags || []).join(' ')].join(' '))) : [];
  const mHits = jOpen ? DB.moments().filter((m) => match(m.text)).sort((a, b) => (b.at || '').localeCompare(a.at || '')) : [];

  h += lockNote;
  if (!bookHits.length && !tocHits.length && !qHits.length && !tHits.length && !mHits.length && !nHits.length && !pHits.length) h += `<div class="empty"><div class="e">🤔</div><h3>Sonuç bulunamadı</h3><p>Daha kısa ya da farklı bir kelime deneyin.</p></div>`;
  if (bookHits.length) h += `<div class="section-title">📘 Kitaplar ve makaleler <span class="count">${bookHits.length}</span></div><div class="book-grid">${bookHits.map(bookCard).join('')}</div>`;
  if (tocHits.length) {
    h += `<div class="section-title">📑 İçindekiler’de geçiyor <span class="count">${tocHits.length}</span></div><div class="card"><ul class="toc-list">`;
    tocHits.slice(0, 40).forEach(({ b, t }) => { h += `<li><span><a href="#/book/${b.id}" class="q-book" data-act="open-toc" data-book="${b.id}">${esc(b.title)}</a> — ${highlight(t.title, terms)}</span><span class="pg">${t.page ? 's. ' + esc(t.page) : ''}</span></li>`; });
    h += `</ul></div>`;
  }
  if (qHits.length || searchFilter.stars !== 'all') {
    h += `<div class="section-title">✍️ Alıntılar <span class="count">${qHits.length}</span></div><div class="row-actions">${starFilterHtml(searchFilter.stars, 'search-sfilter')}</div>`;
    h += qHits.slice(0, 100).map((x) => quoteCard(x, { showBook: true, terms })).join('') || '<p class="muted">Bu filtrede alıntı yok.</p>';
  }
  if (pHits.length) h += `<div class="section-title">✍️ Blog yazıları <span class="count">${pHits.length}</span></div>${pHits.slice(0, 40).map((x) => `<a class="card m-hit" href="#/post/${x.id}"><b>${highlight(x.title || 'Başlıksız', terms)}</b><div class="m-text clamp3 small">${highlight(postPlain(x.body).slice(0, 300), terms)}</div></a>`).join('')}`;
  if (nHits.length) h += `<div class="section-title">📝 Notlar <span class="count">${nHits.length}</span></div>${nHits.slice(0, 60).map((n) => noteCard(n, { showNb: true, terms })).join('')}`;
  if (tHits.length) h += `<div class="section-title">💡 Düşünceler <span class="count">${tHits.length}</span></div>${tHits.slice(0, 60).map((t) => thoughtCard(t, { terms })).join('')}`;
  if (mHits.length) {
    h += `<div class="section-title">📔 Günlük <span class="count">${mHits.length}</span></div>`;
    mHits.slice(0, 60).forEach((m) => {
      const p = getPrompt(m.prompt, m);
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
  const pms = DB.allPagemarks().filter((m) => m.kind === 'reread');
  let h = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>🔖 Tekrar Oku</h1></div>`;
  const openPm = pms.filter((m) => !m.done);
  if (openPm.length) {
    h += `<div class="section-title">📖 İşaretlenen sayfalar <span class="count">${openPm.length}</span></div>`;
    openPm.forEach((m) => {
      const b = DB.getBook(m.bookId); const pg = m.pos && (m.pos.pdfPage || m.pos.page);
      h += `<article class="q-card k-tekrar"><div class="q-ref"><a class="q-book" href="#/book/${b.id}">${b.kind === 'article' ? '📄' : '📘'} ${esc(b.title)}</a>${pg ? `<span class="badge page">s. ${esc(pg)}</span>` : ''}<span class="small muted">${fmtDate(m.createdAt)}</span></div>
        <div class="q-actions"><a class="btn sm primary" href="#/read/${b.id}?pos=${m.pos ? m.pos.frac || 0 : 0}${m.pos && m.pos.pdfPage ? '&pdfpage=' + m.pos.pdfPage : ''}">📖 Sayfayı aç</a><button data-act="pm-done" data-id="${m.id}" style="color:var(--teal)">✅ Okudum</button></div></article>`;
    });
  }
  if (!items.length && !openPm.length) {
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
    h += `<p class="hint">Bir etikete dokunduğunuzda o konunun geçtiği tüm alıntılar${Lock.isOpen('thoughts') ? ' ve düşünceler' : ''} listelenir.</p><div class="tag-cloud">${tags.map(([t, n], i) => `<a href="#/tag/${encodeURIComponent(t)}" style="background:${TAG_COLORS[i % TAG_COLORS.length]};font-size:${13 + Math.round((n / max) * 7)}px">#${esc(t)} <small style="opacity:.85">${n}</small></a>`).join('')}</div>`;
  }
  view.innerHTML = h;
}
function renderTag(tag) {
  const qs = DB.allQuotes().filter((q) => (q.tags || []).includes(tag));
  const ts = DB.thoughts().filter((t) => (t.tags || []).includes(tag));
  const open = Lock.isOpen('thoughts');
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

// ================= Diğer, Ayarlar, Gizlilik, Kılavuz =================
function renderMore() {
  const n = dueCount();
  const vis = navOrder();
  const hidden = Object.keys(NAV_ITEMS).filter((k) => !vis.includes(k));
  const books = DB.books();
  const cnt = (k) => { if (k === 'articles') return DB.articles().filter((a) => !a.private).length; if (!LISTS[k]) return ''; if (k === 'private' && Lock.enabled() && !Lock.isOpen('privateBooks')) return '🔒'; return books.filter((b) => inList(b, k)).length; };
  const row = (k) => `<a href="${NAV_ITEMS[k].h}"><span>${NAV_ITEMS[k].e}</span><b>${NAV_ITEMS[k].full}</b>${k === 'reread' && n ? `<i class="nav-badge" style="position:static">${n}</i>` : `<small class="cnt">${cnt(k)}</small>`}<em>›</em></a>`;
  const bookKeys = hidden.filter((k) => LISTS[k] || k === 'articles');
  const otherKeys = hidden.filter((k) => !bookKeys.includes(k));
  view.innerHTML = `<div class="topbar"><h1>☰ Diğer</h1></div>
    ${bookKeys.length ? `<div class="set-group">Kitaplarım &amp; Makalelerim</div><div class="more-list tight">${bookKeys.map(row).join('')}</div>` : ''}
    ${otherKeys.length ? `<div class="set-group">Bölümler</div><div class="more-list tight">${otherKeys.map(row).join('')}</div>` : ''}
    <div class="set-group">Uygulama</div><div class="more-list tight">
      <a href="#/settings"><span>⚙️</span><b>Ayarlar</b><em>›</em></a>
      <a href="#/settings/guide"><span>📘</span><b>Kullanım kılavuzu</b><em>›</em></a>
      <button data-act="share-app"><span>📤</span><b>Uygulamayı paylaş</b><em>›</em></button>
      <a href="#/privacy"><span>🔐</span><b>Gizlilik politikası</b><em>›</em></a>
    </div>
    <p class="hint" style="text-align:center">Kitap & Notlarım · sürüm ${APP_VERSION}</p>`;
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

const SETTINGS_PAGES = [
  ['Kişiselleştirme', [
    ['lock', '🔒', 'Kilit', 'PIN, kilitli bölümler, kurtarma kodu'],
    ['menu', '🧭', 'Menü', 'Alt menüde görünen bölümler ve sırası'],
    ['barcode', '📷', 'Barkod ve kitap arama', 'Titreşim, ses, arama düğmeleri'],
    ['reader', '📖', 'Okuma görünümü', 'Zemin rengi, yazı tipi, boyut, sayfa çevirme'],
  ]],
  ['İçerik', [
    ['topics', '🏷️', 'Kategoriler', 'Kitap ve makale kategorileri'],
    ['notebooks', '📝', 'Not defterleri', 'Defterler ve alışveriş kategorileri'],
    ['@thought-nbs', '💡', 'Düşünce defterleri', 'Ekle, adlandır, sil'],
    ['@journal-prompts', '📔', 'Günlük başlıkları', 'Ekle, emoji, gizle'],
  ]],
  ['Veri', [
    ['backup', '💾', 'Yedekleme ve aktarım', 'Telefon ↔ bilgisayar'],
    ['export', '⬇️', 'Dışa aktarma', 'PDF, Word, Excel'],
  ]],
  ['Uygulama', [
    ['install', '📲', 'Yükle ve paylaş', 'Ana ekrana ekleme, paylaşma'],
    ['guide', '📘', 'Kullanım kılavuzu', 'Adım adım anlatım, sık sorulanlar'],
    ['@privacy', '🔐', 'Gizlilik politikası', ''],
    ['danger', '⚠️', 'Verileri sil', ''],
  ]],
];
const SETTINGS_TITLES = Object.fromEntries(SETTINGS_PAGES.flatMap(([, items]) => items.map(([k, e, t]) => [k, `${e} ${t}`])));

async function renderSettings(sub = '') {
  const top = (title) => `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${title}</h1></div>`;
  if (!sub) {
    view.innerHTML = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>⚙️ Ayarlar</h1></div>
      ${SETTINGS_PAGES.map(([group, items]) => `<div class="set-group">${group}</div><div class="more-list">${items.map(([k, e, t, d]) => {
        const attr = k === '@privacy' ? 'href="#/privacy"' : k.startsWith('@') ? `href="#" data-act="set-open" data-k="${k.slice(1)}"` : `href="#/settings/${k}"`;
        return `<a ${attr}><span>${e}</span><b>${t}</b>${d ? `<small>${d}</small>` : ''}<em>›</em></a>`;
      }).join('')}</div>`).join('')}
      <p class="hint" style="text-align:center;margin-top:18px">Kitap & Notlarım · sürüm ${APP_VERSION}</p>`;
    return;
  }
  const s = DB.getSettings();
  let h = top(SETTINGS_TITLES[sub] || '⚙️ Ayarlar');
  if (sub === 'lock') {
    const pinOn = Lock.enabled();
    const sections = [['journal', '📔 Günlük'], ['thoughts', '💡 Düşüncelerim'], ['reports', '📊 Raporlar'], ['privateBooks', '🔒 Özel Kitaplar'], ['privateEbooks', '🔒 Özel E-kitaplarım'], ['privateArticles', '🔒 Özel Makalelerim'], ['blog', '✍️ Blog'], ...DB.nbooks().map((n) => [lockKey(n.id), `${n.emoji || '📓'} ${n.name}`]), ['shopping', '🛒 Alışveriş Listem']];
    h += `<div class="card"><b>PIN</b>
      <p class="hint">Tüm kilitli bölümler için <b>tek PIN</b> ve <b>tek kurtarma kodu</b> kullanılır. Kilidi bir kez açınca tüm kilitli bölümler açılır.</p>
      ${pinOn ? `<p class="small">Durum: <b style="color:var(--teal)">Açık</b></p><div class="row-actions"><button class="btn" data-act="pin-change" style="flex:1">🔁 PIN'i değiştir</button><button class="btn" data-act="pin-regen" style="flex:1">🔑 Kurtarma kodunu yenile</button></div><button class="btn danger block" data-act="pin-off">Kilidi tamamen kapat</button>`
        : `<p class="small">Durum: <b>Kapalı</b></p><button class="btn primary block" data-act="pin-on">🔒 PIN kilidini aç</button>`}</div>
      <div class="card"><b>Kilitli bölümler</b><p class="hint">İşaretli bölümlere girerken PIN sorulur.${pinOn ? '' : ' (PIN açıldığında geçerli olur.)'}</p>
        ${sections.map(([k, l]) => `<label class="check"><input type="checkbox" data-lock="${esc(k)}" ${Lock.isLockedSection(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
      <div class="card"><label class="field"><span>Kullanılmazsa yeniden kilitle</span><select id="lock-min">${[1, 5, 15, 30, 60].map((m) => `<option value="${m}" ${String(s.lockMinutes) === String(m) ? 'selected' : ''}>${m} dakika sonra</option>`).join('')}</select></label>
        <p class="hint">Uygulamayı kapattığınızda kilit her zaman yeniden devreye girer. Bu kilit meraklı gözlere karşıdır; veriler cihazda şifrelenmiş değildir.</p></div>`;
  } else if (sub === 'menu') {
    const vis = navOrder();
    const all = [...vis, ...Object.keys(NAV_ITEMS).filter((k) => !vis.includes(k))];
    h += `<p class="hint">Alt menüde <b>📚 Kitaplar</b> ve <b>☰ Diğer</b> her zaman vardır. Aşağıdan diğer bölümleri seçin ve sıralayın; işaretli olmayanlar <b>☰ Diğer</b> sayfasında durur. Telefonda en fazla 5 bölüm rahat sığar.</p>
      <div class="card">${all.map((k) => {
        const on = vis.includes(k), i = vis.indexOf(k);
        return `<div class="order-row"><label class="check" style="flex:1"><input type="checkbox" data-navk="${k}" ${on ? 'checked' : ''}> ${NAV_ITEMS[k].e} ${NAV_ITEMS[k].full}</label>
          ${on ? `<button class="btn sm" data-act="nav-move" data-k="${k}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Yukarı">↑</button><button class="btn sm" data-act="nav-move" data-k="${k}" data-d="1" ${i === vis.length - 1 ? 'disabled' : ''} aria-label="Aşağı">↓</button>` : ''}</div>`;
      }).join('')}</div>
      <button class="btn block" data-act="nav-reset">Varsayılana dön</button>`;
  } else if (sub === 'barcode') {
    const links = s.searchLinks || [];
    h += `<div class="card"><b>Okuyunca</b>
        <label class="check"><input type="checkbox" data-set="scanVibrate" ${s.scanVibrate ? 'checked' : ''}> 📳 Titreşim</label>
        <label class="check"><input type="checkbox" data-set="scanBeep" ${s.scanBeep ? 'checked' : ''}> 🔊 Kısa ses</label></div>
      <div class="card"><b>Kitap bulunamayınca çıkacak arama düğmeleri</b><p class="hint">Düğme, kitabın ISBN'i ile o sitenin arama sayfasını açar.</p>
        ${Object.entries(Scan.SEARCH_SITES).map(([k, v]) => `<label class="check"><input type="checkbox" data-link="${k}" ${links.includes(k) ? 'checked' : ''}> 🔎 ${esc(v.l)}</label>`).join('')}</div>
      <div class="card"><b>ISBN hafızası</b><p class="hint">Elle girdiğiniz kitap bilgileri, aynı ISBN tekrar okutulunca kullanılmak üzere saklanır (${DB.S.isbnmemo ? [...DB.S.isbnmemo.values()].filter((x) => !x.deleted).length : 0} kayıt). Yedeğe dahildir.</p></div>`;
  } else if (sub === 'notebooks') {
    const nbs = DB.nbooks(), cats = DB.shopcats();
    h += `<div class="card"><b>📝 Not defterleri</b><p class="hint">Hazır defterler (Genel Notlar, Özel Notlar) silinemez; adı ve simgesi değiştirilebilir.</p>
        ${nbs.map((n, i) => `<div class="order-row"><span style="flex:1">${esc(n.emoji || '📓')} ${esc(n.name)}${Lock.isLockedSection(lockKey(n.id)) ? ' 🔒' : ''} <small class="muted">${DB.notesOf(n.id).length} not</small></span>
          <button class="btn sm" data-act="nbook-move" data-id="${n.id}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm" data-act="nbook-move" data-id="${n.id}" data-d="1" ${i === nbs.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn sm" data-act="set-nbook-edit" data-id="${n.id}">✏️</button></div>`).join('')}
        <button class="btn primary block mt" data-act="set-nbook-new">＋ Not Defteri</button></div>
      <div class="card"><b>🛒 Alışveriş kategorileri</b>
        ${cats.length ? cats.map((c, i) => `<div class="order-row"><span style="flex:1">${esc(c.emoji || '🛒')} ${esc(c.name)}</span>
          <button class="btn sm" data-act="shopcat-move" data-id="${c.id}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm" data-act="shopcat-move" data-id="${c.id}" data-d="1" ${i === cats.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn sm" data-act="set-shopcat-edit" data-id="${c.id}">✏️</button></div>`).join('') : '<p class="hint">Henüz kategori yok.</p>'}
        <button class="btn block mt" data-act="set-shopcat-new">＋ Kategori</button></div>`;
  } else if (sub === 'topics') {
    const ts = DB.topics();
    h += `<p class="hint">Kategoriler Kütüphanem, Okunacaklar, Satın Alınacaklar, Seçkin, Özel Kitaplar, E-kitaplar ve Makalelerde ortaktır. Her bölümdeki “＋ Kategori” düğmesiyle de eklenir. Katalog ve alış listesi kategorilere göre ayrılır.</p>
      <div class="card">${ts.length ? ts.map((t, i) => `<div class="order-row"><span style="flex:1">${esc(t.emoji || '🏷️')} ${esc(t.name)} <small class="muted">${DB.books().concat(DB.articles()).filter((b) => (b.topics || []).includes(t.id)).length} kayıt</small></span>
        <button class="btn sm" data-act="topic-move" data-id="${t.id}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm" data-act="topic-move" data-id="${t.id}" data-d="1" ${i === ts.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn sm" data-act="set-topic-edit" data-id="${t.id}">✏️</button></div>`).join('') : '<p class="hint">Henüz kategori yok.</p>'}
        <button class="btn primary block mt" data-act="set-topic-new">＋ Kategori</button></div>`;
  } else if (sub === 'reader') {
    const p = readerPrefs();
    h += `<div class="card"><div class="field"><span>Zemin rengi</span><div class="bg-row">${BG_PRESETS.map(([bg, fg, l]) => `<button type="button" class="bg-sw ${p.bg.toLowerCase() === bg.toLowerCase() ? 'on' : ''}" data-setbg="${bg}" data-fg="${fg}" style="background:${bg};color:${fg}" title="${l}">Aa</button>`).join('')}
        <label class="bg-sw pick" title="İstediğiniz renk">🎨<input type="color" id="sr-color" value="${esc(p.bg)}"></label></div></div>
      <label class="field"><span>Yazı tipi</span><select id="sr-font">${FONTS.map(([k, l]) => `<option value="${k}" ${p.font === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="field"><span>Yazı boyutu: <b id="sr-size-v">${p.size}</b></span><input type="range" id="sr-size" min="13" max="34" value="${p.size}"></div>
      <div class="field"><span>Satır aralığı: <b id="sr-line-v">${p.line}</b></span><input type="range" id="sr-line" min="1.2" max="2.2" step="0.1" value="${p.line}"></div>
      <div class="field"><span>Kenar boşluğu: <b id="sr-margin-v">${p.margin}</b></span><input type="range" id="sr-margin" min="8" max="60" value="${p.margin}"></div>
      <div class="field"><span>Sayfa çevirme</span><div class="seg"><button type="button" class="${p.turn !== 'book' ? 'on' : ''}" data-setturn="slide">↔ Kaydırma</button><button type="button" class="${p.turn === 'book' ? 'on' : ''}" data-setturn="book">📖 Kitap gibi</button></div></div>
      <div class="reader-preview" id="sr-prev" style="background:${p.bg};color:${p.fg || autoFg(p.bg)};font-family:${FONTS.find((f) => f[0] === p.font) ? FONTS.find((f) => f[0] === p.font)[2] : 'serif'};font-size:${p.size}px;line-height:${p.line}">Okumak, başka hayatlara açılan bir penceredir. Bu ön izleme, seçtiğiniz ayarlarla metnin nasıl görüneceğini gösterir.</div>
      <button class="btn block mt" data-act="reader-reset">Varsayılana dön (Krem zemin, Literata)</button></div>`;
  } else if (sub === 'backup') {
    let persisted = null;
    try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { /* yok */ }
    const counts = `${DB.books().length} kitap, ${DB.allQuotes().length} alıntı, ${DB.allNotes().length} not, ${DB.thoughts().length} düşünce, ${DB.moments().length} günlük yazısı`;
    h += `<div class="card"><p class="hint" style="margin-top:0">Verileriniz yalnızca bu cihazda saklanır (${counts}). Başka bir cihaza taşımak için: bu cihazda <b>Yedek al</b> → dosyayı diğer cihaza gönderin (Drive, WhatsApp, e-posta, USB) → orada <b>Yedeği içe aktar</b>. Kayıtlar birleştirilir; aynı kayıt varsa en son düzenlenen kalır.</p>
      <p class="hint">Yedek dosyası günlüğü, fotoğrafları ve özel notları da içerir; güvendiğiniz yerlere gönderin. PIN ve ayarlar yedeğe girmez.</p>
      <p class="small">Son yedek: <b>${s.lastBackup ? fmtDate(s.lastBackup) : 'hiç alınmadı'}</b>${persisted === true ? ' · 🔒 Kalıcı depolama açık' : ''}</p>
      <label class="check"><input type="checkbox" data-set="backupFiles" ${s.backupFiles ? 'checked' : ''}> 📱 E-kitap ve makale dosyalarını da yedekle</label>
      <p class="hint">Dosyalar büyük olabilir; işaretlerseniz yedek dosyası da büyür (WhatsApp/e-postayla gönderilemeyebilir). İşaretlemezseniz notlarınız, alıntılarınız ve kaldığınız sayfa yine yedeklenir; dosyaları diğer cihaza ayrıca yüklersiniz.</p>
      <div class="row-actions"><button class="btn teal" data-act="backup" style="flex:1">📤 Yedek al</button><button class="btn" data-act="restore" style="flex:1">📥 Yedeği içe aktar</button></div></div>`;
  } else if (sub === 'export') {
    h += `<div class="card"><b>📚 Tüm kitap notları</b><p class="hint">Tüm kitapların alıntılarını tek bir PDF, Word ya da Excel dosyası olarak alın.</p><button class="btn block" data-act="export-all">📦 Tüm notlar</button></div>
      <div class="card"><b>💡 Düşünceler</b><p class="hint">Düşüncelerim sayfasındaki ⬇️ düğmesinden.</p><a class="btn block" href="#/thoughts">Düşüncelerime git</a></div>
      <div class="card"><b>📔 Günlük</b><p class="hint">Takvimdeki “⬇️ Bu ayı dışa aktar” düğmesinden.</p><a class="btn block" href="#/journal-cal">Takvime git</a></div>`;
  } else if (sub === 'install') {
    h += installCardHtml();
  } else if (sub === 'guide') {
    renderGuide(); return;
  } else if (sub === 'danger') {
    h += `<div class="card"><b>⚠️ Tüm verileri sil</b><p class="hint">Bu cihazdaki tüm kitap, alıntı, not, düşünce, günlük ve alışveriş kayıtlarını kalıcı olarak siler. Geri alınamaz. Önce yedek alın.</p>
      <button class="btn block" data-act="backup">📤 Önce yedek al</button><button class="btn danger block mt" data-act="wipe">🗑️ Tüm verileri sil</button></div>`;
  } else { go('#/settings'); return; }
  view.innerHTML = h;
  bindSettings(sub);
}

function bindSettings(sub) {
  view.querySelectorAll('[data-lock]').forEach((c) => { c.onchange = () => { Lock.setSectionLocked(c.dataset.lock, c.checked); toast('Kaydedildi ✓'); }; });
  const lm = $('#lock-min'); if (lm) lm.onchange = () => { DB.setSettings({ lockMinutes: parseInt(lm.value, 10) }); toast('Kaydedildi ✓'); };
  view.querySelectorAll('[data-set]').forEach((c) => { c.onchange = () => { DB.setSettings({ [c.dataset.set]: c.checked }); toast('Kaydedildi ✓'); }; });
  if (sub === 'reader') {
    const setR = (patch) => { const p = { ...readerPrefs(), ...patch }; DB.setSettings({ reader: p }); const pv = $('#sr-prev'); if (pv) { pv.style.background = p.bg; pv.style.color = p.fg || autoFg(p.bg); pv.style.fontFamily = (FONTS.find((f) => f[0] === p.font) || FONTS[0])[2]; pv.style.fontSize = p.size + 'px'; pv.style.lineHeight = p.line; } };
    view.querySelectorAll('[data-setbg]').forEach((b) => { b.onclick = () => { view.querySelectorAll('.bg-sw').forEach((x) => x.classList.toggle('on', x === b)); setR({ bg: b.dataset.setbg, fg: b.dataset.fg }); }; });
    view.querySelectorAll('[data-setturn]').forEach((b) => { b.onclick = () => { view.querySelectorAll('[data-setturn]').forEach((x) => x.classList.toggle('on', x === b)); setR({ turn: b.dataset.setturn }); }; });
    $('#sr-color').oninput = (e) => setR({ bg: e.target.value, fg: autoFg(e.target.value) });
    $('#sr-font').onchange = (e) => setR({ font: e.target.value });
    [['size', parseInt], ['line', parseFloat], ['margin', parseInt]].forEach(([k, fn]) => { const i = $('#sr-' + k); i.oninput = () => { $('#sr-' + k + '-v').textContent = i.value; setR({ [k]: fn(i.value, 10) }); }; });
  }
  view.querySelectorAll('[data-link]').forEach((c) => {
    c.onchange = () => {
      const cur = new Set(DB.getSettings().searchLinks || []);
      if (c.checked) cur.add(c.dataset.link); else cur.delete(c.dataset.link);
      DB.setSettings({ searchLinks: Object.keys(Scan.SEARCH_SITES).filter((k) => cur.has(k)) }); toast('Kaydedildi ✓');
    };
  });
  view.querySelectorAll('[data-navk]').forEach((c) => {
    c.onchange = () => {
      let cur = navOrder();
      if (c.checked) cur.push(c.dataset.navk); else cur = cur.filter((k) => k !== c.dataset.navk);
      DB.setSettings({ nav: cur }); buildNav(); rerender();
    };
  });
  void sub;
}

function renderGuide() {
  const q = guideState.q;
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const list = GUIDE.filter((g) => !terms.length || terms.every((t) => norm(g.t + ' ' + g.h.replace(/<[^>]+>/g, ' ')).includes(t)));
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>📘 Kullanım kılavuzu</h1></div>
    <input class="input" id="guide-q" placeholder="Kılavuzda ara… (ör. barkod, PIN, yedek)" value="${esc(q)}" style="margin-bottom:12px">
    ${list.length ? list.map((g) => `<details class="card guide" ${terms.length || guideState.open === g.id ? 'open' : ''} data-g="${g.id}"><summary><span>${g.e}</span> ${esc(g.t)}</summary><div class="prose">${g.h}</div></details>`).join('')
      : '<p class="muted">Aramanızla eşleşen konu yok.</p>'}
    <p class="hint" style="text-align:center">Sorunuzun cevabı burada yoksa: <a href="#/privacy">Gizlilik politikası</a>'ndaki iletişim adresine yazabilirsiniz.</p>`;
  const inp = $('#guide-q');
  inp.oninput = () => { guideState.q = inp.value; const pos = inp.selectionStart; renderGuide(); const g = $('#guide-q'); g.focus(); g.setSelectionRange(pos, pos); };
  view.querySelectorAll('details.guide').forEach((d) => d.addEventListener('toggle', () => { if (d.open) guideState.open = d.dataset.g; }));
}
const guideState = { q: '', open: null };

let privacyCache = null;
async function renderPrivacy() {
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>🔐 Gizlilik</h1></div><div class="card prose" id="privacy-box"><div class="loading-box"><div class="spinner"></div></div></div>`;
  try {
    if (!privacyCache) {
      const html = await (await fetch('privacy.html')).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.querySelector('#policy');
      privacyCache = main ? main.innerHTML : '';
    }
    const box = $('#privacy-box'); if (box) box.innerHTML = privacyCache || '<p>Gizlilik politikası yüklenemedi.</p>';
  } catch (e) { const box = $('#privacy-box'); if (box) box.innerHTML = '<p>Gizlilik politikası şu an açılamadı. İnternete bağlanıp yeniden deneyin.</p>'; }
}

async function doBackup() {
  const data = await DB.exportBackup({ withFiles: !!DB.getSettings().backupFiles });
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
    toast(`Aktarıldı ✓ ${st.added} yeni kayıt, ${st.updated} güncelleme${st.files ? `, ${st.files} dosya` : ''}`, 5000);
    rerender();
  } catch (err) { toast(err.message || 'Dosya okunamadı', 5000); }
}
async function shareApp() {
  const data = { title: 'Kitap & Notlarım', text: 'Kitaplardan alıntılarınızı sayfa numarasıyla saklayın; düşünce ve günlük tutun.', url: appUrl() };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  copyText(data.url);
}

// ================= Olaylar =================
const ACTIONS = {
  ...THOUGHT_ACTIONS,
  ...JOURNAL_ACTIONS,
  ...NOTE_ACTIONS,
  ...LIST_ACTIONS,
  ...ARTICLE_ACTIONS,
  ...BLOG_ACTIONS,
  ...REPORT_ACTIONS,
  'move-book': (el, e) => { if (e) e.preventDefault(); openMoveSheet(el.dataset.id); },
  'pm-done': async (el) => { const m = DB.S.pagemarks.get(el.dataset.id); if (!m) return; m.done = true; m.doneAt = new Date().toISOString(); await DB.save('pagemarks', m); toast('Harika! ✅'); rerender(); },
  'topic-move': async (el) => { await moveOrder('topics', DB.topics(), el.dataset.id, parseInt(el.dataset.d, 10)); rerender(); },
  'set-topic-edit': (el) => openTopicEditor(el.dataset.id, () => rerender()),
  'set-topic-new': () => openTopicEditor(null, () => rerender()),
  'reader-reset': () => { DB.setSettings({ reader: { bg: '#FBF5E6', fg: '#2B2B2B', font: 'Literata', size: 19, line: 1.6, margin: 22, turn: 'slide' } }); toast('Varsayılan okuma görünümü ✓'); rerender(); },
  'set-open': (el, e) => { e.preventDefault(); if (el.dataset.k === 'thought-nbs') manageThoughtNotebooks(); if (el.dataset.k === 'journal-prompts') managePrompts(); },
  'pin-regen': () => Lock.regenCode(),
  'unlock-search': () => Lock.unlockFlow(() => rerender()),
  'nav-move': (el) => {
    const cur = navOrder(); const i = cur.indexOf(el.dataset.k); const j = i + parseInt(el.dataset.d, 10);
    if (i < 0 || j < 0 || j >= cur.length) return;
    [cur[i], cur[j]] = [cur[j], cur[i]]; DB.setSettings({ nav: cur }); buildNav(); rerender();
  },
  'nav-reset': () => { DB.setSettings({ nav: ['notes', 'thoughts', 'journal', 'search'] }); buildNav(); rerender(); toast('Varsayılan menü ✓'); },
  'nbook-move': async (el) => { await moveOrder('nbooks', DB.nbooks(), el.dataset.id, parseInt(el.dataset.d, 10)); rerender(); },
  'shopcat-move': async (el) => { await moveOrder('shopcats', DB.shopcats(), el.dataset.id, parseInt(el.dataset.d, 10)); rerender(); },
  'set-nbook-edit': (el) => openNbookEditor(el.dataset.id, rerender),
  'set-nbook-new': () => openNbookEditor(null, rerender),
  'set-shopcat-edit': (el) => openShopcatEditor(el.dataset.id, rerender),
  'set-shopcat-new': () => openShopcatEditor(null, rerender),
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
    copyText(`${body}\n— ${q.src ? EX.sourceText(b, q) : EX.citationText(b, EX.pageLabel(q))}${q.text && q.comment ? `\n\n💭 ${q.comment}` : ''}`);
  },
  'export-book': (el) => openExport(el.dataset.book),
  'export-all': () => openExport(null),
  'del-book': async (el) => {
    const b = DB.getBook(el.dataset.book);
    const art = b.kind === 'article';
    if (await confirmDialog(`“${b.title}”${b.fileId ? ', dosyası' : ''} ve içindeki ${DB.quotesOf(b.id).length} alıntı silinsin mi?`, 'Sil')) { await DB.deleteBook(b.id); toast(art ? 'Makale silindi' : 'Kitap silindi'); location.replace(art ? '#/articles' : '#/'); }
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
    if (!(await confirmDialog('Bu cihazdaki TÜM kitaplar, alıntılar, notlar, düşünceler, günlük ve alışveriş listesi kalıcı olarak silinecek. Geri alınamaz.', 'Devam'))) return;
    if (!(await confirmDialog('Son kez soruyorum: her şey silinsin mi?', 'Evet, hepsini sil'))) return;
    await DB.wipeAll(); toast('Tüm veriler silindi'); go('#/');
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACTIONS[el.dataset.act]) return;
  if (el.closest('#book-form') && ['scan', 'isbn-lookup', 'cover-pick', 'cover-remove'].includes(el.dataset.act)) return;
  ACTIONS[el.dataset.act](el, e);
});

// ================= Güncelleme ve başlatma =================
// Yeni sürüm yayınlandığında servis çalışanı onu indirir ve hemen devreye alır; açık sayfa
// kendini bir kez yeniler ve "Uygulama güncellendi" bildirimi gösterir.
function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return; // ilk kurulumda yenilemeye gerek yok
    reloading = true;
    try { sessionStorage.setItem('kn-updated', '1'); } catch (e) { /* yok say */ }
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = () => reg.update().catch(() => { /* çevrimdışı */ });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    setInterval(check, 60 * 60 * 1000);
  }).catch(() => { /* çevrimdışı desteği yok */ });
}

async function start() {
  try { await DB.load(); } catch (err) {
    view.innerHTML = `<div class="empty"><div class="e">⚠️</div><h3>Veritabanı açılamadı</h3><p>${esc(err.message)}</p><p class="small">Gizli sekmede olabilirsiniz ya da tarayıcı depolamayı engelliyor olabilir.</p><p class="small mt">Uygulama yeni güncellendiyse eski dosyalar karışmış olabilir. Bu düğme yalnızca uygulama dosyalarını yeniden indirir, <b>notlarınız silinmez</b>.</p><button class="btn primary" onclick="window.__knRepair && window.__knRepair()">🔄 Onar ve yeniden aç</button></div>`;
    return;
  }
  // Özel Kitaplar kilitliyken her yerde gizlensin; eski kurulumlarda bu kilidi varsayılan olarak ekle
  DB.visibility.hidePrivate = (b) => Lock.enabled() && !Lock.isOpen(privateLockOf(b));
  const st0 = DB.getSettings();
  if (!st0.locksV3) DB.setSettings({ locksV3: true, locks: [...new Set([...(st0.locks || []), 'privateBooks'])] });
  if (!st0.locks33) DB.setSettings({ locks33: true, locks: [...new Set([...(DB.getSettings().locks || []), 'reports'])] });
  if (!st0.locks32) DB.setSettings({ locks32: true, locks: [...new Set([...(DB.getSettings().locks || []), 'privateEbooks', 'privateArticles'])] });
  if (!st0.nav32) {
    const nv = DB.getSettings().nav || [];
    if (!nv.includes('blog')) { const i = nv.indexOf('search'); nv.splice(i < 0 ? nv.length : i, 0, 'blog'); }
    DB.setSettings({ nav32: true, nav: nv });
  }
  if (!st0.lists31) {
    // 3.1: Satın alınacak (henüz okunmaya başlanmamış) kitaplar okuma listesinden çıkar; yalnızca kendi bölümünde görünür
    for (const b of DB.books()) if (b.wish && (b.status || 'okunacak') === 'okunacak' && !b.startDate) { b.status = 'none'; await DB.saveBook(b); }
    DB.setSettings({ lists31: true });
  }
  readerHooks.openQuoteEditor = openQuoteEditor;
  window.addEventListener('hashchange', route);
  buildNav();
  route();
  setupServiceWorker();
  let updated = false;
  try { updated = sessionStorage.getItem('kn-updated') === '1'; sessionStorage.removeItem('kn-updated'); } catch (e) { /* yok say */ }
  if (updated) toast(`✨ Uygulama güncellendi (sürüm ${APP_VERSION})`, 4000);
}
start();
