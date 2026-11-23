# Yapılacaklar

Durum: **1. aşama (A, D, E) sürüm 2.3'te uygulandı.** Sırada: 2. aşama (C, kitap listeleri), 3. aşama (B, e-kitap okuyucu).
Uygulama adı "Kitap & Notlarım" olarak değiştirildi.

## Verilen kararlar (23.11.2026)
- **Seçkin Kitaplar:** En çok beğenilen, "hayatıma dokundu" denilen kitaplar.
- **Tek kitap kaydı + işaretler:** Kitap bir kez kaydedilir; listeler işaretle çalışır (Kütüphanemde var,
  Okunacak, Satın alınacak, Seçkin, Özel). Bir kitap birden fazla listede olabilir. "Satın alınacak"
  kitap tek dokunuşla "Kütüphanem"e geçer. Konu başlıkları tüm listelerde ortaktır.
- **Düşüncelerim ayrı kalır** (Not Defteri ile birleşmez).
- **Not Defteri:** Defterlerin içindeki her nota başlık eklenebilir.
- **Menü sırası:** Kitaplar · Not Defteri · Düşüncelerim · Günlük · Ara · Diğer
- **Kilit:** Bütün kilitli bölümler için tek PIN ve tek kurtarma kodu. Ayarlar'dan hangi bölümlerin
  kilitli olacağı seçilir (Günlük, Düşünceler, Özel Notlar, Özel Kitaplar, kullanıcının defterleri…).
- **PDF:** İki görünüm olacak, tek düğmeyle geçilecek. Orijinal görünümde sayfa aynen kalır, zemin rengi
  ve yakınlaştırma ayarlanır. Metin görünümünde yazı tipi ve boyutu da değişir.
- **EPUB / Word / TXT sayfa numarası:** O anki ekrana göre hesaplanır, yanında yüzde gösterilir. Kalınan yer
  yazı boyutu değişse de korunur. Alıntıya kaydedilen sayfa numarası kaydederken düzeltilebilir.
- **Alışveriş Listem:** Kategoriler (Market, Eczane…) altında işaretlenebilir maddeler; alınanlar ✓,
  istenirse alınanlar silinir.
- **Uygulama sırası:** 1) A (barkod) + D (Not Defteri) + E (ayarlar, gizlilik, kılavuz), 2) C (kitap listeleri), 3) B (e-kitap okuyucu).
- **Gizlilik iletişimi:** Gizlilik politikasına iletişim adresi olarak **mkaraggoz@gmail.com** yazılacak (kullanıcı yazılışı teyit etti).

## A. Kitap ekleme ve bilgi bulma
1. **Tam ekran barkod okuyucu:** Kamera tam ekran açılsın, kendiliğinden ve sürekli odaklansın; barkodu
   küçük bir çerçeveye getirmek gerekmesin, görüntünün her yerinde algılasın.
   **Hassasiyet:** Kamera barkodu görür görmez anında algılasın. Yapılacaklar:
   - Android Chrome'daki yerleşik barkod algılayıcı (BarcodeDetector) öncelikli kullanılsın; donanım destekli ve en hızlısı.
   - Yüksek çözünürlüklü görüntü, sürekli otomatik odak (focusMode: continuous) ve uygunsa yakınlaştırma.
   - Saniyede daha fazla kare taransın; tarama alanı sınırlaması kaldırılsın (tüm görüntü taransın).
   - Okununca titreşim ve kısa ses; aynı barkod iki kez okunmasın.
   - Karanlık ortam için **🔦 fener** düğmesi (telefon destekliyorsa).
2. **Kitap bulunamazsa** "🔎 Kitapyurdu'nda ara" ve "🔎 Google'da ara" düğmeleri (ISBN ile arama sayfası açılır).
3. **Kendi kayıtlarından doldurma:** Elle girilmiş bir ISBN tekrar okutulunca bilgiler kendiliğinden dolsun.

## B. E-kitap okuyucu (PDF, Word, TXT, EPUB)
4. **Kitap ekle** bölümünden PDF / Word (.docx) / metin (.txt) / EPUB dosyası yükleme (giriş noktası Kitap ekle ekranı).
5. Okuma ayarları: **zemin rengi** (hazır gözü yormayan tonlar + istenen herhangi bir renk için renk seçici), yazı boyutu,
   yazı tipi (istenen yazı stiline değiştirilebilir). **Varsayılan: en rahat okunan yazı tipi** gelir.
6. Metni seçip **"Notlarıma kaydet"**: önem derecesi, etiket, yorum, tekrar oku seçeneklerinin **hepsi** kayıt ekranında gelsin;
   her alıntıya **ayrı renk tonu** seçilebilsin. Seçilen renk okurken metnin üzerinde **fosforlu kalem gibi** görünsün.
7. Sayfalara "Tekrar oku" işareti; notlara ve sayfalara yorum ekleme.
8. Sayfa çevirme: **kitap gibi çevirme** (sayfa çevirme efekti) ya da **başparmakla sağa/sola kaydırma**.
9. Altta **kaçıncı sayfada olunduğu** yazsın; sayfa kısmına numara yazınca o sayfaya gitsin; kitaba tekrar
   gelince **kalınan sayfadan** devam etsin.

## C. Kitap listeleri
10. **Özel Kitaplar** sekmesi: Herkesin ulaşmasını istemediğiniz kitaplar; PIN ile kilitli (günlük gibi).
    Kilitliyken bu kitaplar ve alıntıları Kitaplar listesinde, aramada, etiketlerde ve Tekrar Oku'da da görünmesin.
11. **Seçkin Kitaplar:** En çok beğenilen, "hayatıma dokundu" denilen kitaplar.
12. **Okunacak Kitaplar** sekmesi: Okumak istenen kitapların listesi. Yıldız (okuma/önem derecesi); sıralama **yıldıza göre**
    ya da **"ilk okumak istediğim" 1'den başlayan sıra numarasına göre**; konulara göre tasnif; yeni konu başlığı ekleme.
13. **Kütüphanem:** Evdeki kitaplar; barkod / ISBN / elle ekleme (bulunamayan ISBN elle girilince sonra tanınsın: yapıldı);
    konulara göre tasnif; **"okudum" işareti**; **okuduklarım / okumadıklarım** ayrı görülebilsin (süzgeç ve sayılar);
    konu başlıkları altında, okundu bilgisiyle **kütüphane kataloğu**: PDF olarak kaydetme ve **yazıcıdan çıktı**.
14. **Satın Almak İstediğim Kitaplar:** Diğer listeler gibi yıldız ve sıralama; konu başlığına göre tasnif;
    **"ilk önce almak istediklerim"** sırası; **alış listesi**: PDF ve yazıcıdan çıktı. Alınan kitap tek dokunuşla Kütüphanem'e geçer.

## D. Not Defteri
15. Menüde **Not Defteri** (Kitaplar ile Düşüncelerim arasında). İçinde **Genel Notlar** ve **Özel Notlar**; "＋ Not Defteri" ile yeni defter ekleme ve adlandırma.
16. Ayarlar'dan istenen not defterine PIN kilidi; tüm kilitler için **tek kurtarma kodu**.
17. Her notun kaydedildiği tarih ve saat görünsün.
18. Not defteri içinde **Alışveriş Listem**; kendi alışveriş kategorilerini ekleyip adlandırma.

## E. Ayarlar, gizlilik, kılavuz
19. **Ayarlar'dan yönetim:** Yeni eklenen her özelliğin ayarı Ayarlar'dan rahatça yapılabilsin. Önerilen bölümler:
    - **🔒 Kilit:** PIN aç/kapat/değiştir; hangi bölümler kilitli (Günlük, Düşüncelerim, Özel Notlar, Özel Kitaplar, kendi defterleri); kurtarma kodu yenileme.
    - **🏷️ Konu başlıkları:** Kitap konularını ekleme, yeniden adlandırma, silme, sıralama.
    - **📝 Not defterleri:** Ekleme, adlandırma, sıralama, silme; Alışveriş kategorileri.
    - **📔 Günlük başlıkları:** Ekleme, emoji, gizleme (şu an Günlük sayfasında; Ayarlar'a da konacak).
    - **🏷️ Konu başlıkları** (kitap listeleri için ortak): ekleme, adlandırma, sıralama, silme.
    - **📖 Okuma görünümü:** Varsayılan zemin rengi, yazı tipi, yazı boyutu, satır aralığı, sayfa çevirme biçimi (kaydırma ya da kitap gibi çevirme).
    - **📷 Barkod:** Bulunamazsa hangi arama düğmeleri görünsün (Kitapyurdu, Google), titreşim açık/kapalı.
    - **🧭 Menü:** Alt menüde hangi bölümlerin görüneceği ve sırası (6 bölüm sığmazsa diye).
    - Var olanlar: Yedekleme, dışa aktarma, yükleme/paylaşma, verileri silme.
20. **Kapsamlı gizlilik politikası:** Bütün yeni özellikleri kapsayacak şekilde yeniden yazılacak: yüklenen
    e-kitap dosyaları, kamera, fotoğraflar, kilit/PIN, yedek dosyaları, internet bağlantıları (ISBN arama,
    Kitapyurdu/Google arama düğmeleri, yazı tipleri), çerezler, çocuklar, veri silme, haklar (KVKK/GDPR
    çerçevesinde), değişiklikler, iletişim (mkaraggoz@gmail.com). Hem uygulama içinde hem `privacy.html`.
21. (Yapıldı; 2. ve 3. aşamada yeni bölümler kılavuza ve gizlilik politikasına eklenecek.) **Kullanım kılavuzu Ayarlar'da:** Ayarlar → "📘 Kullanım kılavuzu" bölümü; konulara ayrılmış, aranabilir,
    adım adım anlatım (kitap ekleme, barkod, alıntı, okuyucu, listeler, not defteri, düşünceler, günlük, kilit,
    yedekleme, dışa aktarma, kurulum ve güncelleme, sık sorulan sorular).

## F. Ertelenenler
22. **Play Store'a yükleme:** Kullanıcı karar verince konuşulacak. (Teknik hazırlık zaten yapıldı.)

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
