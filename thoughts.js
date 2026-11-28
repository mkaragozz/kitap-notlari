// 💡 Düşüncelerim: kitaplardan bağımsız fikirler. Defterler, ortak etiketler, yıldız,
// her parça tarih-saatli; eski bir düşüncenin altına sonradan ekleme yapılabilir.
import * as DB from './db.js?v=3.5.6';
import * as EX from './export.js?v=3.5.6';
import * as Lock from './lock.js?v=3.5.6';
import { $, esc, view, toast, openSheet, closeSheet, confirmDialog, rerender, go, fmtDateTime, today, norm,
  starPickerHtml, bindStarPicker, starsBadge, STAR_LABELS } from './ui.js?v=3.5.6';
import { thoughtCard, thoughtTitle, thoughtText, thoughtLastAt, tagInputHtml, bindTagInput, openRelated } from './cards.js?v=3.5.6';

const state = { nb: 'all', sort: 'new', stars: 'all', q: '' };

function lockBtn() { return Lock.enabled() ? '<button class="btn sm ghost" data-act="lock-now" title="Kilitle">🔒</button>' : ''; }

export function renderThoughts() {
  if (!Lock.isOpen('thoughts')) { Lock.renderLockScreen(view, 'Düşüncelerim'); return; }
  const all = DB.thoughts();
  const nbs = DB.notebooks();
  if (state.nb !== 'all' && state.nb !== 'none' && !DB.getNotebook(state.nb)) state.nb = 'all';
  let list = all.filter((t) => state.nb === 'all' || (state.nb === 'none' ? !DB.getNotebook(t.notebookId) : t.notebookId === state.nb));
  if (state.stars !== 'all') list = list.filter((t) => (t.stars || 0) >= parseInt(state.stars, 10));
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  if (terms.length) list = list.filter((t) => { const hay = norm([t.title, thoughtText(t), (t.tags || []).join(' ')].join(' ')); return terms.every((x) => hay.includes(x)); });
  if (state.sort === 'stars') list.sort((a, b) => (b.stars || 0) - (a.stars || 0) || (thoughtLastAt(b) || '').localeCompare(thoughtLastAt(a) || ''));
  else if (state.sort === 'old') list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  else list.sort((a, b) => (thoughtLastAt(b) || '').localeCompare(thoughtLastAt(a) || ''));

  const count = (id) => all.filter((t) => (id === 'none' ? !DB.getNotebook(t.notebookId) : t.notebookId === id)).length;
  const noneCount = count('none');
  let h = `<div class="topbar"><h1>💡 Düşüncelerim</h1>${lockBtn()}<button class="btn sm" data-act="thoughts-export">⬇️</button></div>
    <div class="card quick">
      <textarea id="quick-thought" rows="3" placeholder="Aklınıza ne geldi? Yazın, tarih ve saatiyle kaydedilsin…"></textarea>
      <div class="quick-foot"><span class="small muted">🕒 ${esc(fmtDateTime(new Date().toISOString()))}${state.nb !== 'all' && state.nb !== 'none' ? ` · 📓 ${esc(DB.getNotebook(state.nb).name)}` : ''}</span>
      <button class="btn sm" data-act="new-thought">Ayrıntılı…</button><button class="btn sm primary" data-act="quick-thought">💾 Kaydet</button></div>
    </div>
    <div class="nb-row">
      <button class="nb-chip ${state.nb === 'all' ? 'on' : ''}" data-act="nb" data-nb="all">Hepsi <small>${all.length}</small></button>
      ${nbs.map((n) => `<button class="nb-chip ${state.nb === n.id ? 'on' : ''}" data-act="nb" data-nb="${n.id}">📓 ${esc(n.name)} <small>${count(n.id)}</small></button>`).join('')}
      ${noneCount && nbs.length ? `<button class="nb-chip ${state.nb === 'none' ? 'on' : ''}" data-act="nb" data-nb="none">Deftersiz <small>${noneCount}</small></button>` : ''}
      <button class="nb-chip add" data-act="nb-new">＋ Defter</button>
      ${nbs.length ? '<button class="nb-chip add" data-act="nb-manage" title="Defterleri düzenle">⚙️</button>' : ''}
    </div>`;
  if (all.length) {
    h += `<div class="row-actions filters">
      <input class="input sm-input" id="t-filter" placeholder="Düşüncelerde ara…" value="${esc(state.q)}" style="flex:1;min-width:150px">
      <select class="input sm-input" id="t-stars" style="width:auto">${[['all', 'Tüm dereceler'], ['1', '⭐ ve üstü'], ['2', '⭐⭐ ve üstü'], ['3', '⭐⭐⭐ Müthiş']].map(([k, l]) => `<option value="${k}" ${state.stars === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="input sm-input" id="t-sort" style="width:auto">${[['new', 'Son yazılan'], ['old', 'İlk yazılan'], ['stars', 'Önem derecesi']].map(([k, l]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
  }
  if (!all.length) {
    h += `<div class="empty"><div class="e">💡</div><h3>Henüz düşünce yok</h3><p>Okuduğunuz kitaplardan bağımsız, aklınıza gelen fikirleri buraya yazın. Her düşünce yazdığınız tarih ve saatle kaydedilir. Konu defterleri açıp düzenleyebilir, etiket ekleyerek kitaplardaki alıntılarla bağlayabilirsiniz.</p></div>`;
  } else if (!list.length) h += `<p class="muted">Bu filtrede düşünce yok.</p>`;
  else h += list.map((t) => thoughtCard(t, { terms })).join('');
  h += `<button class="fab" data-act="new-thought">＋ Düşünce</button>`;
  view.innerHTML = h;

  const f = $('#t-filter');
  if (f) {
    f.oninput = () => { state.q = f.value; const pos = f.selectionStart; renderThoughts(); const g = $('#t-filter'); g.focus(); g.setSelectionRange(pos, pos); };
    $('#t-stars').onchange = (e) => { state.stars = e.target.value; renderThoughts(); };
    $('#t-sort').onchange = (e) => { state.sort = e.target.value; renderThoughts(); };
  }
}

export function renderThought(id) {
  if (!Lock.isOpen('thoughts')) { Lock.renderLockScreen(view, 'Düşüncelerim'); return; }
  const t = DB.getThought(id);
  if (!t) { view.innerHTML = `<div class="empty"><div class="e">🔍</div><h3>Düşünce bulunamadı</h3><a class="btn" href="#/thoughts">Düşüncelere dön</a></div>`; return; }
  const nb = t.notebookId ? DB.getNotebook(t.notebookId) : null;
  const parts = t.parts || [];
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1></h1>${lockBtn()}<button class="btn sm" data-act="edit-thought-meta" data-id="${t.id}">✏️ Düzenle</button></div>
    <div class="t-head s${t.stars || 0}">
      <h2>💡 ${esc(thoughtTitle(t))}</h2>
      <div class="q-ref">${nb ? `<span class="badge nb">📓 ${esc(nb.name)}</span>` : ''}${starsBadge(t.stars)}${t.stars ? `<span class="small">${STAR_LABELS[t.stars]}</span>` : ''}</div>
      ${t.tags && t.tags.length ? `<div class="q-ref">${t.tags.map((x) => `<a class="chip" href="#/tag/${encodeURIComponent(x)}">#${esc(x)}</a>`).join('')}</div>` : ''}
    </div>
    <div class="timeline">${parts.map((p, i) => `<div class="tl-item">
      <div class="tl-time">🕒 ${esc(fmtDateTime(p.at))}${i === 0 ? ' · <span class="muted">ilk yazılış</span>' : ''}${p.editedAt ? ` <span class="muted small">(düzenlendi ${esc(fmtDateTime(p.editedAt))})</span>` : ''}</div>
      <div class="tl-text">${esc(p.text)}</div>
      <div class="q-actions"><button data-act="edit-part" data-id="${t.id}" data-part="${p.id}">✏️</button>${parts.length > 1 ? `<button data-act="del-part" data-id="${t.id}" data-part="${p.id}">🗑️</button>` : ''}</div></div>`).join('')}</div>
    <button class="btn primary block" data-act="add-part" data-id="${t.id}">➕ Ekle</button>
    <p class="hint" style="text-align:center">Düşüncenizi geliştirin; eklediğiniz her parça kendi tarih ve saatiyle kaydedilir.</p>
    <div class="row-actions mt"><button class="btn" data-act="related" data-kind="thought" data-id="${t.id}" style="flex:1">🔗 Bağlantılar</button>
      <button class="btn danger" data-act="del-thought" data-id="${t.id}">🗑️ Sil</button></div>
    <p class="hint">İlk yazılış: ${esc(fmtDateTime(t.createdAt))}</p>`;
}

function notebookSelectHtml(selected) {
  return `<select id="t-nb"><option value="">— Deftersiz —</option>${DB.notebooks().map((n) => `<option value="${n.id}" ${selected === n.id ? 'selected' : ''}>📓 ${esc(n.name)}</option>`).join('')}<option value="__new">＋ Yeni defter…</option></select>`;
}
function bindNotebookSelect(s) {
  const sel = $('#t-nb', s);
  let prev = sel.value;
  sel.onchange = async () => {
    if (sel.value !== '__new') { prev = sel.value; return; }
    const name = (prompt('Yeni defterin adı (ör. Eğitim, Felsefe, İnsan ilişkileri):') || '').trim();
    if (!name) { sel.value = prev; return; }
    const n = await DB.save('notebooks', { name });
    const opt = document.createElement('option'); opt.value = n.id; opt.textContent = '📓 ' + name;
    sel.insertBefore(opt, sel.querySelector('[value="__new"]'));
    sel.value = n.id; prev = n.id;
  };
  return () => (sel.value === '__new' ? '' : sel.value);
}

export function openThoughtEditor(id = null) {
  const t = id ? DB.getThought(id) : null;
  const preNb = !t && state.nb !== 'all' && state.nb !== 'none' ? state.nb : '';
  const s = openSheet({
    title: t ? 'Düşünceyi düzenle' : '💡 Yeni düşünce',
    body: `${t ? '' : `<p class="hint">🕒 ${esc(fmtDateTime(new Date().toISOString()))} olarak kaydedilecek.</p>`}
      <label class="field"><span>Başlık (isteğe bağlı)</span><input id="t-title" value="${esc(t ? t.title : '')}" placeholder="Boş bırakırsanız ilk cümle başlık olur"></label>
      ${t ? '' : '<label class="field"><span>Düşüncem</span><textarea id="t-text" class="serif" rows="7" placeholder="Aklınıza geleni yazın…"></textarea></label>'}
      <label class="field"><span>Defter</span>${notebookSelectHtml(t ? t.notebookId : preNb)}</label>
      <div class="field"><span>Etiketler (kitaplardaki alıntılarla ortak)</span>${tagInputHtml(t ? t.tags || [] : [])}</div>
      <div class="field"><span>Önem derecesi</span>${starPickerHtml(t ? t.stars : 0)}</div>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  const tags = bindTagInput(s, t ? t.tags || [] : []);
  const stars = bindStarPicker(s);
  const getNb = bindNotebookSelect(s);
  $('[data-x="save"]', s).onclick = async () => {
    const title = $('#t-title', s).value.trim();
    if (t) {
      Object.assign(t, { title, notebookId: getNb(), tags: tags.get(), stars: stars.get() });
      await DB.save('thoughts', t);
    } else {
      const text = $('#t-text', s).value.trim();
      if (!text) { toast('Düşünce boş olamaz'); return; }
      const now = new Date().toISOString();
      const n = await DB.save('thoughts', { title, notebookId: getNb(), tags: tags.get(), stars: stars.get(), parts: [{ id: DB.uid(), text, at: now }] });
      await closeSheet(); toast('Düşünce kaydedildi ✓'); go('#/thought/' + n.id); return;
    }
    await closeSheet(); toast('Kaydedildi ✓'); rerender();
  };
  if (!t) setTimeout(() => { const x = $('#t-text', s); if (x) x.focus(); }, 250);
}

function openPartEditor(t, part = null) {
  const s = openSheet({
    title: part ? 'Parçayı düzenle' : '➕ Düşünceye ekle',
    body: `<p class="hint">${part ? `Yazılış: ${esc(fmtDateTime(part.at))}. Düzenleme tarihi ayrıca not edilir.` : `🕒 ${esc(fmtDateTime(new Date().toISOString()))} tarihiyle eklenecek.`}</p>
      <label class="field"><textarea id="p-text" class="serif" rows="8" placeholder="Bu düşünceye bugün ne eklemek istersiniz?">${esc(part ? part.text : '')}</textarea></label>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  $('[data-x="save"]', s).onclick = async () => {
    const text = $('#p-text', s).value.trim();
    if (!text) { toast('Boş olamaz'); return; }
    const now = new Date().toISOString();
    if (part) { part.text = text; part.editedAt = now; } else t.parts = [...(t.parts || []), { id: DB.uid(), text, at: now }];
    await DB.save('thoughts', t);
    await closeSheet(); toast('Kaydedildi ✓'); rerender();
  };
  setTimeout(() => $('#p-text', s).focus(), 250);
}

export function manageNotebooks() {
  const nbs = DB.notebooks();
  const s = openSheet({
    title: '📓 Defterler',
    body: `<p class="hint">Bir defteri silerseniz içindeki düşünceler silinmez, “Deftersiz” olarak kalır.</p>
      ${nbs.map((n) => `<div class="nb-item"><span>📓 ${esc(n.name)}</span><span class="small muted">${DB.thoughts().filter((t) => t.notebookId === n.id).length}</span>
        <button class="btn sm" data-ren="${n.id}">✏️</button><button class="btn sm danger" data-del="${n.id}">🗑️</button></div>`).join('')}
      <button class="btn block mt" data-x="new">＋ Yeni defter</button>`,
  });
  s.addEventListener('click', async (e) => {
    const ren = e.target.closest('[data-ren]'), del = e.target.closest('[data-del]');
    if (ren) {
      const n = DB.getNotebook(ren.dataset.ren);
      const name = (prompt('Defterin yeni adı:', n.name) || '').trim();
      if (name) { n.name = name; await DB.save('notebooks', n); manageNotebooks(); rerender(); }
    }
    if (del) {
      const n = DB.getNotebook(del.dataset.del);
      if (await confirmDialog(`“${n.name}” defteri silinsin mi? İçindeki düşünceler silinmez.`, 'Sil')) {
        await DB.remove('notebooks', n.id);
        for (const t of DB.thoughts().filter((x) => x.notebookId === n.id)) { t.notebookId = ''; await DB.save('thoughts', t); }
        if (state.nb === n.id) state.nb = 'all';
        toast('Defter silindi'); rerender();
      }
    }
    if (e.target.closest('[data-x="new"]')) { await newNotebook(); manageNotebooks(); }
  });
}
async function newNotebook() {
  const name = (prompt('Yeni defterin adı (ör. Eğitim, Felsefe, İnsan ilişkileri):') || '').trim();
  if (!name) return null;
  const n = await DB.save('notebooks', { name });
  state.nb = n.id;
  rerender();
  return n;
}

function exportThoughts() {
  const nbs = DB.notebooks();
  const s = openSheet({
    title: '⬇️ Düşünceleri dışa aktar',
    body: `<label class="field"><span>Hangi düşünceler?</span><select id="ex-nb"><option value="all">Hepsi (defterlere göre gruplu)</option>${nbs.map((n) => `<option value="${n.id}" ${state.nb === n.id ? 'selected' : ''}>📓 ${esc(n.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Önem derecesi</span><select id="ex-st"><option value="0">Hepsi</option><option value="1">⭐ ve üstü</option><option value="2">⭐⭐ ve üstü</option><option value="3">⭐⭐⭐ Müthiş tespitler</option></select></label>
      <div class="choice-grid mt"><button class="choice c6" data-f="pdf"><span class="e">🖨️</span>PDF / Yazdır</button><button class="choice c2" data-f="docx"><span class="e">📝</span>Word</button></div>
      <p class="hint mt">PDF için açılan yazdırma ekranında hedef olarak <b>“PDF olarak kaydet”</b>i seçin.</p>`,
  });
  s.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const which = $('#ex-nb', s).value, min = parseInt($('#ex-st', s).value, 10);
    const sorted = (arr) => arr.filter((t) => (t.stars || 0) >= min).sort((a, c) => (a.createdAt || '').localeCompare(c.createdAt || ''));
    const groups = which === 'all'
      ? [...nbs.map((n) => ({ name: n.name, thoughts: sorted(DB.thoughts().filter((t) => t.notebookId === n.id)) })),
        { name: 'Deftersiz', thoughts: sorted(DB.thoughts().filter((t) => !DB.getNotebook(t.notebookId))) }]
      : [{ name: DB.getNotebook(which).name, thoughts: sorted(DB.thoughts().filter((t) => t.notebookId === which)) }];
    if (!groups.some((g) => g.thoughts.length)) { toast('Dışa aktarılacak düşünce yok'); return; }
    const title = which === 'all' ? 'Düşüncelerim' : `Düşüncelerim: ${DB.getNotebook(which).name}`;
    if (b.dataset.f === 'pdf') { await closeSheet(); EX.printHtml(EX.buildThoughtsPrintHtml(title, groups)); return; }
    try {
      b.disabled = true;
      const blob = await EX.buildThoughtsDocx(title, groups);
      const r = await EX.saveFile(blob, `${EX.safeName(title)} - ${today()}.docx`);
      if (r !== 'cancelled') toast('Dosya hazır ✓');
    } catch (err) { toast(err.message, 5000); }
    b.disabled = false;
  });
}

export const THOUGHT_ACTIONS = {
  'new-thought': () => openThoughtEditor(),
  'quick-thought': async () => {
    const ta = $('#quick-thought');
    const text = ta.value.trim();
    if (!text) { ta.focus(); toast('Önce düşüncenizi yazın'); return; }
    await DB.save('thoughts', { title: '', notebookId: state.nb !== 'all' && state.nb !== 'none' ? state.nb : '', tags: [], stars: 0, parts: [{ id: DB.uid(), text, at: new Date().toISOString() }] });
    toast('Düşünce kaydedildi ✓'); rerender();
  },
  'edit-thought-meta': async (el) => { if (document.querySelector('.sheet')) await closeSheet(); openThoughtEditor(el.dataset.id); },
  'add-part': (el) => openPartEditor(DB.getThought(el.dataset.id)),
  'edit-part': (el) => { const t = DB.getThought(el.dataset.id); openPartEditor(t, (t.parts || []).find((p) => p.id === el.dataset.part)); },
  'del-part': async (el) => {
    const t = DB.getThought(el.dataset.id);
    if (!(await confirmDialog('Bu parça silinsin mi?', 'Sil'))) return;
    t.parts = (t.parts || []).filter((p) => p.id !== el.dataset.part);
    await DB.save('thoughts', t); toast('Silindi'); rerender();
  },
  'del-thought': async (el) => {
    if (!(await confirmDialog('Bu düşünce tüm parçalarıyla silinsin mi?', 'Sil'))) return;
    await DB.remove('thoughts', el.dataset.id); toast('Silindi'); location.replace('#/thoughts');
  },
  nb: (el) => { state.nb = el.dataset.nb; rerender(); },
  'nb-new': () => newNotebook(),
  'nb-manage': () => manageNotebooks(),
  'thoughts-export': () => exportThoughts(),
  'related-thought': (el) => openRelated('thought', el.dataset.id),
};
