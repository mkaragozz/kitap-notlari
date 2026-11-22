// Yerel veritabanı (IndexedDB) + bellek içi önbellek.
// Silinen kayıtlar "deleted: true" olarak işaretlenir; böylece telefon ↔ bilgisayar
// aktarımında silme işlemleri de doğru şekilde birleştirilir.

const DB_NAME = 'kitap-notlari';
const DB_VERSION = 1;
let dbPromise = null;

export const S = { books: new Map(), quotes: new Map() };

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('quotes')) {
        const s = d.createObjectStore('quotes', { keyPath: 'id' });
        s.createIndex('bookId', 'bookId');
      }
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

export async function load() {
  const [books, quotes] = await Promise.all([getAll('books'), getAll('quotes')]);
  S.books = new Map(books.map((b) => [b.id, b]));
  S.quotes = new Map(quotes.map((q) => [q.id, q]));
}

export function books() {
  return [...S.books.values()].filter((b) => !b.deleted);
}
export function getBook(id) {
  const b = S.books.get(id);
  return b && !b.deleted ? b : null;
}
export function allQuotes() {
  return [...S.quotes.values()].filter((q) => !q.deleted && getBook(q.bookId));
}
export function quotesOf(bookId) {
  return allQuotes().filter((q) => q.bookId === bookId);
}

export async function saveBook(b) {
  const now = new Date().toISOString();
  if (!b.id) { b.id = uid(); b.createdAt = now; }
  b.updatedAt = now;
  S.books.set(b.id, b);
  await putMany('books', [b]);
  requestPersist();
  return b;
}

export async function saveQuote(q) {
  const now = new Date().toISOString();
  if (!q.id) { q.id = uid(); q.createdAt = now; }
  q.updatedAt = now;
  S.quotes.set(q.id, q);
  await putMany('quotes', [q]);
  requestPersist();
  return q;
}

export async function deleteQuote(id) {
  const q = S.quotes.get(id);
  if (!q) return;
  // Kaydın içeriğini temizle, sadece silindi işaretini tut
  const tomb = { id: q.id, bookId: q.bookId, deleted: true, createdAt: q.createdAt, updatedAt: new Date().toISOString() };
  S.quotes.set(id, tomb);
  await putMany('quotes', [tomb]);
}

export async function deleteBook(id) {
  const b = S.books.get(id);
  if (!b) return;
  const now = new Date().toISOString();
  const tomb = { id: b.id, deleted: true, createdAt: b.createdAt, updatedAt: now };
  S.books.set(id, tomb);
  const qs = [...S.quotes.values()].filter((q) => q.bookId === id && !q.deleted)
    .map((q) => ({ id: q.id, bookId: q.bookId, deleted: true, createdAt: q.createdAt, updatedAt: now }));
  qs.forEach((q) => S.quotes.set(q.id, q));
  await putMany('books', [tomb]);
  await putMany('quotes', qs);
}

// ---- Yedekleme / aktarım ----
export function exportBackup() {
  return {
    app: 'kitap-notlari',
    version: 1,
    exportedAt: new Date().toISOString(),
    books: [...S.books.values()],
    quotes: [...S.quotes.values()],
  };
}

// Birleştirme: aynı kayıt iki cihazda da varsa, en son güncellenen kazanır.
export async function importBackup(data) {
  if (!data || data.app !== 'kitap-notlari' || !Array.isArray(data.books) || !Array.isArray(data.quotes)) {
    throw new Error('Bu dosya bir Kitap Notlarım yedeği değil.');
  }
  const stats = { booksAdded: 0, booksUpdated: 0, quotesAdded: 0, quotesUpdated: 0 };
  const newer = (inc, cur) => !cur || (inc.updatedAt || '') > (cur.updatedAt || '');
  const bPut = [], qPut = [];
  for (const b of data.books) {
    if (!b || !b.id) continue;
    const cur = S.books.get(b.id);
    if (newer(b, cur)) { bPut.push(b); cur ? stats.booksUpdated++ : stats.booksAdded++; S.books.set(b.id, b); }
  }
  for (const q of data.quotes) {
    if (!q || !q.id) continue;
    const cur = S.quotes.get(q.id);
    if (newer(q, cur)) { qPut.push(q); cur ? stats.quotesUpdated++ : stats.quotesAdded++; S.quotes.set(q.id, q); }
  }
  await putMany('books', bPut);
  await putMany('quotes', qPut);
  return stats;
}

export async function wipeAll() {
  await clearStore('books');
  await clearStore('quotes');
  S.books.clear();
  S.quotes.clear();
}

let persistAsked = false;
function requestPersist() {
  if (persistAsked) return;
  persistAsked = true;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* yok say */ }
}

// ---- Ayarlar (cihaza özel) ----
const SETTINGS_KEY = 'kn-settings';
const DEFAULTS = { apiKey: '', model: 'claude-opus-5-5', citeStyle: 'page', lastBackup: '' };
export function getSettings() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; }
  catch (e) { return { ...DEFAULTS }; }
}
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) { /* yok say */ }
  return next;
}
