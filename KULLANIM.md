# Kitap Notlarım: Kullanım Kılavuzu

Tek bir uygulama hem bilgisayarda hem Android telefonda çalışır (yüklenebilir web uygulaması, PWA).

## Bilgisayarda açmak
1. `Baslat.bat` dosyasına çift tıklayın. Tarayıcıda `http://localhost:8765` açılır.
2. Chrome / Edge adres çubuğundaki **⊕ Yükle** simgesine basın; masaüstünüzde "Kitap Notlarım" simgesi oluşur.
3. Uygulamayı kullanırken siyah PowerShell penceresi açık kalmalıdır.

## Android telefonda açmak
Telefonun uygulamaya ulaşabilmesi için klasörün internette (HTTPS) yayınlanması gerekir. Örneğin
GitHub Pages ya da Netlify ücretsiz olarak kullanılabilir. Adresi Chrome'da açın, sonra
⋮ menüsü → **Ana ekrana ekle / Uygulamayı yükle** seçeneğine dokunun.
Verileriniz sunucuya gitmez; her cihazın kendi hafızasında saklanır.

## Yapay zekâ özellikleri
Fotoğraftan yazıya çevirme, içindekiler okuma, künye fotoğrafından kitap bilgisi, anlamına göre arama
ve özet için **Ayarlar → Claude API anahtarı** girilmelidir. Anahtarı https://console.anthropic.com
adresinden alabilirsiniz. Kullanım başına küçük bir ücret alınır. Anahtar her cihaza ayrıca girilir.

## Telefon ↔ bilgisayar aktarımı
Ayarlar → **Yedek al**. Oluşan `.json` dosyasını diğer cihaza gönderin (Drive, WhatsApp, e-posta),
orada Ayarlar → **Yedeği içe aktar**. Kayıtlar birleştirilir; aynı kayıt iki cihazda da değiştiyse
en son düzenlenen kalır.

## Önemli
- Tarayıcı verilerini temizlerseniz notlar silinir. Düzenli olarak yedek alın (uygulama 14 günde bir hatırlatır).
- PDF için: Dışa aktar → PDF / Yazdır → yazıcı olarak "PDF olarak kaydet".
