# Doğruluk protokolü

Amaç: kullanıcıya verilen her bilgi ya bu oturumda **test edilmiş**, ya **kaynağından okunmuş** olmalı; değilse
"doğrulayamadım" diye açıkça işaretlenmeli.

## Bilgi türüne göre doğrulama

| Bilgi | Doğrulama yolu | Örnek |
|---|---|---|
| Uygulama davranışı | Playwright testi, ekran görüntüsü, konsol çıktısı | "30 ekranı gezdim, hata yok" |
| Canlı sitenin sürümü | `curl -s https://…/sw.js?t=$RANDOM \| grep "const V"` | "Sitede V='3.5' görünüyor" |
| Kütüphane sürümü | Dosyanın başlığı, `npm view <paket> version`, `npm pack` | |
| Kütüphane lisansı | `lib/*.LICENSE` dosyasının metni | "pdf.js: Apache License 2.0" |
| Güvenlik açığı | `npm audit --json` + danışma sayfasının kendisi (github.com/advisories/GHSA-…) | etkilenen aralık, düzeltilmiş sürüm, önerilen önlem |
| Yasa / yönetmelik | Resmî metin (mevzuat.gov.tr, kvkk.gov.tr, eur-lex.europa.eu) | madde numarası ve adres |
| Mağaza kuralı / ücret | Resmî yardım merkezi sayfası | adres + okunduğu tarih |
| Tarayıcı API desteği | MDN (developer.mozilla.org) ya da gerçek cihazda deneme | |

## Ağ engeli olduğunda

Oturumun ağ politikası bazı siteleri engelleyebilir (ör. cdn.sheetjs.com 403 döndü). Bu durumda:
- Başka resmî bir kaynaktan doğrula (npm kayıt defteri, GitHub danışma sayfası).
- Doğrulayamıyorsan bilgiyi kullanma ya da "doğrulayamadım" diye işaretle; tahminle boşluğu doldurma.

## Raporlama şablonu

```
Yaptıklarım: …
Test sonuçları: … (hangi test, ne çıktı)
Kaynaklar: <adres> — <ne doğrulandı>
Doğrulayamadıklarım: … (neden, nasıl doğrulanır)
Kalan riskler: … (ör. "Excel kütüphanesinin bilinen bir açığı dosya okurken geçerli; uygulama yalnızca yazıyor")
```

## Kaçınılacak ifadeler

- "Kesinlikle güvenli", "kusursuz", "hiçbir açık yok" → yerine: "bilinen açıklar kapatıldı; şu testlerden geçti".
- "Google şunu yapıyor" (kaynaksız) → yerine: "gözlemim şu; nedeni resmî kaynakta doğrulanmadı".
- Hafızadan sürüm/ücret/tarih → önce kaynağı aç.
