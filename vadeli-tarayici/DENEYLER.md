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

### D1 — Rastgele yürüyüş üretecinde sahte kenar (motor hatası değil, test verisi hatası)
* **Ne:** İlk sağlık testinde maliyetsiz rastgele yürüyüşte (kenarsız veri) işlem başı +0.09 R çıktı; rastgele girişlerde bile.
* **Neden araştırıldı:** Kenarsız veride kâr = sızıntı şüphesi.
* **Sonuç:** Üreteç her mumu 4 alt adımla oluşturuyordu; stop "tam stop fiyatından" dolduğunda gerçek yolun stopu
  aşan kısmı yok sayılıyor ve stoplar sistematik olarak lehte doluyordu. Alt adım 60'a çıkarıldı → etki kayboldu.
  Ders: gerçek piyasada da stoplar kayar; bu yüzden stop dolumlarına da %0.03 kayma uygulanıyor.

### D2 — Şartname stratejisi (temel) gerçek veride
* **Sonuç:** ort. R −0.005 (t −0.7), 3/7 yıl pozitif, %45 sembol kârlı, ızgaranın %35'i pozitif, walk-forward −0.014,
  holdout −0.002. **Kriterleri geçmedi.** Maliyetsiz +0.054 R: kırılım etkisi var ama 1s'te maliyetleri karşılamıyor.
  Short tarafı toplamda −165 R, long +45 R.

### D3 — 4s_tetik
* **Neden:** Daha az ama daha büyük hareketli işlem → maliyet/stop oranı düşer.
* **Sonuç:** +0.078 R (t 3.7), 6/7 yıl, %86 sembol, ızgara %100, WF +0.050 (3/5), holdout +0.011. **Geçti.**

### D4 — genis_cikis (20 kanal, 4×ATR)
* **Sonuç:** +0.001 R, holdout −0.003. Geçmedi. (Izgarası temel ile aynı kombinasyonları kapsadığından ızgara/WF aynıdır.)

### D5 — hacim_filtre (kırılım mumu hacmi > 1.5× ortalama)
* **Sonuç:** +0.001 R, 5/7 yıl, ızgara %65, WF −0.007. Geçmedi. İşlem sayısını %15 azalttı, kaliteyi anlamlı artırmadı.

### D6 — vol_filtre (ATR/fiyat ≥ %0.4)
* **Sonuç:** −0.006 R. Geçmedi. 22 sembolde filtre neredeyse hiç işlem elemedi (bu semboller zaten oynak).

### D7 — btc_rejim (1s tetik)
* **Sonuç:** −0.006 R, 2/7 yıl. Geçmedi.

### D8 — sadece_long
* **Sonuç:** +0.004 R, 4/7 yıl; 2022–2024 ağır zarar, 2025–2026 pozitif (holdout +0.034). Geçmedi.
  Son dönemdeki iyi görünüm boğa piyasasından; seçilseydi tipik "son veriye uydurma" olurdu.

### D9 — 4s_tetik_btc
* **Sonuç:** +0.095 R (t 4.0), 7/7 yıl, %91 sembol, ızgara %100, WF +0.079 (4/5), holdout +0.020 (t 0.7). **Geçti.**
  Ön kayıt kuralı (birden fazla geçerse walk-forward'a göre seç) gereği **seçildi** ve canlı varsayılan yapıldı.
  Güncel ilk 50'de: %64 sembol kârlı (≥1.5 yıl geçmişlilerde %88), ort. R +0.091; 2025+ dönemi +0.040 (t 1.3).
* **Uyarı:** 2025–2026 kenarı istatistiksel olarak sıfırdan ayırt edilemiyor; 8 varyant arasından seçim yanlılığı var.
  Bu yüzden "canlıya uygun" kriterini geçmesine rağmen gerçek parayla yalnız çok küçük riskle/izleme amaçlı öneriliyor.

### Yapılmayanlar (bilinçli)
* Seçilen varyantın parametreleri (20/10/3×ATR/EMA200) ızgaradaki en iyi değerlere çekilmedi (ör. 55/20/4×ATR
  daha yüksek R gösteriyor); bu, test verisine bakarak ayar olurdu. Walk-forward zaten bu tür seçimin görülmemiş
  veride avantaj sağlamadığını gösteriyor (2025–2026'da seçilen kombinasyon medyanın altında kaldı).

---

## 1. Ön kayıt — türev konumlanma verileri (sonuçlar görülmeden yazıldı, 2026-11-25)

**Soru:** CoinGlass benzeri konumlanma verileri (açık pozisyon, fonlama, long/short kalabalığı, taker baskısı) sinyalleri
iyileştiriyor mu? Veri: Binance arşivi `metrics` (5 dk, 2021-12'den beri) + gerçek fonlama. Bu yüzden karşılaştırma
dönemi **2022-01 → 2026-10** (5 yıllık dilim), holdout yine **2025-01 → 2026-10**. Göstergeler 2020'den ısınır.

**Taban:** `4s_tetik_btc` (canlı varsayılan) ve karşılaştırma için `temel` (1s). Her filtre tabana tek tek eklenir:

| Ad | Filtre | Gerekçe |
|---|---|---|
| +oi | kırılımda açık pozisyon son 6 mumda artmış | fiyat + yeni para = gerçek kırılım |
| +fon | LONG fonlama > %0.05/8s ise atla; SHORT < −%0.05 ise atla | kalabalık tarafa geç binmemek |
| +kalabalik | LONG long/short hesap oranı z > 1.5 ise atla; SHORT z < −1.5 ise atla | perakende kalabalığına karşı |
| +taker | LONG taker alım/satım > 1, SHORT < 1 | kırılım mumunda agresif taraf teyidi |
| +kombine | +oi +fon +kalabalik | tek birleşim denemesi |

**Kabul kuralı (canlı varsayılana eklenmesi için hepsi):** aynı dönemde tabana göre (a) ort. R daha yüksek,
(b) 5 yılın en az 4'ünde daha iyi, (c) holdout'ta daha iyi, (d) eşik taramasında 3 eşiğin en az 2'si tabandan iyi
(oi_n 3/6/12, fonlama %0.03/%0.05/%0.10, z 1/1.5/2), (e) işlem sayısı tabanın en az %40'ı.
Geçen yoksa türev verileri yalnızca **bilgi** olarak gösterilir, sinyale girmez.

**Piyasa geneli (CoinGecko/CMC):** ücretsiz geçmişi yok/kısa olduğundan backtest edilemez → sinyale girmez,
yalnızca panoda bağlam ve ısı haritası. **TradingView:** resmi API yok, kazıma kullanım şartlarına aykırı → kullanılmaz.

### D10 — Türev filtreleri (sonuçlar; tablo: `raporlar/ozet_turev.md`)
Dönem 2022-01 → 2026-10, taban `4s_tetik_btc`: 4357 işlem, ort. R +0.083, holdout +0.020.

| Filtre | Ort. R | Holdout R (t) | İşlem | Eşikler | Kabul |
|---|---|---|---|---|---|
| +oi (açık pozisyon artışı) | **0.114** | **0.084 (1.9)** | 2714 | 0.105 / 0.114 / 0.119 (hepsi tabandan iyi) | ✓ |
| +fon (fonlama vetosu) | 0.088 | 0.020 | 4288 | 0.095 / 0.088 / 0.085 | ✗ (holdout iyileşmedi) |
| +kalabalik (L/S z-skoru) | 0.086 | 0.023 | 4276 | 0.095 / 0.086 / 0.084 | ✓ (ama etki +0.003 R) |
| +taker | 0.071 | 0.035 | 3188 | – | ✗ |
| +kombine (oi+fon+kalabalik) | 0.131 | 0.093 (2.0) | 2583 | – | ✓ (fon ve kalabalık katkısı küçük) |

1s taban (`temel`): hiçbir filtre ortalamayı sıfırın üstüne çıkaramadı (en iyi −0.011 R). Türev verisi kenarsız stratejiyi kurtarmıyor.

**Karar:** canlı varsayılana yalnız **+oi** eklendi (`oi_teyit = true`).
* +kalabalık kuralları teknik olarak geçti, ancak iyileşme (+0.003 R) istatistiksel gürültünün çok altında; denenmemiş bir
  "+oi +kalabalık" birleşimini canlıya koymak yerine eklenmedi. Bu, ön kayıttan bilinçli bir sapmadır (daha az filtre yönünde).
* +kombine'nin üstünlüğü büyük ölçüde +oi'den geliyor; fonlama filtresi tek başına kabul edilmediği için birleşim seçilmedi.
* Uyarı: +oi 2022'de tabandan kötü (−0.055 vs +0.075). Holdout iyileşmesi (t 1.9) umut verici ama kesin değil.

### D11 — Veri düzeltmesi: açık pozisyonu 0 yazılmış saatler
Telefon sürümünün eşdeğerlik testi, arşivde birkaç saat açık pozisyonun **0** yazıldığını ortaya çıkardı (sonsuz değişim →
filtre yanlışlıkla "geçti"). İki tarafta da 0/negatif açık pozisyon "veri yok" sayıldı ve deney yeniden çalıştırıldı:
+oi 2714 → 2708 işlem, ort. R 0.114 → 0.115, holdout 0.084 → 0.087. Karar değişmedi.

---

## 2. Ön kayıt — geliştirme turu 2 (sonuçlar görülmeden yazıldı, 2026-11-26)

**Bağlam ve dürüstlük notu.** Şimdiye kadar 8 + 5 = 13 varyant denendi; 2025-26 holdout'u da artık "görülmüş" veridir.
Bu turda denenen her şey aynı veride ek bir deneme sayılır, dolayısıyla eşik daha sıkı tutulur ve **asıl hakem
ileri testtir** (§3). Analizler yine **2026-10 sonuna kadar** veriyle yapılır; **2026-11-01 sonrası hiçbir analizde
kullanılmaz**, ileri teste ayrılmıştır.

**Taban:** canlı varsayılan `4s_tetik_btc +oi` (4s tetik 20/10, ATR14×3, EMA200(4s), BTC rejimi, OI↑(6)).
Dönem 2022-01 → 2026-10 (açık pozisyon verisi 2021-12'den beri), 5 yıllık dilim, holdout 2025-01 → 2026-10.

**Kenar varyantları (her biri tabana tek tek eklenir):**

| Ad | Değişiklik | Gerekçe (önsel) | Eşik taraması |
|---|---|---|---|
| +rs | LONG yalnız coinin son 42 4s-mumluk (7 gün) getirisi BTC'ninkinden yüksekse; SHORT yalnız düşükse. BTC'nin kendisinde filtre nötr. | Kriptoda kesitsel momentum (güçlü coin güçlü kalır) literatürde belgelenmiş; kırılımı "lider" coinlerde almak | 21 / 42 / 84 mum |
| +basabas | Fiyat lehte +1R gittiğinde stop giriş fiyatına (+iki yön maliyet) çekilir; sonra normal ATR takibi sürer | Kazanmaya başlayan işlemin zarara dönmesini önlemek (trend takibinde zararlı da olabilir; bu yüzden test) | 1.0 / 1.5 / 2.0 R |
| 1g_tetik | Tetik ve rejim **günlük** mum (20/10 kanal, ATR14×3, EMA200 günlük, BTC rejimi günlük, OI↑ 6 gün) | 1s→4s geçişi maliyet payını düşürüp sonucu iyileştirdi; aynı mantık bir adım daha | giriş kanalı 10 / 20 / 40 |

**Kabul kuralı (canlı varsayılana eklenmesi için hepsi):** tabana göre (a) ort. R daha yüksek **ve fark ≥ +0.02 R**
(çoklu deneme payı), (b) 5 yılın en az 4'ünde daha iyi, (c) holdout'ta daha iyi, (d) 3 eşiğin en az 2'si tabandan iyi,
(e) işlem sayısı tabanın en az %40'ı. Birden fazla geçerse yalnız tüm dönem iyileşmesi en büyük olan eklenir;
birleşimler bu turda denenmez. Hiçbiri geçmezse varsayılan değişmez.

**Kenar dışı kontroller (karar kuralı farklı):**
* **K1 — Hayatta kalma yanlılığı:** 2022-01'de arşivde hacimce ilk 60 içinde olup bugün listeden çıkmış/işlem görmeyen
  semboller tabanla çalıştırılır. Ort. R ≤ 0 çıkarsa bu, raporda "ana set sonuçları iyimser" uyarısı olarak yazılır
  (strateji değişmez; ileri test eşiği değişmez).
* **K2 — Tek hesap portföy simülasyonu:** şimdiye kadar her sembol ayrı alt hesaptı. Gerçekte tek hesapta aynı anda
  çok sayıda (çoğu aynı yönde, korelasyonlu) pozisyon açılır. 22 sembol tek ortak özkaynakla, işlem başına %1 riskle
  simüle edilir; toplam açık risk tavanı **yok / 8R / 5R / 3R** karşılaştırılır (tavan doluyken yeni sinyal atlanır).
  **Seçim kuralı getiriye göre değil:** yıllık getiri / max düşüş oranı en iyi olan tavan varsayılan yapılır; eşitlikte
  daha düşük max düşüş. Bu bir risk ayarıdır, kenar iddiası değildir.

## 3. Ön kayıt — ileri test (2026-11-26)

**Amaç:** hiçbir analizde kullanılmamış veride stratejinin gerçek performansını ölçmek ve "devam / dur" kararını
önceden yazılmış kurala bağlamak.

* **Dondurulmuş strateji:** §2 sonucu belirlenen canlı varsayılan; sürüm kodu (`param_surum`) rapora yazılır.
  Parametre değişirse ileri test sıfırdan başlar (eski sürümün kaydı ayrı tutulur).
* **Başlangıç:** 2026-11-01 00:00 UTC (analizlerde kullanılmayan ilk an). **Evren:** ana set 22 sembol (doğrulanan set).
* **Kaynak:** Binance resmi arşivi (günlük ZIP'ler, ertesi gün yayınlanır) — bilgisayarın açık olmasından bağımsız,
  herkes tarafından yeniden üretilebilir. Canlı tarayıcının kendi kaydı (Geçmiş ekranı) ayrıca gösterilir.
* **Beklenti:** tabanın 2022-2026 ort. R'si ve işlem başı R standart sapması (backtest raporundan).
* **Kurallar (her işlem kapanınca yeniden hesaplanır):**
  1. **< 50 işlem:** "erken" — karar yok.
  2. **Uyarı bandı:** kümülatif R, beklenen kümülatif R − 2σ√n çizgisinin altına düşerse "uyarı" (backtest beklentisiyle
     uyumsuz).
  3. **100. işlemde:** ort. R ≤ 0 ise **DUR** (strateji ileri testte kenar göstermedi).
  4. **200. işlemde:** ort. R > 0 ve uyarı bandının üstündeyse "küçük riskle canlı uygun" (%0.25–0.5/işlem);
     aksi hâlde DUR.
  5. Kararlar yalnızca bu kurallarla verilir; ara sonuçlara bakarak parametre değiştirilmez.

### D12 — Tur 2 kenar varyantları (sonuçlar; tablo: `raporlar/ozet_tur2.md`)
Taban (canlı varsayılan, 2022-01 → 2026-10): 2708 işlem, ort. R +0.115 (t 2.6), holdout +0.087, yıllık −0.055 / +0.196 / +0.208 / +0.051 / +0.129.

| Varyant | İşlem | Ort. R | Holdout R | Yıllık ort. R | Eşikler | Kabul |
|---|---|---|---|---|---|---|
| +rs (göreli güç, 42) | 2116 | 0.107 | 0.049 | −0.019 / 0.155 / 0.279 / 0.020 / 0.087 | 0.093 / 0.107 / 0.091 | ✗ (a, b, c, d sağlanmadı) |
| +basabas (1R) | 2714 | 0.112 | 0.087 | −0.056 / 0.190 / 0.201 / 0.054 / 0.126 | 0.112 / 0.115 / 0.115 | ✗ (etkisiz) |
| 1g_tetik (günlük) | 451 | 0.205 (t 1.3) | 0.151 (t 0.5) | −0.155 / −0.005 / 0.652 / 0.313 / −0.053 | 0.119 / 0.205 / 0.181 | ✗ (b: 2/5 yıl, e: işlem %17) |

**Karar:** hiçbiri kabul edilmedi, canlı varsayılan **değişmedi** (`p8abf0564`).
* Göreli güç filtresi işlemleri azalttı ama kaliteyi artırmadı; holdout'ta tabandan kötü.
* Başabaş stop neredeyse hiç devreye girmedi (3×ATR takip eden stop +1R'ye gelindiğinde zaten girişe yakın).
* Günlük tetik yüksek ortalama gösteriyor ama sonuç tek bir yıla (2024, +0.65 R) dayanıyor; 5 yılın 3'ünde negatif ve işlem
  sayısı t-istatistiği için çok az. "Ortalama yüksek" görünmesi bu turdaki en tehlikeli tuzaktı; kural sayesinde alınmadı.

### D13 — K2: tek hesap portföy simülasyonu
Eski raporlardaki portföy, 22 ayrı alt hesabın eşit ağırlıklı ortalamasıydı (her işlem fiilen toplam sermayenin
%1/22'sini riske ediyordu). **Tek hesapta %1 risk/işlem çok farklı bir tablo veriyor:**

* Aynı anda açık pozisyon: ortalama **9**, en fazla **22** (hepsi). İşlemlerin %65'i başka bir işlemle aynı 4s mumda açılıyor.
* Tavansız, %1 risk: yıllık %31 ama **max düşüş %55** (2022: −%29).
* Tavanlı sonuçlar, aynı anda gelen sinyallerden hangisinin alındığına çok bağlı (5R tavanında yıllık %15–%28). Bu yüzden
  sıra 20 kez karıştırılıp **medyan** kullanıldı (ön kayıttaki tek sıralı hesap bu keyfiliği yansıtmıyordu; düzeltme kuralı
  değiştirmiyor, yalnız gürültüyü azaltıyor).

| Tavan (%1 risk) | Alınan işlem | Yıllık (medyan) | Max DD | Yıllık/DD |
|---|---|---|---|---|
| yok | 2708 | %30.9 | −%55.0 | 0.56 |
| 8R | 840 | %16.6 | −%38.2 | 0.44 |
| **5R** | 468 | %21.3 | −%26.4 | **0.81** |
| 3R | 282 | %7.3 | −%18.8 | 0.39 |

**Karar (ön kayıtlı kural):** 5R tavanı. Panoya "Açık pozisyon / tavan: N / 5" göstergesi eklendi; tavan doluyken yeni
sinyale girilmemesi öneriliyor. Ek (betimleyici, seçim yok): işlem başı risk düşürmek de benzer getiri/düşüş oranı veriyor —
%0.5 risk + 5R tavan: yıllık ~%11.5, max DD ~−%14; %0.25 risk tavansız: ~%14 / −%17.
**En önemli pratik sonuç:** önceki raporun "−%4.9 max düşüş" rakamı tek hesapta %1 riskle geçerli değil.

### D14 — K1: hayatta kalma yanlılığı (2022-01'de bilinebilecek evren)
2022-01 arşiv hacmine göre ilk 60 sözleşme (o gün bilinebilecek liste; sonradan listeden çıkan LUNA, MATIC, EOS, SXP, ANT
dahil), taban strateji, 2022-01 → 2026-10:

* **Tüm evren: 6574 işlem, ort. R +0.062 (t 2.8), holdout +0.048 (t 1.6), %60 sembol kârlı.** Ana sette +0.115.
* Ana set dışında kalan 38 sembol: **+0.025 R** (3866 işlem), holdout +0.016.
* Listeden çıkanlar: +0.109 R (282 işlem) — ön kayıtlı kural (≤ 0 ise uyarı) tetiklenmedi.

**Yorum:** asıl yanlılık listeden çıkanlarda değil, **"bugün hâlâ büyük olan coinler" seçiminde**. Önsel olarak seçilmiş
bir evrende kenar ana setteki değerin yaklaşık yarısı; ana set dışındaki coinlerde maliyetlerden sonra neredeyse sıfır.
Strateji değişmedi (kural gereği). Panoda ana set dışı coinlerin sinyallerine **"ana set dışı"** etiketi ve "Yalnız ana set"
filtresi eklendi. İleri test zaten yalnız ana sette yürüyor.

### D15 — İleri test başladı
`python tarayici.py ileri-test` (pano: Geçmiş → İleri test, açık tarayıcı her gün 03 UTC sonrası kendiliğinden günceller).
İlk sonuç (2026-11-01 → 11-25, 22 sembol): 16 kapanan işlem, ort. R +0.365, toplam +5.8 R, 3 açık. Kural gereği **erken**
(< 50 işlem): bu sayı hiçbir şey kanıtlamaz; tek işlemin R standart sapması ~2.3.

---

## 4. Ön kayıt — formasyon, destek/direnç ve indikatör istatistiği (sonuçlar görülmeden yazıldı, 2026-11-26)

**Kullanıcının sorusu:** 1 saat, 4 saat ve günlük grafikte hangi al/sat sinyalleri (mum formasyonları, grafik formasyonları,
destek/direnç kırılımı, indikatörler) geçmişte gerçekten tuttu? Hedef: "%80 doğru tahmin".

**"Doğru" tanımı (kullanıcı seçti):** sinyalden sonraki mumun açılışında giriş; stop = giriş ∓ 1.5×ATR(14); hedef =
giriş ± k × stop mesafesi (k = 1 ve 2). Fiyat **önce hedefe** değerse doğru, **önce stopa** değerse yanlış. Aynı mumda
ikisi de olursa yanlış sayılır (temkinli). 50 mum içinde ikisi de olmazsa "sonuçsuz" (ayrıca raporlanır, oranlara girmez).
Önemli: k = 1'de rastgele girişin doğruluk oranı ~%50'dir; %80 doğruluk k = 1'de bile çok güçlü bir kenar demektir.
Daha uzak hedefte (k = 2) rastgele oran ~%33'tür. Bu yüzden her sinyal **aynı coin ve dönemdeki rastgele girişlerle**
karşılaştırılır ve maliyet sonrası beklenen R (spot: %0.1 komisyon/yön + %0.05 kayma) da verilir.

**Veri:** Binance spot arşivi, hacimce ilk 200 USDT çiftinden kripto olanlar (tokenize hisse, altın, stabil hariç),
1s mum → 4s ve günlük. 2021-01 → 2026-10; **holdout 2025-01 → 2026-10.** Göstergeler yalnız kapanmış mumla
(look-ahead yok); pivot (tepe/dip) noktaları ancak sağında k mum kapandıktan sonra "bilinir" sayılır.

**Sinyal aileleri (her biri long/short, her zaman diliminde ayrı):**
* **Mum formasyonları:** yutan (engulfing), çekiç / ters çekiç, kayan yıldız / asılı adam, doji (yusufçuk / mezar taşı),
  sabah / akşam yıldızı, üç beyaz asker / üç kara karga, delen çizgi / kara bulut, harami, marubozu. Dönüş formasyonları
  yalnız önceki 10 mumluk eğilim tersse sayılır (standart tanım).
* **Grafik formasyonları:** ikili dip / ikili tepe, omuz-baş-omuz / ters OBO, yükselen / alçalan / simetrik üçgen
  kırılımı, bayrak (sert hareket + daralan konsolidasyon kırılımı). Pivotlarla (sağında/solunda 5 mum) tanımlanır;
  sinyal = formasyonun boyun/kenar çizgisinin kapanışla kırılması.
* **Destek/direnç kırılımı:** son onaylı, henüz kırılmamış pivot tepesinin (direnç) kapanışla yukarı kırılması → al;
  pivot dibinin (destek) aşağı kırılması → sat. Ayrıca hacim teyitli hali (kırılım mumu hacmi > 1.5 × 20 mum ort.).
* **İndikatörler:** RSI(14) 30'un üstüne dönüş / 70'in altına dönüş, MACD(12,26,9) sinyal kesişimi, EMA20/EMA50
  kesişimi, Bollinger(20,2) bandı dışına kapanıştan geri dönüş, Donchian 20 kırılımı (karşılaştırma için).
* **Üç zaman dilimi teyidi:** 1s sinyali + 4s ve günlükte trend aynı yönde (kapanış > EMA50 ve EMA20 > EMA50; short tersi).

**Kabul ("kullanılabilir sinyal") kuralı — hepsi:** (a) en az 300 olay; (b) doğruluk oranı rastgele girişten anlamlı
yüksek: z ≥ 3.5 (yaklaşık 300+ test yapıldığı için sıkı eşik); (c) holdout'ta da rastgeleden yüksek; (d) maliyet sonrası
ortalama R > 0. Hiçbiri %80'e ulaşmazsa bu açıkça yazılır; eşik değerleri sonuç görülerek değiştirilmez.
