# Yapılacaklar (sonraya bırakılanlar)

## 1. Türkçe kitaplar için ek bilgi kaynağı
**Sorun:** Barkod okunuyor, ama bazı Türkçe kitaplar ISBN ile (barkodla da, elle yazınca da) bulunamıyor.
Şu anki kaynaklar (Google Books, Open Library) Türk yayınevlerinin kitaplarını eksik içeriyor.

**Seçenekler:**
- **Wikidata** (ücretsiz, sunucu gerekmez): Bazı Türkçe kitaplar var; kapsamı sınırlı ama eklemesi kolay.
- **Türk kitap siteleri / Kültür Bakanlığı ISBN sorgusu:** Kapsamı en iyi seçenek, ama bu siteler tarayıcıdan
  doğrudan sorgulanamıyor (CORS) ve kullanım koşulları incelenmeli. Küçük bir ara sunucu
  (ör. ücretsiz Cloudflare Worker) gerektirir.
- **Ücretli servisler** (ISBNdb vb.): Anahtar ve aylık ücret gerektirir.
- **Kendi kitaplığından öğrenme:** Elle girilen kitap bilgisi, aynı ISBN tekrar okutulduğunda cihazdaki
  kayıttan doldurulur (zaten ekli kitap için uyarı var; diğer cihazlara yedekle taşınır).

**Bulunamayan örnek ISBN'ler:** (kullanıcıdan alınacak)

## 2. Play Store'a yükleme
Teknik hazırlık yapıldı (gizlilik sayfası, simgeler, manifest). Kalan: geliştirici hesabı, PWABuilder ile paket,
`assetlinks.json` doğrulaması (mkaragozz.github.io deposu), 12 kişilik 14 günlük kapalı test, mağaza metinleri ve ekran görüntüleri.
