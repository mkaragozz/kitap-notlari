// Ortak arayüz yardımcıları: seçiciler, bildirim, alt sayfa (modal), tarih biçimleri, dosya seçme.

/** Resim adresi: yalnızca data:image, blob: ve https: kabul edilir, HTML özniteliği için kaçışlanır. */
export const safeSrc = (u) => { const s = String(u || '').trim(); return /^(data:image\/[a-z+.-]+;base64,|blob:|https:\/\/)/i.test(s) ? esc(s) : ''; };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const view = $('#view');
const modalRoot = $('#modal-root');

// ---- Yönlendirme kancaları (app.js doldurur) ----
export const nav = { go: (h) => { location.hash = h; }, rerender: () => {} };
export const go = (h) => nav.go(h);
export const rerender = () => nav.rerender();

// ---- Tarih / saat ----
const pad = (n) => String(n).padStart(2, '0');
export function localDate(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function today() { return localDate(new Date()); }
export function fmtDate(s) { if (!s) return ''; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}.${m}.${y}`; }
export function fmtTime(iso) { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function fmtDateTime(iso) { if (!iso) return ''; const d = new Date(iso); return `${fmtDate(localDate(d))} · ${fmtTime(iso)}`; }
export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function longDate(s) { const d = parseDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`; }
export function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return localDate(d); }

// ---- Metin ----
export function norm(s) {
  return String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }[c]));
}
export function highlight(text, terms) {
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

// ---- Bildirim ----
let toastTimer;
export function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ---- Dosyalar ve görseller ----
export function pickFiles({ accept = 'image/*', multiple = false, capture = false } = {}) {
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
export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Görsel açılamadı')); };
    img.src = url;
  });
}
export async function fileToDataUrl(blob, maxSide = 360, quality = 0.82) {
  const img = await loadImage(blob);
  const s = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
export function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
export async function copyText(s) {
  try { await navigator.clipboard.writeText(s); toast('Panoya kopyalandı'); }
  catch (e) { prompt('Kopyalayın:', s); }
}

// ---- Alt sayfa (modal) ----
export const modal = { open: false };
let modalOnClose = null;
let modalLocked = false;

export function openSheet({ title, body, foot = '', onClose = null, locked = false, wide = false, full = false }) {
  if (!modal.open) { try { history.pushState({ kn: 'modal' }, ''); } catch (e) { /* yok say */ } }
  else if (modalOnClose) { const prev = modalOnClose; modalOnClose = null; prev(); }
  modal.open = true; modalOnClose = onClose; modalLocked = locked;
  modalRoot.innerHTML = `<div class="modal-bg${full ? ' full' : ''}"><div class="sheet${wide ? ' wide' : ''}${full ? ' full' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><h3>${esc(title)}</h3>${locked ? '' : '<button class="x" data-act="close-sheet" aria-label="Kapat">✕</button>'}</div>
    <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div></div>`;
  const sheet = $('.sheet', modalRoot);
  $('.modal-bg', modalRoot).addEventListener('click', (e) => { if (e.target.classList.contains('modal-bg') && !modalLocked) closeSheet(); });
  return sheet;
}
function dropSheet() {
  modal.open = false; modalLocked = false;
  modalRoot.innerHTML = '';
  const cb = modalOnClose; modalOnClose = null;
  if (cb) cb();
}
export function closeSheet() {
  return new Promise((resolve) => {
    if (!modal.open) return resolve();
    dropSheet();
    if (history.state && history.state.kn === 'modal') {
      const h = () => { window.removeEventListener('popstate', h); resolve(); };
      window.addEventListener('popstate', h);
      history.back();
    } else resolve();
  });
}
window.addEventListener('popstate', () => { if (modal.open) dropSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.open && !modalLocked) closeSheet(); });

export function confirmDialog(msg, okLabel = 'Evet', danger = true) {
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

// ---- Yıldız (önem derecesi) ----
export const STAR_LABELS = ['Normal', 'Önemli', 'Çok önemli', 'Müthiş tespit'];
export function starsBadge(n) {
  n = n || 0;
  return n ? `<span class="badge stars-b s${n}" title="${STAR_LABELS[n]}">${'⭐'.repeat(n)}</span>` : '';
}
export function starPickerHtml(n, id = 'star-pick') {
  n = n || 0;
  return `<div class="star-pick" id="${id}" data-val="${n}">
    ${[1, 2, 3].map((i) => `<button type="button" class="${n >= i ? 'on' : ''}" data-s="${i}" aria-label="${STAR_LABELS[i]}">⭐</button>`).join('')}
    <span class="star-label">${STAR_LABELS[n]}</span></div>`;
}
export function bindStarPicker(root, id = 'star-pick') {
  const box = $('#' + id, root);
  const paint = () => {
    const v = parseInt(box.dataset.val, 10) || 0;
    $$('[data-s]', box).forEach((b) => b.classList.toggle('on', v >= parseInt(b.dataset.s, 10)));
    $('.star-label', box).textContent = STAR_LABELS[v];
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = parseInt(b.dataset.s, 10);
    box.dataset.val = String((parseInt(box.dataset.val, 10) || 0) === s ? 0 : s);
    paint();
  });
  return { get: () => parseInt(box.dataset.val, 10) || 0 };
}
