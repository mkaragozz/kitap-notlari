// Uygulama: hash yönlendirme (#/…), alt menü, ekranlar, ayarlar, güncelleme bildirimi.
import * as DB from './db.js?v=1.0';
import { $, esc, norm, fmtDateTime, toast, openSheet, download } from './ui.js?v=1.0';

const APP_VERSION = '1.0';
const APP_NAME = 'Uygulamam';
const view = $('#view');

// ---- Menü: telefonda altta, geniş ekranda solda (CSS) ----
const NAV = [
  { k: 'home', e: '🏠', l: 'Ana sayfa', h: '#/' },
  { k: 'search', e: '🔎', l: 'Ara', h: '#/search' },
  { k: 'settings', e: '⚙️', l: 'Ayarlar', h: '#/settings' },
];
function buildNav() {
  $('#nav').innerHTML = `<div class="nav-brand">📒 ${esc(APP_NAME)}</div>` +
    NAV.map((n) => `<a href="${n.h}" data-nav="${n.k}"><span class="ni">${n.e}</span><span>${n.l}</span></a>`).join('');
}

function route() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(qs || '');
  const key = parts[0] || 'home';
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === (key === 'note' ? 'home' : key)));
  try {
    if (!parts.length) renderHome();
    else if (parts[0] === 'note') renderNote(parts[1]);
    else if (parts[0] === 'search') renderSearch(params.get('q') || '');
    else if (parts[0] === 'settings') renderSettings();
    else renderHome();
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty"><div class="e">⚠️</div><h3>Bir sorun oluştu</h3><p class="small muted">${esc(e.message)}</p><a class="btn" href="#/">Ana sayfa</a></div>`;
  }
  window.scrollTo(0, 0);
}

// ---- Ekranlar ----
const card = (n) => `<a class="card note" href="#/note/${n.id}"><b>${esc(n.title || 'Başlıksız')}</b><p>${esc((n.text || '').slice(0, 160))}</p><small class="muted">🕒 ${fmtDateTime(n.updatedAt)}</small></a>`;

function renderHome() {
  const list = DB.notes();
  view.innerHTML = `<section class="hero"><h1>📒 ${esc(APP_NAME)}</h1>
      <form class="searchbar" id="home-search"><input name="q" placeholder="Ara…" enterkeyhint="search" autocomplete="off"><button>Ara</button></form></section>
    ${list.length ? list.map(card).join('') : `<div class="empty"><div class="e">📝</div><h3>Henüz not yok</h3><p>Sağ alttaki düğmeyle ilk notunuzu yazın.</p></div>`}
    <a class="fab" href="#/note/new">＋ Not</a>`;
  $('#home-search').onsubmit = (e) => { e.preventDefault(); location.hash = '#/search?q=' + encodeURIComponent(e.target.q.value.trim()); };
}

function renderNote(id) {
  const n = id === 'new' ? { title: '', text: '' } : DB.getNote(id);
  if (!n) { view.innerHTML = `<div class="empty"><h3>Not bulunamadı</h3><a class="btn" href="#/">Geri</a></div>`; return; }
  view.innerHTML = `<div class="topbar"><a class="back" href="#/" aria-label="Geri">‹</a><h1>${id === 'new' ? 'Yeni not' : 'Not'}</h1></div>
    <form id="note-form" class="card">
      <label class="field"><span>Başlık</span><input class="input" name="title" value="${esc(n.title)}"></label>
      <label class="field"><span>Not</span><textarea class="input" name="text" rows="10">${esc(n.text)}</textarea></label>
      <div class="row"><button class="btn primary">💾 Kaydet</button>${id !== 'new' ? '<button type="button" class="btn danger" id="del">🗑️ Sil</button>' : ''}</div>
    </form>`;
  // Dinleyiciler bu ekranın kendi elemanlarına bağlanır (kalıcı #view'a değil) → ziyaretler arasında birikmez
  $('#note-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await DB.save('notes', { ...n, title: f.title.value.trim(), text: f.text.value });
    toast('Kaydedildi'); location.hash = '#/';
  };
  const del = $('#del');
  if (del) del.onclick = async () => { if (confirm('Not silinsin mi?')) { await DB.remove('notes', n.id); toast('Silindi'); location.hash = '#/'; } };
}

function renderSearch(q) {
  const t = norm(q);
  const hits = t ? DB.notes().filter((n) => norm(n.title + ' ' + n.text).includes(t)) : [];
  view.innerHTML = `<div class="topbar"><h1>🔎 Ara</h1></div>
    <form class="searchbar boxed" id="s-form"><input name="q" value="${esc(q)}" placeholder="Ara…" autofocus><button>Ara</button></form>
    ${t ? (hits.length ? hits.map(card).join('') : '<p class="muted">Sonuç yok.</p>') : ''}`;
  $('#s-form').onsubmit = (e) => { e.preventDefault(); location.hash = '#/search?q=' + encodeURIComponent(e.target.q.value.trim()); };
}

function renderSettings() {
  const s = DB.getSettings();
  view.innerHTML = `<div class="topbar"><h1>⚙️ Ayarlar</h1></div>
    <div class="card"><b>💾 Yedekleme</b><p class="hint">Verileriniz yalnızca bu cihazda. Başka cihaza taşımak için yedek alıp orada içe aktarın; kayıtlar birleştirilir.
      ${s.lastBackup ? `Son yedek: ${fmtDateTime(s.lastBackup)}` : 'Henüz yedek alınmadı.'}</p>
      <div class="row"><button class="btn primary" id="bk">📤 Yedek al</button><label class="btn">📥 İçe aktar<input type="file" accept=".json,application/json" id="imp" hidden></label></div></div>
    <div class="card"><b>🎨 Görünüm</b><div class="row">${[['auto', 'Otomatik'], ['light', 'Açık'], ['dark', 'Koyu']].map(([k, l]) => `<button class="btn ${s.theme === k ? 'primary' : ''}" data-theme="${k}">${l}</button>`).join('')}</div></div>
    <div class="card"><b>📲 Uygulama olarak yükle</b><p class="hint">Android/Chrome: ⋮ → Uygulamayı yükle · iPhone/Safari: Paylaş → Ana Ekrana Ekle · Bilgisayar: adres çubuğunda ⊕ Yükle.</p></div>
    <p class="hint center"><a href="privacy.html">Gizlilik politikası</a> · ${esc(APP_NAME)} · sürüm ${APP_VERSION}</p>`;
  $('#bk').onclick = async () => {
    download(`${DB.APP_ID}-yedek-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(DB.exportBackup()));
    await DB.setSettings({ lastBackup: new Date().toISOString() }); renderSettings();
  };
  $('#imp').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const st = await DB.importBackup(JSON.parse(await f.text())); toast(`İçe aktarıldı: ${st.added} yeni, ${st.updated} güncellendi`); }
    catch (err) { toast('⚠️ ' + err.message); }
  };
  view.querySelectorAll('[data-theme]').forEach((b) => { b.onclick = async () => { await DB.setSettings({ theme: b.dataset.theme }); applyTheme(); renderSettings(); }; });
}

function applyTheme() {
  const t = DB.getSettings().theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
}

// ---- Service worker: yeni sürüm hemen devreye girer, sayfa bir kez yenilenir ve bildirim gösterilir ----
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const had = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || reloaded) return;
    reloaded = true;
    sessionStorage.setItem('justUpdated', '1');
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => { setInterval(() => reg.update(), 60 * 60 * 1000); });
}

// ---- Açılış ----
(async () => {
  await DB.init();
  // Tek seferlik göçler (eski kurulumların verisini/ayarını değiştirmek için) buraya:
  // if (!DB.getSettings().flag11) { ...; await DB.setSettings({ flag11: true }); }
  applyTheme();
  buildNav();
  window.addEventListener('hashchange', route);
  route();
  window.__appStarted = true; // index.html'deki açılış bekçisi bunu bekler
  if (sessionStorage.getItem('justUpdated')) { sessionStorage.removeItem('justUpdated'); toast(`✨ Uygulama güncellendi (sürüm ${APP_VERSION})`); }
  registerSW();
})();
