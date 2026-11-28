// Alıntı ve düşünce kartları, etiket bağlantıları, ortak liste yardımcıları.
import * as DB from './db.js?v=3.5.4';
import * as Lock from './lock.js?v=3.5.4';
import { pageLabel, sourceText } from './export.js?v=3.5.4';
import { HL_COLORS } from './reader.js?v=3.5.4';
import { $, $$, esc, norm, highlight, fmtDate, fmtDateTime, openSheet, starsBadge } from './ui.js?v=3.5.4';

export function pageNum(p) { const n = parseInt(p, 10); return isNaN(n) ? null : n; }

/** mode: 'page' (sayfa sırası) | 'stars' (önem) | 'new' (en yeni) */
export function sortQuotes(qs, mode = 'page') {
  const byPage = (a, b) => (pageNum(a.page) ?? 1e9) - (pageNum(b.page) ?? 1e9) || (a.createdAt || '').localeCompare(b.createdAt || '');
  if (mode === 'stars') return [...qs].sort((a, b) => (b.stars || 0) - (a.stars || 0) || byPage(a, b));
  if (mode === 'new') return [...qs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return [...qs].sort(byPage);
}

export function thoughtTitle(t) {
  if (t.title) return t.title;
  const first = ((t.parts || [])[0] || {}).text || '';
  const line = first.split(/\n/)[0].trim();
  return line.length > 70 ? line.slice(0, 68) + '…' : line || 'Başlıksız düşünce';
}
export function thoughtText(t) { return (t.parts || []).map((p) => p.text).join('\n'); }
export function thoughtLastAt(t) { const ps = t.parts || []; return ps.length ? ps[ps.length - 1].at : t.createdAt; }

/** Tüm etiketler (sayılarıyla). Düşünce etiketleri yalnızca kilit açıksa sayılır. */
export function allTags() {
  const m = new Map();
  DB.allQuotes().forEach((q) => (q.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
  if (Lock.isOpen('thoughts')) DB.thoughts().forEach((x) => (x.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
}

export function quoteCard(q, { showBook = false, terms = null, shared = null } = {}) {
  const b = DB.getBook(q.bookId);
  const pl = pageLabel(q);
  const long = (q.text || '').length > 420;
  return `<article class="q-card s${q.stars || 0}"${q.color && HL_COLORS[q.color] ? ` style="border-left-color:${HL_COLORS[q.color]}"` : ''}>
    ${q.text ? `<div class="q-text ${long ? 'clamp' : ''}" data-act="expand">${highlight(q.text, terms)}</div>` : ''}
    ${q.src && b ? `<a class="q-src" href="#/read/${b.id}?q=${q.id}" title="Orijinal dosyada yerini aç">📎 ${esc(q.src.where || 'Kaynak')}${q.src.file ? ` · ${esc(q.src.file)}` : ''}</a>` : ''}
    ${q.comment ? `<div class="q-comment ${q.text ? '' : 'solo'}"><b>💭 Yorumum</b> ${highlight(q.comment, terms)}</div>` : ''}
    <div class="q-ref">
      ${showBook && b ? `<a class="q-book" href="#/book/${b.id}">📘 ${esc(b.title)}</a>` : ''}
      ${pl ? `<span class="badge page">s. ${esc(pl)}</span>` : ''}
      ${starsBadge(q.stars)}
      ${q.chapter ? `<span class="small">${esc(q.chapter)}</span>` : ''}
    </div>
    ${q.tags && q.tags.length ? `<div class="q-ref">${q.tags.map((t) => `<a class="chip ${shared && shared.includes(t) ? 'sel' : ''}" href="#/tag/${encodeURIComponent(t)}">#${highlight(t, terms)}</a>`).join('')}</div>` : ''}
    ${q.reread && !q.reread.done ? `<div class="q-ref"><span class="badge kind-tekrar">🔖 Tekrar oku${q.reread.due ? ' · ' + fmtDate(q.reread.due) : ''}</span></div>` : ''}
    <div class="q-actions">
      ${q.anchor && b && b.fileId ? `<a class="qa-link" href="#/read/${b.id}?q=${q.id}" title="Kitapta yerini göster">📖</a>` : ''}
      <button data-act="related" data-kind="quote" data-id="${q.id}" title="Aynı etiketi taşıyan kayıtlar">🔗 Bağlantılar</button>
      <button data-act="copy-quote" data-id="${q.id}" title="Kaynakla birlikte kopyala">📋</button>
      <button data-act="edit-quote" data-id="${q.id}">✏️ Düzenle</button>
    </div></article>`;
}

export function thoughtCard(t, { terms = null, shared = null } = {}) {
  const nb = t.notebookId ? DB.getNotebook(t.notebookId) : null;
  const parts = t.parts || [];
  const last = parts[parts.length - 1];
  const preview = parts.length ? parts[0].text : '';
  return `<article class="t-card s${t.stars || 0}">
    <a class="t-link" href="#/thought/${t.id}">
      <div class="t-title">💡 ${highlight(thoughtTitle(t), terms)}</div>
      ${preview.trim() && preview.trim() !== thoughtTitle(t) ? `<div class="t-prev">${highlight(preview.slice(0, 260), terms)}${preview.length > 260 ? '…' : ''}</div>` : ''}
    </a>
    <div class="q-ref">
      ${nb ? `<span class="badge nb">📓 ${esc(nb.name)}</span>` : ''}
      ${starsBadge(t.stars)}
      <span class="small">🕒 ${esc(fmtDateTime(last ? last.at : t.createdAt))}</span>
      ${parts.length > 1 ? `<span class="small">· ${parts.length} parça</span>` : ''}
    </div>
    ${t.tags && t.tags.length ? `<div class="q-ref">${t.tags.map((x) => `<a class="chip ${shared && shared.includes(x) ? 'sel' : ''}" href="#/tag/${encodeURIComponent(x)}">#${highlight(x, terms)}</a>`).join('')}</div>` : ''}
    </article>`;
}

/** Aynı etiketi taşıyan alıntılar (ve kilit açıksa düşünceler). Ortak etiketi çok olan üstte. */
export function openRelated(kind, id) {
  const src = kind === 'thought' ? DB.getThought(id) : DB.getQuote(id);
  if (!src) return;
  const tags = src.tags || [];
  let body = '';
  if (!tags.length) {
    body = `<div class="empty small"><div class="e">🏷️</div><h3>Bu kaydın etiketi yok</h3><p>Kayda “özgürlük”, “zaman” gibi konu etiketleri ekleyin. Aynı etiketi taşıyan alıntılar ve düşünceler burada birbirine bağlanır.</p>
      <button class="btn primary" data-act="${kind === 'thought' ? 'edit-thought-meta' : 'edit-quote'}" data-id="${id}">🏷️ Etiket ekle</button></div>`;
    openSheet({ title: '🔗 Bağlantılar', body });
    return;
  }
  const score = (x) => (x.tags || []).filter((t) => tags.includes(t));
  const items = [];
  DB.allQuotes().forEach((q) => { if (!(kind === 'quote' && q.id === id)) { const s = score(q); if (s.length) items.push({ type: 'quote', x: q, s }); } });
  const open = Lock.isOpen('thoughts');
  if (open) DB.thoughts().forEach((t) => { if (!(kind === 'thought' && t.id === id)) { const s = score(t); if (s.length) items.push({ type: 'thought', x: t, s }); } });
  items.sort((a, b) => b.s.length - a.s.length || (b.x.stars || 0) - (a.x.stars || 0) || (b.x.updatedAt || '').localeCompare(a.x.updatedAt || ''));
  body = `<p class="hint">Bu kaydın etiketleri: ${tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join(' ')}<br>Ortak etiketi daha çok olanlar üstte. Ortak etiketler koyu renkle gösterilir.</p>`;
  if (!open && Lock.enabled()) body += `<div class="banner sun small">🔒 Düşünceleriniz kilitli olduğu için listede yalnızca alıntılar var.</div>`;
  if (!items.length) body += `<p class="muted">Henüz aynı etiketle başka kayıt yok.</p>`;
  items.forEach(({ type, x, s }) => {
    body += `<div class="rel-head">${s.length > 1 ? `<b>${s.length} ortak etiket</b>` : '1 ortak etiket'}</div>`;
    body += type === 'quote' ? quoteCard(x, { showBook: true, shared: s }) : thoughtCard(x, { shared: s });
  });
  openSheet({ title: `🔗 Bağlantılar (${items.length})`, body });
}

/** Yıldız / tekrar filtresi çubuğu */
export function starFilterHtml(current, act = 'sfilter') {
  return `<div class="seg sfilter">${[['all', 'Hepsi'], ['1', '⭐+'], ['2', '⭐⭐+'], ['3', '⭐⭐⭐'], ['rr', '🔖']].map(([k, l]) => `<button class="${current === k ? 'on' : ''}" data-act="${act}" data-f="${k}" title="${k === 'rr' ? 'Tekrar okunacaklar' : k === 'all' ? 'Hepsi' : 'En az ' + k + ' yıldız'}">${l}</button>`).join('')}</div>`;
}
export function applyStarFilter(list, f) {
  if (!f || f === 'all') return list;
  if (f === 'rr') return list.filter((q) => q.reread && !q.reread.done);
  const n = parseInt(f, 10);
  return list.filter((q) => (q.stars || 0) >= n);
}

// ---- Etiket girişi ----
export function tagInputHtml(tags) {
  return `<div class="tag-input" data-tags>${tags.map((t) => `<button type="button" class="chip x" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}<input placeholder="etiket yazıp Enter’a basın" enterkeyhint="done"></div><div class="tag-sugg"></div>`;
}
export function bindTagInput(root, initial) {
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
