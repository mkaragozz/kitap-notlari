// 📘 Kullanım kılavuzu: Ayarlar → Kullanım kılavuzu. Konulara ayrılmış, aranabilir.
// Her konu: { id, e (simge), t (başlık), h (HTML içerik) }

export const GUIDE = [
  {
    id: 'basla', e: '👋', t: 'Başlarken',
    h: `<p><b>Kitap & Notlarım</b>; okuduğunuz kitaplardan alıntıları sayfa numarasıyla saklamanız, kendi notlarınızı ve düşüncelerinizi yazmanız, günlük tutmanız için hazırlanmış bir uygulamadır.</p>
      <ul><li>Alttaki menüden bölümler arasında geçersiniz: <b>📚 Kitaplar · 📝 Notlar · 💡 Düşünceler · 📔 Günlük · 🔎 Ara · ☰ Diğer</b>.</li>
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
      <li>Aynı sayfadan hangi bölümlerin kilitli olacağını seçin: Günlük, Düşüncelerim, Özel Notlar, kendi defterleriniz, Alışveriş Listem.</li></ol>
      <ul><li>Tüm kilitler için <b>tek PIN ve tek kurtarma kodu</b> vardır; kilidi bir kez açınca tüm kilitli bölümler açılır.</li>
      <li>Belirlediğiniz süre (varsayılan 5 dakika) kullanmazsanız ya da uygulamayı kapatırsanız kilit yeniden devreye girer. 🔒 düğmesiyle hemen kilitleyebilirsiniz.</li>
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
      <p>Kayıtlar <b>birleştirilir</b>; aynı kayıt iki cihazda da değiştiyse en son düzenlenen kalır. Yedek dosyası günlüğü, fotoğrafları ve özel notları da içerir; güvendiğiniz yerlere gönderin. PIN ve uygulama ayarları yedeğe girmez, her cihazda ayrıca yapılır.</p>`,
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
