# Yasal uyum kontrol listesi

**Bu bir hukuki danışmanlık değildir.** Aşağıdakiler, kişisel bir uygulamada gözden kaçmaması gereken konulardır.
Kesin bilgi (madde, süre, ücret) vermeden önce resmî kaynağı aç ve oku; okuyamıyorsan "doğrulayamadım" de.

## Resmî kaynaklar

| Konu | Kaynak |
|---|---|
| Türkiye mevzuatı (KVKK 6698, FSEK 5846 vb.) | mevzuat.gov.tr |
| Kişisel Verileri Koruma Kurumu rehberleri | kvkk.gov.tr |
| AB Genel Veri Koruma Tüzüğü (GDPR, 2016/679) | eur-lex.europa.eu |
| Google Play geliştirici politikaları | play.google.com/console ve support.google.com/googleplay/android-developer |
| Açık kaynak lisans metinleri | opensource.org/licenses ve kütüphanenin kendi LICENSE dosyası |

## 1. Kişisel veri

- Uygulama veriyi cihazdan çıkarmıyorsa bunu açıkça yaz; dışarı giden **her** isteği (hangi servis, hangi bilgi,
  ne zaman) gizlilik politikasında tablo olarak listele. Yeni bir dış istek eklenince tabloyu güncelle.
- Analitik, reklam, çerez takibi ekleme; kullanıcı isterse önce etkisini anlat.
- **Biyometrik veri** (ses kaydından ses modeli, yüz, parmak izi) KVKK'da özel nitelikli kişisel veridir (Kanun
  m. 6 — metni mevzuat.gov.tr'den kontrol et). Böyle bir özellik istenirse: açık rıza, amaç, saklama süresi,
  silme hakkı, verinin cihazdan çıkıp çıkmadığı netleşmeden uygulama. Mümkünse cihazda kalan alternatifi öner.
- Başkalarının verisini (ör. paylaşılan yedekler) işlemek kullanıcının sorumluluğundadır; uygulama paylaşmaz.

## 2. Telif hakkı

- Kullanıcının yüklediği e-kitap/makale yalnızca kendi cihazında açılır; uygulama içerik dağıtmaz.
- DRM korumasını aşan özellik **eklenmez**.
- Kapak görselleri ve kitap bilgileri harici servislerden (Open Library, Google Books) gelir; servislerin kullanım
  koşullarını resmî sayfalarından kontrol et, uygulama bunları yeniden dağıtmaz, yalnızca kullanıcının cihazında gösterir.
- Simge, ad ve görünüm başka bir markayı/uygulamayı taklit etmemeli.

## 3. Açık kaynak lisansları

Her `lib/` kütüphanesinin lisans dosyası yanında durmalı. Kitap & Notlarım'da dosyalardan doğrulanan lisanslar:

| Kütüphane | Lisans (LICENSE dosyasından) |
|---|---|
| pdf.js | Apache License 2.0 |
| html5-qrcode | Apache License 2.0 |
| SheetJS (xlsx) | Apache License 2.0 |
| docx | MIT |
| JSZip | MIT veya GPLv3 (çift lisans) |
| mammoth | BSD tarzı ("Redistribution and use in source and binary forms…") |

Apache 2.0 ve BSD/MIT, lisans ve telif bildiriminin korunmasını ister: LICENSE dosyalarını silme.

## 4. Gizlilik politikası (`privacy.html`)

Asgari bölümler: kısaca özet · saklanan veriler · izinler (kamera: yalnızca barkod; görüntü kaydedilmez/gönderilmez)
· dış bağlantılar tablosu · dosyalar · yedekleme (şifresiz) · PIN kilidinin sınırı · verilerin silinmesi · çocuklar ·
değişiklikler (son güncelleme tarihi + sürüm) · iletişim (yalnızca kullanıcının onayladığı adres, yazımı teyit edilmiş).

## 5. Uygulama mağazası

- Kullanıcı istemeden mağaza işine başlama.
- Ücret, hesap türü, hedef API düzeyi, veri güvenliği formu gibi gereklilikleri **resmî Play Console sayfasından**
  okumadan kesin bilgi verme; değişkendir.
- Gizlilik politikası herkese açık bir adreste olmalı (GitHub Pages adresi uygundur).

## 6. Yapılmayacaklar

- Bir kişi, şirket ya da kurum adına davranan (taklit eden) sayfa veya uygulama.
- Sahte kayıt, sahte değerlendirme, yanıltıcı izin isteği, kullanıcıdan gizli veri toplama.
- Kullanıcının izni olmadan kişisel bilgisinin (e-posta, ad) dış servislere gönderilmesi.
