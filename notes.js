// 📝 Not Defteri: Genel Notlar, Özel Notlar ve kullanıcının eklediği defterler; Alışveriş Listem.
// Her notun başlığı, metni, oluşturma ve son düzenleme tarih-saati vardır.
// Hangi defterin kilitli olacağı Ayarlar → Kilit'ten seçilir (tek PIN).
import * as DB from './db.js?v=2.3';
import * as Lock from './lock.js?v=2.3';
import { $, esc, view, toast, openSheet, closeSheet, confirmDialog, rerender, go, fmtDateTime, norm, highlight } from './ui.js?v=2.3';

const NB_EMOJIS = ['📒', '📓', '📔', '📕', '📗', '📘', '📙', '🔐', '💼', '🏠', '🎓', '🕌', '💡', '❤️', '🩺', '💰', '✈️', '🍳', '🌱', '🎯', '🧠', '📌', '⭐', '🗂️'];
const SHOP_EMOJIS = ['🛒', '💊', '🏠', '🥦', '🍞', '🧴', '👕', '🎁', '📚', '🔧', '🐾', '👶', '🖊️', '💻'];
const state = { q: {}, sort: 'new' };

export const lockKey = (nbId) => 'nb:' + nbId;
export function nbIsOpen(nbId) { return Lock.isOpen(lockKey(nbId)); }
function lockBtn() { return Lock.enabled() ? '<button class="btn sm ghost" data-act="lock-now" title="Kilitle">🔒</button>' : ''; }
const lockIcon = (key) => (Lock.enabled() && Lock.isLockedSection(key) ? ' <span title="Kilitli">🔒</span>' : '');

function preview(n) { const t = String(n.text || '').replace(/\s+/g, ' ').trim(); return t.length > 160 ? t.slice(0, 158) + '…' : t; }
export function noteTitle(n) {
  if (n.title) return n.title;
  const first = String(n.text || '').split(/\n/)[0].trim();
  return first.length > 60 ? first.slice(0, 58) + '…' : first || 'Başlıksız not';
}

// ---------- Defterler sayfası ----------
export function renderNotes() {
  const nbs = DB.nbooks();
  const items = DB.shopitems();
  const shopLeft = items.filter((i) => !i.done && DB.S.shopcats.get(i.catId) && !DB.S.shopcats.get(i.catId).deleted).length;
  let h = `<div class="topbar"><h1>📝 Not Defteri</h1>${lockBtn()}</div>
    <div class="nb-grid">
      ${nbs.map((n) => {
        const c = DB.notesOf(n.id).length;
        return `<a class="nb-card" href="#/notes/${n.id}"><span class="nb-e">${esc(n.emoji || '📓')}</span><b>${esc(n.name)}${lockIcon(lockKey(n.id))}</b><small>${c} not</small></a>`;
      }).join('')}
      <a class="nb-card shop" href="#/shopping"><span class="nb-e">🛒</span><b>Alışveriş Listem${lockIcon('shopping')}</b><small>${shopLeft ? `${shopLeft} alınacak` : 'Liste boş'}</small></a>
      <button class="nb-card add" data-act="nbook-new"><span class="nb-e">＋</span><b>Not Defteri</b><small>Yeni defter ekle</small></button>
    </div>`;
  if (!Lock.enabled() && DB.notesOf(DB.NB_PRIVATE).length === 0) {
    h += `<p class="hint">💡 Özel Notlar'ı ve istediğiniz defterleri kilitlemek için <a href="#/settings/lock">Ayarlar → Kilit</a>'ten PIN belirleyin.</p>`;
  }
  // Son notlar (açık defterlerden)
  const recent = DB.allNotes().filter((n) => nbIsOpen(n.nbId)).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);
  if (recent.length) h += `<div class="section-title">🕒 Son notlar</div>${recent.map((n) => noteCard(n, { showNb: true })).join('')}`;
  view.innerHTML = h;
}

export function noteCard(n, { showNb = false, terms = null } = {}) {
  const nb = DB.getNbook(n.nbId);
  return `<article class="note-card" data-act="note-open" data-id="${n.id}">
    <div class="t-title">${highlight(noteTitle(n), terms)}</div>
    ${n.title && n.text ? `<div class="t-prev">${highlight(preview(n), terms)}</div>` : ''}
    <div class="q-ref">${showNb && nb ? `<span class="badge nb">${esc(nb.emoji || '📓')} ${esc(nb.name)}</span>` : ''}
      <span class="small">🕒 ${esc(fmtDateTime(n.createdAt))}</span>${n.editedAt ? `<span class="small muted">· düzenlendi ${esc(fmtDateTime(n.editedAt))}</span>` : ''}</div>
  </article>`;
}

// ---------- Bir defterin notları ----------
export function renderNotebook(id) {
  const nb = DB.getNbook(id);
  if (!nb) { view.innerHTML = `<div class="empty"><div class="e">🔍</div><h3>Defter bulunamadı</h3><a class="btn" href="#/notes">Not Defteri'ne dön</a></div>`; return; }
  if (!nbIsOpen(id)) { Lock.renderLockScreen(view, nb.name); return; }
  const q = state.q[id] || '';
  const terms = norm(q).split(/\s+/).filter(Boolean);
  let list = DB.notesOf(id);
  const total = list.length;
  if (terms.length) list = list.filter((n) => { const hay = norm(n.title + ' ' + n.text); return terms.every((t) => hay.includes(t)); });
  if (state.sort === 'old') list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  else if (state.sort === 'title') list.sort((a, b) => noteTitle(a).localeCompare(noteTitle(b), 'tr'));
  else list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  let h = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${esc(nb.emoji || '📓')} ${esc(nb.name)}</h1>${lockBtn()}<button class="btn sm" data-act="nbook-edit" data-id="${id}" title="Defteri düzenle">✏️</button></div>`;
  if (total) {
    h += `<div class="row-actions filters"><input class="input sm-input" id="n-filter" placeholder="Bu defterde ara…" value="${esc(q)}" style="flex:1;min-width:150px">
      <select class="input sm-input" id="n-sort" style="width:auto">${[['new', 'Son düzenlenen'], ['old', 'İlk yazılan'], ['title', 'Başlığa göre']].map(([k, l]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
  }
  if (!total) h += `<div class="empty"><div class="e">${esc(nb.emoji || '📓')}</div><h3>Bu defter boş</h3><p>Aşağıdaki <b>＋ Not</b> düğmesiyle ilk notunuzu yazın. Her not, yazdığınız tarih ve saatle kaydedilir.</p></div>`;
  else if (!list.length) h += `<p class="muted">Aramanızla eşleşen not yok.</p>`;
  else h += list.map((n) => noteCard(n, { terms })).join('');
  h += `<button class="fab" data-act="note-new" data-nb="${id}">＋ Not</button>`;
  view.innerHTML = h;
  const f = $('#n-filter');
  if (f) {
    f.oninput = () => { state.q[id] = f.value; const pos = f.selectionStart; renderNotebook(id); const g = $('#n-filter'); g.focus(); g.setSelectionRange(pos, pos); };
    $('#n-sort').onchange = (e) => { state.sort = e.target.value; renderNotebook(id); };
  }
}

// ---------- Not düzenleyici ----------
export function openNoteEditor({ id = null, nbId = null } = {}) {
  const n = id ? { ...DB.getNote(id) } : { nbId, title: '', text: '' };
  if (id && !n.id) return;
  const s = openSheet({
    title: id ? 'Notu düzenle' : '📝 Yeni not',
    body: `<p class="hint">${id ? `🕒 Yazılış: ${esc(fmtDateTime(n.createdAt))}${n.editedAt ? ` · Son düzenleme: ${esc(fmtDateTime(n.editedAt))}` : ''}` : `🕒 ${esc(fmtDateTime(new Date().toISOString()))} olarak kaydedilecek.`}</p>
      <label class="field"><span>Başlık</span><input id="n-title" maxlength="120" value="${esc(n.title)}" placeholder="Notun başlığı (isteğe bağlı)"></label>
      <label class="field"><span>Not</span><textarea id="n-text" class="serif" rows="10" placeholder="Notunuzu yazın…">${esc(n.text)}</textarea></label>
      <label class="field"><span>Defter</span><select id="n-nb">${DB.nbooks().map((x) => `<option value="${x.id}" ${x.id === n.nbId ? 'selected' : ''}>${esc(x.emoji || '📓')} ${esc(x.name)}</option>`).join('')}</select></label>`,
    foot: `${id ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button><button class="btn" data-x="copy" style="flex:0 0 auto" title="Kopyala">📋</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  $('[data-x="save"]', s).onclick = async () => {
    const title = $('#n-title', s).value.trim(), text = $('#n-text', s).value.trim();
    if (!title && !text) { toast('Başlık ya da not yazın'); $('#n-text', s).focus(); return; }
    const changed = !id || title !== n.title || text !== n.text;
    Object.assign(n, { title, text, nbId: $('#n-nb', s).value });
    if (id && changed) n.editedAt = new Date().toISOString();
    await DB.save('notes', n);
    await closeSheet(); toast('Not kaydedildi ✓'); rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => { if (await confirmDialog('Bu not silinsin mi?', 'Sil')) { await DB.remove('notes', n.id); toast('Not silindi'); rerender(); } };
  const cp = $('[data-x="copy"]', s);
  if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText([n.title, n.text].filter(Boolean).join('\n\n')); toast('Panoya kopyalandı'); } catch (e) { /* yok say */ } };
  if (!id) setTimeout(() => $('#n-title', s).focus(), 250);
}

// ---------- Defter ekle / düzenle ----------
export function openNbookEditor(id = null, onDone = null) {
  const nb = id ? DB.getNbook(id) : null;
  let emoji = nb ? nb.emoji || '📓' : '📓';
  const s = openSheet({
    title: nb ? 'Defteri düzenle' : '＋ Yeni not defteri',
    body: `<label class="field"><span>Defterin adı</span><input id="nb-name" maxlength="40" value="${esc(nb ? nb.name : '')}" placeholder="ör. İş notları, Tarifler, Ders notları"></label>
      <div class="field"><span>Simge</span><div class="emoji-grid">${NB_EMOJIS.map((x) => `<button type="button" data-em="${x}" class="${x === emoji ? 'on' : ''}">${x}</button>`).join('')}</div></div>
      <label class="check"><input type="checkbox" id="nb-lock" ${Lock.isLockedSection(lockKey(id || '__new')) ? 'checked' : ''}> 🔒 Bu defteri PIN ile kilitle</label>
      ${!Lock.enabled() ? '<p class="hint">Kilit için önce <a href="#/settings/lock">Ayarlar → Kilit</a>\'ten PIN belirlemelisiniz. İşaretlerseniz PIN belirlediğinizde kilitli olur.</p>' : ''}
      ${nb && nb.builtin ? '<p class="hint">Bu hazır bir defter; adını ve simgesini değiştirebilirsiniz, silinemez.</p>' : ''}`,
    foot: `${nb && !nb.builtin ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  s.addEventListener('click', (e) => {
    const b = e.target.closest('[data-em]'); if (!b) return;
    emoji = b.dataset.em; s.querySelectorAll('[data-em]').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('[data-x="save"]', s).onclick = async () => {
    const name = $('#nb-name', s).value.trim();
    if (!name) { toast('Defterin adını yazın'); return; }
    const rec = nb ? { ...nb } : { order: DB.nbooks().length };
    Object.assign(rec, { name, emoji });
    const saved = await DB.save('nbooks', rec);
    Lock.setSectionLocked(lockKey(saved.id), $('#nb-lock', s).checked);
    await closeSheet(); toast(nb ? 'Defter güncellendi ✓' : 'Defter eklendi ✓');
    if (onDone) onDone(); else if (!nb) go('#/notes/' + saved.id); else rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => {
    const c = DB.notesOf(nb.id).length;
    if (!(await confirmDialog(`“${nb.name}” defteri${c ? ` ve içindeki ${c} not` : ''} silinsin mi?`, 'Sil'))) return;
    for (const n of DB.notesOf(nb.id)) await DB.remove('notes', n.id);
    await DB.remove('nbooks', nb.id);
    Lock.setSectionLocked(lockKey(nb.id), false);
    toast('Defter silindi');
    if (onDone) onDone(); else location.replace('#/notes');
  };
  if (!nb) setTimeout(() => $('#nb-name', s).focus(), 250);
}

// ---------- Alışveriş Listem ----------
const shopState = { open: null };
export function renderShopping() {
  if (!Lock.isOpen('shopping')) { Lock.renderLockScreen(view, 'Alışveriş Listem'); return; }
  const cats = DB.shopcats();
  const items = DB.shopitems();
  const doneCount = items.filter((i) => i.done && cats.some((c) => c.id === i.catId)).length;
  let h = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>🛒 Alışveriş Listem</h1>${lockBtn()}</div>`;
  if (!cats.length) {
    h += `<div class="empty"><div class="e">🛒</div><h3>Henüz kategori yok</h3><p>Önce bir kategori ekleyin (ör. Market, Eczane), sonra içine alacaklarınızı yazın.</p>
      <div class="row-actions" style="justify-content:center">${[['🛒', 'Market'], ['💊', 'Eczane'], ['🏠', 'Ev']].map(([e, l]) => `<button class="btn" data-act="shopcat-quick" data-e="${e}" data-l="${l}">${e} ${l}</button>`).join('')}</div>
      <button class="btn primary mt" data-act="shopcat-new">＋ Kendi kategorimi ekle</button></div>`;
    view.innerHTML = h; return;
  }
  cats.forEach((c) => {
    const list = items.filter((i) => i.catId === c.id).sort((a, b) => (a.done - b.done) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    const left = list.filter((i) => !i.done).length;
    h += `<section class="shop-cat card">
      <div class="shop-head"><b>${esc(c.emoji || '🛒')} ${esc(c.name)}</b><span class="count">${left}/${list.length}</span>
        <button class="btn sm ghost" data-act="shopcat-edit" data-id="${c.id}" aria-label="Kategoriyi düzenle">✏️</button></div>
      <ul class="shop-list">${list.map((i) => `<li class="${i.done ? 'done' : ''}"><label><input type="checkbox" data-act="shop-toggle" data-id="${i.id}" ${i.done ? 'checked' : ''}><span>${esc(i.text)}</span></label>
        <button class="x" data-act="shop-del" data-id="${i.id}" aria-label="Sil">×</button></li>`).join('')}</ul>
      <form class="shop-add" data-cat="${c.id}"><input placeholder="Ekle… (ör. 2 ekmek)" enterkeyhint="done" maxlength="120"><button class="btn sm">＋</button></form>
    </section>`;
  });
  h += `<div class="row-actions"><button class="btn" data-act="shopcat-new" style="flex:1">＋ Kategori ekle</button>${doneCount ? `<button class="btn danger" data-act="shop-clear">🧹 Alınanları temizle (${doneCount})</button>` : ''}</div>`;
  view.innerHTML = h;
  view.querySelectorAll('.shop-add').forEach((f) => {
    f.onsubmit = async (e) => {
      e.preventDefault();
      const inp = f.querySelector('input');
      const text = inp.value.trim(); if (!text) return;
      await DB.save('shopitems', { catId: f.dataset.cat, text, done: false });
      shopState.open = f.dataset.cat;
      rerender();
      const again = view.querySelector(`.shop-add[data-cat="${f.dataset.cat}"] input`); if (again) again.focus();
    };
  });
}

export function openShopcatEditor(id = null, onDone = null) {
  const c = id ? DB.S.shopcats.get(id) : null;
  let emoji = c ? c.emoji || '🛒' : '🛒';
  const s = openSheet({
    title: c ? 'Kategoriyi düzenle' : '＋ Alışveriş kategorisi',
    body: `<label class="field"><span>Kategori adı</span><input id="sc-name" maxlength="40" value="${esc(c ? c.name : '')}" placeholder="ör. Market, Eczane, Kırtasiye"></label>
      <div class="field"><span>Simge</span><div class="emoji-grid">${SHOP_EMOJIS.map((x) => `<button type="button" data-em="${x}" class="${x === emoji ? 'on' : ''}">${x}</button>`).join('')}</div></div>`,
    foot: `${c ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  s.addEventListener('click', (e) => {
    const b = e.target.closest('[data-em]'); if (!b) return;
    emoji = b.dataset.em; s.querySelectorAll('[data-em]').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('[data-x="save"]', s).onclick = async () => {
    const name = $('#sc-name', s).value.trim();
    if (!name) { toast('Kategori adını yazın'); return; }
    await DB.save('shopcats', { ...(c || { order: DB.shopcats().length }), name, emoji });
    await closeSheet(); toast('Kaydedildi ✓'); if (onDone) onDone(); else rerender();
  };
  const del = $('[data-x="del"]', s);
  if (del) del.onclick = async () => {
    const its = DB.shopitems().filter((i) => i.catId === c.id);
    if (!(await confirmDialog(`“${c.name}” kategorisi${its.length ? ` ve içindeki ${its.length} madde` : ''} silinsin mi?`, 'Sil'))) return;
    for (const i of its) await DB.remove('shopitems', i.id);
    await DB.remove('shopcats', c.id);
    toast('Kategori silindi'); if (onDone) onDone(); else rerender();
  };
  if (!c) setTimeout(() => $('#sc-name', s).focus(), 250);
}

/** Sıralama yardımcısı: listedeki bir kaydı yukarı/aşağı taşır ve tüm sıraları kaydeder */
export async function moveOrder(store, list, id, dir) {
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const arr = [...list];
  [arr[i], arr[j]] = [arr[j], arr[i]];
  for (let k = 0; k < arr.length; k++) if (arr[k].order !== k) { arr[k].order = k; await DB.save(store, arr[k]); }
}

export const NOTE_ACTIONS = {
  'nbook-new': () => openNbookEditor(),
  'nbook-edit': (el) => openNbookEditor(el.dataset.id),
  'note-new': (el) => openNoteEditor({ nbId: el.dataset.nb }),
  'note-open': (el, e) => { if (e.target.closest('a')) return; openNoteEditor({ id: el.dataset.id }); },
  'shopcat-new': () => openShopcatEditor(),
  'shopcat-edit': (el) => openShopcatEditor(el.dataset.id),
  'shopcat-quick': async (el) => { await DB.save('shopcats', { name: el.dataset.l, emoji: el.dataset.e, order: DB.shopcats().length }); rerender(); },
  'shop-toggle': async (el) => { const i = DB.S.shopitems.get(el.dataset.id); if (!i) return; i.done = el.checked; i.doneAt = i.done ? new Date().toISOString() : ''; await DB.save('shopitems', i); rerender(); },
  'shop-del': async (el) => { await DB.remove('shopitems', el.dataset.id); rerender(); },
  'shop-clear': async () => {
    if (!(await confirmDialog('Alındı olarak işaretlenen maddeler listeden silinsin mi?', 'Temizle', false))) return;
    for (const i of DB.shopitems().filter((x) => x.done)) await DB.remove('shopitems', i.id);
    toast('Temizlendi ✓'); rerender();
  },
};
