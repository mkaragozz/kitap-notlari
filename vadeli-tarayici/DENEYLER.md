# DENEYLER — her deneme (başarısızlar dahil)

Biçim: **ne denendi → neden → sonuç**. Sayılar `raporlar/` altındaki otomatik çıktılardan alınmıştır.
Tüm sonuçlar maliyetler dahildir: taker %0.05/yön, kayma %0.03/yön, gerçek fonlama (Binance arşivi).

## 0. Ön kayıt (tam sonuçlara bakmadan önce yazıldı)

Dürüstlük notu: Bu kurallar yazılmadan hemen önce temel stratejinin yalnızca 5 sembolde (BTC, ETH, XRP, SOL, BNB)
tüm dönem sonucu görüldü (yaklaşık başabaş; short tarafı beşinde de negatif). Başka hiçbir sonuç görülmeden
aşağıdaki karar kuralı ve alternatif listesi sabitlendi.

**"Canlıya uygun" sayılmak için bir varyantın hepsini sağlaması gerekir:**
1. Ana sette (22 uzun geçmişli sembol, 2020–2026-10) havuz ortalaması **ort. R > 0** ve **PF(R) ≥ 1.10**
2. 7 yıllık dilimin en az **5'inde** toplam R > 0
3. Sembollerin en az **%60'ı** kârlı
4. Parametre ızgarasında kombinasyonların en az **%60'ı** ort. R > 0 (tek şanslı ayar yok)
5. Walk-forward (2 yıl eğitim → 1 yıl test, 2022–2026): birleşik test ort. R > 0 ve test yıllarının en az **3/5**'i pozitif
6. Holdout (2025-01 → 2026-10) ort. R > 0
7. Sağlık: getirileri karıştırılmış gerçek veride ort. R ≤ ~0; rastgele yürüyüşte medyan getiri < 0

**Alternatifler (önceden sabit, değerleri sonuca bakarak değiştirilmeyecek):**
| Ad | Değişiklik | Gerekçe |
|---|---|---|
| temel | şartname: 1s tetik 20/10, ATR14×3, EMA200(4s) | başlangıç |
| 4s_tetik | tetik ve rejim 4s | daha az gürültü, daha az işlem → daha düşük maliyet payı |
| genis_cikis | çıkış kanalı 20, ATR×4 | trendlere daha uzun süre kalmak |
| hacim_filtre | kırılım mumu USDT hacmi > 1.5 × önceki 20 ort. | sahte kırılımları elemek |
| vol_filtre | ATR/fiyat ≥ %0.4 | maliyetin stopa oranının yüksek olduğu sakin piyasayı elemek |
| btc_rejim | LONG yalnız BTC 4s > EMA200, SHORT yalnız altında | altcoinlerin BTC ile korelasyonu |
| sadece_long | short yok | kripto uzun vadede yukarı eğilimli; short'un maliyeti/fonlaması |
| 4s_tetik_btc | 4s tetik + BTC rejimi | iki makul fikrin birleşimi (tek birleşim denemesi) |

Birden fazla varyant kuralları geçerse seçim **tüm dönem getirisine göre değil**, walk-forward test sonucuna göre yapılır.
Hiçbiri geçmezse sonuç "canlıya uygun değil" olarak raporlanır.

---

## Deneme kayıtları
