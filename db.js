// Yerel veritabanı (IndexedDB) + bellek içi önbellek.
// Silinen kayıtlar "deleted: true" olarak işaretlenir; böylece telefon ↔ bilgisayar
// aktarımında silme işlemleri de doğru şekilde birleştirilir.
//
// Depolar:
//   books     : kitaplar
//   quotes    : alıntılar (alıntı metni + yorum, sayfa, etiket, yıldız, tekrar okuma)
//   thoughts  : kitaplardan bağımsız düşünceler (parçalar halinde, her parça tarih-saatli)
//   notebooks : düşünce defterleri
//   moments   : günlük anları (gün, saat, başlık türü, metin, fotoğraflar)
//   days      : günlük gün bilgisi (ruh hâli). id = 'YYYY-MM-DD'
//   prompts   : günlük başlıkları (kendi eklediğiniz başlıklar + hazır başlıklarda yaptığınız değişiklikler)
//   nbooks    : not defterleri (Genel Notlar, Özel Notlar + kullanıcının ekledikleri)
//   notes     : notlar (başlık, metin; oluşturma ve düzenleme tarih-saati)
//   shopcats  : alışveriş listesi kategorileri (Market, Eczane…)
//   shopitems : alışveriş listesi maddeleri (işaretlenebilir)
//   isbnmemo  : elle girilen kitap bilgilerinin ISBN hafızası (aynı ISBN tekrar okutulunca doldurmak için)
//   topics    : kitap ve makalelerde ortak konu başlıkları
//   pagemarks : okuyucuda sayfa işaretleri ("tekrar oku") ve sayfa yorumları
//   posts     : blog yazıları
//   readlog   : okuyucuda geçirilen süre ve çevrilen sayfa (gün + kitap başına), Raporlar için
//   files     : e-kitap / makale dosyaları (PDF, Word, TXT, EPUB). Büyük olduğu için belleğe alınmaz,
//               normal yedeğe girmez (Ayarlar'da "E-kitapları da yedekle" seçeneği vardır).
//
// "books" deposunda kitaplar ve makaleler birlikte durur: makalelerde kind === 'article'.
// Kitap işaretleri: owned (Kütüphanemde), wish (Satın alınacak), favorite (Seçkin), private (Özel),
// status (okunuyor / okunacak / bitti = okudum), topics [konu id], toReadOrder, wishOrder, listStars.

const DB_NAME = 'kitap-notlari';
const DB_VERSION = 6;
export const STORES = ['books', 'quotes', 'thoughts', 'notebooks', 'moments', 'days', 'prompts', 'nbooks', 'notes', 'shopcats', 'shopitems', 'isbnmemo', 'topics', 'pagemarks', 'posts', 'readlog'];
const FILE_STORE = 'files';
let dbPromise = null;

export const S = Object.fromEntries(STORES.map((s) => [s, new Map()]));

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      [...STORES, FILE_STORE].forEach((name) => { if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: 'id' }); });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getAll(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const r = d.transaction(store, 'readonly').objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

async function putMany(store, items) {
  if (!items.length) return;
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    items.forEach((it) => s.put(it));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function clearStore(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, 'readwrite');
    t.objectStore(store).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export function uid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ---- Eski kayıtları yeni yapıya çevirme ----
// Eski sürümde alıntıların türü vardı (alıntı / not / tekrar okunacak) ve "favori" işareti vardı.
// Yeni yapıda tek tür kayıt var: alıntı metni + yorum; önem derecesi 0–3 yıldız.
export function migrateQuote(q) {
  if (!q || q.deleted) return false;
  let changed = false;
  if ('kind' in q) {
    if (q.kind === 'not') {
      const own = String(q.text || '').trim();
      const prev = String(q.comment || '').trim();
      q.comment = [own, prev].filter(Boolean).join('\n\n');
      q.text = '';
    }
    if (q.kind === 'tekrar' && !q.reread) q.reread = { due: '', done: false };
    delete q.kind;
    changed = true;
  }
  if ('favorite' in q) {
    if (q.favorite && !q.stars) q.stars = 3;
    delete q.favorite;
    changed = true;
  }
  if (q.stars == null) { q.stars = 0; changed = true; }
  return changed;
}

export async function load() {
  const all = await Promise.all(STORES.map((s) => getAll(s)));
  STORES.forEach((s, i) => { S[s] = new Map(all[i].map((x) => [x.id, x])); });
  const migrated = [...S.quotes.values()].filter((q) => migrateQuote(q));
  if (migrated.length) await putMany('quotes', migrated);
  await ensureSeeds();
}

// Hazır not defterleri: sabit kimlikli, böylece iki cihazın yedeği birleşince çift olmazlar.
export const NB_GENERAL = 'nb-general';
export const NB_PRIVATE = 'nb-private';
async function ensureSeeds() {
  const seeds = [
    { id: NB_GENERAL, name: 'Genel Notlar', emoji: '📒', builtin: true, order: 0 },
    { id: NB_PRIVATE, name: 'Özel Notlar', emoji: '🔐', builtin: true, order: 1 },
  ];
  const put = [];
  const old = '2000-01-01T00:00:00.000Z'; // yedekten gelen (adı değişmiş) kopya her zaman kazansın
  seeds.forEach((x) => { if (!S.nbooks.has(x.id)) { const r = { ...x, createdAt: old, updatedAt: old }; S.nbooks.set(x.id, r); put.push(r); } });
  await putMany('nbooks', put);
}

const live = (store) => [...S[store].values()].filter((x) => !x.deleted);

// ---- Görünürlük: Özel Kitaplar kilitliyken gizlenir (app.js bağlar) ----
export const visibility = { hidePrivate: (b) => false }; // eslint-disable-line no-unused-vars
const visible = (b) => b && !b.deleted && !(b.private && visibility.hidePrivate(b));

// ---- Kitaplar, makaleler ve alıntılar ----
/** Görünür kitaplar (makaleler hariç) */
export function books() { return live('books').filter((b) => b.kind !== 'article' && visible(b)); }
/** Görünür makaleler */
export function articles() { return live('books').filter((b) => b.kind === 'article' && visible(b)); }
export function getBook(id) { const b = S.books.get(id); return visible(b) ? b : null; }
/** Gizli (özel) olsa bile kaydı döner */
export function getBookRaw(id) { const b = S.books.get(id); return b && !b.deleted ? b : null; }
export function allQuotes() { return live('quotes').filter((q) => getBook(q.bookId)); }
export function quotesOf(bookId) { return allQuotes().filter((q) => q.bookId === bookId); }
export function getQuote(id) { const q = S.quotes.get(id); return q && !q.deleted ? q : null; }

// ---- Düşünceler, defterler, günlük ----
export function thoughts() { return live('thoughts'); }
export function getThought(id) { const t = S.thoughts.get(id); return t && !t.deleted ? t : null; }
export function notebooks() { return live('notebooks').sort((a, b) => a.name.localeCompare(b.name, 'tr')); }
export function getNotebook(id) { const n = S.notebooks.get(id); return n && !n.deleted ? n : null; }
export function moments() { return live('moments'); }
export function momentsOn(date) { return moments().filter((m) => m.date === date).sort((a, b) => (a.at || '').localeCompare(b.at || '')); }
export function getMoment(id) { const m = S.moments.get(id); return m && !m.deleted ? m : null; }
export function promptRecords() { return live('prompts'); }
// ---- Not defteri ----
export function nbooks() { return live('nbooks').sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.createdAt || '').localeCompare(b.createdAt || '')); }
export function getNbook(id) { const n = S.nbooks.get(id); return n && !n.deleted ? n : null; }
export function notesOf(nbId) { return live('notes').filter((n) => n.nbId === nbId); }
export function allNotes() { return live('notes').filter((n) => getNbook(n.nbId)); }
export function getNote(id) { const n = S.notes.get(id); return n && !n.deleted ? n : null; }
export function shopcats() { return live('shopcats').sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.createdAt || '').localeCompare(b.createdAt || '')); }
export function shopitems() { return live('shopitems'); }
export function getIsbnMemo(isbn) { const m = S.isbnmemo.get(isbn); return m && !m.deleted ? m : null; }
export function topics() { return live('topics').sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name, 'tr')); }
export function getTopic(id) { const t = S.topics.get(id); return t && !t.deleted ? t : null; }
export function pagemarksOf(bookId) { return live('pagemarks').filter((m) => m.bookId === bookId); }
export function allPagemarks() { return live('pagemarks').filter((m) => getBook(m.bookId)); }
export function posts() { return live('posts'); }
/** Okuma süresi kaydı: { id: 'YYYY-MM-DD_kitapId', date, bookId, minutes, pages } */
export function readlog() { return live('readlog'); }
export function getPost(id) { const p = S.posts.get(id); return p && !p.deleted ? p : null; }
export function getDay(date) { const d = S.days.get(date); return d && !d.deleted ? d : null; }

// ---- Genel kaydetme / silme ----
export async function save(store, obj) {
  const now = new Date().toISOString();
  if (!obj.id) obj.id = uid();
  if (!obj.createdAt) obj.createdAt = now;
  obj.updatedAt = now;
  S[store].set(obj.id, obj);
  await putMany(store, [obj]);
  requestPersist();
  return obj;
}

export async function remove(store, id, keep = []) {
  const x = S[store].get(id);
  if (!x) return;
  // Kaydın içeriğini temizle, sadece silindi işaretini tut
  const tomb = { id: x.id, deleted: true, createdAt: x.createdAt, updatedAt: new Date().toISOString() };
  keep.forEach((k) => { if (k in x) tomb[k] = x[k]; });
  S[store].set(id, tomb);
  await putMany(store, [tomb]);
}

export const saveBook = (b) => save('books', b);
export const saveQuote = (q) => save('quotes', q);
export const deleteQuote = (id) => remove('quotes', id, ['bookId']);

export async function deleteBook(id) {
  const b = S.books.get(id);
  if (!b) return;
  const now = new Date().toISOString();
  const qs = [...S.quotes.values()].filter((q) => q.bookId === id && !q.deleted)
    .map((q) => ({ id: q.id, bookId: q.bookId, deleted: true, createdAt: q.createdAt, updatedAt: now }));
  qs.forEach((q) => S.quotes.set(q.id, q));
  const pms = [...S.pagemarks.values()].filter((m) => m.bookId === id && !m.deleted)
    .map((m) => ({ id: m.id, bookId: id, deleted: true, createdAt: m.createdAt, updatedAt: now }));
  pms.forEach((m) => S.pagemarks.set(m.id, m));
  if (b.fileId) await deleteFile(b.fileId);
  await remove('books', id);
  await putMany('quotes', qs);
  await putMany('pagemarks', pms);
}

// ---- Dosyalar (e-kitap / makale) ----
export async function putFile(rec) {
  // rec: { id?, name, type, size, blob }
  if (!rec.id) rec.id = uid();
  rec.updatedAt = new Date().toISOString();
  await putMany(FILE_STORE, [rec]);
  requestPersist();
  return rec;
}
export async function getFile(id) {
  if (!id) return null;
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const r = d.transaction(FILE_STORE, 'readonly').objectStore(FILE_STORE).get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
export async function deleteFile(id) {
  const d = await openDB();
  return new Promise((resolve) => {
    const t = d.transaction(FILE_STORE, 'readwrite');
    t.objectStore(FILE_STORE).delete(id);
    t.oncomplete = () => resolve(); t.onerror = () => resolve();
  });
}
export async function allFiles() { return getAll(FILE_STORE); }
const blobToB64 = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
function b64ToBlob(b64, type) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: type || 'application/octet-stream' }); }

// ---- Yedekleme / aktarım ----
export async function exportBackup({ withFiles = false } = {}) {
  const out = { app: 'kitap-notlari', version: 3, exportedAt: new Date().toISOString() };
  STORES.forEach((s) => { out[s] = [...S[s].values()]; });
  if (withFiles) {
    const files = await allFiles();
    out.files = [];
    for (const f of files) {
      const owner = [...S.books.values()].find((b) => b.fileId === f.id && !b.deleted);
      if (!owner || !f.blob) continue;
      out.files.push({ id: f.id, name: f.name, type: f.type, size: f.size, updatedAt: f.updatedAt, data: await blobToB64(f.blob) });
    }
  }
  return out;
}

// Birleştirme: aynı kayıt iki cihazda da varsa, en son güncellenen kazanır.
export async function importBackup(data) {
  if (!data || data.app !== 'kitap-notlari' || !Array.isArray(data.books) || !Array.isArray(data.quotes)) {
    throw new Error('Bu dosya bir Kitap & Notlarım yedeği değil.');
  }
  const stats = { added: 0, updated: 0 };
  const newer = (inc, cur) => !cur || (inc.updatedAt || '') > (cur.updatedAt || '');
  for (const store of STORES) {
    const list = Array.isArray(data[store]) ? data[store] : [];
    const put = [];
    for (const x of list) {
      if (!x || !x.id) continue;
      if (store === 'quotes') migrateQuote(x);
      const cur = S[store].get(x.id);
      if (newer(x, cur)) { put.push(x); cur ? stats.updated++ : stats.added++; S[store].set(x.id, x); }
    }
    await putMany(store, put);
  }
  if (Array.isArray(data.files)) {
    for (const f of data.files) {
      if (!f || !f.id || !f.data) continue;
      const cur = await getFile(f.id);
      if (cur && (cur.updatedAt || '') >= (f.updatedAt || '')) continue;
      await putMany(FILE_STORE, [{ id: f.id, name: f.name, type: f.type, size: f.size, updatedAt: f.updatedAt, blob: b64ToBlob(f.data, f.type) }]);
      stats.files = (stats.files || 0) + 1;
    }
  }
  return stats;
}

export async function wipeAll() {
  for (const s of STORES) { await clearStore(s); S[s].clear(); }
  await clearStore(FILE_STORE);
  await ensureSeeds();
}

let persistAsked = false;
function requestPersist() {
  if (persistAsked) return;
  persistAsked = true;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* yok say */ }
}

// ---- Ayarlar (cihaza özel) ----
const SETTINGS_KEY = 'kn-settings';
const DEFAULTS = {
  lastBackup: '', pin: null,
  // Kilitli bölümler (PIN açıkken). 'nb:<id>' = not defteri, 'shopping' = alışveriş listesi
  locks: ['journal', 'thoughts', 'nb:nb-private'],
  lockMinutes: 5,
  lockOnLeave: true,
  // Barkod
  scanVibrate: true, scanBeep: true, searchLinks: ['kitapyurdu', 'google'],
  // Alt menüde görünen bölümler ve sırası (Kitaplar ve Diğer sabit)
  nav: ['notes', 'thoughts', 'journal', 'blog', 'search'],
  // Okuyucu (Ayarlar → Okuma görünümü)
  reader: { bg: '#FBF5E6', fg: '#2B2B2B', font: 'Literata', size: 19, line: 1.6, margin: 22, turn: 'slide' },
  backupFiles: false,
  tts: { voice: '', rate: 1, pitch: 1, pause: 'normal' },
};
const REMOVED = ['apiKey', 'model', 'citeStyle'];
export function getSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    REMOVED.forEach((k) => delete raw[k]);
    return { ...DEFAULTS, ...raw };
  } catch (e) { return { ...DEFAULTS }; }
}
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) { /* yok say */ }
  return next;
}
// Eski sürümden kalan API anahtarını cihazdan sil
try {
  const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  if (raw && REMOVED.some((k) => k in raw)) { REMOVED.forEach((k) => delete raw[k]); localStorage.setItem(SETTINGS_KEY, JSON.stringify(raw)); }
} catch (e) { /* yok say */ }
