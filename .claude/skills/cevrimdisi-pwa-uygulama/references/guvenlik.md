# Güvenlik

İçindekiler: 1. Tehdit modeli · 2. Tarama ve açık giderme akışı · 3. CSP · 4. Güvenilmeyen HTML · 5. Kaçışlama ·
6. Dosya okuyucular · 7. Bağımlılıklar · 8. PIN kilidi · 9. Yedek dosyası · 10. Gerçek örnek: 3.5 güvenlik sürümü

## 1. Tehdit modeli

- Veriler cihazda (IndexedDB). Sunucu yok, hesap yok → sunucu sızıntısı riski yok.
- Asıl risk: **uygulama içinde başkasının kodunun çalışması (XSS)**. Çalışırsa aynı kökendeki tüm veriler
  (notlar, günlük, PIN özeti) okunabilir. Giriş yolları: açılan PDF/EPUB/Word, içe aktarılan yedek, yapıştırılan
  HTML, harici API yanıtları (kapak adresi, kitap adı), CDN'den yüklenen kütüphaneler.
- İkincil: telefonu eline alan kişi (→ PIN kilidi), yedek dosyasının ele geçmesi (→ kullanıcıyı uyar).

## 2. Tarama ve açık giderme akışı

1. **Statik tarama:** `python3 scripts/guvenlik_tarama.py <proje>`. YÜKSEK = hemen düzelt. ORTA = koda bak;
   gerçekten güvenliyse satıra `// guvenlik-ok: <neden>` yorumu ekleyebilirsin (yorum şablon dizesinin dışında olmalı).
2. **Bağımlılık denetimi:** `bash scripts/bagimlilik_denetimi.sh <paket@sürüm> …`. Her bulgu için danışma sayfasını
   oku ve şu dört soruyu yanıtla: Etkilenen sürüm aralığında mıyız? Düzeltilmiş sürüm var mı? Önerilen önlem ne?
   Uygulama o kod yolunu kullanıyor mu (ör. SheetJS açığı "dosya okurken"; uygulama yalnızca yazıyorsa etkilenmez)?
   Yalnızca Node.js'te kullanılan alt bağımlılıklar (ör. `canvas` → `tar`) tarayıcı paketine girmez; bunu
   `npm ls <paket>` ile göster.
3. **Kanıtla:** zararlı içerik testini (scripts/zararli_icerik_testi.js) **eski** sürümde çalıştır → açık var mı?
   Düzeltmeden sonra yeni sürümde çalıştır → kapandı mı? Bir kez de CSP kaldırılmış hâlde çalıştır: düzeltme
   tek başına yeterli olmalı, CSP ikinci savunma hattıdır.
4. **Gerileme testi:** tüm ekranları gez (pageerror + CSP ihlali), okuyucuyu her dosya türüyle aç, dışa aktarmaları
   dene.
5. **Belgele:** gizlilik politikasındaki dış istek tablosu ve "son güncelleme" tarihi; kullanıcıya rapor
   (`references/dogruluk.md` şablonu).

## 3. Content-Security-Policy

`index.html` `<head>` içinde, ilk etiketlerden biri olarak:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'sha256-<satır içi betiğin özeti>'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: blob: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' <kullanılan API kökenleri>; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'">
<meta name="referrer" content="no-referrer">
```

- Satır içi betiğin özeti: `base64(sha256(<script> ile </script> arasındaki metin))`. Tarama betiği beklenen
  değeri yazar. Betik değişince CSP'yi güncelle.
- `style-src 'unsafe-inline'` stil öznitelikleri için kabul edilebilir (betik çalıştırmaz); `script-src` için asla.
- Meta etiketiyle verilen CSP'de `frame-ancestors` çalışmaz; GitHub Pages özel başlık eklemeye izin vermez.
- Test edildi (Chromium): bu CSP ile aynı kökenden yüklenen bir betikteki `new Function()` engellendi, satır içi olay
  işleyicileri engellendi. Dikkat: Playwright `page.evaluate` ile çalıştırılan kod CSP'ye takılmaz; CSP'yi sınamak için
  sınama kodunu ayrı bir `.js` dosyası olarak `<script src>` ile yükle.
- Not: Etkisiz (inert) belgede ayrıştırılan içerikteki `onclick` öznitelikleri Chromium'da CSP ihlali olarak
  konsola raporlanabilir; bu raporlar kodun **çalıştığı** anlamına gelmez (testte `window.__pwned` değişmedi).

## 4. Güvenilmeyen HTML

Yanlış (canlı belgede ayrıştırır; `<img src=x onerror=…>` temizlemeden ÖNCE çalışır — 3.4'te kanıtlandı):
```js
const d = document.createElement('div'); d.innerHTML = untrusted;   // ✗
```
Doğru:
```js
const INERT = document.implementation.createHTMLDocument('');
function clean(html) {
  const d = INERT.createElement('div'); d.innerHTML = html || '';     // resim yüklenmez, betik/işleyici çalışmaz
  // izin listesi: yalnızca bilinen etiketler; tüm öznitelikleri sil, A için yalnızca https:/mailto: href (+ rel=noopener),
  // IMG için yalnızca data:/blob: src; SCRIPT/STYLE/IFRAME/OBJECT/EMBED/SVG/FORM… tamamen kaldır
  return d.innerHTML;
}
```
- Yedekten gelen HTML (blog yazısı vb.) **her gösterimde** `clean()`den geçer; yalnızca kayıtta temizlemek yetmez.
- `DOMParser().parseFromString(x, 'text/html')` da etkisizdir; EPUB bölümleri için uygundur.

## 5. Kaçışlama

- Metin → HTML: `esc()` (& < > " ' kaçışlanır). Her kayıt alanı (ad, başlık, yorum, etiket, kategori) için.
- Resim adresi → `safeSrc()`: yalnızca `data:image/…;base64,`, `blob:`, `https://`; kaçışlanmış döner, değilse ''.
- Bağlantı adresi: `https:`/`mailto:` dışındakileri düşür; `target="_blank"` ise `rel="noopener"`.
- Sayısal değerler (`Math.round`, `.length`) güvenlidir; şablon içinde şablonlar varsa en içteki ifadeye bak.

## 6. Dosya okuyucular

- **PDF (pdf.js ≤ 4.1.392):** GHSA-wgrm-67xf-hhpq — zararlı PDF, `isEvalSupported` varsayılan `true` iken
  uygulama kökeninde kod çalıştırabilir. Danışmanın önerdiği önlem: `getDocument({ isEvalSupported: false, … })`.
  Düzeltilmiş sürüm: 4.2.67 (API değişikliği gerektirir). CSP `'unsafe-eval'` vermediği için ikinci savunma hattı var.
- **Word (mammoth):** GHSA-rmjr-87wv-gf87 — `>= 0.3.25, < 1.11.0`, harici bağlantılı resim yoluyla dizin geçişi.
  Çözüm: ≥ 1.11.0 (Kitap & Notlarım'da 1.13.0'a yükseltildi).
- **EPUB:** zip içindeki XHTML → DOMParser / etkisiz belge → izin listesiyle temizle → resimler `blob:` adresiyle.
- **Excel (SheetJS 0.18.5):** GHSA-4r6h-8v6p-xvw6 "dosya okurken" prototip kirliliği; danışma sayfası "yalnızca
  dışa aktaran iş akışları etkilenmez" diyor. GHSA-5pgg-2g8v-p4x9 (ReDoS, < 0.20.2) için tetikleyici yol danışmada
  belirtilmemiş. Düzeltilmiş sürümler npm'de değil, cdn.sheetjs.com'da; ağ engeli varsa bunu "kalan risk" olarak raporla.

## 7. Bağımlılıklar

- Her kütüphane `lib/` altında: `ad.min.js` + `ad.LICENSE`; adreste kendi sürümü (`?v=3.11.174`).
- npm'den indirirken `npm pack paket@sürüm` (npm bütünlük özetini doğrular); `--ignore-scripts`.
- Çalışma anında CDN'den kod yükleme yok (tedarik zinciri + internetsiz çalışma). Zorunluysa `integrity` (SRI) ekle.
- Service worker `lib/` dosyalarını ilk kullanımda önbelleğe alabilir (büyük dosyalar her güncellemede yeniden inmez).

## 8. PIN kilidi

- `salt = random(16 bayt)`, `hash = SHA-256(salt + ':' + pin)`, `recHash = SHA-256(salt + ':rec:' + kod)`.
- Yanlış denemede artan bekleme; kilit açıklığı yalnızca bellekte; hareketsizlikte, uygulama kapanınca ve **kilitli
  bölümden çıkınca** yeniden kilit; kilitli kayıtlar her listeden gizli.
- 4 haneli PIN kaba kuvvete dayanıklı değildir ve veri şifrelenmez: bunu kullanıcıya ve gizlilik politikasına yaz.
- Kurtarma kodu uygulamanın içinde (özellikle kilitli bir defterde) saklanmamalı.

## 9. Yedek dosyası

- Şifresizdir: kullanıcıyı uyar ("güvenli bir yerde saklayın").
- İçe aktarmada uygulama kimliğini kontrol et, `id`siz kaydı atla, `updatedAt`e göre birleştir; içeriği güvenilmeyen
  veri say (Bölüm 4–5).

## 10. Gerçek örnek: Kitap & Notlarım 3.5

| Bulgu | Kaynak / kanıt | Düzeltme |
|---|---|---|
| pdf.js isEvalSupported varsayılan | npm audit + GHSA-wgrm-67xf-hhpq | `isEvalSupported: false` + CSP |
| Blog temizleyicisi canlı belgede ayrıştırıyordu | Test: 3.4'te `window.__pwned=1` oldu, 3.5'te olmadı | etkisiz belge + her gösterimde temizleme |
| EPUB bölümleri canlı `div`te ayrıştırılıyordu | kod incelemesi + CSP ihlal raporu | etkisiz belge |
| Günlük/blog resim adresleri kaçışlanmıyordu | tarama betiği | `safeSrc()` |
| mammoth 1.8.0 | npm audit + GHSA-rmjr-87wv-gf87 | 1.13.0 |
| docx/xlsx çalışma anında CDN'den | tarama betiği | `lib/` altına yerel kopya |
| CSP yoktu, satır içi `onclick`/`onerror` vardı | tarama betiği | CSP + olay dinleyicisi |
