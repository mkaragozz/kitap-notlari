// Barkod okuyucu + ISBN ile kitap bilgisi bulma.
// Sıra: 1) cihazdaki ISBN hafızası (daha önce elle girilen kitaplar), 2) Google Books + Open Library.
// Bulunamazsa Kitapyurdu / Google vb. arama bağlantıları gösterilir (Ayarlar'dan seçilir).
import * as DB from './db.js?v=3.5.6';
import { $, esc, openSheet, closeSheet, pickFiles, fileToDataUrl, toast } from './ui.js?v=3.5.6';

const LIB = 'lib/html5-qrcode.min.js?v=2.3.8';
let libLoad = null;
function loadLib() {
  if (window.__Html5QrcodeLibrary__) return Promise.resolve(window.__Html5QrcodeLibrary__);
  libLoad = libLoad || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LIB;
    s.onload = () => resolve(window.__Html5QrcodeLibrary__);
    s.onerror = () => { libLoad = null; reject(new Error('Barkod okuyucu yüklenemedi')); };
    document.head.appendChild(s);
  });
  return libLoad;
}

export function cleanIsbn(s) { return String(s || '').replace(/[^0-9Xx]/g, '').toUpperCase(); }
export function validIsbn(s) {
  const c = cleanIsbn(s);
  if (c.length === 13 && /^\d{13}$/.test(c)) {
    const sum = [...c].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  if (c.length === 10 && /^\d{9}[\dX]$/.test(c)) {
    const sum = [...c].reduce((a, d, i) => a + (d === 'X' ? 10 : Number(d)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}
const isBookCode = (code) => /^97[89]\d{10}$/.test(code) && validIsbn(code);

/**
 * Tam ekran kamera açıp kitap barkodunu okur. Döner: ISBN (string) ya da null (iptal).
 * Android Chrome'da telefonun yerleşik (donanım destekli) barkod algılayıcısı kullanılır;
 * yoksa (ör. iPhone) html5-qrcode kütüphanesi tüm görüntüyü tarar.
 */
export function scanBarcode() {
  return new Promise((resolve) => {
    const st = DB.getSettings();
    let finished = false;
    let stream = null, track = null, libScanner = null, timer = null;
    let lastWarn = 0;
    const stopAll = async () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null; track = null;
      if (libScanner) { try { if (libScanner.isScanning) await libScanner.stop(); libScanner.clear(); } catch (e) { /* yok say */ } libScanner = null; }
    };
    const finish = async (val) => { if (finished) return; finished = true; await stopAll(); resolve(val); };
    const s = openSheet({
      title: '📷 Barkod okut', full: true,
      body: `<div class="scan-stage" id="scan-stage"><video id="scan-video" playsinline muted autoplay></video><div id="scan-lib" class="scan-lib"></div>
          <div class="scan-guide"><i></i></div>
          <div class="scan-tip" id="scan-tip">Barkodu kameraya gösterin, kendiliğinden okunur</div></div>
        <div class="scan-bar">
          <button class="btn" data-x="torch" hidden>🔦 Fener</button>
          <button class="btn" data-x="file">🖼️ Fotoğraftan</button>
          <button class="btn" data-act="close-sheet">Vazgeç</button></div>`,
      onClose: () => finish(null),
    });
    const tip = (t) => { const m = $('#scan-tip', s); if (m) m.textContent = t; };
    const found = async (code) => {
      if (finished) return;
      if (st.scanVibrate && navigator.vibrate) navigator.vibrate(90);
      if (st.scanBeep) beep();
      await finish(code);
      closeSheet();
    };
    const other = () => { if (Date.now() - lastWarn > 2500) { lastWarn = Date.now(); tip('Bu bir kitap barkodu değil (978 ya da 979 ile başlamalı)'); } };

    const startNative = async () => {
      const video = $('#scan-video', s);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, advanced: [{ focusMode: 'continuous' }] },
      });
      if (finished) { stopAll(); return; }
      video.srcObject = stream;
      await video.play().catch(() => {});
      track = stream.getVideoTracks()[0];
      tuneTrack(track, s);
      const det = new window.BarcodeDetector({ formats: ['ean_13'] });
      const loop = async () => {
        if (finished) return;
        try {
          if (video.readyState >= 2) {
            const codes = await det.detect(video);
            const book = codes.find((c) => isBookCode(c.rawValue));
            if (book) { found(book.rawValue); return; }
            if (codes.length) other();
          }
        } catch (e) { /* bir kare atlandı */ }
        timer = setTimeout(loop, 60);
      };
      loop();
    };

    const startLib = async () => {
      const L = await loadLib();
      if (finished) return;
      $('#scan-video', s).remove();
      libScanner = new L.Html5Qrcode('scan-lib', { formatsToSupport: [L.Html5QrcodeSupportedFormats.EAN_13], experimentalFeatures: { useBarCodeDetectorIfSupported: true }, verbose: false });
      await libScanner.start(
        { facingMode: 'environment' },
        { fps: 20, disableFlip: true, videoConstraints: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, advanced: [{ focusMode: 'continuous' }] } },
        (text) => { if (isBookCode(text)) found(text); else other(); },
        () => {},
      );
      try { const caps = libScanner.getRunningTrackCapabilities(); if (caps && caps.torch) showTorch(s, (on) => libScanner.applyVideoConstraints({ advanced: [{ torch: on }] })); } catch (e) { /* yok */ }
    };

    nativeSupported().then((native) => (native ? startNative() : startLib())).catch((err) => {
      const denied = /Permission|NotAllowed|denied/i.test(String(err && (err.name || err.message || err)));
      $('#scan-stage', s).innerHTML = `<div class="banner coral" style="margin:16px">${denied
        ? 'Kamera izni verilmedi. Tarayıcı ayarlarından bu siteye kamera izni verin ya da “Fotoğraftan”ı kullanın.'
        : 'Kamera açılamadı. “Fotoğraftan” ile barkodun fotoğrafını seçebilir ya da ISBN\'i elle yazabilirsiniz.'}</div>`;
    });

    $('[data-x="file"]', s).onclick = async () => {
      const [f] = await pickFiles();
      if (!f) return;
      try { const code = await decodeFile(f); if (code) found(code); else tip('Fotoğrafta kitap barkodu bulunamadı. Daha yakından ve net çekin.'); }
      catch (e) { tip('Fotoğrafta kitap barkodu bulunamadı.'); }
    };
  });
}

let nativeCheck = null;
function nativeSupported() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return Promise.resolve(false);
  nativeCheck = nativeCheck || window.BarcodeDetector.getSupportedFormats().then((f) => f.includes('ean_13')).catch(() => false);
  return nativeCheck;
}

/** Sürekli odak, gerekiyorsa hafif yakınlaştırma ve fener */
function tuneTrack(track, s) {
  let caps = {};
  try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (e) { /* yok */ }
  const adv = {};
  if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
  // Kitap barkodu küçük: çok yakın tutunca odak kaçmasın diye hafif yakınlaştır
  if (caps.zoom && caps.zoom.max >= 2) adv.zoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min || 1, 1.6));
  if (Object.keys(adv).length) track.applyConstraints({ advanced: [adv] }).catch(() => {});
  if (caps.torch) showTorch(s, (on) => track.applyConstraints({ advanced: [{ torch: on }] }));
}
function showTorch(s, apply) {
  const b = $('[data-x="torch"]', s); if (!b) return;
  let on = false;
  b.hidden = false;
  b.onclick = () => { on = !on; Promise.resolve(apply(on)).catch(() => {}); b.classList.toggle('primary', on); };
}
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 1450; o.type = 'sine';
    g.gain.setValueAtTime(0.18, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.15);
  } catch (e) { /* ses yok */ }
}

async function decodeFile(file) {
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['ean_13'] });
      const codes = await det.detect(await createImageBitmap(file));
      const c = codes.find((x) => isBookCode(x.rawValue));
      if (c) return c.rawValue;
    } catch (e) { /* kütüphaneye düş */ }
  }
  const L = await loadLib();
  let holder = document.getElementById('qr-file-holder');
  if (!holder) { holder = document.createElement('div'); holder.id = 'qr-file-holder'; holder.style.display = 'none'; document.body.appendChild(holder); }
  const sc = new L.Html5Qrcode('qr-file-holder', { formatsToSupport: [L.Html5QrcodeSupportedFormats.EAN_13], verbose: false });
  try {
    const text = await sc.scanFile(file, false);
    return isBookCode(text) ? text : null;
  } finally { try { sc.clear(); } catch (e) { /* yok say */ } }
}

// ---- ISBN ile kitap bilgisi ----
async function fromOpenLibrary(isbn) {
  const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const j = await r.json();
  const d = j[`ISBN:${isbn}`];
  if (!d) return null;
  return {
    title: d.title || '', subtitle: d.subtitle || '',
    author: (d.authors || []).map((a) => a.name).join(', '),
    publisher: (d.publishers || []).map((p) => p.name).join(', '),
    year: ((d.publish_date || '').match(/\d{4}/) || [''])[0],
    pages: d.number_of_pages || '',
    city: ((d.publish_places || [])[0] || {}).name || '',
    categories: (d.subjects || []).slice(0, 4).map((x) => x.name).join(', '),
    coverUrl: d.cover && (d.cover.large || d.cover.medium || d.cover.small),
  };
}
async function fromGoogle(isbn) {
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  const j = await r.json();
  const v = j.items && j.items[0] && j.items[0].volumeInfo;
  if (!v) return null;
  const img = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail || '');
  return {
    title: v.title || '', subtitle: v.subtitle || '',
    author: (v.authors || []).join(', '),
    publisher: v.publisher || '',
    year: ((v.publishedDate || '').match(/\d{4}/) || [''])[0],
    pages: v.pageCount || '',
    categories: (v.categories || []).join(', '),
    language: v.language || '',
    description: (v.description || '').replace(/<[^>]+>/g, ''),
    coverUrl: img ? img.replace('http://', 'https://').replace('&edge=curl', '') : '',
  };
}

/** İki kaynağa birden sorar, bilgileri birleştirir. Bulunamazsa null döner. */
export async function lookupIsbn(isbn) {
  const clean = cleanIsbn(isbn);
  if (clean.length !== 10 && clean.length !== 13) throw new Error('ISBN 10 ya da 13 haneli olmalı.');
  const memo = localInfo(clean);
  if (memo) return memo;
  const [ol, gb] = await Promise.allSettled([fromOpenLibrary(clean), fromGoogle(clean)]);
  const a = ol.status === 'fulfilled' ? ol.value : null;
  const b = gb.status === 'fulfilled' ? gb.value : null;
  if (!a && !b) {
    if (ol.status === 'rejected' && gb.status === 'rejected') throw new Error('Kitap servislerine ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    return null;
  }
  const out = { isbn: clean };
  const keys = ['title', 'subtitle', 'author', 'publisher', 'year', 'pages', 'city', 'categories', 'language', 'description'];
  // Google Books Türkçe kitaplarda genelde daha doğru; önce onu, eksikleri Open Library'den al
  keys.forEach((k) => { out[k] = (b && b[k]) || (a && a[k]) || ''; });
  out.coverUrls = [a && a.coverUrl, b && b.coverUrl].filter(Boolean);
  return out;
}

// ---- ISBN hafızası: elle girilen bilgiler cihazda (ve yedekte) saklanır ----
const MEMO_FIELDS = ['title', 'subtitle', 'author', 'translator', 'publisher', 'city', 'year', 'edition', 'pages', 'categories', 'description', 'cover'];
function localInfo(isbn) {
  const m = DB.getIsbnMemo(isbn);
  const b = DB.books().filter((x) => x.isbn && cleanIsbn(x.isbn) === isbn).sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || ''))[0];
  const src = b || m;
  if (!src || !src.title) return null;
  const out = { isbn, fromMemo: true };
  MEMO_FIELDS.forEach((k) => { out[k] = src[k] || (m && m[k]) || ''; });
  out.coverUrls = [];
  return out;
}
/** Kitap kaydedildiğinde ISBN hafızasını günceller */
export async function rememberBook(b) {
  const isbn = cleanIsbn(b.isbn);
  if (!isbn || !b.title) return;
  const rec = { ...(DB.getIsbnMemo(isbn) || {}), id: isbn };
  MEMO_FIELDS.forEach((k) => { if (b[k]) rec[k] = b[k]; });
  if (rec.cover && rec.cover.length > 120000) delete rec.cover; // çok büyük kapakları hafızaya alma
  await DB.save('isbnmemo', rec);
}

/** Kitap bulunamayınca gösterilecek arama bağlantıları */
export const SEARCH_SITES = {
  kitapyurdu: { l: "Kitapyurdu'nda ara", u: (i) => `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${i}` },
  google: { l: "Google'da ara", u: (i) => `https://www.google.com/search?q=${i}` },
  dr: { l: "D&R'da ara", u: (i) => `https://www.dr.com.tr/search?q=${i}` },
  idefix: { l: "İdefix'te ara", u: (i) => `https://www.idefix.com/search?q=${i}` },
  nadir: { l: "Nadir Kitap'ta ara", u: (i) => `https://www.nadirkitap.com/kitapara_search.html?kelime=${i}` },
};
export function searchLinksHtml(isbn) {
  const keys = DB.getSettings().searchLinks || ['kitapyurdu', 'google'];
  return keys.filter((k) => SEARCH_SITES[k]).map((k) => `<a class="btn sm" href="${SEARCH_SITES[k].u(cleanIsbn(isbn))}" target="_blank" rel="noopener">🔎 ${esc(SEARCH_SITES[k].l)}</a>`).join(' ');
}

/** Kapak görselini cihaza kaydedilebilir küçük bir görsele çevirir; olmazsa adresini döner. */
export async function fetchCover(urls) {
  for (const u of urls || []) {
    try {
      const r = await fetch(u, { mode: 'cors' });
      if (!r.ok) continue;
      const blob = await r.blob();
      if (blob.size < 1200) continue; // boş/yer tutucu görsel
      return await fileToDataUrl(blob, 480, 0.85);
    } catch (e) { /* sıradakini dene */ }
  }
  return (urls && urls[0]) || '';
}

/** Barkod okut → bilgileri bul. Döner: {isbn, info|null} ya da null (iptal). */
export async function scanAndLookup() {
  const code = await scanBarcode();
  if (!code) return null;
  toast(`Barkod okundu: ${code}. Bilgiler aranıyor…`, 2500);
  try { return { isbn: code, info: await lookupIsbn(code) }; }
  catch (err) { toast(err.message, 4500); return { isbn: code, info: null }; }
}
