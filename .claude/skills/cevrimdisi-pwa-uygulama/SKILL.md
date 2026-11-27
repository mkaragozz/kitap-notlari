---
name: cevrimdisi-pwa-uygulama
description: Telefona yüklenebilen, internetsiz çalışan, verileri yalnızca cihazda saklayan kişisel web uygulamalarını (PWA) baştan sona yapar — fikir toplama, tasarım, kodlama, test, güvenlik taraması ve açık giderme, yasal kontrol, GitHub Pages'te yayın, güncelleme ve bakım. Not defteri, kitap/alıntı takibi, günlük, e-kitap okuyucu, liste, koleksiyon, alışkanlık takibi gibi uygulamalar için. Kullanıcı "telefonuma uygulama yapalım", "kendi uygulamamı yapmak istiyorum", "ana ekrana eklenen uygulama", "PWA", "offline çalışsın", "GitHub Pages'te yayınla", "uygulamam güncellenmiyor / boş sayfa açılıyor", "güvenlik taraması yap", "açıkları kapat", "Play Store'a uygun olsun", "verilerim cihazımda kalsın", "PIN kilidi / yedekleme / barkod okuyucu / e-kitap okuyucu ekle" dediğinde, programlama bilmese ve "PWA" kelimesini hiç kullanmasa bile MUTLAKA bu skill'i kullan.
---

# Çevrimdışı kişisel uygulama (PWA): baştan sona

Bu skill, "Kitap & Notlarım" uygulamasının (22–27 Kasım 2026, sürüm 1.0 → 3.5) yapımında **yaşanan ve doğrulanan**
her şeyin özüdür. Hedef kullanıcı genellikle programcı değildir: telefonda kullanır, ekran görüntüsüyle istek yapar,
görmediği bir şeyin yayınlanmasını istemez, güvenlik ve doğruluk konusunda çok hassastır.

Dört ilke her şeyin önündedir. Çelişki olursa bu sırayla uygula:

1. **Doğruluk** — doğrulayamadığın bilgiyi kullanma (aşağıda).
2. **Güvenlik** — kullanıcının verisi hiçbir koşulda sızmamalı; her sürümde tarama.
3. **Yasal uyum** — kişisel veri, telif, lisans, mağaza kuralları.
4. **Kullanıcının isteği ve rahatlığı** — sade, pratik, derli toplu.

---

## 1. Doğruluk protokolü (halüsinasyon yok)

Kullanıcı açıkça istedi: "Kaynağına ulaşamadığın ve doğrulayamadığın hiçbir bilgiyi kullanma."
Bu yüzden her bilgi şu üç sınıftan birine girmeli; girmiyorsa **kullanılmaz**:

| Sınıf | Nasıl doğrulanır | Kullanıcıya nasıl söylenir |
|---|---|---|
| **Test edilmiş** | Bu oturumda kod çalıştırıldı, ekran görüntüsü/çıktı alındı | "Test ettim: …" |
| **Kaynaktan okunmuş** | Resmî sayfa / belge / danışma (advisory) açılıp okundu; adres verilebilir | "Kaynak: <adres> — …" |
| **Doğrulanamadı** | Kaynağa ulaşılamadı (ağ engeli vb.) ya da yalnızca hafızadan biliniyor | "Bunu doğrulayamadım; kontrol etmek için: …" |

Kurallar:
- Hafızadan gelen sürüm numarası, ücret, yasa maddesi, mağaza kuralı, tarayıcı davranışı **tahmindir**. Kullanmadan
  önce kaynağı aç; açamıyorsan "doğrulayamadım" de. Tahmini kesin bilgi gibi yazma.
- Bir sorunun nedenini gözlemden çıkardıysan "muhtemel neden" de, nasıl doğrulanacağını ekle
  (ör. Samsung İnternet'ten yüklemede Play Koruma uyarısı — gözlem, nedeni resmî kaynakla doğrulanmadı).
- Bağımlılık açıkları için kaynak: `npm audit` (GitHub Advisory veritabanı) + danışma sayfasının kendisi.
  Ayrıntılar: `references/dogruluk.md`.
- Kullanıcıya rapor verirken: yapılanı, test sonucunu, yapılamayanı ve nedenini ayrı ayrı yaz. "Kusursuz",
  "%100 güvenli" deme: hiçbir yazılım için doğrulanabilir bir iddia değildir. "Bilinen açıklar kapatıldı, şu
  testlerden geçti" de.

## 2. Güvenlik (her sürümde zorunlu)

Tehdit modeli: veriler cihazda; saldırı yolu, kullanıcının açtığı **dosyalar** (PDF, EPUB, Word, yedek .json,
fotoğraf) ve **bağımlılıklar**dır. Bir dosyadaki kod uygulama içinde çalışırsa tüm notlar okunabilir.

Her sürümden önce:
1. `python3 scripts/guvenlik_tarama.py <proje>` → YÜKSEK bulgu sıfır olmalı; ORTA bulguları tek tek koda bakarak
   doğrula (sezgisel tarama, yanlış alarm verebilir).
2. Bağımlılık denetimi: `bash scripts/bagimlilik_denetimi.sh pdfjs-dist@3.11.174 mammoth@1.13.0 …` (lib/
   altındaki her kütüphane, gerçek sürümüyle). Her bulgunun danışma sayfasını oku: etkilenen sürüm, düzeltilmiş
   sürüm, önerilen önlem, uygulamada o kod yolu kullanılıyor mu?
3. Zararlı içerik testi: `scripts/zararli_icerik_testi.js` şablonunu uyarla — zararlı blog/günlük/yedek/EPUB
   içeriği yükle, `window.__pwned` hiç değişmemeli; bir de CSP kapalıyken çalıştır (düzeltme CSP'ye yaslanmamalı).
4. Açığı kapattıktan sonra **eski sürümde açığın gerçekten var olduğunu** ve yeni sürümde kapandığını aynı testle
   göster (ör. 3.4'te "EVET", 3.5'te "hayır"). Bu, düzeltmenin işe yaradığının kanıtıdır.

Zorunlu önlemler (ayrıntı ve kod: `references/guvenlik.md`):
- **CSP** (`<meta http-equiv="Content-Security-Policy">`): `script-src 'self'` + satır içi betiğin sha256 özeti,
  `object-src 'none'`, `base-uri 'self'`, `connect-src` yalnızca kullanılan API'ler. `'unsafe-eval'` ve script için
  `'unsafe-inline'` yok. Satır içi `onclick=`/`onerror=` yok (olay dinleyicisi + `data-*`).
- **Güvenilmeyen HTML** asla canlı belgede (`document.createElement('div').innerHTML = …`) çözülmez:
  `document.implementation.createHTMLDocument('')` ya da `DOMParser` içinde çözülür, izin listesiyle temizlenir,
  sonra gösterilir. Yedekten gelen içerik de **her gösterimde** temizlenir.
- Her kayıt alanı HTML'e `esc()` ile, resim adresleri `safeSrc()` ile (yalnızca `data:image`, `blob:`, `https:`).
- pdf.js: `getDocument({ isEvalSupported: false, … })` (GHSA-wgrm-67xf-hhpq).
- Kütüphaneler `lib/` altında, sürümü ve lisansıyla; çalışma anında CDN'den kod yükleme yok.
- PIN: tuzlu SHA-256 özeti + kurtarma kodu; kilitli bölümden çıkınca yeniden kilit; "veriler şifrelenmez,
  meraklı gözlere karşıdır" açıklaması. Kurtarma kodunun uygulama **dışında** saklanması gerektiğini söyle.
- Koda API anahtarı/parola konmaz (istemci kodu herkese açıktır).

## 3. Yasal uyum (hukuki danışmanlık değildir)

Ayrıntı ve resmî kaynaklar: `references/yasal.md`. Özet kontrol listesi:
- **Kişisel veri:** Türkiye'de 6698 sayılı KVKK, AB kullanıcıları için GDPR (2016/679). Veri cihazdan çıkmıyorsa
  bunu gizlilik politikasında açıkça yaz; dışarı giden her istek (ISBN, DOI, yazı tipi) tabloda listelensin.
  Ses kaydı, yüz, parmak izi gibi **biyometrik** veriler özel nitelikli kişisel veridir: toplamadan önce kullanıcıyla
  konuş, mümkünse hiç toplama.
- **Telif:** Kullanıcının yüklediği e-kitaplar yalnızca kendi cihazında, kişisel kullanım için. Uygulama içerik
  paylaşmaz/dağıtmaz. DRM'li dosya açılmaz, DRM kırma özelliği **eklenmez**.
- **Lisanslar:** Her `lib/` kütüphanesinin lisans dosyası yanında durur (Apache-2.0, MIT, BSD-2 vb.).
- **Gizlilik politikası:** ayrı `privacy.html`; iletişim e-postası yalnızca kullanıcı onaylarsa (yazımını kullanıcıya
  teyit ettir).
- **Mağaza (Play Store):** kullanıcı istemeden başlama; kurallar ve ücretler resmî Play Console yardım sayfasından
  okunmadan kesin bilgi verme.
- Bir site/kişi/kurum adına davranan (taklit eden) sayfa, sahte kayıt, kullanıcıyı yanıltan izin isteği yapılmaz.

## 4. Kullanıcıyla çalışma

1. **Dinle, topla, sonra uygula.** Kullanıcı istekleri parça parça söyler ("en son uygula diyene kadar bekle").
   Numaralı liste tut; belirsiz noktaları tek seferde sor, önerini "(önerim)" diye işaretle.
2. **Sade dil.** "IndexedDB" yerine "veriler telefonunuzda saklanır". Teknik ödünleşimi tek cümleyle anlat
   (ör. yapay zekâ = API anahtarı + ücret + veri dışarı gider; barkod okuyucu = ücretsiz, cihazda).
3. **Önce göster.** Her değişiklikten sonra telefon boyutunda (360×800, ölçek 2) ekran görüntüsü gönder.
   Ekran görüntüsündeki renkli işaretlerin her birini ayrı maddede karşıla.
4. **"Yayınla" denmeden yayınlama.** Kullanıcı açıkça "yayınla" ya da "düzelt ve yayınla" derse yayınla.
5. **Sürüm numarası:** küçük değişiklik +0.1; ana dalda kullanılmış bir numarayı tekrar kullanma.
6. Yayından sonra canlı adresi doğrula ve kullanıcıya "uygulamayı kapatıp açın; 'Uygulama güncellendi (X.Y)'
   bildirimi çıkar" de.

## 5. Yaşam döngüsü

| Aşama | Ne yapılır | Kaynak |
|---|---|---|
| 1. Fikir | İstek listesi, öncelik, belirsizlikleri sorma | Bölüm 4 |
| 2. İskelet | `assets/sablon/` kopyala; ad, renk, `DB_NAME`, `APP_ID` değiştir | Bölüm 6 |
| 3. Özellik | İlgili kalıbı oku, uygula | `references/kaliplar.md` |
| 4. Test | Playwright ile her ekran, örnek veri, `pageerror` + CSP ihlali toplama | Bölüm 7 |
| 5. Güvenlik | Tarama + bağımlılık denetimi + zararlı içerik testi | Bölüm 2 |
| 6. Yasal | Gizlilik politikası, lisanslar, dış istek tablosu | Bölüm 3 |
| 7. Önizleme | Ekran görüntüsü, madde madde anlatım, onay bekle | Bölüm 4 |
| 8. Yayın | Sürüm yükselt, PR + birleştir, canlıyı `curl` ile doğrula | Bölüm 8 |
| 9. Bakım | Ana daldaki yenilikleri al, geriye dönük göç, kılavuzu güncelle | Bölüm 9 |
| 10. Skill'leştirme | Öğrenileni skill'e yaz; yalnızca doğrulanmış bilgi | Bu dosya |

Projede gerçekten yaşanan sorunlar ve çözümleri (tarihli, commit'lerden doğrulanmış): `references/proje-gecmisi.md`.

## 6. Başlangıç şablonu (`assets/sablon/`)

Çalışır, test edilmiş iskelet: `index.html` (açılış bekçisi + onar düğmesi + CSP), `sw.js` (sürümlü önbellek),
`db.js` (IndexedDB, mezar taşı, yedek birleştirme), `app.js` (hash yönlendirme, ekranlar, ayarlar, güncelleme
bildirimi), `ui.js` (`esc`, `safeSrc`, bildirim, alt sayfa), `styles.css` (açık/koyu tema, telefon alt menü +
masaüstü kenar çubuğu), `manifest.webmanifest`, `privacy.html` (doldurulacak taslak), simgeler + `make_icons.js`,
`bump_version.py`. Test edildi: not ekleme, aksansız arama, internetsiz açılma, yedek al/içe aktar (silinen kayıt
geri gelmez), sürüm yükseltince güncelleme bildirimi, güvenlik taramasında YÜKSEK bulgu yok.

Uyarlarken: `APP_NAME` (app.js), `<title>` + manifest adı, `DB_NAME` + `APP_ID` (db.js; başka uygulamayla
çakışmasın), renkler (`:root`), `STORES`, ekranlar. Yeni modül → `sw.js` `MODS`. `index.html`deki satır içi betiği
değiştirirsen CSP özetini güncelle (tarama betiği doğru özeti yazar).

## 7. Altın kurallar (her biri yaşanmış bir hatadan)

1. **Sürüm eki + `sw.js` V + `APP_VERSION` birlikte değişir** (`bump_version.py X.Y`). Atlanırsa eski ve yeni
   modüller karışır → boş sayfa (2.1'de yaşandı). Betik yalnızca tam eşleşen eki değiştirir; kütüphane eklerine
   (`?v=3.11.174`) elle `sed` uygulama (bir toplu değiştirme bunları `3.31.174` yapmıştı).
2. **Açılış bekçisi**: 6 sn içinde açılmazsa "🔄 Onar ve yeniden aç" (yalnızca önbelleği siler, veriyi değil).
3. **Yeni service worker hemen devreye girer**, sayfa bir kez yenilenir, "✨ Uygulama güncellendi" bildirimi.
4. **Silme = mezar taşı**, yedek birleştirme `updatedAt`e göre.
5. **Eski kurulumlar için tek seferlik göç** (`if (!s.bayrakXY) {…}`); varsayılan ayar yalnızca yeni kurulumu etkiler.
6. **Olay dinleyicisi ekranın kendi kabına** bağlanır; kalıcı kaba bağlanırsa birikir ve kayıtları ezer.
7. **Dosyalar ayrı depoda**, belleğe toplu yüklenmez; yedeğe dahil etmek isteğe bağlı.
8. **Kilit dürüst ve sıkı**: tek PIN, kurtarma kodu, bölümden çıkınca yeniden kilit, kilitli kayıtlar arama/etiket/
   rapor/sayaçlarda da gizli.
9. **Aynı depoda başka oturumlar da çalışabilir**: işe başlamadan `git fetch origin main` ve birleştir.

## 8. Test ve yayın

- Playwright + Chromium, `python3 -m http.server`, `serviceWorkers: 'block'`; harici servisleri `route` ile taklit et;
  `pageerror` ve `Content Security Policy` içeren konsol iletilerini topla.
- Kamera, dokunmatik seçim ve sesli okuma gibi cihaz özellikleri yalnızca gerçek telefonda doğrulanır: bunu
  kullanıcıya açıkça söyle.
- GitHub Pages: çalışma dalında commit → PR → birleştir → `curl https://<kullanıcı>.github.io/<depo>/sw.js | grep "const V"`.

## 9. Bakım

- Arayüz değiştiyse uygulama içi kılavuzu ve `privacy.html`i güncelle (dış istek tablosu, son güncelleme tarihi).
- Her sürümde Bölüm 2'deki güvenlik adımları; bağımlılık danışmaları zamanla değişir.
- Kullanıcı yeni bir özellik isterse önce yasal/güvenlik etkisini değerlendir (ör. ses kaydı = biyometrik veri;
  bulut servisi = veri cihazdan çıkar, ücret) ve seçenekleri dürüstçe sun.

## Dosyalar

- `references/dogruluk.md` — doğrulama protokolü, kaynak türleri, raporlama şablonu
- `references/guvenlik.md` — tehdit modeli, CSP, temizleme, PIN, bağımlılık yönetimi, açık giderme akışı
- `references/yasal.md` — KVKK/GDPR, telif, lisanslar, gizlilik politikası, mağaza; resmî kaynak adresleri
- `references/kaliplar.md` — kod kalıpları (güncelleme, göç, dosya deposu, PIN, barkod, PDF çıktısı, grafik, okuyucu)
- `references/proje-gecmisi.md` — Kitap & Notlarım: sürümler, yaşanan sorunlar, çözümler
- `scripts/guvenlik_tarama.py` — statik güvenlik taraması (salt okunur)
- `scripts/bagimlilik_denetimi.sh` — kütüphane sürümleri için `npm audit`
- `scripts/zararli_icerik_testi.js` — zararlı içerikle uçtan uca test şablonu
- `assets/sablon/` — başlangıç uygulaması
