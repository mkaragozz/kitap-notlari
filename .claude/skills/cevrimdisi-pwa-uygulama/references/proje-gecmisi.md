# Kitap & Notlarım: proje geçmişi

Kaynak: `mkaragozz/kitap-notlari` deposunun commit geçmişi ve bu oturumdaki testler. Tarihler commit tarihleridir.
Amaç: aynı hataları tekrar yapmamak; benzer bir uygulamada hangi sırayla ilerleneceğini görmek.

## Sürümler

| Tarih | Sürüm | Ne yapıldı |
|---|---|---|
| 22.11.2026 | 1.0 | Kullanıcının ilk yüklediği uygulama (kitap + alıntı notları) |
| 22.11.2026 | 2.0 | Barkodla kitap ekleme (künye fotoğrafı ve tüm yapay zekâ özellikleri kaldırıldı), Düşüncelerim, Günlük, PIN kilidi, tek tür alıntı + "Yorumum", 3 yıldızlı önem, etiket bağlantıları |
| 22.11.2026 | 2.1 → 2.2 | 2.1 telefonda **boş sayfa** açtı (eski/yeni dosyalar karıştı) → her dosyaya `?v=` sürüm eki, hemen devreye giren service worker, "Onar ve yeniden aç" bekçisi |
| 23.11.2026 | 2.3 | Ad "Kitap & Notlarım"; tam ekran anlık barkod okuyucu, ISBN hafızası, Kitapyurdu/Google arama düğmeleri; Not Defteri (Genel/Özel/kendi defterleri, Alışveriş Listem); bölüm bazlı kilit; kapsamlı gizlilik politikası; uygulama içi kılavuz |
| 23.11.2026 | 3.0 | E-kitap okuyucu (PDF/Word/TXT/EPUB, vurgular, sayfa işaretleri), kitap listeleri, Makaleler (DOI), Blog |
| 23.11.2026 | 3.1 | Kitap bölümleri ayrı sayfalar; Özel E-kitaplarım/Makalelerim; her bölümde kategori; ana sayfa sayaçları ve "Taşı"; Raporlar (Pareto, dönemler, PDF); okuyucuda "Alıntılarıma aktar" + otomatik kaynak/dipnot |
| 23.11.2026 | 3.2 | Ana sayfa sadeleştirme (arama yanında 📷, Makalelerim kutusu), alt menüde Blog |
| (başka oturum) | 3.3 | Aynı siteye geçici olarak ayrı bir uygulama eklendi; service worker `/vadeli/` yolunu atlayacak şekilde değişti |
| 27.11.2026 | 3.4 | Kilitli bölümden çıkınca hemen yeniden kilit (ayarlanabilir); kütüphane sürüm ekleri düzeltildi |
| 27.11.2026 | 3.5.1 | Sesli okuma (telefonun sesi; ses/hız/ton, cümle + kelime takibi); üç haneli sürüm numarası |
| 28.11.2026 | 3.5.2 | İndirilebilir Piper (erkek) ve MMS Türkçe sesleri, duraklamalı okuma, yalnızca Türkçe sesler, okuyucu dışında süren okuma + küçük oynatıcı, tahmini kelime takibi |
| 27.11.2026 | 3.5 | Güvenlik sürümü: CSP, pdf.js önlemi, etkisiz belgede HTML temizleme, `safeSrc`, mammoth 1.13.0, docx/xlsx yerel kopya |

## Yaşanan sorunlar ve çözümleri

| Sorun | Neden (doğrulanan) | Çözüm |
|---|---|---|
| Push 403 | GitHub uygulamasının depoya erişim izni yoktu | Kullanıcı izin verdi |
| Güncelleme sonrası boş sayfa (2.1) | Önbellekte eski ve yeni modüller karıştı | `?v=` ekleri + bekçi + onar düğmesi |
| Blog kaydı başka yazının üstüne yazıldı | Olay dinleyicisi kalıcı `#view` kabına bağlanıp birikmişti | Dinleyiciyi ekranın kendi kabına bağla |
| Alıntı sayfa numarası yanlış | Seçim yerine açık sayfadan hesaplanıyordu | Seçimin konumundan hesapla |
| Grafik çubuğu çizilmedi / etiket kesildi | Negatif genişlik; sağ boşluk az | En az 8 birim genişlik; R=62; viewBox 400 |
| Satın alınacak kitaplar ana sayfada çıktı | Varsayılan durum "okunacak" idi | Durum "listede değil" + tek seferlik göç |
| Türkçe ISBN bulunamadı | Open Library/Google Books Türk yayınlarını az kapsıyor; Kitapyurdu vb. tarayıcıdan erişilemiyor | Arama düğmeleri + ISBN hafızası |
| Kütüphane eki `3.31.174` oldu | Toplu `sed` sürüm değiştirme kütüphane ekini de değiştirdi | Betik yalnızca tam eşleşen eki değiştirir |
| Özel not kilit açıkken "Son notlar"da göründü | Kilit tek seferde açılıp süre dolana kadar açık kalıyordu | Bölümden çıkınca yeniden kilit |
| Kurtarma kodu kilitli defterde saklandı | Kullanıcı hatası riski | Kılavuz ve kilit ekranında uyarı |
| Blog/EPUB içeriğinde kod çalışabiliyordu (3.4) | Canlı belgede `innerHTML`; test 3.4'te kodun çalıştığını gösterdi | Etkisiz belge + CSP (3.5) |
| Samsung İnternet'ten yüklemede Play Koruma uyarısı | **Doğrulanmadı** (gözlem). Chrome ile yüklemede uyarı beklenmez | Chrome ile yükleme önerildi |

## Kullanıcının tercihleri (bu projede öğrenilen)

- Türkçe, sade anlatım; teknik terim yok.
- Her değişiklikten önce ekran görüntüsü; "yayınla" denmeden yayın yok.
- Emin olunmayan yerde soru; ama bariz kararlarda öneriyle ilerle.
- Pratik, derli toplu, kalabalık olmayan arayüz.
- Doğruluk ve güvenlik en üst öncelik.
