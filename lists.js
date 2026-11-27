// 📚 Kitap listeleri: Okuyorum, Okunacak, Kütüphanem, Satın Alınacak, Seçkin, Özel.
// Kitap bir kez kaydedilir; listeler işaretlerle çalışır. Konu başlıkları kitap ve makalelerde ortaktır.
import * as DB from './db.js?v=3.3';
import * as EX from './export.js?v=3.3';
import * as Lock from './lock.js?v=3.3';
import { $, esc, view, toast, openSheet, closeSheet, confirmDialog, rerender, go, norm, today, fmtDate } from './ui.js?v=3.3';

// Ayrı bölümler (menüde / Diğer'de): Kütüphanem, Satın Alınacaklar, Seçkin, Özel Kitaplar, E-kitaplar.
// Okuma listeleri (ana sayfadan açılır): Okuyorum, Okumak istediklerim, Okuduklarım.
export const LISTS = {
  reading: { e: '📖', l: 'Okuyorum' },
  toread: { e: '🕮', l: 'Okumak istediklerim' },
  read: { e: '✅', l: 'Okuduklarım' },
  library: { e: '🏠', l: 'Kütüphanem' },
  wish: { e: '🛒', l: 'Satın Alınacaklar' },
  fav: { e: '💎', l: 'Seçkin Kitaplar' },
  private: { e: '🔒', l: 'Özel Kitaplar' },
  ebooks: { e: '📱', l: 'E-kitaplar' },
  privateEbooks: { e: '🔒', l: 'Özel E-kitaplarım' },
};
/** Özel bölümlerin kilit anahtarı (Ayarlar → Kilit) */
export const PRIVATE_LOCK = { private: 'privateBooks', privateEbooks: 'privateEbooks' };
export const privateLockOf = (b) => (b.kind === 'article' ? 'privateArticles' : b.fileId ? 'privateEbooks' : 'privateBooks');
/** Ayrı bölümlerin adresleri */
export const SECTION_ROUTES = { library: 'library', wish: 'wish', fav: 'favorites', private: 'private', ebooks: 'ebooks' };
export const listHref = (key) => (key === 'privateEbooks' ? '#/ebooks/private' : SECTION_ROUTES[key] ? `#/${SECTION_ROUTES[key]}` : `#/books/${key}`);
const COLORS = [['#7C5CFF', '#FF5DA2'], ['#FF6B57', '#FFB020'], ['#10B8A6', '#2F9BFF'], ['#FF5DA2', '#FFB020'], ['#2F9BFF', '#7C5CFF'], ['#10B8A6', '#7CD957'], ['#FF8A3D', '#FF5D7A']];
function hashStr(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
export function thumbHtml(b) {
  if (b.cover) return `<div class="thumb"><img src="${esc(b.cover)}" alt="" onerror="this.remove()"></div>`;
  const [a, c] = COLORS[hashStr(b.title) % COLORS.length];
  return `<div class="thumb" style="background:linear-gradient(150deg,${a},${c})"><span>${esc((b.title || '?').slice(0, 2))}</span></div>`;
}
const TOPIC_EMOJIS = ['📚', '🧠', '🕌', '📜', '⚖️', '🧭', '💼', '💰', '🧪', '🌍', '🎨', '🎵', '❤️', '👨‍👩‍👧', '🩺', '🏛️', '✍️', '🧘', '⚽', '🍳', '🌱', '💻', '🔭', '🎓'];

/** Kitabın hangi listelerde olduğu */
export function inList(b, key) {
  if (key === 'reading') return b.status === 'okunuyor' && !b.private;
  if (key === 'toread') return (b.status || 'okunacak') === 'okunacak' && !b.private;
  if (key === 'read') return b.status === 'bitti' && !b.private;
  if (key === 'library') return !!b.owned && !b.private;
  if (key === 'wish') return !!b.wish && !b.private;
  if (key === 'fav') return !!b.favorite && !b.private;
  if (key === 'ebooks') return !!b.fileId && !b.private;
  if (key === 'private') return !!b.private && !b.fileId;
  if (key === 'privateEbooks') return !!b.private && !!b.fileId;
  return false;
}
export const isRead = (b) => b.status === 'bitti';

const state = { topic: {}, sort: {}, group: {}, read: 'all' };

export function topicChips(b) {
  const ts = (b.topics || []).map((id) => DB.getTopic(id)).filter(Boolean);
  return ts.map((t) => `<span class="chip topic">${esc(t.emoji || '🏷️')} ${esc(t.name)}</span>`).join('');
}
function miniStars(b, field) {
  const v = b[field] || 0;
  return `<span class="mini-stars">${[1, 2, 3].map((i) => `<button data-act="list-star" data-id="${b.id}" data-f="${field}" data-v="${i}" class="${v >= i ? 'on' : ''}" aria-label="${i} yıldız">⭐</button>`).join('')}</span>`;
}

function listCard(b, key, idx) {
  const read = isRead(b);
  const ordered = key === 'toread' || key === 'wish';
  const starField = key === 'wish' ? 'wishStars' : key === 'toread' ? 'toReadStars' : null;
  let act = '';
  if (key === 'wish') act = `<button class="lc-act buy" data-act="bought" data-id="${b.id}" title="Aldım: Kütüphanem'e taşı">🛒<small>Aldım</small></button>`;
  else if (key === 'toread') act = `<button class="lc-act" data-act="start-reading" data-id="${b.id}" title="Okumaya başla">📖<small>Başla</small></button>`;
  else if ((key === 'ebooks' || key === 'privateEbooks') && b.fileId) act = `<div class="lc-acts"><a class="lc-act" href="#/read/${b.id}" title="Oku">📖<small>Oku</small></a><button class="lc-act chk ${read ? 'on' : ''}" data-act="toggle-read" data-id="${b.id}">${read ? '✓' : ''}<small>${read ? 'Okudum' : 'Okumadım'}</small></button></div>`;
  else if (key !== 'reading') act = `<button class="lc-act chk ${read ? 'on' : ''}" data-act="toggle-read" data-id="${b.id}" title="${read ? 'Okudum (geri almak için dokunun)' : 'Okudum olarak işaretle'}">${read ? '✓' : ''}<small>${read ? 'Okudum' : 'Okumadım'}</small></button>`;
  const tags = `${topicChips(b)}${key !== 'library' && b.owned ? '<span class="chip own">🏠</span>' : ''}${b.fileId && key !== 'ebooks' ? '<span class="chip filek">📱</span>' : ''}${b.favorite && key !== 'fav' ? '<span class="chip">💎</span>' : ''}`;
  return `<article class="list-card c">
    ${ordered ? `<div class="lc-ord"><button data-act="list-move" data-id="${b.id}" data-d="-1" aria-label="Yukarı">▲</button><b>${idx + 1}</b><button data-act="list-move" data-id="${b.id}" data-d="1" aria-label="Aşağı">▼</button></div>` : ''}
    <a class="lc-main" href="#/book/${b.id}">${thumbHtml(b)}<div class="lc-body">
      <div class="lc-title">${esc(b.title)}</div>
      <div class="lc-sub">${esc(b.author || '—')}</div>
      ${tags || starField ? `<div class="lc-tags">${starField ? miniStars(b, starField) : ''}${tags}</div>` : ''}
    </div></a>
    ${act}
  </article>`;
}

function sortList(list, key) {
  const mode = state.sort[key] || (key === 'toread' || key === 'wish' ? 'order' : 'title');
  const ordField = key === 'wish' ? 'wishOrder' : 'toReadOrder';
  const starField = key === 'wish' ? 'wishStars' : 'toReadStars';
  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', 'tr');
  if (mode === 'order') return [...list].sort((a, b) => (a[ordField] ?? 1e9) - (b[ordField] ?? 1e9) || (a.createdAt || '').localeCompare(b.createdAt || ''));
  if (mode === 'stars') return [...list].sort((a, b) => (b[starField] || 0) - (a[starField] || 0) || (a[ordField] ?? 1e9) - (b[ordField] ?? 1e9));
  if (mode === 'author') return [...list].sort((a, b) => (a.author || '').localeCompare(b.author || '', 'tr') || byTitle(a, b));
  if (mode === 'new') return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return [...list].sort(byTitle);
}

/** Bir listenin sayfası (Kitaplar sayfasındaki sekme) */
export function renderListTab(key) {
  if (PRIVATE_LOCK[key] && Lock.enabled() && !Lock.isOpen(PRIVATE_LOCK[key])) { return `<div id="lock-slot" data-name="${esc(LISTS[key].l)}"></div>`; }
  const all = DB.books();
  let list = all.filter((b) => inList(b, key));
  const total = list.length;
  const topics = DB.topics();
  const tf = state.topic[key] || 'all';
  if (tf === 'none') list = list.filter((b) => !(b.topics || []).some((id) => DB.getTopic(id)));
  else if (tf !== 'all') list = list.filter((b) => (b.topics || []).includes(tf));
  if (key === 'library' && state.read !== 'all') list = list.filter((b) => (state.read === 'read' ? isRead(b) : !isRead(b)));
  list = sortList(list, key);
  const sortOpts = key === 'toread' ? [['order', 'Okuma sırası'], ['stars', 'Yıldız'], ['title', 'A-Z'], ['author', 'Yazar']]
    : key === 'wish' ? [['order', 'Alma sırası'], ['stars', 'Yıldız'], ['title', 'A-Z'], ['author', 'Yazar']]
      : [['title', 'A-Z'], ['author', 'Yazar'], ['new', 'Son eklenen']];
  const sort = state.sort[key] || sortOpts[0][0];
  const group = !!state.group[key];
  let h = '';
  if (PRIVATE_LOCK[key] && !Lock.enabled()) h += `<div class="banner sun small">🔒 Bu bölümü kilitlemek için <a href="#/settings/lock">Ayarlar → Kilit</a>'ten PIN belirleyin.</div>`;
  if (total) {
    // Araç satırı: sıralama + konulara ayır + çıktı
    h += `<div class="lt-tools">
      <label class="lt-sort">⇅<select id="list-sort" data-k="${key}">${sortOpts.map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <span style="flex:1"></span>
      ${topics.length ? `<button class="lt-btn ${group ? 'on' : ''}" data-act="list-group" data-k="${key}" title="Kategorilere ayır">🗂️ <span>Kategoriler</span></button>` : ''}
      ${key === 'library' ? `<button class="lt-btn" data-act="catalog-pdf" title="Katalog: PDF / yazdır">🖨️ <span>Katalog</span></button>` : ''}
      ${key === 'wish' ? `<button class="lt-btn" data-act="wish-pdf" title="Alış listesi: PDF / yazdır">🖨️ <span>Liste</span></button>` : ''}
    </div>`;
    // Süzgeç şeridi: (Kütüphanem'de okundu durumu) | konular
    const r = key === 'library' ? all.filter((b) => inList(b, 'library') && isRead(b)).length : 0;
    const readChips = key === 'library' ? [['all', `Hepsi ${total}`], ['read', `✓ Okuduklarım ${r}`], ['unread', `Okumadıklarım ${total - r}`]].map(([k, l]) => `<button class="pill ${state.read === k ? 'on' : ''}" data-act="read-filter" data-f="${k}">${l}</button>`).join('') + '<i class="pill-sep"></i>' : '';
    // Kategoriler: bu bölümde kullanılanlar sayısıyla önde, kullanılmayanlar sonda
    const secList = all.filter((b) => inList(b, key));
    const tcount = (id) => secList.filter((b) => (b.topics || []).includes(id)).length;
    const noneCount = secList.filter((b) => !(b.topics || []).some((id) => DB.getTopic(id))).length;
    const sortedTopics = [...topics].sort((a, c) => tcount(c.id) - tcount(a.id) || (a.order ?? 99) - (c.order ?? 99));
    const topicChipsRow = topics.length ? [['all', 'Tüm kategoriler', ''], ...sortedTopics.map((t) => [t.id, `${t.emoji || '🏷️'} ${t.name}`, tcount(t.id)]), ['none', 'Kategorisiz', noneCount]].map(([k, l, n]) => `<button class="pill t ${tf === k ? 'on' : ''} ${n === 0 ? 'dim' : ''}" data-act="topic-filter" data-k="${key}" data-t="${k}">${esc(l)}${n !== '' ? ` <small>${n}</small>` : ''}</button>`).join('') : '';
    h += `<div class="pill-row">${readChips}${topicChipsRow}<button class="pill add" data-act="topic-new">＋ Kategori</button></div>`;
  }
  if (!total) {
    const tips = {
      library: 'Evinizdeki kitapları ekleyin; konulara ayırın, okuduklarınızı işaretleyin, kataloğunuzu yazdırın.',
      wish: 'Almak istediğiniz kitapları ekleyin; aldığınızda tek dokunuşla Kütüphanem\'e geçer.',
      fav: '“Hayatıma dokundu” dediğiniz kitaplar burada durur. Kitabın Bilgiler sekmesinden “💎 Seçkin”i işaretleyin.',
      private: 'Herkesin görmesini istemediğiniz kitaplar. Kilitliyken başka hiçbir yerde görünmez.',
      ebooks: 'PDF, Word, TXT ya da EPUB yükleyin; uygulamanın içinde okuyun.',
      privateEbooks: 'Kimsenin görmesini istemediğiniz e-kitaplar. PIN ile kilitlidir; kilitliyken başka hiçbir yerde görünmez.',
      toread: 'Okumak istediğiniz kitaplar burada sıralanır.', reading: 'Okumaya başladığınız kitaplar burada görünür.', read: 'Bitirdiğiniz kitaplar burada görünür.',
    };
    h += `<div class="empty"><div class="e">${LISTS[key].e}</div><h3>${esc(LISTS[key].l)} boş</h3><p>${tips[key] || ''}</p>
      ${key === 'ebooks' || key === 'privateEbooks' ? `<a class="btn primary" href="#/new-book?list=${key}">📱 E-kitap yükle</a>` : key === 'reading' || key === 'read' ? '' : `<a class="btn primary" href="#/new-book?list=${key}&scan=1">📷 Barkodla ekle</a> <a class="btn" href="#/new-book?list=${key}">✍️ Elle ekle</a>`}</div>`;
  } else if (!list.length) h += `<p class="muted">Bu süzgeçte kitap yok.</p>`;
  else if (group) {
    const groups = [...topics.map((t) => ({ t, items: list.filter((b) => (b.topics || []).includes(t.id)) })), { t: { name: 'Kategorisiz', emoji: '📂' }, items: list.filter((b) => !(b.topics || []).some((id) => DB.getTopic(id))) }].filter((g) => g.items.length);
    groups.forEach((g) => { h += `<div class="group-head">${esc(g.t.emoji || '🏷️')} ${esc(g.t.name)} <span class="count">${g.items.length}</span></div><div class="lc-list">${g.items.map((b, i) => listCard(b, key, i)).join('')}</div>`; });
  } else h += `<div class="lc-list">${list.map((b, i) => listCard(b, key, i)).join('')}</div>`;
  if (['toread', 'library', 'wish', 'private', 'ebooks', 'privateEbooks', 'fav'].includes(key) && total) h += `<a class="fab" href="#/new-book?list=${key}">${key === 'ebooks' || key === 'privateEbooks' ? '📱 Yükle' : '＋ Ekle'}</a>`;
  return h;
}
export function bindListTab(key) {
  const sel = $('#list-sort');
  if (sel) sel.onchange = () => { state.sort[key] = sel.value; rerender(); };
  const slot = $('#lock-slot');
  if (slot) Lock.renderLockScreen(slot, slot.dataset.name || 'Özel Kitaplar');
}

/** Listede sıra değiştir (Okunacak / Satın Alınacak) */
async function moveInList(id, dir) {
  const b = DB.getBook(id); if (!b) return;
  const key = b.wish ? 'wish' : 'toread';
  const field = key === 'wish' ? 'wishOrder' : 'toReadOrder';
  const list = sortList(DB.books().filter((x) => inList(x, key)), key).map((x) => x);
  // sıra moduna göre değil, kayıtlı sıraya göre taşı
  const ordered = [...list].sort((a, c) => (a[field] ?? 1e9) - (c[field] ?? 1e9) || (a.createdAt || '').localeCompare(c.createdAt || ''));
  const i = ordered.findIndex((x) => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= ordered.length) return;
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  for (let k = 0; k < ordered.length; k++) if (ordered[k][field] !== k) { ordered[k][field] = k; await DB.saveBook(ordered[k]); }
  state.sort[key] = 'order';
}

// ---------- Konu başlıkları ----------
export function openTopicEditor(id = null, onDone = null) {
  const t = id ? DB.getTopic(id) : null;
  let emoji = t ? t.emoji || '📚' : '📚';
  const s = openSheet({
    title: t ? 'Kategoriyi düzenle' : '＋ Yeni kategori',
    body: `<label class="field"><span>Kategori adı</span><input id="tp-name" maxlength="40" value="${esc(t ? t.name : '')}" placeholder="ör. Felsefe, Tarih, Kişisel gelişim"></label>
      <div class="field"><span>Simge</span><div class="emoji-grid">${TOPIC_EMOJIS.map((x) => `<button type="button" data-em="${x}" class="${x === emoji ? 'on' : ''}">${x}</button>`).join('')}</div></div>
      <p class="hint">Kategoriler bütün kitap bölümlerinde ve makalelerde ortaktır; bir bölümde eklediğiniz kategoriyi diğerlerinde de kullanabilirsiniz.</p>`,
    foot: `${t ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  s.addEventListener('click', (e) => { const b = e.target.closest('[data-em]'); if (!b) return; emoji = b.dataset.em; s.querySelectorAll('[data-em]').forEach((x) => x.classList.toggle('on', x === b)); });
  $('[data-x="save"]', s).onclick = async () => {
    const name = $('#tp-name', s).value.trim();
    if (!name) { toast('Kategori adını yazın'); return; }
    const dup = DB.topics().find((x) => x.id !== id && norm(x.name) === norm(name));
    if (dup) { toast('Bu adla bir kategori zaten var'); return; }
    const rec = await DB.save('topics', { ...(t || { order: DB.topics().length }), name, emoji });
    await closeSheet(); toast('Kaydedildi ✓');
    if (onDone) onDone(rec); else rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => {
    const used = DB.books().concat(DB.articles()).filter((b) => (b.topics || []).includes(t.id));
    if (!(await confirmDialog(`“${t.name}” kategorisi silinsin mi?${used.length ? ` ${used.length} kayıttan bu kategori kaldırılır (kayıtlar silinmez).` : ''}`, 'Sil'))) return;
    for (const b of used) { b.topics = b.topics.filter((x) => x !== t.id); await DB.saveBook(b); }
    await DB.remove('topics', t.id);
    toast('Kategori silindi'); if (onDone) onDone(null); else rerender();
  };
  setTimeout(() => $('#tp-name', s).focus(), 250);
}

/** Formlar için konu seçici */
export function topicPickerHtml(selected = []) {
  return `<div class="topic-pick" id="topic-pick">${DB.topics().map((t) => `<button type="button" class="chip topic ${selected.includes(t.id) ? 'sel' : ''}" data-tp="${t.id}">${esc(t.emoji || '🏷️')} ${esc(t.name)}</button>`).join('')}
    <button type="button" class="chip add" data-tp-new>＋ Yeni kategori</button></div>`;
}
export function bindTopicPicker(root, initial = []) {
  const sel = new Set(initial.filter((id) => DB.getTopic(id)));
  const box = $('#topic-pick', root);
  const paint = () => { box.outerHTML = topicPickerHtml([...sel]); bind(); };
  const bind = () => {
    const b = $('#topic-pick', root);
    b.onclick = (e) => {
      const c = e.target.closest('[data-tp]');
      if (c) { if (sel.has(c.dataset.tp)) sel.delete(c.dataset.tp); else sel.add(c.dataset.tp); c.classList.toggle('sel'); return; }
      if (e.target.closest('[data-tp-new]')) {
        const name = (prompt('Yeni kategori (ör. Felsefe, Tarih, Roman):') || '').trim();
        if (!name) return;
        const ex = DB.topics().find((x) => norm(x.name) === norm(name));
        if (ex) { sel.add(ex.id); paint(); return; }
        DB.save('topics', { name, emoji: '📚', order: DB.topics().length }).then((t) => { sel.add(t.id); paint(); });
      }
    };
  };
  bind();
  return { get: () => [...sel] };
}

// ---------- PDF / çıktı: Kütüphane kataloğu ve alış listesi ----------
function groupByTopic(list) {
  const topics = DB.topics();
  const groups = topics.map((t) => ({ name: `${t.emoji || ''} ${t.name}`.trim(), items: list.filter((b) => (b.topics || []).includes(t.id)) }));
  groups.push({ name: '📂 Kategorisiz', items: list.filter((b) => !(b.topics || []).some((id) => DB.getTopic(id))) });
  return groups.filter((g) => g.items.length);
}
function openCatalog() {
  const s = openSheet({
    title: '🖨️ Kütüphane kataloğu',
    body: `<label class="field"><span>Hangi kitaplar?</span><select id="cat-read"><option value="all">Hepsi</option><option value="read">Yalnızca okuduklarım</option><option value="unread">Yalnızca okumadıklarım</option></select></label>
      <label class="field"><span>Düzen</span><select id="cat-group"><option value="topic">Kategorilere göre</option><option value="alpha">Alfabetik tek liste</option></select></label>
      <label class="check"><input type="checkbox" id="cat-ebook"> 📱 E-kitapları da ekle</label>
      <button class="btn primary block mt" data-x="go">🖨️ PDF / Yazdır</button>
      <p class="hint mt">Açılan yazdırma ekranında <b>“PDF olarak kaydet”</b>i seçerseniz PDF dosyası olur; yazıcı seçerseniz kâğıda basılır.</p>`,
  });
  $('[data-x="go"]', s).onclick = async () => {
    const rf = $('#cat-read', s).value, grp = $('#cat-group', s).value, withE = $('#cat-ebook', s).checked;
    // Kütüphanem = basılı kitaplar (owned). İstenirse yalnızca e-kitap olanlar da eklenir.
    let list = DB.books().filter((b) => !b.private && (b.owned || (withE && b.fileId)));
    if (rf === 'read') list = list.filter(isRead); if (rf === 'unread') list = list.filter((b) => !isRead(b));
    list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
    if (!list.length) { toast('Katalogda gösterilecek kitap yok'); return; }
    const groups = grp === 'topic' ? groupByTopic(list) : [{ name: 'Tüm kitaplar', items: list }];
    const readN = list.filter(isRead).length;
    const table = (items) => `<table class="pd-table"><thead><tr><th>#</th><th>Kitap</th><th>Yazar</th><th>Yayınevi</th><th>Yıl</th><th>Okundu</th></tr></thead><tbody>${items.map((b, i) => `<tr><td>${i + 1}</td><td><b>${esc(b.title)}</b>${b.subtitle ? `<br><small>${esc(b.subtitle)}</small>` : ''}${b.fileId ? ' 📱' : ''}</td><td>${esc(b.author || '')}</td><td>${esc(b.publisher || '')}</td><td>${esc(b.year || '')}</td><td class="c">${isRead(b) ? '✔' : '—'}</td></tr>`).join('')}</tbody></table>`;
    const html = `<article class="print-doc"><header class="pd-head"><h1>📚 Kütüphanemin Kataloğu</h1><p class="pd-meta">${list.length} kitap · ${readN} okundu · ${list.length - readN} okunmadı · ${fmtDate(today())}</p></header>
      ${groups.map((g) => `<section><h2>${esc(g.name)} <small>(${g.items.length})</small></h2>${table(g.items)}</section>`).join('')}</article>`;
    await closeSheet(); EX.printHtml(html);
  };
}
function openWishList() {
  const s = openSheet({
    title: '🖨️ Alış listesi',
    body: `<label class="field"><span>Düzen</span><select id="w-group"><option value="order">Önce almak istediklerim sırasıyla</option><option value="topic">Kategorilere göre</option></select></label>
      <label class="field"><span>Önem</span><select id="w-st"><option value="0">Hepsi</option><option value="1">⭐ ve üstü</option><option value="2">⭐⭐ ve üstü</option><option value="3">Yalnızca ⭐⭐⭐</option></select></label>
      <button class="btn primary block mt" data-x="go">🖨️ PDF / Yazdır</button>
      <p class="hint mt">Yazdırma ekranında <b>“PDF olarak kaydet”</b>i seçerseniz PDF dosyası olur.</p>`,
  });
  $('[data-x="go"]', s).onclick = async () => {
    const min = parseInt($('#w-st', s).value, 10);
    const list = [...DB.books().filter((b) => inList(b, 'wish') && (b.wishStars || 0) >= min)].sort((a, b) => (a.wishOrder ?? 1e9) - (b.wishOrder ?? 1e9) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    if (!list.length) { toast('Listede kitap yok'); return; }
    const groups = $('#w-group', s).value === 'topic' ? groupByTopic(list) : [{ name: 'Alınacak kitaplar', items: list }];
    const table = (items) => `<table class="pd-table"><thead><tr><th>☐</th><th>#</th><th>Kitap</th><th>Yazar</th><th>Yayınevi</th><th>ISBN</th><th>Önem</th></tr></thead><tbody>${items.map((b, i) => `<tr><td class="c">☐</td><td>${i + 1}</td><td><b>${esc(b.title)}</b></td><td>${esc(b.author || '')}</td><td>${esc(b.publisher || '')}</td><td>${esc(b.isbn || '')}</td><td>${'⭐'.repeat(b.wishStars || 0)}</td></tr>`).join('')}</tbody></table>`;
    const html = `<article class="print-doc"><header class="pd-head"><h1>🛒 Satın Alınacak Kitaplar</h1><p class="pd-meta">${list.length} kitap · ${fmtDate(today())}</p></header>${groups.map((g) => `<section><h2>${esc(g.name)}</h2>${table(g.items)}</section>`).join('')}</article>`;
    await closeSheet(); EX.printHtml(html);
  };
}

export const LIST_ACTIONS = {
  'list-star': async (el) => {
    const b = DB.getBook(el.dataset.id); if (!b) return;
    const v = parseInt(el.dataset.v, 10);
    b[el.dataset.f] = (b[el.dataset.f] || 0) === v ? 0 : v;
    await DB.saveBook(b); rerender();
  },
  'list-move': async (el) => { await moveInList(el.dataset.id, parseInt(el.dataset.d, 10)); rerender(); },
  'toggle-read': async (el) => {
    const b = DB.getBook(el.dataset.id); if (!b) return;
    if (isRead(b)) { b.status = 'none'; b.endDate = ''; }
    else { b.status = 'bitti'; b.endDate = b.endDate || today(); if (b.pages) b.currentPage = b.pages; if (b.owned) b.hideHome = true; }
    await DB.saveBook(b); toast(isRead(b) ? 'Okudum olarak işaretlendi ✅' : 'Okumadım olarak işaretlendi'); rerender();
  },
  bought: async (el) => {
    const b = DB.getBook(el.dataset.id); if (!b) return;
    b.wish = false; b.owned = true;
    await DB.saveBook(b); toast(`“${b.title}” Kütüphanem'e eklendi 🏠`); rerender();
  },
  'start-reading': async (el) => {
    const b = DB.getBook(el.dataset.id); if (!b) return;
    b.status = 'okunuyor'; b.startDate = b.startDate || today(); b.hideHome = false;
    await DB.saveBook(b); toast('İyi okumalar! 📖'); go('#/book/' + b.id);
  },
  'topic-filter': (el) => { state.topic[el.dataset.k] = el.dataset.t; rerender(); },
  'list-group': (el) => { state.group[el.dataset.k] = !state.group[el.dataset.k]; rerender(); },
  'read-filter': (el) => { state.read = el.dataset.f; rerender(); },
  'topic-new': () => openTopicEditor(),
  'catalog-pdf': () => openCatalog(),
  'wish-pdf': () => openWishList(),
};
