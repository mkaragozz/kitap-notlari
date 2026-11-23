# Yapılacaklar

Durum: **Not alındı, uygulanmadı.** Kullanıcı "uygula" diyene kadar kodda değişiklik yapılmayacak.
Açık sorular yanıtlanınca bu dosya güncellenecek.

## A. Kitap ekleme ve bilgi bulma
1. **Tam ekran barkod okuyucu:** Kamera tam ekran açılsın, kendiliğinden ve sürekli odaklansın; barkodu
   küçük bir çerçeveye getirmek gerekmesin, görüntünün her yerinde algılasın.
2. **Kitap bulunamazsa** "🔎 Kitapyurdu'nda ara" ve "🔎 Google'da ara" düğmeleri (ISBN ile arama sayfası açılır).
3. **Kendi kayıtlarından doldurma:** Elle girilmiş bir ISBN tekrar okutulunca bilgiler kendiliğinden dolsun.

## B. E-kitap okuyucu (PDF, Word, TXT, EPUB)
4. Kitap ekle bölümünden PDF / Word (.docx) / metin (.txt) / EPUB dosyası yükleme.
5. Okuma ayarları: zemin rengi (istenen renk), yazı boyutu, yazı tipi. Varsayılan: en rahat okunan yazı tipi.
6. Metni seçip "Notlarıma kaydet": önem derecesi, etiket, yorum, tekrar oku seçenekleriyle; her alıntıya ayrı renk tonu.
7. Sayfalara "Tekrar oku" işareti; notlara ve sayfalara yorum ekleme.
8. Sayfa çevirme: kitap gibi çevirme ya da başparmakla sağa/sola kaydırma.
9. Altta sayfa numarası; sayfa numarası yazınca o sayfaya gitme; kalınan sayfadan devam etme.

## C. Kitap listeleri
10. **Özel Kitaplar:** Herkesin görmesini istemediğiniz kitaplar; PIN ile kilitli (günlük gibi).
11. **Seçkin Kitaplar** bölümü (ayrıntısı soruldu).
12. **Okunacak Kitaplar:** Yıldız (okuma/önem derecesi), 1'den başlayan sıralama, konulara göre tasnif, yeni konu başlığı ekleme.
13. **Kütüphanem:** Evdeki kitaplar; barkod / ISBN / elle ekleme; konulara göre tasnif; "okudum" işareti;
    konu başlıkları altında, okundu bilgisiyle **kütüphane kataloğu PDF/çıktı**.
14. **Satın Almak İstediğim Kitaplar:** Yıldız, sıralama, konuya göre tasnif, "önce almak istediklerim";
    **alış listesi PDF/çıktı**.

## D. Not Defteri
15. Menüde Günlük'ün yanında **Not Defteri**. İçinde **Genel Notlar** ve **Özel Notlar**; "＋ Not Defteri" ile yeni defter ekleme ve adlandırma.
16. Ayarlar'dan istenen not defterine PIN kilidi; tüm kilitler için **tek kurtarma kodu**.
17. Her notun kaydedildiği tarih ve saat görünsün.
18. Not defteri içinde **Alışveriş Listem**; kendi alışveriş kategorilerini ekleyip adlandırma.

## E. Ertelenenler
19. **Play Store'a yükleme:** Kullanıcı karar verince konuşulacak. (Teknik hazırlık zaten yapıldı.)

---

## Ek bilgi: Türkçe kitap kaynağı araştırması (23.11.2026)
Bulunamayan örnek ISBN'ler (üçü de orijinal baskı):
- 9786256162990: Doğan Kitap
- 9786051982656: *Yaşamak İçin Nedenler*, bandrollü
- 9786254106200: Pegasus Yayınları, Shane Parrish, bandrollü

Sonuçlar:
- Open Library'de üçü de yok. Google Books test ortamında kota hatası verdi; kullanıcının telefonunda da bulamadı.
- Kitapyurdu Cloudflare bot korumalı; D&R ve İdefix yönlendirme yapıyor ya da JavaScript ile yükleniyor.
  Hiçbiri tarayıcıdan doğrudan sorgulanamıyor (CORS yok).
- Kültür Bakanlığı ISBN sisteminin herkese açık API'si yok.
- Bu yüzden çözüm olarak A-2 ve A-3 seçildi. Ücretli servis (ISBNdb vb.) şimdilik yok.
