---
name: cevrimdisi-pwa-uygulama
description: Telefona yüklenebilen, internetsiz çalışan, verileri yalnızca cihazda saklayan kişisel web uygulamaları (PWA) tasarlar, yazar, GitHub Pages'te yayınlar ve günceller — not defteri, kitap/alıntı takibi, günlük, liste, koleksiyon, alışkanlık takibi gibi. Kullanıcı "telefonuma uygulama yapmak istiyorum", "kendi uygulamamı yapalım", "ana ekrana eklenen bir uygulama", "PWA", "offline çalışsın", "GitHub Pages'te yayınla", "uygulamam güncellenmiyor / boş sayfa açılıyor", "Play Store'a uygun olsun", "verilerim cihazımda kalsın", "PIN kilidi / yedekleme / barkod okuyucu ekle" dediğinde, programlama bilmese ve "PWA" kelimesini kullanmasa bile MUTLAKA bu skill'i kullan.
---

# Çevrimdışı kişisel uygulama (PWA) yapımı

Bu skill, "Kitap & Notlarım" uygulamasını (sıfırdan 3.2 sürümüne) yaparken öğrenilenlerin özüdür. Hedef kullanıcı
genellikle programcı değildir: telefonda kullanır, ekran görüntüsüyle istek yapar, sonucu görmeden yayın istemez.

## Neden bu mimari

- **Derleme adımı yok** (saf HTML + CSS + ES modülleri): kullanıcı hiçbir şey kurmadan GitHub Pages'te yayınlanır,
  her dosya okunabilir kalır, yıllar sonra da çalışır.
- **Veriler IndexedDB'de, sunucu yok**: ücretsiz, gizlilik politikası basit ("verileriniz cihazınızdan çıkmaz"),
  hesap/şifre derdi yok. Bedeli: cihazlar arası aktarım yedek dosyasıyla yapılır — bunu baştan söyle.
- **Service worker önbelleği**: uçak modunda bile açılır; ana ekrana "uygulama" olarak yüklenir.
- **Kütüphaneleri `lib/` altına kopyala** (CDN'e bağlı kalma): internetsiz çalışır, CDN değişse bozulmaz.

## Kullanıcıyla çalışma şekli

1. **Önce dinle, sonra yap.** Kullanıcı genelde istekleri parça parça söyler ("en son uygula diyene kadar bekle").
   İstekleri numaralı listede topla, belirsizleri tek seferde sor, önerini "(önerim)" diye işaretle.
2. **Kararları basit dille sun.** "IndexedDB" yerine "veriler telefonunuzda saklanır". Teknik ödünleşimleri bir
   cümleyle anlat (ör. yapay zekâ özelliği → API anahtarı ve ücret demek; barkod okuyucu ücretsiz).
3. **Göster, onay al, yayınla.** Telefon boyutunda (360×800, ölçek 2) ekran görüntüsü gönder; "yayınla" denmeden
   canlıya çıkma. Ekran görüntüsündeki renkli işaretleri tek tek karşıla.
4. **Aşamalı yayın.** Büyük işleri aşamalara böl, her aşamada sürüm yükselt (2.3 → 3.0 → 3.1). Kullanıcı "neden
   doğrudan 3.0?" diye sorabilir: ara sürümler sorun çıkarsa geri dönmeyi kolaylaştırır, bunu açıkla.
5. Yayından sonra canlı adresteki `sw.js` sürümünü `curl` ile doğrula, kullanıcıya güncellemeyi nasıl alacağını söyle.

## Başlangıç şablonu

`assets/sablon/` çalışır bir iskelettir: `index.html` (açılış bekçisi + onar düğmesi), `sw.js` (sürümlü önbellek),
`db.js` (depolar, mezar taşı, yedek birleştirme), `app.js` (hash yönlendirme, alt menü, ayarlar), `ui.js`,
`styles.css` (açık/koyu tema, telefon + masaüstü yerleşimi), `manifest.webmanifest`, `privacy.html` (doldurulacak
taslak), `icon.svg` + hazır PNG simgeler, `make_icons.js` (simgeyi değiştirince PNG'leri yeniden üretir),
`bump_version.py`. Bu iskelet telefonda test edildi: not ekleme, aksansız arama, internetsiz açılma, yedek al /
içe aktar (silinen kayıt geri gelmez), sürüm yükseltince "✨ Uygulama güncellendi" bildirimi.

Yeni projede klasörü olduğu gibi kopyala, sonra uyarla: `APP_NAME` (app.js), `<title>` + `manifest` adı, `DB_NAME` ve
`APP_ID` (db.js — başka uygulamayla çakışmasın), renkler (`:root`), `STORES` ve ekranlar. Yeni modül → `sw.js` `MODS`.

## Altın kurallar (her biri yaşanmış bir hatadan)

1. **Sürüm eki + `sw.js` V + `APP_VERSION` birlikte değişir.** Her yerel import `./db.js?v=1.4` gibi yazılır.
   Atlanırsa telefonda eski ve yeni modüller karışır → boş sayfa. `bump_version.py X.Y` hepsini yapar ve doğrular.
2. **Açılış bekçisi.** `index.html` 6-8 sn içinde `window.__appStarted` görmezse "🔄 Onar ve yeniden aç" gösterir;
   düğme yalnızca service worker ve önbelleği siler, IndexedDB'ye dokunmaz. Kullanıcıyı boş ekranda bırakmaz.
3. **Yeni service worker hemen devreye girer** (`skipWaiting` + `clients.claim`), sayfa `controllerchange`te bir kez
   yenilenir ve "✨ Uygulama güncellendi (sürüm X)" der. Kullanıcı "güncelleme gelmedi" demez.
4. **Silme = mezar taşı** (`deleted:true, updatedAt`). Yedek içe aktarma kayıtları `updatedAt`e göre birleştirir;
   böylece telefon ↔ bilgisayar arasında yedekle gidip gelmek güvenlidir.
5. **Eski kullanıcılar için tek seferlik göç.** Varsayılan ayar değişikliği yalnızca yeni kurulumu etkiler;
   mevcut veriyi/ayarı değiştirmek için açılışta `if (!s.flagX) { …; setSettings({flagX:true}) }`.
6. **Olay dinleyicilerini kalıcı kaba değil, o ekranın kendi kabına bağla** — yoksa her ziyarette birikir ve bir
   ekranın kaydı başka kaydın üstüne yazar.
7. **Dosyalar (PDF, fotoğraf) ayrı bir depoda** ve belleğe toplu yüklenmez; yedeğe dahil etmek isteğe bağlıdır
   (dosya büyür).
8. **Kilit (PIN) dürüst olsun:** tuzlu SHA-256 özeti sakla, kurtarma kodu ver, "veriler şifrelenmez, meraklı
   gözlere karşıdır" yaz. Kilitli bölüm kayıtları aramada, etiketlerde, raporlarda da gizlenmeli
   (tek bir `hidePrivate(kayıt)` kancası ile).

Kod kalıpları (service worker, bekçi, yedek birleştirme, PIN, barkod, okuyucu, grafikler, PDF çıktısı):
`references/kaliplar.md` — ilgili özelliği eklerken o bölümü oku.

## Sık istenen özellikler ve doğru yaklaşım

| İstek | Yaklaşım |
|---|---|
| Barkodla kitap/ürün ekleme | Android'de yerel `BarcodeDetector`, yoksa `html5-qrcode`; tam ekran, otomatik odak, titreşim. ISBN → Open Library + Google Books. Bulunamazsa arama siteleri düğmeleri + "ISBN hafızası" (elle girilen bilgiyi sakla). Türkçe kitaplar bu servislerde zayıf; Kitapyurdu/D&R tarayıcıdan erişilemez (CORS) — kullanıcıya dürüstçe söyle. |
| "Fotoğraftan bilgi çeksin" | Yapay zekâ/OCR = API anahtarı + ücret + gizlilik. Barkodu öner. |
| E-kitap okuyucu | pdf.js (tuval + metin katmanı), mammoth (Word), JSZip (EPUB), TXT. Akış metni CSS sütunlarıyla sayfalanır. Vurgu, sayfa işareti, kaldığı yer. |
| Rapor / istatistik | Bağımlılıksız SVG çubuk/sütun/Pareto; tek eksen; dönem seçimi; PDF = yazdırma görünümü. |
| PDF / Word / Excel çıktısı | PDF: gizli `#print-area` + `window.print()` ("PDF olarak kaydet"). Word: docx kütüphanesi (dipnot destekli). Excel: SheetJS. |
| Cihazlar arası | Yedek al (.json) → gönder → içe aktar. Bulut senkronu istenirse ücret/gizlilik ödünleşimini anlat. |
| Bilgisayarda kullanım | Chrome/Edge adres çubuğu ⊕ Yükle. Geniş ekranda alt menü sol kenar çubuğuna dönüşür (CSS). |
| Play Store | PWA → Bubblewrap/PWABuilder ile TWA; `assetlinks.json`, gizlilik politikası sayfası, maskable simgeler, ekran görüntüleri. Google Play geliştirici hesabı tek seferlik ücretlidir. Kullanıcı istemeden başlama. |
| Gizlilik politikası | Ayrı `privacy.html`: toplanan veri yok, cihazda saklama, kamera izni amacı, yedek dosyası, iletişim e-postası (kullanıcı onaylarsa). |
| Kullanım kılavuzu | Uygulama içinde aranabilir kılavuz (Ayarlar → Kılavuz); arayüz değiştikçe güncelle. |

## Test

Playwright + Chromium ile yerel sunucuda (`python3 -m http.server`), `serviceWorkers: 'block'` bağlamında:
örnek veri gir, her ekranı gez, `pageerror` topla, ekran görüntüsü al. Harici servisleri (`openlibrary`, `crossref`,
font) `route` ile taklit et. Kamera ve dokunmatik seçim gerçek cihaz ister — bunu kullanıcıya açıkça söyle.

## Yayın (GitHub Pages)

Depo → Settings → Pages → `main` / kök. Çalışma dalında commit → kullanıcı "yayınla" deyince PR + birleştir →
1-3 dk sonra `curl https://<kullanıcı>.github.io/<depo>/sw.js | grep "const V"` ile doğrula. Push 403 verirse
kullanıcının GitHub uygulama iznini vermesi gerekir; ne yapacağını adım adım anlat.
