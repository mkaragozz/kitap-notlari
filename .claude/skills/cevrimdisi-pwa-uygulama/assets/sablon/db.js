// Veri katmanı: IndexedDB + bellekte Map. Silme = mezar taşı (deleted:true), yedek birleştirme updatedAt'e göre.
// Yeni veri türü: STORES'a ekleyin ve DB_VERSION'ı bir artırın.
const DB_NAME = 'uygulamam';
const DB_VERSION = 1;
export const STORES = ['notes'];
export const APP_ID = 'uygulamam'; // yedek dosyasını tanımak için

export const S = {}; // store -> Map(id -> kayıt)
let db;
let settings = {};
const DEFAULTS = { theme: 'auto', lastBackup: null }; // yalnızca YENİ kurulumları etkiler; eskiler için göç yazın

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const now = () => new Date().toISOString();

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      [...STORES, 'meta'].forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const tx = (store, mode = 'readonly') => db.transaction(store, mode).objectStore(store);
const all = (store) => new Promise((res, rej) => { const r = tx(store).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export function putMany(store, items) {
  if (!items.length) return Promise.resolve();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    items.forEach((x) => t.objectStore(store).put(x));
    t.oncomplete = () => res(); t.onerror = () => rej(t.error);
  });
}

export async function init() {
  db = await open();
  for (const s of STORES) S[s] = new Map((await all(s)).map((x) => [x.id, x]));
  const meta = await all('meta');
  settings = { ...DEFAULTS, ...((meta.find((m) => m.id === 'settings') || {}).value || {}) };
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* yok say */ }
}

export const getSettings = () => settings;
export function setSettings(patch) { settings = { ...settings, ...patch }; return putMany('meta', [{ id: 'settings', value: settings }]); }

const live = (store) => [...S[store].values()].filter((x) => !x.deleted);
export const notes = () => live('notes').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
export const getNote = (id) => { const x = S.notes.get(id); return x && !x.deleted ? x : null; };
export async function save(store, x) {
  if (!x.id) { x.id = uid(); x.createdAt = now(); }
  x.updatedAt = now();
  S[store].set(x.id, x);
  await putMany(store, [x]);
  return x;
}
export async function remove(store, id) {
  const x = S[store].get(id); if (!x) return;
  const t = { id, deleted: true, updatedAt: now() }; // mezar taşı: başka cihazdaki yedekte de silinsin
  S[store].set(id, t); await putMany(store, [t]);
}

export function exportBackup() {
  const out = { app: APP_ID, version: 1, exportedAt: now() };
  STORES.forEach((s) => { out[s] = [...S[s].values()]; });
  return out;
}
export async function importBackup(data) {
  if (!data || data.app !== APP_ID) throw new Error('Bu dosya bu uygulamanın yedeği değil.');
  const stats = { added: 0, updated: 0 };
  for (const s of STORES) {
    const put = [];
    for (const x of Array.isArray(data[s]) ? data[s] : []) {
      if (!x || !x.id) continue;
      const cur = S[s].get(x.id);
      if (!cur || (x.updatedAt || '') > (cur.updatedAt || '')) { put.push(x); cur ? stats.updated++ : stats.added++; S[s].set(x.id, x); }
    }
    await putMany(s, put);
  }
  return stats;
}
