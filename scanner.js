// Barkod okuyucu + ISBN ile kitap bilgisi bulma (ücretsiz kaynaklar: Open Library, Google Books).
import { $, esc, openSheet, closeSheet, pickFiles, fileToDataUrl, toast } from './ui.js?v=2.2';

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
 * Kamerayı açıp kitap barkodunu okur. Döner: ISBN (string) ya da null (iptal).
 */
export function scanBarcode() {
  return new Promise((resolve) => {
    let finished = false;
    let scanner = null;
    const finish = async (val) => {
      if (finished) return;
      finished = true;
      try { if (scanner && scanner.isScanning) await scanner.stop(); } catch (e) { /* yok say */ }
      try { scanner && scanner.clear(); } catch (e) { /* yok say */ }
      resolve(val);
    };
    const s = openSheet({
      title: '📷 Barkod okut',
      body: `<p class="hint">Kitabın arka kapağındaki barkodu (978 ya da 979 ile başlayan) çerçevenin içine getirin. Telefonu biraz uzak tutup yavaşça yaklaştırın.</p>
        <div id="qr-reader" class="qr-reader"><div class="loading-box"><div class="spinner"></div>Kamera açılıyor…</div></div>
        <div id="qr-msg" class="small muted mt"></div>`,
      foot: `<button class="btn" data-x="file">🖼️ Fotoğraftan oku</button><button class="btn" data-act="close-sheet">Vazgeç</button>`,
      onClose: () => finish(null),
    });
    const msg = (t) => { const m = $('#qr-msg', s); if (m) m.innerHTML = t; };
    const done = async (code) => { await finish(code); await closeSheet(); };

    loadLib().then(async (L) => {
      if (finished) return;
      $('#qr-reader', s).innerHTML = '';
      scanner = new L.Html5Qrcode('qr-reader', {
        formatsToSupport: [L.Html5QrcodeSupportedFormats.EAN_13],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: (w, h) => ({ width: Math.min(300, Math.floor(w * 0.85)), height: Math.min(150, Math.floor(h * 0.5)) }), aspectRatio: 1.333 },
          (text) => {
            if (isBookCode(text)) { if (navigator.vibrate) navigator.vibrate(80); done(text); }
            else msg('Bu bir kitap barkodu değil gibi görünüyor (978/979 ile başlamalı).');
          },
          () => { /* kare okunamadı, devam */ },
        );
        if (finished) { try { await scanner.stop(); } catch (e) { /* yok say */ } }
      } catch (err) {
        const denied = /Permission|NotAllowed|denied/i.test(String(err && (err.name || err.message || err)));
        $('#qr-reader', s).innerHTML = `<div class="banner coral">${denied
          ? 'Kamera izni verilmedi. Tarayıcı ayarlarından bu siteye kamera izni verin ya da “Fotoğraftan oku”yu kullanın.'
          : 'Kamera açılamadı. “Fotoğraftan oku” ile barkodun fotoğrafını seçebilir ya da ISBN\'i elle yazabilirsiniz.'}</div>`;
      }
    }).catch((err) => { $('#qr-reader', s).innerHTML = `<div class="banner coral">${esc(err.message)}</div>`; });

    $('[data-x="file"]', s).onclick = async () => {
      const [f] = await pickFiles();
      if (!f) return;
      try {
        const code = await decodeFile(f);
        if (code) done(code); else msg('Fotoğrafta kitap barkodu bulunamadı. Daha yakından ve net çekmeyi deneyin.');
      } catch (e) { msg('Fotoğrafta kitap barkodu bulunamadı.'); }
    };
  });
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
