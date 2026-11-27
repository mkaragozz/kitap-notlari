// ✍️ Blog: yazılarınızı yazıp kaydettiğiniz, arşivlediğiniz kişisel blog (internette yayınlanmaz).
// Başlık, biçimlendirme (kalın, italik, ara başlık, liste, alıntı, bağlantı), kapak fotoğrafı, kategori, etiket,
// taslak / tamamlandı durumu, yazma ve düzenleme tarihi, ay-yıl arşivi; kopyalama, Word ve PDF.
import * as DB from './db.js?v=3.5';
import * as EX from './export.js?v=3.5';
import * as Lock from './lock.js?v=3.5';
import { $, esc, view, toast, confirmDialog, rerender, go, norm, fmtDateTime, fmtDate, MONTHS, pickFiles, fileToDataUrl, copyText, highlight, safeSrc } from './ui.js?v=3.5';

const state = { status: 'all', cat: 'all', q: '' };
const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A']);

// Güvenlik: HTML "etkisiz" bir belgede çözülür (resim yüklenmez, olay işleyicisi çalışmaz).
// Yedekten gelen yazılar da her gösterimde bu süzgeçten geçer.
const INERT = document.implementation.createHTMLDocument('');
export function cleanHtml(html) {
  const d = INERT.createElement('div'); d.innerHTML = html || '';
  const walk = (el) => [...el.children].forEach((c) => {
    let tag = c.tagName.toUpperCase();
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'LINK'].includes(tag)) { c.remove(); return; }
    if (tag === 'DIV') { const p = INERT.createElement('p'); while (c.firstChild) p.appendChild(c.firstChild); c.replaceWith(p); walk(el); return; }
    if (tag === 'H1') { const h = INERT.createElement('h2'); while (c.firstChild) h.appendChild(c.firstChild); c.replaceWith(h); tag = 'H2'; walk(el); return; }
    if (!ALLOWED.has(tag)) { const f = document.createDocumentFragment(); while (c.firstChild) f.appendChild(c.firstChild); c.replaceWith(f); walk(el); return; }
    [...c.attributes].forEach((a) => { if (!(tag === 'A' && a.name === 'href')) c.removeAttribute(a.name); });
    if (tag === 'A') { const h = c.getAttribute('href') || ''; if (!/^https?:|^mailto:/i.test(h)) c.removeAttribute('href'); else { c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); } }
    walk(c);
  });
  walk(d);
  return d.innerHTML.replace(/<p><br><\/p>$/g, '').trim();
}
const plain = (html) => { const d = INERT.createElement('div'); d.innerHTML = html || ''; return (d.innerText || d.textContent || '').trim(); };
const words = (html) => (plain(html).match(/\S+/g) || []).length;
const postDate = (p) => p.createdAt || p.updatedAt || '';
function lockBtn() { return Lock.enabled() && Lock.isLockedSection('blog') ? '<button class="btn sm ghost" data-act="lock-now" title="Kilitle">🔒</button>' : ''; }

function postCard(p, terms) {
  const ex = plain(p.body).slice(0, 180);
  return `<a class="post-card" href="#/post/${p.id}">
    ${p.cover ? `<div class="pc-cover"><img src="${esc(p.cover)}" alt=""></div>` : ''}
    <div class="pc-body"><div class="t-title">${highlight(p.title || 'Başlıksız yazı', terms)}</div>
      ${ex ? `<div class="t-prev">${highlight(ex, terms)}${plain(p.body).length > 180 ? '…' : ''}</div>` : ''}
      <div class="q-ref">${p.status === 'draft' ? '<span class="badge draft">📝 Taslak</span>' : '<span class="badge done">✅ Tamamlandı</span>'}
        ${p.category ? `<span class="badge nb">📁 ${esc(p.category)}</span>` : ''}<span class="small">🕒 ${esc(fmtDate(postDate(p)))}</span><span class="small muted">${words(p.body)} kelime</span></div></div></a>`;
}

export function renderBlog() {
  if (!Lock.isOpen('blog')) { Lock.renderLockScreen(view, 'Blog'); return; }
  const all = DB.posts();
  const cats = [...new Set(all.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  let list = all;
  if (state.status !== 'all') list = list.filter((p) => (p.status || 'draft') === state.status);
  if (state.cat !== 'all') list = list.filter((p) => p.category === state.cat);
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  if (terms.length) list = list.filter((p) => { const h = norm([p.title, plain(p.body), p.category, (p.tags || []).join(' ')].join(' ')); return terms.every((t) => h.includes(t)); });
  list = [...list].sort((a, b) => postDate(b).localeCompare(postDate(a)));
  const drafts = all.filter((p) => (p.status || 'draft') === 'draft').length;
  let h = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>✍️ Blog</h1>${lockBtn()}</div>`;
  if (all.length) {
    h += `<div class="seg read-seg">${[['all', `Hepsi (${all.length})`], ['draft', `📝 Taslaklar (${drafts})`], ['done', `✅ Tamamlanan (${all.length - drafts})`]].map(([k, l]) => `<button class="${state.status === k ? 'on' : ''}" data-act="blog-status" data-s="${k}">${l}</button>`).join('')}</div>
      <input class="input" id="blog-q" placeholder="Yazılarda ara…" value="${esc(state.q)}" style="margin:10px 0">
      ${cats.length ? `<div class="nb-row">${[['all', 'Tüm kategoriler'], ...cats.map((c) => [c, '📁 ' + c])].map(([k, l]) => `<button class="nb-chip ${state.cat === k ? 'on' : ''}" data-act="blog-cat" data-c="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}`;
  }
  if (!all.length) h += `<div class="empty"><div class="e">✍️</div><h3>Henüz blog yazınız yok</h3><p>Yazılarınızı burada yazın, taslak olarak saklayın, tamamlayınca arşivleyin. Yazılar yalnızca bu cihazda durur; istediğiniz yerde yayınlamak için kopyalayabilir ya da Word/PDF olarak alabilirsiniz.</p><a class="btn primary" href="#/new-post">✍️ İlk yazımı yaz</a></div>`;
  else if (!list.length) h += `<p class="muted">Bu süzgeçte yazı yok.</p>`;
  else {
    // Arşiv: yıl → ay
    let curY = null, curM = null;
    list.forEach((p) => {
      const d = new Date(postDate(p)); const y = d.getFullYear(), m = d.getMonth();
      if (y !== curY) { h += `<div class="section-title">📅 ${y} <span class="count">${list.filter((x) => new Date(postDate(x)).getFullYear() === y).length}</span></div>`; curY = y; curM = null; }
      if (m !== curM) { h += `<div class="group-head">${MONTHS[m]}</div>`; curM = m; }
      h += postCard(p, terms);
    });
  }
  h += `<a class="fab" href="#/new-post">✍️ Yeni yazı</a>`;
  view.innerHTML = h;
  const q = $('#blog-q');
  if (q) q.oninput = () => { state.q = q.value; const pos = q.selectionStart; renderBlog(); const g = $('#blog-q'); g.focus(); g.setSelectionRange(pos, pos); };
}

export function renderPost(id) {
  if (!Lock.isOpen('blog')) { Lock.renderLockScreen(view, 'Blog'); return; }
  const p = DB.getPost(id);
  if (!p) { view.innerHTML = `<div class="empty"><div class="e">🔍</div><h3>Yazı bulunamadı</h3><a class="btn" href="#/blog">Bloga dön</a></div>`; return; }
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1></h1>${lockBtn()}<a class="btn sm" href="#/post/${p.id}/edit">✏️ Düzenle</a></div>
    <article class="post-view card">
      ${p.cover ? `<img class="pv-cover" src="${esc(p.cover)}" alt="">` : ''}
      <h1 class="pv-title">${esc(p.title || 'Başlıksız yazı')}</h1>
      <div class="q-ref">${p.status === 'draft' ? '<span class="badge draft">📝 Taslak</span>' : '<span class="badge done">✅ Tamamlandı</span>'}${p.category ? `<span class="badge nb">📁 ${esc(p.category)}</span>` : ''}
        <span class="small">🕒 Yazılış: ${esc(fmtDateTime(p.createdAt))}</span>${p.editedAt ? `<span class="small muted">· Düzenleme: ${esc(fmtDateTime(p.editedAt))}</span>` : ''}<span class="small muted">· ${words(p.body)} kelime</span></div>
      ${(p.tags || []).length ? `<div class="q-ref">${p.tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="pv-body">${cleanHtml(p.body) || '<p class="muted">Boş yazı</p>'}</div>
    </article>
    <div class="row-actions">
      <button class="btn" data-act="post-copy" data-id="${p.id}" style="flex:1">📋 Metni kopyala</button>
      <button class="btn" data-act="post-copyhtml" data-id="${p.id}" style="flex:1">🌐 HTML kopyala</button></div>
    <div class="row-actions">
      <button class="btn" data-act="post-word" data-id="${p.id}" style="flex:1">📝 Word</button>
      <button class="btn" data-act="post-pdf" data-id="${p.id}" style="flex:1">🖨️ PDF / Yazdır</button>
      <button class="btn danger" data-act="post-del" data-id="${p.id}">🗑️</button></div>
    <p class="hint">“HTML kopyala” ile yazıyı biçimlendirmesiyle birlikte Blogger, WordPress, Medium gibi bir siteye yapıştırabilirsiniz.</p>`;
}

export function renderPostEditor(id) {
  if (!Lock.isOpen('blog')) { Lock.renderLockScreen(view, 'Blog'); return; }
  const p = id ? { ...DB.getPost(id) } : { title: '', body: '', status: 'draft', category: '', tags: [], cover: '' };
  if (id && !p.id) { go('#/blog'); return; }
  const cats = [...new Set(DB.posts().map((x) => x.category).filter(Boolean))];
  view.innerHTML = `<div id="pe-page"><div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>${id ? 'Yazıyı düzenle' : '✍️ Yeni yazı'}</h1></div>
    <div class="card post-edit">
      <input class="pe-title" id="pe-title" placeholder="Başlık" value="${esc(p.title)}" maxlength="200">
      <div class="pe-tools" id="pe-tools">
        <button type="button" data-cmd="bold" title="Kalın"><b>K</b></button><button type="button" data-cmd="italic" title="İtalik"><i>İ</i></button><button type="button" data-cmd="underline" title="Altı çizili"><u>A</u></button>
        <button type="button" data-cmd="h2" title="Ara başlık">H2</button><button type="button" data-cmd="h3" title="Küçük başlık">H3</button><button type="button" data-cmd="p" title="Normal paragraf">¶</button>
        <button type="button" data-cmd="insertUnorderedList" title="Madde işaretli liste">•</button><button type="button" data-cmd="insertOrderedList" title="Numaralı liste">1.</button>
        <button type="button" data-cmd="quote" title="Alıntı">❝</button><button type="button" data-cmd="link" title="Bağlantı">🔗</button>
        <button type="button" data-cmd="removeFormat" title="Biçimi temizle">⌫</button><button type="button" data-cmd="undo" title="Geri al">↶</button></div>
      <div class="pe-body" id="pe-body" contenteditable="true" data-ph="Yazmaya başlayın…">${cleanHtml(p.body)}</div>
      <div class="small muted" id="pe-count"></div>
    </div>
    <div class="card">
      <div class="field"><span>Kapak fotoğrafı</span><div id="pe-cover">${p.cover ? `<img src="${esc(p.cover)}" class="pe-cover-img" alt="">` : ''}</div>
        <div class="row-actions"><button type="button" class="btn sm" data-x="cover">🖼️ Seç</button>${p.cover ? '<button type="button" class="btn sm ghost" data-x="nocover">Kaldır</button>' : ''}</div></div>
      <label class="field"><span>Kategori</span><input id="pe-cat" list="pe-cats" value="${esc(p.category)}" placeholder="ör. Kitap yorumları, Gezi, Denemeler"><datalist id="pe-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
      <label class="field"><span>Etiketler (virgülle ayırın)</span><input id="pe-tags" value="${esc((p.tags || []).join(', '))}" placeholder="ör. okuma, düşünce"></label>
    </div>
    <div class="row-actions"><button class="btn" data-x="draft" style="flex:1">📝 Taslak olarak kaydet</button><button class="btn primary" data-x="done" style="flex:1">✅ Tamamlandı olarak kaydet</button></div>
    ${id ? `<p class="hint">Yazılış: ${esc(fmtDateTime(p.createdAt))}${p.editedAt ? ` · Son düzenleme: ${esc(fmtDateTime(p.editedAt))}` : ''}</p>` : ''}</div>`;
  const body = $('#pe-body'), count = $('#pe-count');
  const upd = () => { count.textContent = `${words(body.innerHTML)} kelime`; };
  upd(); body.addEventListener('input', upd);
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* yok */ }
  $('#pe-tools').addEventListener('mousedown', (e) => e.preventDefault());
  $('#pe-tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]'); if (!b) return;
    body.focus();
    const c = b.dataset.cmd;
    if (c === 'h2' || c === 'h3' || c === 'p') document.execCommand('formatBlock', false, c.toUpperCase());
    else if (c === 'quote') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
    else if (c === 'link') { const u = prompt('Bağlantı adresi (https://…):', 'https://'); if (u && /^https?:\/\//.test(u)) document.execCommand('createLink', false, u); }
    else document.execCommand(c, false, null);
    upd();
  });
  let cover = p.cover || '';
  $('#pe-page').addEventListener('click', async (e) => {
    const x = e.target.closest('[data-x]'); if (!x) return;
    if (x.dataset.x === 'cover') { const [f] = await pickFiles(); if (f) { cover = await fileToDataUrl(f, 1200, 0.82); $('#pe-cover').innerHTML = `<img src="${cover}" class="pe-cover-img" alt="">`; } }
    if (x.dataset.x === 'nocover') { cover = ''; $('#pe-cover').innerHTML = ''; x.remove(); }
    if (x.dataset.x === 'draft' || x.dataset.x === 'done') {
      const title = $('#pe-title').value.trim(), html = cleanHtml(body.innerHTML);
      if (!title && !plain(html)) { toast('Başlık ya da yazı yazın'); return; }
      const changed = !id || title !== p.title || html !== p.body;
      Object.assign(p, { title, body: html, status: x.dataset.x, cover, category: $('#pe-cat').value.trim(), tags: $('#pe-tags').value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean) });
      if (id && changed) p.editedAt = new Date().toISOString();
      const saved = await DB.save('posts', p);
      toast(x.dataset.x === 'draft' ? 'Taslak kaydedildi 📝' : 'Yazı kaydedildi ✅');
      location.replace('#/post/' + saved.id);
    }
  });
  if (!id) setTimeout(() => $('#pe-title').focus(), 100);
}

function postHtmlDoc(p) {
  return `<article class="print-doc">${p.cover ? `<img src="${safeSrc(p.cover)}" style="max-width:100%;border-radius:6pt" alt="">` : ''}<h1>${esc(p.title || 'Başlıksız yazı')}</h1>
    <p class="pd-meta">${esc(fmtDate(p.createdAt))}${p.category ? ' · ' + esc(p.category) : ''}${(p.tags || []).length ? ' · ' + p.tags.map((t) => '#' + esc(t)).join(' ') : ''}</p><div>${cleanHtml(p.body)}</div></article>`;
}
export const BLOG_ACTIONS = {
  'blog-status': (el) => { state.status = el.dataset.s; rerender(); },
  'blog-cat': (el) => { state.cat = el.dataset.c; rerender(); },
  'post-copy': (el) => { const p = DB.getPost(el.dataset.id); copyText(`${p.title}\n\n${plain(p.body)}`); },
  'post-copyhtml': async (el) => {
    const p = DB.getPost(el.dataset.id);
    const html = `<h1>${esc(p.title)}</h1>${cleanHtml(p.body)}`;
    try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([`${p.title}\n\n${plain(p.body)}`], { type: 'text/plain' }) })]); toast('Biçimli olarak kopyalandı'); }
    catch (e) { copyText(html); }
  },
  'post-word': async (el) => {
    const p = DB.getPost(el.dataset.id);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(p.title)}</title></head><body style="font-family:Calibri,sans-serif">${p.cover ? `<img src="${safeSrc(p.cover)}" width="600">` : ''}<h1>${esc(p.title)}</h1><p style="color:#666">${esc(fmtDate(p.createdAt))}${p.category ? ' · ' + esc(p.category) : ''}</p>${cleanHtml(p.body)}</body></html>`;
    const r = await EX.saveFile(new Blob(['﻿', html], { type: 'application/msword' }), `${EX.safeName(p.title || 'blog-yazisi')}.doc`);
    if (r !== 'cancelled') toast('Word dosyası hazır ✓');
  },
  'post-pdf': (el) => EX.printHtml(postHtmlDoc(DB.getPost(el.dataset.id))),
  'post-del': async (el) => {
    if (!(await confirmDialog('Bu blog yazısı silinsin mi?', 'Sil'))) return;
    await DB.remove('posts', el.dataset.id); toast('Yazı silindi'); location.replace('#/blog');
  },
};
export const postPlain = plain;
