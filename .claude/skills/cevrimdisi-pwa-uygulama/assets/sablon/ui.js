// Küçük ortak yardımcılar
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Resim adresi: yalnızca data:image, blob: ve https: kabul edilir, HTML özniteliği için kaçışlanır. */
export const safeSrc = (u) => { const s = String(u || '').trim(); return /^(data:image\/[a-z+.-]+;base64,|blob:|https:\/\/)/i.test(s) ? esc(s) : ''; };
export const norm = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

let toastT;
export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/** Alttan açılan sayfa (telefonda), ortada pencere (masaüstünde). */
export function openSheet({ title, body, onOpen }) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><b>${esc(title)}</b><button class="x" aria-label="Kapat">✕</button></div><div class="sheet-body">${body}</div></div></div>`;
  const close = () => { root.innerHTML = ''; };
  $('.x', root).onclick = close;
  $('.sheet-bg', root).onclick = (e) => { if (e.target.classList.contains('sheet-bg')) close(); };
  if (onOpen) onOpen($('.sheet', root), close);
  return close;
}

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
