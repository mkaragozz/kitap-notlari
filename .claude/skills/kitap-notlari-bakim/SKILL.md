---
name: kitap-notlari-bakim
description: Kitap & Notlarım uygulamasında (mkaragozz.github.io/kitap-notlari, bu depo) değişiklik, yeni özellik, hata düzeltme, tasarım düzenlemesi ya da yayınlama yapılırken kullanılır — kullanıcı "uygulamaya şunu ekle", "şu düğmeyi taşı", "telefonda şu çalışmıyor", "ekran görüntüsündeki yeri değiştir", "yayınla", "sürüm", "güncelleme gelmedi" gibi bir şey dediğinde, bu depoda herhangi bir .js/.css/.html dosyasına dokunmadan önce MUTLAKA bu skill'i oku.
---

# Kitap & Notlarım: bakım ve geliştirme

Uygulama derleme adımı olmayan, saf JavaScript (ES modülleri) ile yazılmış, internetsiz çalışan bir PWA'dır.
GitHub Pages `main` dalından yayınlanır. Kullanıcı Türkçe konuşur, teknik terim bilmez, telefonda kullanır.

## Kullanıcıyla çalışma kuralları (neden önemli)

- **Türkçe, sade dil.** Kod, commit, dal adı gibi terimleri kullanıcıya açıklamadan kullanma.
- **Önce göster, sonra yayınla.** Her değişiklikten sonra telefon boyutunda (360×800, deviceScaleFactor 2)
  ekran görüntüsü al ve `SendUserFile` ile gönder. Kullanıcı açıkça **"yayınla"** demeden `main`e birleştirme.
  Kullanıcı, görmediği bir şeyin canlıya çıkmasını istemiyor.
- **Emin olmadığında sor.** Kullanıcı "tereddütte kaldığında bana soru sor" dedi. Ama bariz kararlar için
  soru sorup bekletme; önerini yap, ekran görüntüsünde göster, değiştirmek isterse söyler.
- Kullanıcı ekran görüntüsü üzerinde renkli kalemle işaret koyarak istek yapar ("kırmızıyla işaretlediğim yere…").
  Her işareti tek tek eşleştir, yanıtta her rengi ayrı madde olarak karşıla.
- Tasarım tercihi: **pratik, derli toplu, kalabalık olmayan.** Aynı işi yapan ikinci bir düğme ekleme.
- Sürüm numaralarını sen belirle (kullanıcı "sana bırakıyorum" dedi): küçük değişiklik +0.1.

## Dosya haritası

| Dosya | Ne var |
|---|---|
| `index.html` | Kabuk; açılış bekçisi (`window.__knStarted` gelmezse "🔄 Onar ve yeniden aç" = `window.__knRepair`) |
| `app.js` | Yönlendirme (`route()`, `NAV_OF`, `NAV_ITEMS`), ana sayfa (`renderHome`), kitap formu, alıntı editörü, Diğer (`renderMore`), Ayarlar alt sayfaları, açılış göçleri (migration) ve `APP_VERSION` |
| `db.js` | IndexedDB (`DB_VERSION`, `STORES`, `files` deposu), ayar varsayılanları (`DEFAULTS`), yedek al/içe aktar |
| `lists.js` | Kitap bölümleri: `LISTS`, `SECTION_ROUTES`, `PRIVATE_LOCK`, liste kartları, kategoriler, katalog PDF |
| `reader.js` | E-kitap okuyucu (PDF/Word/TXT/EPUB), vurgular, "Alıntılarıma aktar" |
| `cards.js`, `export.js` | Alıntı/düşünce kartları; PDF/Word/Excel dışa aktarma, kaynak satırı |
| `articles.js`, `blog.js`, `notes.js`, `thoughts.js`, `journal.js`, `reports.js` | Bölümler |
| `lock.js` | PIN, kurtarma kodu, bölüm kilitleri (`isOpen(section)`) |
| `scanner.js` | Tam ekran barkod okuyucu, ISBN hafızası, arama siteleri |
| `guide.js` | Uygulama içi kullanım kılavuzu: **arayüz değiştiyse burayı da güncelle** |
| `ui.js`, `styles.css` | Ortak yardımcılar; stiller (yeni stiller dosyanın sonuna `/* ---------- X.Y: … ---------- */` başlığıyla eklenir) |
| `sw.js` | Service worker: `V`, `MODS` listesi, önbellek |
| `privacy.html` | Gizlilik politikası (iletişim: kullanıcının verdiği e-posta) |
| `KULLANIM.md`, `YAPILACAKLAR.md` | Kullanıcıya yönelik notlar; ertelenen işler (Play Store yüklemesi gibi) |
| `lib/` | Yerel kopya kütüphaneler: html5-qrcode, pdf.js, mammoth, jszip (CDN'e bağımlı kalma) |

## Altın kural: sürüm eki

Her `import` satırı ve `index.html`deki her yerel dosya `?v=X.Y` ekiyle yüklenir. `sw.js` içindeki `V` ve
`app.js` içindeki `APP_VERSION` aynı sayıyı taşır. **Herhangi bir uygulama dosyası değiştiğinde üçü birlikte
yükseltilmeli.** Atlanırsa telefonda eski ve yeni dosyalar karışır ve boş sayfa açılır (2.1'de yaşandı).

```bash
python3 .claude/skills/kitap-notlari-bakim/scripts/bump_version.py 3.3   # hepsini birden yükseltir ve doğrular
```

Yeni bir `.js` modülü eklersen `sw.js` içindeki `MODS` listesine de ekle; yoksa internetsiz açılmaz.
`lib/` kütüphanelerinin kendi sürüm ekleri vardır (`pdf.min.js?v=3.11.174`); bunlara elle `sed` uygulama — eski bir
toplu değiştirme bunları `3.31.174` yapmıştı. Betik yalnızca tam eşleşen eki değiştirir.
`sw.js` `/vadeli/` yolunu bilerek atlar (aynı sitede ayrı uygulama vardı); bu satırı kaldırma.

## Veri değişiklikleri

- Silme = mezar taşı (`deleted: true`, `updatedAt`). Yedek birleştirme `updatedAt`e göre yapılır; kaydı gerçekten silme.
- Yeni depo gerekiyorsa `STORES`a ekle ve `DB_VERSION`ı artır.
- Mevcut kullanıcıların verisini/ayarını değiştiren her şey **tek seferlik göç** olarak yazılır: `app.js`
  açılışında `if (!st0.<bayrak>) { …; DB.setSettings({ <bayrak>: true }) }`. Örnek: `nav32` alt menüye Blog'u ekledi.
  `db.js` `DEFAULTS` yalnızca yeni kurulumları etkiler; eski kurulumlar için göç şart.
- Özel (kilitli) kayıtlar `DB.visibility.hidePrivate` ile her listeden gizlenir; yeni liste yazarken `DB.books()`/
  `DB.articles()` kullan (filtreli), `getBookRaw` yalnızca kilit ekranı kararı için.

## İş akışı

1. Önce `git fetch origin main` ve ana daldaki yeni commit'leri çalışma dalına birleştir: kullanıcı başka oturumlarda da
   bu depoda çalışıyor (ör. aynı siteye ayrı bir uygulama eklenip taşındı, sürüm yükseltildi). Ana dalda kullanılmış
   bir sürüm numarasını tekrar kullanma; bir üstüne çık.
2. İsteği maddelere ayır; belirsiz olanı sor.
3. Kodu değiştir. Bash güvenlik kontrolü `$$` ve `rm` içeren heredoc'ları engeller: çok satırlı düzenlemeler için
   betiği Write ile scratchpad'e yaz, `python3 betik.py` ile çalıştır (her `old` metnin varlığını `assert` et).
4. Sürümü yükselt (`bump_version.py`).
5. Yerel sunucu + duman testi:
   ```bash
   (curl -s -o /dev/null http://localhost:8765/ || (nohup python3 -m http.server 8765 >/dev/null 2>&1 &)); sleep 1
   node .claude/skills/kitap-notlari-bakim/scripts/smoke_test.js <çıktı-klasörü>
   ```
   Tüm rotaları gezer, sayfa hatalarını yazar, ana sayfa ve Diğer'in ekran görüntüsünü alır. Değiştirdiğin
   ekranı ayrıca Playwright ile örnek veri girerek test et (Chromium hazır; `playwright install` çalıştırma).
   Kamera ile barkod ve dokunarak metin seçme yalnızca gerçek telefonda denenebilir; bunu kullanıcıya söyle.
6. Ekran görüntülerini gönder, değişiklikleri madde madde (kullanıcının diliyle) anlat, "yayınla" de diye bekle.
7. Çalışma dalına commit + push (commit iletisi sonuna oturumun istediği atıf satırları).
8. Kullanıcı **"yayınla"** deyince: PR aç (`main` ← çalışma dalı), birleştir, sonra canlıyı doğrula:
   ```bash
   curl -s "https://mkaragozz.github.io/kitap-notlari/sw.js?t=$RANDOM" | grep -o "const V = '[0-9.]*'"
   ```
   Pages 1-3 dk gecikir; 30 sn arayla tekrar dene. Yeni sürüm görününce kullanıcıya: "Uygulamayı tamamen kapatıp
   açın; '✨ Uygulama güncellendi (sürüm X.Y)' bildirimi çıkar" de.

## Sık sorulanlar

- **"Güncelleme gelmedi / sürüm eski"**: Uygulamayı kapatıp iki kez açmasını iste. Açılmazsa "🔄 Onar ve yeniden aç"
  düğmesi yalnızca dosyaları yeniler, verileri silmez.
- **Türkçe kitap ISBN'i bulunamıyor**: Open Library/Google Books Türk yayınlarını az kapsar; Kitapyurdu vb. tarayıcıdan
  erişime kapalı (CORS/Cloudflare). Çözüm: bulunamayınca arama düğmeleri + ISBN hafızası (zaten var).
- **Bilgisayarda kullanım / cihazlar arası aktarım**: Chrome/Edge ⊕ Yükle; veriler Ayarlar → Yedekleme ile taşınır.
- **Play Store**: Kullanıcı erteledi; o istemeden başlama (bkz. `YAPILACAKLAR.md`).
