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

const DB_NAME = 'kitap-notlari';
const DB_VERSION = 2;
export const STORES = ['books', 'quotes', 'thoughts', 'notebooks', 'moments', 'days'];
let dbPromise = null;

export const S = Object.fromEntries(STORES.map((s) => [s, new Map()]));

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      STORES.forEach((name) => { if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: 'id' }); });
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
}

const live = (store) => [...S[store].values()].filter((x) => !x.deleted);

// ---- Kitaplar ve alıntılar ----
export function books() { return live('books'); }
export function getBook(id) {
  const b = S.books.get(id);
  return b && !b.deleted ? b : null;
}
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
  await remove('books', id);
  await putMany('quotes', qs);
}

// ---- Yedekleme / aktarım ----
export function exportBackup() {
  const out = { app: 'kitap-notlari', version: 2, exportedAt: new Date().toISOString() };
  STORES.forEach((s) => { out[s] = [...S[s].values()]; });
  return out;
}

// Birleştirme: aynı kayıt iki cihazda da varsa, en son güncellenen kazanır.
export async function importBackup(data) {
  if (!data || data.app !== 'kitap-notlari' || !Array.isArray(data.books) || !Array.isArray(data.quotes)) {
    throw new Error('Bu dosya bir Kitap Notlarım yedeği değil.');
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
  return stats;
}

export async function wipeAll() {
  for (const s of STORES) { await clearStore(s); S[s].clear(); }
}

let persistAsked = false;
function requestPersist() {
  if (persistAsked) return;
  persistAsked = true;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* yok say */ }
}

// ---- Ayarlar (cihaza özel) ----
const SETTINGS_KEY = 'kn-settings';
const DEFAULTS = { lastBackup: '', pin: null };
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
