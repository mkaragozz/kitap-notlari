// 📘 Kullanım kılavuzu: Ayarlar → Kullanım kılavuzu. Konulara ayrılmış, aranabilir.
// Her konu: { id, e (simge), t (başlık), h (HTML içerik) }

export const GUIDE = [
  {
    id: 'basla', e: '👋', t: 'Başlarken',
    h: `<p><b>Kitap & Notlarım</b>; okuduğunuz kitaplardan alıntıları sayfa numarasıyla saklamanız, kendi notlarınızı ve düşüncelerinizi yazmanız, günlük tutmanız için hazırlanmış bir uygulamadır.</p>
      <ul><li>Alttaki menüden bölümler arasında geçersiniz: <b>📚 Kitaplar · 📝 Notlar · 💡 Düşünceler · 📔 Günlük · ✍️ Blog · 🔎 Ara · ☰ Diğer</b>. Tekrar Oku, Etiketler ve Raporlar ☰ Diğer'dedir.</li><li>Ana sayfadaki arama kutusunun yanındaki <b>📷</b> düğmesi barkod okuyucuyu açar. Altındaki kutularla Kütüphanem, Satın Alınacaklar, Seçkin, Özel Kitaplar, E-kitaplar ve <b>📄 Makalelerim</b>'e geçersiniz.</li>
      <li>Menüde hangi bölümlerin görüneceğini <b>Ayarlar → 🧭 Menü</b>'den değiştirebilirsiniz; menüde olmayanlar <b>☰ Diğer</b> sayfasında durur.</li>
      <li>Bilgisayarda menü solda, telefonda altta görünür.</li>
      <li>Bütün verileriniz <b>yalnızca bu cihazda</b> saklanır. Düzenli olarak yedek alın (bkz. <i>Yedekleme</i>).</li></ul>`,
  },
  {
    id: 'kurulum', e: '📲', t: 'Kurulum, paylaşma ve güncelleme',
    h: `<p><b>Android:</b> Chrome'da uygulamanın adresini açın → sağ üstteki <b>⋮</b> → <b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>.</p>
      <p><b>iPhone / iPad:</b> Safari'de adresi açın → alttaki <b>Paylaş (□↑)</b> → <b>Ana Ekrana Ekle</b>.</p>
      <p><b>Bilgisayar:</b> Chrome ya da Edge'de adresi açın → adres çubuğunun sağındaki <b>⊕ Yükle</b>.</p>
      <p><b>Paylaşma:</b> Ayarlar → 📲 Yükle ve paylaş → <b>Uygulamayı paylaş</b>. Herkesin verisi kendi cihazında kalır; kimse sizin notlarınızı göremez.</p>
      <p><b>Güncelleme:</b> Yeni sürüm kendiliğinden gelir; uygulama bir kez yenilenir ve “✨ Uygulama güncellendi” der. Uygulama açılmazsa birkaç saniye sonra çıkan <b>🔄 Onar ve yeniden aç</b> düğmesine basın; notlarınız silinmez.</p>`,
  },
  {
    id: 'kitap', e: '📚', t: 'Kitap eklemek',
    h: `<ol><li><b>Kitaplar</b> sayfasında <b>＋ Kitap</b>'a dokunun (ya da ana sayfadaki <b>📷 Barkodla kitap ekle</b>).</li>
      <li><b>📷 Barkod okut</b>'a basın. Kamera tam ekran açılır; kitabın arkasındaki barkodu (978 ya da 979 ile başlar) kameraya gösterin, <b>kendiliğinden okunur</b>. Çerçeveye sığdırmanız gerekmez.</li>
      <li>Kitap bulunursa adı, yazarı, yayınevi, yılı, sayfa sayısı ve kapağı dolar. Kontrol edip <b>💾 Kaydet</b>'e basın.</li></ol>
      <p><b>Kitap bulunamazsa:</b> Türk yayınevlerinin bazı kitapları ücretsiz kitap veritabanlarında yoktur. Çıkan <b>🔎 Kitapyurdu'nda ara</b> / <b>🔎 Google'da ara</b> düğmeleriyle bilgilere bakıp formu elle doldurun. Bir kez elle kaydettiğiniz kitap, <b>aynı ISBN tekrar okutulunca kendiliğinden dolar</b>.</p>
      <p><b>İpuçları:</b> Karanlıkta <b>🔦 Fener</b>'i açın. Kamera açılmıyorsa <b>🖼️ Fotoğraftan</b> ile barkodun fotoğrafını seçin ya da ISBN'i elle yazıp <b>🔍 Bul</b>'a basın. Okununca titreşim ve ses gelir; bunları Ayarlar → 📷 Barkod'dan kapatabilirsiniz.</p>`,
  },
  {
    id: 'alinti', e: '✍️', t: 'Alıntı ve yorum kaydetmek',
    h: `<ol><li>Kitabın sayfasında <b>＋ Alıntı</b>'ya dokunun.</li>
      <li><b>Alıntı metni</b>ni ve <b>sayfa</b> numarasını yazın. Altındaki <b>💭 Yorumum</b> kutusuna kendi düşüncenizi ekleyin. Alıntı yazmadan yalnızca yorum da kaydedebilirsiniz.</li>
      <li><b>Önem derecesi</b>: ⭐ Önemli · ⭐⭐ Çok önemli · ⭐⭐⭐ Müthiş tespit.</li>
      <li><b>Etiketler</b>: “özgürlük”, “zaman” gibi konular. Aynı etiketi taşıyan alıntılar ve düşünceler <b>🔗 Bağlantılar</b>'da birbirine bağlanır.</li>
      <li>İsterseniz <b>🔖 Tekrar okunacaklar listesine ekle</b> kutucuğunu işaretleyip hatırlatma tarihi verin.</li></ol>
      <p>Kitap sayfasında alıntıları yıldıza göre süzebilir, <b>sayfa sırası / önem / en yeni</b>'ye göre sıralayabilirsiniz. 📋 düğmesi alıntıyı “Yazar, <i>Kitap</i>, s. 45” kaynağıyla kopyalar.</p>
      <p>İçindekiler sekmesine bölüm başlıklarını yazarsanız, sayfa numarası yazdığınızda alıntının bölümü kendiliğinden dolar.</p>`,
  },
  {
    id: 'anasayfa', e: '🏠', t: 'Ana sayfa ve kitapları taşımak',
    h: `<p>Ana sayfada üstte <b>📖 Okuyorum · 🕮 Okuyacağım · ✅ Okudum</b> sayıları, altında bu kitapların rafları durur. Kütüphanenizde olan kitaplarda köşede <b>🏠</b> simgesi görünür.</p>
      <ul><li>Kitabın köşesindeki <b>⋯</b> düğmesine dokunup <b>taşıyın</b>: Okuyorum, Okuyacağım, Okudum, <b>Kütüphaneme taşı</b>, Seçkin, Satın Alınacaklar ya da <b>Ana sayfadan kaldır</b>.</li>
      <li>Taşıdığınız ya da kaldırdığınız kitap ana sayfayı kalabalıklaştırmaz; silinmez ve “okundu” bilgisi istatistiklerde kalır. Taşımadıkça ana sayfada durur.</li>
      <li>Kütüphanem'de “Okudum” olarak işaretlediğiniz kitaplar ana sayfaya düşmez.</li></ul>`,
  },
  {
    id: 'raporlar', e: '📊', t: 'Raporlar ve istatistikler',
    h: `<p>☰ Diğer → <b>📊 Raporlar</b>. Bölüm varsayılan olarak PIN ile kilitlidir (Ayarlar → Kilit'ten değiştirilebilir).</p>
      <ul><li>Üstten dönem seçin: <b>Bu hafta, Bu ay, Bu yıl, Son 12 ay, Tümü</b> ya da <b>Tarih seç</b> ile istediğiniz aralık.</li>
      <li><b>Okuma:</b> bitirilen kitap, e-kitap ve makale sayısı; ayda ortalama kaç eser; her eserin kaç günde okunduğu; okuma hızı (sayfa/gün); okunan sayfa; uygulamanın okuyucusunda geçen süre; kaydedilen alıntılar.</li>
      <li><b>Pareto (80/20) grafikleri:</b> okuduklarınızın %80'inin hangi kategoriler ve yazarlar üzerinde toplandığı, alıntılarınızın hangi kitaplarda yoğunlaştığı. Koyu çubuklar %80'e ulaşan grubu, çizgi birikimli yüzdeyi gösterir.</li>
      <li><b>Yazma:</b> Günlük yazıları ve yazılan gün sayısı, ruh hâli dağılımı, yeni düşünceler ve eklemeler, blog yazıları, yazılan kelime; dönem dönem yazma etkinliği grafiği.</li>
      <li>Grafiklerdeki çubuğa dokununca ya da üzerine gelince değeri görünür. Altta bitirilen eserlerin tablosu vardır.</li>
      <li><b>🖨️ PDF</b> ile raporu PDF olarak kaydedin ya da yazdırın.</li></ul>
      <p class="muted">Günlerin doğru hesaplanması için kitabın başlama ve bitiş tarihleri gerekir; Bilgiler sekmesinden düzeltebilirsiniz. Okuma süresi, uygulamanın içinde okuduğunuz e-kitap ve makaleler için tutulur.</p>`,
  },
  {
    id: 'listeler', e: '🗂️', t: 'Kitap listeleri (Kütüphanem, Okunacak, Satın Alınacak, Seçkin, Özel)',
    h: `<p>Kitaplar sayfasının üstündeki sekmeler: <b>Tümü · Okuyorum · Okunacak · Kütüphanem · Satın Alınacak · Seçkin · E-kitaplar · 🔒 Özel</b>. Bir kitabı bir kez kaydedersiniz; hangi listelerde olacağını işaretler belirler (kitap ekleme ekranındaki <b>📚 Listeler ve konular</b> kutusu ya da kitabın Bilgiler sekmesi).</p>
      <ul><li><b>🕮 Okunacak:</b> Okumak istediğiniz kitaplar. ↑↓ ile <b>okuma sıranızı</b> (1, 2, 3…) belirleyin, ⭐ ile önem verin; yıldıza, ada ya da yazara göre de sıralayabilirsiniz. “📖 Okumaya başla” kitabı Okuyorum'a taşır.</li>
      <li><b>🏠 Kütüphanem:</b> Evinizdeki kitaplar. Barkodla, ISBN'le ya da elle ekleyin. <b>✅ Okudum / ○ Okumadım</b> ile işaretleyin; üstten “Okuduklarım / Okumadıklarım”ı ayrı görün. <b>🖨️ Katalog</b> ile konu başlıklarına ayrılmış, okundu bilgili kataloğunuzu PDF olarak kaydedin ya da yazdırın.</li>
      <li><b>🛒 Satın Alınacak:</b> Almak istediğiniz kitaplar. ↑↓ ile “önce almak istediklerim” sırası, ⭐ önem. <b>🛒 Aldım</b>'a basınca kitap Kütüphanem'e geçer. <b>🖨️ Alış listesi</b> ile işaretlemeli bir liste yazdırın.</li>
      <li><b>💎 Seçkin:</b> “Hayatıma dokundu” dediğiniz kitaplar.</li>
      <li><b>🔒 Özel:</b> Herkesin görmesini istemediğiniz kitaplar. PIN kilidi açıkken bu kitaplar ve alıntıları kilit açılana kadar hiçbir listede, aramada ve etiketlerde görünmez.</li>
      <li><b>🏷️ Kategoriler:</b> Her bölümün üstündeki “＋ Kategori” ile ekleyin (ör. Felsefe, Tarih, Roman); bütün bölümlerde ve makalelerde ortaktır, yanında o bölümdeki kitap sayısı yazar. “🗂️ Kategoriler” listeyi kategoriler altında gösterir. Yönetmek için: Ayarlar → 🏷️ Kategoriler.</li>
      <li><b>📱 E-kitaplar</b> bölümünde iki sekme vardır: <b>E-kitaplarım</b> ve PIN ile kilitli <b>🔒 Özel E-kitaplarım</b>. E-kitap yüklerken “🔒 Özel” kutusunu işaretlerseniz kitap Özel E-kitaplarım'a gider.</li></ul>`,
  },
  {
    id: 'okuyucu', e: '📱', t: 'E-kitap okuyucu (PDF, Word, TXT, EPUB)',
    h: `<ol><li><b>＋ Kitap</b> ekranındaki <b>📱 E-kitap dosyası</b> kutusundan PDF, Word (.docx), metin (.txt) ya da EPUB dosyası seçin. Kitabın adı ve yazarı dosyadan okunabiliyorsa kendiliğinden dolar.</li>
      <li>Kitap sayfasındaki <b>📖 Oku</b> düğmesiyle okumaya başlayın. Sonra tekrar açtığınızda <b>kaldığınız sayfadan</b> devam eder; ana sayfada “📖 Okumaya devam et” çıkar.</li></ol>
      <ul><li><b>Sayfa çevirme:</b> Başparmakla sağa/sola kaydırın, ekranın sağ/sol kenarına dokunun ya da alttaki ‹ › düğmelerini kullanın. Ayarlardan <b>“Kitap gibi”</b> çevirme efektini seçebilirsiniz.</li>
      <li><b>Sayfa numarası:</b> Altta yazar; dokunup numara yazarak o sayfaya gidin. EPUB, Word ve TXT'de sayfa numarası ekrana göre hesaplanır ve yanında yüzde (%) yazar; yazıyı büyütünce sayfa sayısı değişir ama kaldığınız yer korunur.</li>
      <li><b>Aa (okuma ayarları):</b> Zemin rengi (hazır gözü yormayan tonlar ya da 🎨 ile istediğiniz renk), yazı tipi (varsayılan: ekranda en rahat okunan <b>Literata</b>), yazı boyutu, satır aralığı, kenar boşluğu.</li>
      <li><b>PDF:</b> 📄 <b>Orijinal görünüm</b> sayfayı aynen gösterir (zemin rengi ve yakınlaştırma değişir, sayfa numaraları kitapla aynıdır). 📝 <b>Metin görünümü</b> yazıyı çıkarır; yazı tipi ve boyutu da değişir, resimler ve sayfa düzeni kaybolur. Üstteki 📝/📄 düğmesiyle geçiş yapın.</li>
      <li><b>Alıntı kaydetme:</b> Metni parmağınızla seçin, alttaki <b>📥 Alıntılarıma aktar</b>'a basın. Alıntı kitabın Alıntılar bölümüne sayfa numarasıyla gider; yıldız, etiket, yorum, tekrar oku ve <b>renk</b> seçebilirsiniz. Seçtiğiniz renk metnin üzerinde fosforlu kalem gibi görünür; vurguya dokununca alıntıyı düzenlersiniz.</li>
      <li><b>🔖</b> bulunduğunuz sayfayı <b>Tekrar Oku</b> listesine ekler; <b>💬</b> sayfaya yorum yazar; <b>📑</b> tüm alıntıları, işaretleri ve yorumları listeler, dokununca o yere gider.</li>
      <li>Kitap sayfasındaki alıntı kartlarında 📖 düğmesi alıntının kitaptaki yerini açar.</li>
      <li><b>Taranmış PDF'ler:</b> Bazı PDF'ler kitabın fotoğrafıdır; içindeki metin, tarayan programın yazı tanımasıyla (OCR) eklenmiştir ve bozuk olabilir. 📝 metin görünümünde böyle bir sayfaya gelince üstte uyarı çıkar; <b>📄 Orijinal görünüm</b> sayfanın kendisini gösterir ve yazı düzgün okunur.</li></ul>
      <p class="muted">Dosyalar yalnızca bu cihazda saklanır. Eski Word biçimi (.doc) desteklenmez; Word'de “.docx” olarak kaydedin. Şifreli (DRM'li) e-kitaplar açılamaz.</p>`,
  },
  {
    id: 'makale', e: '📄', t: 'Makaleler',
    h: `<ol><li>Ana sayfadaki <b>📄 Makalelerim</b> kutusundan (ya da ☰ Diğer'den) → <b>＋ Makale</b>.</li>
      <li><b>DOI</b> numarasını yazıp <b>🔍 Bul</b>'a basın: başlık, yazarlar, dergi, yıl, cilt, sayı ve sayfalar kendiliğinden dolar.</li>
      <li>İsterseniz PDF ya da Word dosyasını ekleyin. Dosyası olmayan (yalnızca bağlantısı olan ya da kâğıt) makaleleri de kaydedebilirsiniz.</li></ol>
      <ul><li>Makaleler kitap okuyucusuyla okunur; alıntı, renk, yıldız, etiket, yorum, tekrar oku, sayfaya yorum ve kaldığı yerden devam <b>kitaplardaki gibidir</b>.</li>
      <li><b>📋 Okuyacaklarım / ✅ Okuduklarım</b> ile ayrı görün; “Okudum” ile işaretleyin. Kategoriler kitaplarla ortaktır.</li>
      <li><b>🔒 Özel Makalelerim:</b> Makale eklerken “🔒 Özel makale”yi işaretleyin; PIN ile kilitli sekmede durur, kilitliyken aramada da görünmez.</li></ul>`,
  },
  {
    id: 'blog', e: '✍️', t: 'Blog',
    h: `<p>Blog yazılarınızı yazıp saklayabileceğiniz <b>kişisel arşivinizdir</b>; internette yayınlanmaz.</p>
      <ul><li><b>✍️ Yeni yazı</b>: başlık yazın; araç çubuğuyla <b>kalın, italik, altı çizili, ara başlık, liste, alıntı, bağlantı</b> ekleyin. Kapak fotoğrafı, kategori ve etiket verin.</li>
      <li><b>📝 Taslak olarak kaydet</b> ya da <b>✅ Tamamlandı olarak kaydet</b>. Yazma ve düzenleme tarihleri saklanır.</li>
      <li>Blog sayfasında yazılar <b>yıl ve ay</b> olarak arşivlenir; taslak/tamamlanan, kategori ve arama ile süzün.</li>
      <li>Yazıyı açıp <b>📋 Metni kopyala</b>, <b>🌐 HTML kopyala</b> (Blogger, WordPress, Medium gibi sitelere biçimiyle yapıştırmak için), <b>📝 Word</b> ya da <b>🖨️ PDF</b>.</li>
      <li>İsterseniz Blog'u Ayarlar → 🔒 Kilit'ten PIN ile kilitleyin.</li></ul>`,
  },
  {
    id: 'notlar', e: '📝', t: 'Not Defteri',
    h: `<p>Not Defteri'nde <b>📒 Genel Notlar</b> ve <b>🔐 Özel Notlar</b> hazır gelir. <b>＋ Not Defteri</b> ile istediğiniz kadar defter ekleyip adını ve simgesini seçebilirsiniz.</p>
      <ul><li>Bir deftere girip <b>＋ Not</b>'a dokunun; <b>başlık</b> ve <b>not</b> yazın. Not, yazdığınız <b>tarih ve saatle</b> kaydedilir; düzenlerseniz son düzenleme zamanı da görünür.</li>
      <li>Notu açıp başka bir deftere taşıyabilir, 📋 ile kopyalayabilir, 🗑️ ile silebilirsiniz.</li>
      <li>Defterin adını, simgesini ya da kilidini değiştirmek için defterin içindeki <b>✏️</b> düğmesine dokunun. Defterleri sıralamak için: Ayarlar → 📝 Not defterleri.</li>
      <li>Hangi defterin <b>PIN ile kilitli</b> olacağını Ayarlar → 🔒 Kilit'ten seçersiniz.</li></ul>`,
  },
  {
    id: 'alisveris', e: '🛒', t: 'Alışveriş Listem',
    h: `<ol><li>Not Defteri'nde <b>🛒 Alışveriş Listem</b>'e girin.</li>
      <li>Kategori ekleyin (ör. 🛒 Market, 💊 Eczane) ya da hazır önerilerden birine dokunun. Kendi kategorinize ad ve simge verebilirsiniz.</li>
      <li>Kategorinin altındaki kutuya alacağınızı yazıp <b>＋</b>'ya basın.</li>
      <li>Aldıkça kutucuğu işaretleyin ✓. <b>🧹 Alınanları temizle</b> ile işaretlileri silin.</li></ol>
      <p>Kategorileri yeniden adlandırmak ya da silmek için kategorinin yanındaki <b>✏️</b>'ye, sıralamak için Ayarlar → 📝 Not defterleri'ne bakın.</p>`,
  },
  {
    id: 'dusunce', e: '💡', t: 'Düşüncelerim',
    h: `<p>Kitaplardan bağımsız, aklınıza gelen fikirler içindir.</p>
      <ul><li>Üstteki kutuya yazıp <b>💾 Kaydet</b>'e basın; tarih ve saatle kaydedilir. Başlık, defter, etiket ve yıldız için <b>Ayrıntılı…</b>'yı kullanın.</li>
      <li>Düşünceleri <b>konu defterlerine</b> ayırabilirsiniz (<b>＋ Defter</b>).</li>
      <li>Bir düşünceyi açıp <b>➕ Ekle</b> ile geliştirin; her ek kendi tarih-saatiyle görünür, böylece fikrin zamanla nasıl olgunlaştığını izlersiniz.</li>
      <li>Etiketleri kitap alıntılarıyla ortaktır; <b>🔗 Bağlantılar</b> aynı konudaki alıntıları gösterir.</li>
      <li>⬇️ ile PDF ya da Word olarak dışa aktarın.</li></ul>`,
  },
  {
    id: 'gunluk', e: '📔', t: 'Günlük',
    h: `<ol><li><b>Günlük</b>'te o günün sayfası açılır. Genel ruh hâlinizi bir yüz ifadesiyle seçin.</li>
      <li>“📍 Bugün nereye gittim”, “👀 Ne gördüm”, “⚡ Önemli bir olay” gibi bir başlığa dokunup yazın. İsterseniz <b>📷 fotoğraf</b> ekleyin.</li>
      <li>Gün içinde istediğiniz kadar yazın; her yazı o anın saatiyle kaydedilir ve gün sonunda <b>tek bir sayfa</b> olarak okunur.</li></ol>
      <ul><li><b>＋ Yeni başlık ekle</b> ile kendi başlığınızı emojisiyle ekleyin; <b>⚙️ Başlıklar</b>'dan hazır başlıkları yeniden adlandırın ya da gizleyin.</li>
      <li><b>📅 Takvim</b>'de yazdığınız günler işaretlidir. Bir yıl önce aynı gün yazdıysanız “🕰️ Geçen yıl bugün” hatırlatması çıkar.</li>
      <li>Fotoğrafa dokunup <b>⬇️ Telefona kaydet</b> ile galeriye kaydedin. İpucu: Fotoğrafı telefonun kamerasıyla çekip “Galeriden seç” ile eklerseniz galeride de kalır.</li>
      <li>Takvimden <b>⬇️ Bu ayı dışa aktar</b> ile ayı PDF ya da Word olarak alın.</li></ul>`,
  },
  {
    id: 'ara', e: '🔎', t: 'Arama, etiketler ve tekrar okuma',
    h: `<p><b>Ara</b>: Kitaplarda, alıntılarda, yorumlarda, etiketlerde, içindekilerde, notlarda, düşüncelerde ve günlükte birlikte arar. Türkçe karakter yazmasanız da bulur (ör. “ozgurluk” → “özgürlük”). Kilitli bölümler kilit açılmadan aramaya girmez.</p>
      <p><b>Etiketler</b>: Tüm konu etiketlerinizi gösterir; birine dokunduğunuzda o konunun geçtiği tüm kitaplar, alıntılar ve düşünceler listelenir.</p>
      <p><b>Tekrar Oku</b>: Tekrar okumak için işaretlediğiniz alıntılar; zamanı gelenler, yaklaşanlar ve tarihsizler olarak ayrılır. Okuyunca <b>✅ Okudum</b>'a basın.</p>`,
  },
  {
    id: 'kilit', e: '🔒', t: 'PIN kilidi',
    h: `<ol><li>Ayarlar → <b>🔒 Kilit</b> → <b>PIN kilidini aç</b>. 4 haneli PIN'i iki kez girin.</li>
      <li>Size bir <b>kurtarma kodu</b> gösterilir (ör. K7M4-9QX2). <b>Mutlaka bir yere yazın</b>; bir daha gösterilmez.</li>
      <li>Aynı sayfadan hangi bölümlerin kilitli olacağını seçin: Günlük, Düşüncelerim, Özel Kitaplar, Özel E-kitaplarım, Özel Makalelerim, Blog, Özel Notlar, kendi defterleriniz, Alışveriş Listem.</li></ol>
      <ul><li>Tüm kilitler için <b>tek PIN ve tek kurtarma kodu</b> vardır.</li>
      <li>Kilitli bir bölümden <b>çıktığınız anda</b> kilit yeniden devreye girer (ör. Özel Notlar'dan Not Defteri'ne dönünce özel notlar "Son notlar"da görünmez). Bunu Ayarlar → Kilit → <b>Kilitli bölümden çıkınca hemen kilitle</b> ile kapatabilirsiniz.</li>
      <li>Ayrıca belirlediğiniz süre (varsayılan 5 dakika) kullanmazsanız ya da uygulamayı kapatırsanız kilit yeniden devreye girer. 🔒 düğmesiyle hemen kilitleyebilirsiniz.</li>
      <li>Kurtarma kodunu uygulamanın <b>dışında</b> saklayın (kâğıt, telefonun kendi not uygulaması). Kilitli bir defterde saklarsanız PIN'i unuttuğunuzda ona ulaşamazsınız.</li>
      <li><b>PIN'i unuttuysanız:</b> kilit ekranında <b>PIN'i unuttum</b> → kurtarma kodunu yazın → yeni PIN belirleyin.</li>
      <li>Kurtarma kodunu kaybettiyseniz PIN'i bilirken Ayarlar → Kilit → <b>Kurtarma kodunu yenile</b> ile yenisini alın.</li></ul>
      <p class="muted">Bu kilit, telefonunuzu eline alan birinin bu bölümleri açmasını engeller; veriler cihazda şifrelenmiş değildir.</p>`,
  },
  {
    id: 'yedek', e: '💾', t: 'Yedekleme ve cihazlar arası aktarım',
    h: `<p>Verileriniz yalnızca bu cihazda durur. Tarayıcı verilerini temizlerseniz ya da telefonu sıfırlarsanız silinir; bu yüzden <b>düzenli yedek alın</b> (uygulama 14 günde bir hatırlatır).</p>
      <ol><li>Ayarlar → <b>💾 Yedekleme</b> → <b>📤 Yedek al</b>. Bir <code>.json</code> dosyası oluşur.</li>
      <li>Dosyayı diğer cihaza gönderin (Drive, WhatsApp, e-posta, USB).</li>
      <li>Diğer cihazda Ayarlar → 💾 Yedekleme → <b>📥 Yedeği içe aktar</b>.</li></ol>
      <p>Kayıtlar <b>birleştirilir</b>; aynı kayıt iki cihazda da değiştiyse en son düzenlenen kalır. Yedek dosyası günlüğü, fotoğrafları ve özel notları da içerir; güvendiğiniz yerlere gönderin. PIN ve uygulama ayarları yedeğe girmez, her cihazda ayrıca yapılır.</p>
      <p><b>E-kitap ve makale dosyaları</b> büyük olduğu için normalde yedeğe girmez (notlarınız, alıntılarınız ve kaldığınız sayfa girer). Dosyaları da taşımak için Ayarlar → 💾 Yedekleme'de <b>“📱 E-kitap ve makale dosyalarını da yedekle”</b>yi işaretleyin.</p>`,
  },
  {
    id: 'disa', e: '⬇️', t: 'Dışa aktarma (PDF, Word, Excel)',
    h: `<ul><li><b>Bir kitabın notları:</b> Kitap sayfası → <b>⬇️ Dışa aktar</b>. Özet, içindekiler, yorumlar, etiketler, yalnızca belli yıldızdaki alıntılar gibi seçenekleri seçin.</li>
      <li><b>Tüm kitaplar:</b> Ayarlar → ⬇️ Dışa aktarma.</li>
      <li><b>Düşünceler:</b> Düşüncelerim → ⬇️. <b>Günlük:</b> Takvim → ⬇️ Bu ayı dışa aktar.</li>
      <li><b>PDF</b> için açılan yazdırma ekranında hedef olarak <b>“PDF olarak kaydet”</b>i seçin.</li></ul>`,
  },
  {
    id: 'ayar', e: '⚙️', t: 'Ayarlar',
    h: `<ul><li><b>🔒 Kilit:</b> PIN, kilitli bölümler, kilit süresi, kurtarma kodu.</li>
      <li><b>🧭 Menü:</b> Alt menüde görünecek bölümler ve sıraları.</li>
      <li><b>📷 Barkod:</b> Titreşim, ses, kitap bulunamayınca çıkacak arama düğmeleri.</li>
      <li><b>📖 Okuma görünümü:</b> Okuyucunun zemin rengi, yazı tipi, boyutu, satır aralığı, kenar boşluğu, sayfa çevirme biçimi.</li>
      <li><b>🏷️ Kategoriler:</b> Kitap ve makale kategorilerini ekleme, adlandırma, sıralama, silme.</li>
      <li><b>📝 Not defterleri:</b> Defterleri ve alışveriş kategorilerini ekleme, adlandırma, sıralama, silme.</li>
      <li><b>💡 Düşünce defterleri</b> ve <b>📔 Günlük başlıkları</b>.</li>
      <li><b>💾 Yedekleme</b>, <b>⬇️ Dışa aktarma</b>, <b>📲 Yükle ve paylaş</b>, <b>🔐 Gizlilik</b>, <b>⚠️ Verileri sil</b>.</li></ul>`,
  },
  {
    id: 'sss', e: '❓', t: 'Sık sorulan sorular',
    h: `<p><b>Kitap barkodla bulunamıyor, kitap korsan mı?</b><br>Büyük ihtimalle hayır. Türk yayınevlerinin birçok kitabı ücretsiz kitap veritabanlarında yok. Bilgileri bir kez elle girin; aynı ISBN bir daha okutulunca kendiliğinden dolar.</p>
      <p><b>Barkod okunmuyor.</b><br>Barkodun 978 ya da 979 ile başladığından emin olun (fiyat barkodları okunmaz). Işığı artırın ya da 🔦 Fener'i açın; telefonu biraz uzaktan tutup yavaşça yaklaştırın. Olmazsa ISBN'i elle yazın.</p>
      <p><b>Notlarım başka telefona geçer mi?</b><br>Kendiliğinden geçmez. Yedek alıp diğer cihazda içe aktarın.</p>
      <p><b>PIN'i ve kurtarma kodunu unuttum.</b><br>Kilitli bölümler açılamaz. Önceden aldığınız bir yedeği PIN kurulmamış başka bir cihaza aktararak verilerinize ulaşabilirsiniz. Bu yüzden kurtarma kodunu güvenli bir yere yazın ve düzenli yedek alın.</p>
      <p><b>Uygulama boş açılıyor.</b><br>Birkaç saniye bekleyin; çıkan <b>🔄 Onar ve yeniden aç</b> düğmesine basın. Notlarınız silinmez. Uygulama bilgisi ekranındaki “Verileri temizle”ye <b>basmayın</b>; bu notlarınızı siler.</p>
      <p><b>İnternet olmadan çalışır mı?</b><br>Evet. Yalnızca barkodla kitap bilgisi aramak ve Word/Excel'e aktarmak için internet gerekir.</p>`,
  },
];
