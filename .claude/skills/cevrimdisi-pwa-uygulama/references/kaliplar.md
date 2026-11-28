# Kod kalıpları

Her bölüm bağımsızdır; yalnızca eklediğin özelliğin bölümünü oku. Hepsi "Kitap & Notlarım"da gerçek telefonlarda
denenmiş kodlardan sadeleştirilmiştir.

İçindekiler
1. Sürüm ve güncelleme akışı
2. Tek seferlik göç (migration)
3. Dosya deposu (PDF, fotoğraf) ve yedeğe dahil etme
4. PIN kilidi + kurtarma kodu + bölüm kilitleri
5. Barkod okuyucu (ISBN) ve kitap bilgisi
6. PDF çıktısı (yazdırma görünümü)
7. Bağımlılıksız SVG grafikler (sütun, yatay çubuk, Pareto)
8. E-kitap okuyucu notları
9. Simge üretimi (SVG → PNG)
10. Ekran tasarımı ilkeleri
11. Sesli okuma (kitabı dinleme)

---

## 1. Sürüm ve güncelleme akışı

- `index.html`: `<script type="module" src="app.js?v=1.3">`, `<link href="styles.css?v=1.3">`
- Her modül: `import * as DB from './db.js?v=1.3';`
- `sw.js`: `const V = '1.3'`, `MODS` listesi aynı ekle önbelleğe alınır, `install`te `cache: 'reload'`.
- `app.js`: `APP_VERSION = '1.3'`, `controllerchange` → tek seferlik `location.reload()` + `sessionStorage` bayrağıyla
  "✨ Uygulama güncellendi" bildirimi (şablondaki `registerSW`).
- Kullanıcıya söylenecek: "Uygulamayı tamamen kapatıp açın; bildirim gelmezse bir kez daha."
- `bump_version.py X.Y` hepsini değiştirir ve eski ek kalmadığını doğrular.

## 2. Tek seferlik göç

```js
const s = DB.getSettings();
if (!s.nav32) {                              // bayrak adı: neyi ve hangi sürümde değiştirdiğini anlatsın
  const nv = s.nav || [];
  if (!nv.includes('blog')) nv.splice(Math.max(0, nv.indexOf('search')), 0, 'blog');
  await DB.setSettings({ nav32: true, nav: nv });
}
```
Veri dönüşümünde her kaydı `DB.save` ile kaydet (updatedAt güncellenir, yedek birleştirme doğru çalışır).

## 3. Dosya deposu

Ayrı bir `files` deposu (`{id, name, type, size, updatedAt, blob}`), `init()`te belleğe yüklenmez; `getFile(id)` ile
istenince okunur. Kayıtta yalnızca `fileId`, `fileName`, `fileType` tutulur. Yedekte isteğe bağlı:

```js
async function blobToB64(b) { const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); }
function b64ToBlob(d, type) { const bin = atob(d); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type }); }
```
Ayarlarda "📱 Dosyaları da yedekle" kutusu; kapalıyken yedek küçük kalır. Fotoğrafları kaydetmeden önce
`canvas` ile ~1600px'e küçült, JPEG 0.85.

## 4. PIN kilidi

```js
async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
function randomHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function newRecoveryCode() { const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a = new Uint8Array(8); crypto.getRandomValues(a); const s = [...a].map((b) => C[b % C.length]).join(''); return s.slice(0, 4) + '-' + s.slice(4); }
const clean = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function storePin(pin) {
  const salt = randomHex(16), code = newRecoveryCode();
  await DB.setSettings({ pin: { salt, hash: await sha(salt + ':' + pin), recHash: await sha(salt + ':rec:' + clean(code)) } });
  return code; // kullanıcıya BİR KEZ göster: "Bu kodu bir yere yazın"
}
const checkPin = async (pin) => { const p = DB.getSettings().pin; return !!p && (await sha(p.salt + ':' + pin)) === p.hash; };
```
- Tek PIN, birden çok bölüm: `settings.locks = ['journal', 'privateBooks', …]`; `isOpen(section)` = kilit kapalı ya da
  bu oturumda açılmış. Açıklık bellekte tutulur (sayfa kapanınca kilitlenir) + N dakika hareketsizlikte yeniden kilit
  (`pointerdown/keydown` ile `lastActive`, `visibilitychange`te kontrol).
- Kilitli kayıtlar her yerden gizlenmeli: `DB.visibility.hidePrivate = (kayıt) => Lock.enabled() && !Lock.isOpen(lockOf(kayıt))`
  ve tüm liste fonksiyonları bu filtreden geçsin (arama, etiketler, raporlar, sayaçlar dahil; sayaçta "🔒" göster).
- Kurtarma kodu ile girilince yeni PIN koydur ve yeni kod üret.

## 5. Barkod okuyucu

- Tam ekran `<video playsinline>` + `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })`.
- Android Chrome: `new BarcodeDetector({ formats: ['ean_13'] })`, 60 ms'de bir `detect(video)` — çok hızlı tanır.
  Desteklenmiyorsa (iPhone) `lib/html5-qrcode.min.js` ile `Html5Qrcode`, `fps: 15`, `qrbox` geniş dikdörtgen.
- Kamera ayarı: `track.getCapabilities()` → `focusMode: 'continuous'`, `zoom ≈ 1.6` (yakın tutunca odak kaçmasın),
  varsa fener düğmesi (`torch`).
- ISBN doğrulama: 13 hane, `978`/`979` ile başlar, kontrol hanesi tutar. Bulunca titreşim (`navigator.vibrate(80)`) +
  isteğe bağlı kısa bip (WebAudio), kamerayı kapat.
- Bilgi: `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, sonra
  `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`. Kapak: Open Library `covers` / Google `imageLinks`
  (`http:` → `https:`).
- Bulunamazsa: ISBN ile arama düğmeleri (Kitapyurdu, D&R, Google — `?q=`/`/arama?q=` adresleri) + kullanıcının elle
  girdiğini `isbnmemo` deposunda sakla; aynı ISBN tekrar okutulunca önce oradan doldur.
- Galeriden fotoğrafla okutma yedeği: `<input type="file" accept="image/*">` → `BarcodeDetector.detect(await createImageBitmap(file))`.

## 6. PDF çıktısı

```js
export function printHtml(html, title) {
  const pa = document.getElementById('print-area');
  pa.innerHTML = html;
  const old = document.title; document.title = title;      // önerilen dosya adı olur
  setTimeout(() => { window.print(); document.title = old; setTimeout(() => { pa.innerHTML = ''; }, 500); }, 50);
}
```
CSS: `@media print { body > *:not(#print-area) { display:none !important } #print-area { display:block } }`,
`@page { margin: 16mm }`, satır içi `pt` birimleri, `break-inside: avoid`. Kullanıcıya: "Yazıcı olarak 'PDF olarak
kaydet'i seçin." Word için `docx` kütüphanesi (dipnotlar `footnotes`). Excel için büyük kütüphane yerine JSZip ile en basit OOXML
paketi yeterli ([Content_Types].xml, _rels, workbook, styles, sheetN; satır içi metin hücreleri, kalın başlık,
dondurulmuş ilk satır). Hepsi yalnızca düğmeye basılınca yüklensin.

## 7. SVG grafikler

- `viewBox` genişliği ~400, `width:100%`; yazılar 11-12 birim (telefonda okunur).
- Yatay çubuk: solda etiket alanı (L≈128), sağda değer etiketi için boşluk (R≈62); çubuk genişliği en az 8.
- Pareto: azalan çubuklar + birikimli % çizgisi + %80 kesikli çizgi; "ilk N öğe toplamın %80'i" cümlesi.
- Renkler: tek seri için tek renk; kategoriler için en fazla 3-4 ayırt edilebilir renk (ör. #2a78d6, #eb6834, #1baf7a).
- Dönem seçici: Bu hafta / Bu ay / Bu yıl / Son 12 ay / Tümü / Özel aralık (iki `<input type="date">`).

## 8. E-kitap okuyucu

- PDF: `pdfjsLib.getDocument({ data })`, sayfa `canvas` + `renderTextLayer` (seçilebilir metin; CSS'te
  `--scale-factor`). Word: `mammoth.convertToHtml({ arrayBuffer })`. EPUB: JSZip → `container.xml` → OPF spine →
  XHTML'leri birleştir. TXT: `<p>`lere böl.
- Akış metni sayfalama: kap `column-width: 100vw; height: X; overflow: hidden`, sayfa = `scrollLeft / genişlik`.
- Kaydırma (swipe) ile sayfa çevirme, sayfa numarası, "sayfaya git", kaldığı yer (`readPos`), okuma süresi günlüğü.
- Vurgu: seçimi `Range` ile al; akış metninde `<mark>` sarmala, PDF'te sayfaya göre dikdörtgenler; çapa (anchor)
  olarak metin + önceki/sonraki 30 karakter sakla ki yeniden çizilebilsin.

## 9. Simge üretimi

```js
// node make_icons.js  (Playwright hazırsa)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  const svg = fs.readFileSync('icon.svg', 'utf8');
  for (const [n, s, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.12]]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<body style="margin:0;background:#7C5CFF"><div style="padding:${s * pad}px">${svg.replace('<svg', `<svg width="${s * (1 - 2 * pad)}" height="${s * (1 - 2 * pad)}"`)}</div></body>`);
    await p.screenshot({ path: n });
  } await b.close(); })();
```

## 10. Ekran tasarımı ilkeleri

- Telefon önce: 360px genişlikte kalabalık olmasın; alt menüde en fazla 5 bölüm + "☰ Diğer".
- Ana sayfa: arama kutusu (yanında en sık işin düğmesi, ör. 📷), bölüm kutuları (3'lü ızgara, sayılarıyla), sayaçlar,
  yatay kaydırmalı raflar, sağ altta tek "＋" düğmesi. Aynı işi yapan iki düğme koyma.
- Her listede boş durum: simge + bir cümle + ne yapılacağını gösteren düğme.
- Uzun formlar yerine alttan açılan sayfa (sheet); silmede onay; kayıttan sonra kısa bildirim (toast).
- Açık/koyu tema: renkler `:root` değişkenlerinde; koyu tema `prefers-color-scheme` + elle seçim (`data-theme`).
- Türkçe sıralama/arama: `localeCompare(x, 'tr')`, `toLocaleLowerCase('tr')`, aksan duyarsız `norm()`.

## 11. Sesli okuma (kitabı dinleme) — Kitap & Notlarım'da denendi, kullanıcı beğenmedi ve kaldırıldı

**Önce oku:** Tarayıcının Web Speech sesleri Türkçede çoğu telefonda tek ve yapay kalitede; kullanıcı "robot gibi,
yanlış okuyor" dedi ve 3.5.4'te özellik tamamen kaldırıldı. Böyle bir istek gelirse önce bir cümlelik örneği
kullanıcının kendi telefonunda dinletip onay al ("Sesi dene"), sonra kur. Aşağıdakiler teknik bilgi içindir.

Ücretsiz ve ek kurulumsuz yol: tarayıcının **Web Speech API**'si (`speechSynthesis`). Kitap & Notlarım 3.5.1'de
uygulandı; sahte ses motoruyla otomatik test edildi, gerçek seslerle **yalnızca gerçek telefonda** doğrulanabilir.

- Sesler: `speechSynthesis.getVoices()` (boş gelirse `voiceschanged` bekle). Türkçe (`lang` "tr" ile başlayan) ve
  `localService: true` olanları öne al. Tarayıcı bir sesin kadın/erkek olduğunu bildirmez: yalnızca adında geçiyorsa
  👩/👨 göster, her sese "Sesi dene" koy. Ton (`pitch` 0.5–1.5) için Kalın/Normal/İnce düğmeleri.
- Gizlilik: `localService: false` olan sesler (spesifikasyona göre uzak servis) okunan metni sağlayıcıya gönderir →
  listede 🌐 ile işaretle, varsayılan olarak cihazdaki sesi seç, gizlilik politikasına satır ekle.
- Metni **cümle cümle** seslendir (uzun metinde bazı tarayıcılar susabilir; 260 karakterden uzun cümleyi virgülden böl).
  `Intl.Segmenter('tr', { granularity: 'sentence' })`, yoksa düzenli ifade.
- Takip: her cümle için DOM `Range`; `CSS.highlights.set('tts', new Highlight(range))` (DOM'a dokunmaz, sayfalamayı
  bozmaz). `utterance.onboundary` kelime sınırı verirse (`charIndex`, `charLength`) kelimeyi ayrıca vurgula.
  Cümlenin/kelimenin sayfası değişince sayfayı çevir; kullanıcı elle çevirirse okumayı yeni sayfadan sürdür.
- PDF orijinal görünüm: pdf.js metin katmanındaki düğümleri birleştir (parçalar arasına sanal boşluk koy, ama
  ofset eşlemesini koru) → aynı vurgulama çalışır. Sayfa bitince sonraki sayfayı çiz ve sürdür.
- Duraklatma: `pause()/resume()` yerine `cancel()` + kaldığı cümleyi hatırla (daha öngörülebilir).
  Her `speak` için bir sayaç (token) tut; eski `onend` olaylarını yok say.
- Dinlerken ekran kararmasın: `navigator.wakeLock.request('screen')`; duraklatınca bırak, sayfa yeniden görününce
  tekrar iste. Ekran kilitlenince telefonun okumayı durdurup durdurmayacağı cihaza bağlıdır: kullanıcıya söyle.
- Kişinin kendi sesini kopyalamak (ses klonlama) tarayıcıda yerleşik değildir; ücretli bulut servisi + biyometrik veri
  demektir (bkz. yasal.md) → önerme.

### 11b. Tarayıcı içinde çalışan sinir ağı sesleri — DENENDİ, TELEFONDA BAŞARISIZ, KALDIRILDI (3.5.2 → 3.5.3)

**Sonuç önce:** Piper ve MMS masaüstünde çalıştı ama telefon hızına yakın koşullarda (CPU 4x yavaşlatma) ilk sese
kadar **23 sn (Piper) / 77 sn (MMS)** sürdü; kullanıcının telefonunda "çalıyor görünüyor ama okumuyor" oldu ve kullanıcı
kaldırılmasını istedi. Ders: ağır bir özelliği yayından ÖNCE telefon koşullarında (CDP `Emulation.setCPUThrottlingRate`
+ ağ yavaşlatma, otomatik oynatma kısıtı açık) ölç; ilk sese kadar geçen süreyi uygulamanın içinden kaydet. Aşağıdaki
notlar yalnızca bilgi içindir:

Kullanıcı geri bildirimi (gerçek telefon, Android Chrome): telefonun Türkçe sesi tek ve "robot gibi"; tarayıcı kelime
sınırı bildirmiyor; ekran kilitlenince Web Speech duruyor; Almanca/Bulgarca ses seçilince Türkçe metni o aksanla okuyor
(ses çeviri yapmaz → listede yalnızca kitabın dilindeki sesleri göster). Edge (Android) bu telefonda uygulamaya hiç ses vermedi.

- **Piper** (rhasspy/piper-voices): Türkçe için yalnızca `tr_TR-dfki-medium` var; konuşmacı erkek (MaryTTS bileşen
  listesi: "A male Turkish … voice"); veri lisansı CC BY-NC-SA 4.0. Tarayıcıda: `onnxruntime-web` (MIT) + espeak-ng
  tabanlı fonem üretici wasm (`@diffusionstudio/piper-wasm`, içinde espeak-ng → GPL-3.0). Fonem kimlikleri Python
  `piper-tts` ile birebir aynı çıktı (doğrulandı). Hız: masaüstü tek iş parçacığında konuşmadan ~4 kat hızlı.
- **Meta MMS** (`facebook/mms-tts-tur`, CC BY-NC 4.0): hazır ONNX sürümü bulunamadı → `torch.onnx.export` (opset 17)
  ile dönüştürüldü (114 MB). Belirteç: küçük harf, sözlükte olmayan karakterleri at, aralara 0 koy (Python ile aynı
  kimlikler doğrulandı). Hız: masaüstünde konuşmadan ~1,4 kat **yavaş** → telefonda takılabilir; kullanıcıya söyle.
  int8 küçültme 38 MB'a indirdi ama wasm'da daha yavaş çalıştı.
- Paketler varsayılan olarak cdnjs / jsdelivr / huggingface'ten yükler → hepsini kendi sitende barındır, `wasmPaths`
  ve `locateFile`'ı kendi yoluna çevir. Dosyaları kullanıcı "İndir" deyince indir, SHA-256 doğrula, ayrı ve sürümden
  bağımsız bir Cache Storage'a yaz; service worker bu yolları yalnızca o önbellekten sunsun.
- CSP'ye yalnızca `'wasm-unsafe-eval'` eklenir; aynı kökenden yüklenen betikte `new Function` hâlâ engellenir (test edildi).
- Duraklama: cümleyi virgül/noktalı virgül parçalarına böl, her parçayı ayrı üret, aralara sessizlik örnekleri ekle,
  tek WAV yap (arka planda zamanlayıcıya güvenme). Kelime takibi: parça süresi içinde kelime uzunluğuna göre tahmin.
- Okuma okuyucudan çıkınca sürsün: oynatıcı modül düzeyinde yaşasın; okuyucu yalnızca "görünüm" kancası bağlasın.
  PDF'te sonraki sayfa için son cümlenin sayfa numarasını kullan (o anki cümle liste bitince boş olur — yaşanan hata).
- Kilit ekranında sürmesi için `<audio>` + Media Session; gerçek telefonda doğrulanmalı.
