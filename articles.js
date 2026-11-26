// 📄 Makaleler: PDF / Word makale ekleme, kitap okuyucusuyla okuma, alıntı-not-fikir (kitaplarla aynı özellikler).
// Makaleler "books" deposunda kind === 'article' olarak durur; böylece alıntılar, etiketler, dışa aktarma ve okuyucu ortaktır.
import * as DB from './db.js?v=3.3';
import * as Lock from './lock.js?v=3.3';
import { $, esc, view, toast, rerender, go, norm, today, pickFiles } from './ui.js?v=3.3';
import { topicChips, topicPickerHtml, bindTopicPicker } from './lists.js?v=3.3';
import { readMeta, fileKind, KIND_LABEL } from './reader.js?v=3.3';

const state = { tab: 'toread', topic: 'all', q: '' };
export const isArticleRead = (a) => a.status === 'bitti';

function articleCard(a) {
  const meta = [a.journal, a.year].filter(Boolean).join(' · ');
  const read = isArticleRead(a);
  const chk = `<button class="lc-act chk ${read ? 'on' : ''}" data-act="art-read" data-id="${a.id}">${read ? '✓' : ''}<small>${read ? 'Okudum' : 'Okumadım'}</small></button>`;
  const act = a.fileId ? `<div class="lc-acts"><a class="lc-act" href="#/read/${a.id}" title="Oku">📖<small>Oku</small></a>${chk}</div>` : chk;
  return `<article class="list-card c">
    <a class="lc-main" href="#/book/${a.id}"><div class="thumb art-thumb"><span>📄</span></div><div class="lc-body">
      <div class="lc-title">${esc(a.title)}</div>
      <div class="lc-sub">${esc(a.author || '—')}${meta ? ' · ' + esc(meta) : ''}</div>
      <div class="lc-tags">${a.fileId ? `<span class="chip filek">${esc(KIND_LABEL[a.fileType] || 'Dosya')}</span>` : ''}${read && a.fileId ? '<span class="chip readc">✓ Okundu</span>' : ''}${a.status === 'okunuyor' ? '<span class="chip own">📖 Okunuyor</span>' : ''}${topicChips(a)}</div>
    </div></a>${act}
  </article>`;
}

export function renderArticles() {
  const all0 = DB.articles();
  const all = all0.filter((a) => !a.private); // özel makaleler yalnızca kendi sekmesinde
  const priv = all0.filter((a) => a.private);
  const privLocked = Lock.enabled() && !Lock.isOpen('privateArticles');
  const toread = all.filter((a) => !isArticleRead(a)), read = all.filter(isArticleRead);
  let list = state.tab === 'read' ? read : state.tab === 'all' ? all : state.tab === 'private' ? priv : toread;
  if (state.topic === 'none') list = list.filter((a) => !(a.topics || []).some((id) => DB.getTopic(id)));
  else if (state.topic !== 'all') list = list.filter((a) => (a.topics || []).includes(state.topic));
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  if (terms.length) list = list.filter((a) => { const h = norm([a.title, a.author, a.journal, a.year, a.doi].join(' ')); return terms.every((t) => h.includes(t)); });
  list = [...list].sort((a, b) => (b.lastReadAt || b.updatedAt || '').localeCompare(a.lastReadAt || a.updatedAt || ''));
  const topics = DB.topics();
  const isPriv = state.tab === 'private';
  let h = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>📄 Makaleler</h1></div>
    <div class="sub-tabs"><a href="#" class="${isPriv ? '' : 'on'}" data-act="art-tab" data-t="${isPriv ? 'toread' : state.tab}">📄 Makalelerim <small>${all.length}</small></a><a href="#" class="${isPriv ? 'on' : ''}" data-act="art-tab" data-t="private">🔒 Özel Makalelerim${privLocked ? '' : ` <small>${priv.length}</small>`}</a></div>
    ${isPriv ? '' : `<div class="pill-row">${[['toread', `📋 Okuyacaklarım ${toread.length}`], ['read', `✅ Okuduklarım ${read.length}`], ['all', `Tümü ${all.length}`]].map(([k, l]) => `<button class="pill ${state.tab === k ? 'on' : ''}" data-act="art-tab" data-t="${k}">${l}</button>`).join('')}</div>`}`;
  if (state.tab === 'private' && privLocked) { view.innerHTML = h + '<div id="art-lock"></div>'; Lock.renderLockScreen($('#art-lock'), 'Özel Makalelerim'); return; }
  if (state.tab === 'private' && !Lock.enabled()) h += `<div class="banner sun small">🔒 Bu bölümü kilitlemek için <a href="#/settings/lock">Ayarlar → Kilit</a>'ten PIN belirleyin.</div>`;
  if (all.length || (state.tab === 'private' && priv.length)) {
    h += `<input class="input" id="art-q" placeholder="Makalelerde ara (başlık, yazar, dergi, DOI)…" value="${esc(state.q)}" style="margin:10px 0">`;
    const base = state.tab === 'private' ? priv : all;
    const tc = (id) => base.filter((a) => (a.topics || []).includes(id)).length;
    h += `<div class="pill-row">${topics.length ? [['all', 'Tüm kategoriler', ''], ...[...topics].sort((a, c) => tc(c.id) - tc(a.id)).map((t) => [t.id, `${t.emoji || '🏷️'} ${t.name}`, tc(t.id)]), ['none', 'Kategorisiz', base.filter((a) => !(a.topics || []).some((id) => DB.getTopic(id))).length]].map(([k, l, n]) => `<button class="pill t ${state.topic === k ? 'on' : ''} ${n === 0 ? 'dim' : ''}" data-act="art-topic" data-t="${k}">${esc(l)}${n !== '' ? ` <small>${n}</small>` : ''}</button>`).join('') : ''}<button class="pill add" data-act="topic-new">＋ Kategori</button></div>`;
  }
  if (state.tab === 'private' && !priv.length) h += `<div class="empty"><div class="e">🔒</div><h3>Özel makale yok</h3><p>Makale eklerken “🔒 Özel makale” kutusunu işaretleyin; burada kilitli olarak durur.</p><a class="btn primary" href="#/new-article?private=1">＋ Özel makale ekle</a></div>`;
  else if (!all.length && state.tab !== 'private') h += `<div class="empty"><div class="e">📄</div><h3>Henüz makale yok</h3><p>PDF ya da Word makale yükleyin, DOI numarasıyla bilgilerini doldurun. Okurken metni seçip alıntı ve not olarak kaydedin.</p><a class="btn primary" href="#/new-article">＋ Makale ekle</a></div>`;
  else if (!list.length) h += `<p class="muted">Bu bölümde makale yok.</p>`;
  else h += `<div class="lc-list">${list.map(articleCard).join('')}</div>`;
  h += `<a class="fab" href="#/new-article${state.tab === 'private' ? '?private=1' : ''}">＋ Makale</a>`;
  view.innerHTML = h;
  const q = $('#art-q');
  if (q) q.oninput = () => { state.q = q.value; const p = q.selectionStart; renderArticles(); const g = $('#art-q'); g.focus(); g.setSelectionRange(p, p); };
}

// ---------- DOI ile bilgi (Crossref, ücretsiz) ----------
export const cleanDoi = (s) => String(s || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
export async function lookupDoi(doi) {
  const d = cleanDoi(doi);
  if (!/^10\.\d{4,}\/\S+$/.test(d)) throw new Error('DOI “10.” ile başlamalı (ör. 10.1000/xyz123).');
  const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(d)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Makale servisine ulaşılamadı.');
  const m = (await r.json()).message || {};
  const parts = (m.issued && m.issued['date-parts'] && m.issued['date-parts'][0]) || [];
  return {
    title: (m.title || [])[0] || '',
    author: (m.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name).filter(Boolean).join(', '),
    journal: (m['container-title'] || [])[0] || m.publisher || '',
    year: parts[0] ? String(parts[0]) : '', volume: m.volume || '', issue: m.issue || '', pagesRange: m.page || '',
    url: m.URL || `https://doi.org/${d}`, doi: d, language: m.language || '',
    description: String(m.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

// ---------- Makale formu ----------
const FIELDS = ['title', 'author', 'journal', 'year', 'volume', 'issue', 'pagesRange', 'doi', 'url', 'description', 'notes'];
export function renderArticleForm(id, priv = false) {
  const a = id ? DB.getBook(id) : { kind: 'article', status: 'okunacak', private: !!priv };
  if (!a) { go('#/articles'); return; }
  const v = (k) => esc(a[k] || '');
  let file = null; // yeni seçilen dosya
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${id ? 'Makaleyi düzenle' : '📄 Yeni makale'}</h1></div>
  <form id="art-form" autocomplete="off">
    <div class="card">
      <b>📎 Makale dosyası</b><p class="hint">PDF ya da Word (.docx). Dosyası olmayan makaleyi (yalnızca bağlantı ya da kâğıt) de kaydedebilirsiniz.</p>
      <div id="art-file">${a.fileId ? `<div class="file-pill">📄 ${esc(a.fileName || 'Dosya')} <small>${esc(KIND_LABEL[a.fileType] || '')}</small></div>` : ''}</div>
      <button type="button" class="btn block" data-x="pick">${a.fileId ? '🔁 Dosyayı değiştir' : '📎 Dosya seç'}</button>
    </div>
    <div class="card"><b>⚡ DOI ile doldur</b><p class="hint">DOI numarasını yazın; başlık, yazarlar, dergi, yıl, cilt, sayı ve sayfalar kendiliğinden dolsun.</p>
      <div style="display:flex;gap:8px"><input class="input" name="doi" value="${v('doi')}" placeholder="ör. 10.1000/xyz123" style="flex:1"><button type="button" class="btn sun" data-x="doi">🔍 Bul</button></div><div id="doi-msg"></div></div>
    <div class="card">
      <label class="field"><span>Makale başlığı *</span><input name="title" required value="${v('title')}"></label>
      <label class="field"><span>Yazar(lar)</span><input name="author" value="${v('author')}" placeholder="Birden çoksa virgülle ayırın"></label>
      <label class="field"><span>Dergi / yayın</span><input name="journal" value="${v('journal')}"></label>
      <div class="grid3"><label class="field"><span>Yıl</span><input name="year" inputmode="numeric" value="${v('year')}"></label>
        <label class="field"><span>Cilt</span><input name="volume" value="${v('volume')}"></label>
        <label class="field"><span>Sayı</span><input name="issue" value="${v('issue')}"></label></div>
      <label class="field"><span>Sayfalar</span><input name="pagesRange" value="${v('pagesRange')}" placeholder="ör. 45-67"></label>
      <label class="field"><span>Bağlantı (URL)</span><input name="url" type="url" value="${v('url')}" placeholder="https://…"></label>
      <label class="field"><span>Özet (abstract)</span><textarea name="description" rows="3">${v('description')}</textarea></label>
      <div class="field"><span>Kategoriler</span>${topicPickerHtml(a.topics || [])}</div>
      <label class="check"><input type="checkbox" name="private" ${a.private ? 'checked' : ''}> 🔒 Özel makale (PIN ile kilitli “Özel Makalelerim” bölümünde)</label>
      <div class="field"><span>Durum</span><div class="seg" id="art-st">${[['okunacak', '📋 Okuyacağım'], ['okunuyor', '📖 Okuyorum'], ['bitti', '✅ Okudum']].map(([k, l]) => `<button type="button" class="${(a.status || 'okunacak') === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div></div>
      <label class="field"><span>Makale hakkında notum</span><textarea name="notes" rows="2">${v('notes')}</textarea></label>
    </div>
    <button class="btn primary block" type="submit">💾 Kaydet</button>
    ${id ? `<button type="button" class="btn danger block mt" data-act="del-book" data-book="${id}">🗑️ Makaleyi sil</button>` : ''}
  </form>`;
  const form = $('#art-form');
  const tp = bindTopicPicker(form, a.topics || []);
  let status = a.status || 'okunacak';
  $('#art-st').onclick = (e) => { const b = e.target.closest('[data-st]'); if (!b) return; status = b.dataset.st; form.querySelectorAll('#art-st button').forEach((x) => x.classList.toggle('on', x === b)); };
  const fill = (info) => { let n = 0; FIELDS.forEach((k) => { const val = info[k] != null ? String(info[k]).trim() : ''; if (val && form[k] && !form[k].value.trim()) { form[k].value = val; n++; } }); return n; };
  form.addEventListener('click', async (e) => {
    const x = e.target.closest('[data-x]'); if (!x) return;
    if (x.dataset.x === 'pick') {
      const [f] = await pickFiles({ accept: '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      if (!f) return;
      const kind = fileKind(f.name, f.type);
      if (kind !== 'pdf' && kind !== 'docx') { toast(kind === 'doc' ? 'Eski .doc biçimi desteklenmiyor; Word\'de “.docx” olarak kaydedin.' : 'Makale için PDF ya da Word (.docx) seçin.', 4500); return; }
      file = f;
      $('#art-file').innerHTML = `<div class="file-pill">📄 ${esc(f.name)} <small>${KIND_LABEL[kind]} · ${(f.size / 1048576).toFixed(1)} MB</small></div>`;
      const meta = await readMeta(f); fill({ title: meta.title, author: meta.author });
    }
    if (x.dataset.x === 'doi') {
      const msg = $('#doi-msg');
      x.disabled = true; x.textContent = '…';
      try {
        const info = await lookupDoi(form.doi.value);
        if (!info) msg.innerHTML = '<div class="banner sun small mt">Bu DOI ile makale bulunamadı. Bilgileri elle yazın.</div>';
        else { const n = fill(info); msg.innerHTML = `<div class="banner teal small mt">✓ ${n} alan dolduruldu. Kontrol edin.</div>`; }
      } catch (err) { msg.innerHTML = `<div class="banner coral small mt">${esc(err.message)}</div>`; }
      x.disabled = false; x.textContent = '🔍 Bul';
    }
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    FIELDS.forEach((k) => { a[k] = String(fd.get(k) || '').trim(); });
    a.doi = cleanDoi(a.doi);
    if (!a.title) { toast('Makale başlığı gerekli'); form.title.focus(); return; }
    a.kind = 'article'; a.status = status; a.topics = tp.get(); a.private = !!fd.get('private');
    if (status === 'bitti' && !a.endDate) a.endDate = today();
    if (file) {
      if (a.fileId) await DB.deleteFile(a.fileId);
      const rec = await DB.putFile({ name: file.name, type: file.type, size: file.size, blob: file });
      Object.assign(a, { fileId: rec.id, fileName: file.name, fileType: fileKind(file.name, file.type), fileSize: file.size, readPos: null });
    }
    const isNew = !a.id;
    await DB.saveBook(a);
    toast(isNew ? 'Makale eklendi ✓' : 'Kaydedildi ✓');
    if (isNew && a.private) { state.tab = 'private'; location.replace('#/articles'); } else if (isNew) location.replace('#/book/' + a.id); else go('#/book/' + a.id);
  };
}

export const ARTICLE_ACTIONS = {
  'art-tab': (el, e) => { if (e) e.preventDefault(); state.tab = el.dataset.t; rerender(); },
  'art-topic': (el) => { state.topic = el.dataset.t; rerender(); },
  'art-read': async (el) => {
    const a = DB.getBook(el.dataset.id); if (!a) return;
    if (isArticleRead(a)) { a.status = 'okunacak'; a.endDate = ''; } else { a.status = 'bitti'; a.endDate = today(); }
    await DB.saveBook(a); toast(isArticleRead(a) ? 'Okudum olarak işaretlendi ✅' : 'Okuyacaklarıma alındı'); rerender();
  },
};
