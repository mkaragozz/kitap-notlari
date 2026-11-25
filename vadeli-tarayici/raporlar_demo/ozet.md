_Oluşturma: 2026-11-25T22:56 UTC — veri: sentetik_

### Varyant karşılaştırması (ana set, tüm dönem, eşit ağırlıklı portföy)

| Varyant | İşlem | Kazanma | Ort. R | t | PF(R) | Portföy toplam | Yıllık | Max DD | Sharpe | Kârlı sembol | Kârlı yıl | Holdout ort. R (t) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| temel | 1659 | 35.3% | -0.070 | -3.1 | 0.82 | -25.4% | -12.0% | -26.6% | -1.98 | 0.0% | 0/7 | 0.000 (0.0) |

### Ön kayıtlı 'canlıya uygun' kriterleri (DENEYLER.md §0)

| Varyant | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Sonuç |
|---|---|---|---|---|---|---|---|---|
| temel | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | geçmedi |

1: ort. R>0 ve PF≥1.10 · 2: ≥5/7 yıl pozitif · 3: ≥%60 sembol kârlı · 4: ızgarada ≥%60 kombinasyon pozitif · 5: walk-forward test ortalaması >0 ve ≥3/5 yıl pozitif · 6: holdout (2025-01→2026-10) ort. R>0 · 7: karıştırılmış veride ort. R≤0.02 ve rastgele yürüyüşte medyan getiri<0 (– = bu varyant için çalıştırılmadı)

### Yıllık dilimler — temel  (`1h tetik 20/10, ATR14x3.0, EMA200(4h)`)

| Dilim | İşlem | Ort. R | t | Toplam R | Kazanma | Long R | Short R | Portföy getiri | Portföy DD | Kârlı sembol |
|---|---|---|---|---|---|---|---|---|---|---|
| 2020-01..2021-01 | 0 | 0.000 | 0.0 | 0.0 | 0.0% | 0.0 | 0.0 | - | - | - |
| 2021-01..2022-01 | 685 | -0.073 | -2.1 | -50.1 | 36.4% | -2.7 | -47.4 | -11.9% | -12.6% | 0.0% |
| 2022-01..2023-01 | 757 | -0.079 | -2.3 | -59.6 | 33.8% | 1.7 | -61.3 | -13.7% | -14.2% | 0.0% |
| 2023-01..2024-01 | 217 | -0.028 | -0.4 | -6.0 | 37.3% | 8.7 | -14.6 | -1.1% | -4.7% | 25.0% |
| 2024-01..2025-01 | 0 | 0.000 | 0.0 | 0.0 | 0.0% | 0.0 | 0.0 | - | - | - |
| 2025-01..2026-01 | 0 | 0.000 | 0.0 | 0.0 | 0.0% | 0.0 | 0.0 | - | - | - |
| 2026-01..2026-11 | 0 | 0.000 | 0.0 | 0.0 | 0.0% | 0.0 | 0.0 | - | - | - |

### Sembol bazında — temel (1000 USDT, %1 risk, 5x tavan, gerçek fonlama)

| Sembol | Başlangıç | Toplam | Yıllık | Max DD | Sharpe | İşlem | Kazanma | PF | Ort. R | Long $ | Short $ | Likidasyon | Al-tut |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEMO3 | 2021-01-01 | -20.1% | -9.4% | -29.0% | -0.70 | 418 | 35.9% | 0.87 | -0.049 | 23 | -224 | 0 | 99.1% |
| DEMO2 | 2021-01-01 | -22.6% | -10.6% | -36.8% | -0.80 | 424 | 36.3% | 0.83 | -0.056 | 34 | -261 | 0 | 20.5% |
| DEMO4 | 2021-01-01 | -29.8% | -14.4% | -30.9% | -1.19 | 401 | 35.7% | 0.77 | -0.084 | -133 | -165 | 0 | 167.2% |
| DEMO1 | 2021-01-01 | -32.5% | -15.8% | -34.3% | -1.27 | 416 | 33.4% | 0.77 | -0.090 | 75 | -400 | 0 | 55.0% |

Çıkış nedenleri (temel): {'kanal': 854, 'stop': 803, 'donem_sonu': 2} — likidasyon: 0 — toplam komisyon+kayma etkisi ve fonlama: komisyon 386 USDT, fonlama 93 USDT (tüm alt hesaplar)

### Parametre sağlamlığı — temel

2 kombinasyon. Ort. R > 0 olan kombinasyon oranı: **0.0%**, portföyü kârlı kombinasyon oranı: **0.0%**. Medyan ort. R: -0.081, medyan portföy getirisi: -26.2%. En iyi/en kötü ort. R: -0.070 / -0.093.

| Giriş N | Çıkış N | ATR kat | EMA | İşlem | Ort. R | Kazanma | Portföy | Kârlı sembol |
|---|---|---|---|---|---|---|---|---|
| 20 | 10 | 3.0 | 200 | 1659 | -0.070 | 35.3% | -25.4% | 0.0% |
| 40 | 10 | 3.0 | 200 | 1344 | -0.093 | 33.9% | -27.1% | 0.0% |

### Walk-forward — temel (2 yıl eğitimde seç → sonraki yıl test)

| Test yılı | Eğitim | Seçilen | Eğitim ort. R | Test ort. R | Test işlem | Varsayılan param test R | Tüm komb. test medyan R | Seçilenin test yüzdeliği |
|---|---|---|---|---|---|---|---|---|
| 2023 | 2021-2022 | 20/10/3.0/200 | -0.076 | -0.028 | 217 | -0.028 | -0.061 | 100.0% |
| 2024 | 2022-2023 | 20/10/3.0/200 | -0.067 | 0.000 | 0 | 0.000 | 0.000 | 100.0% |

Walk-forward birleşik test ort. R (yıllık ortalamalar): -0.014; testte pozitif yıl: 0/2

### Sağlık kontrolleri — temel

| Test | İşlem | Ort. R | t | Toplam R | Not |
|---|---|---|---|---|---|
| Gerçek veri, getiriler karıştırılmış (tohum 0) | 1632 | -0.040 | -1.6 | -66 | kârlı sembol 0.0% |
| Rastgele yürüyüş (20 seri) | - | -0.049 | - | - | medyan getiri -24.3%, kârlı oran 10.0% |
| Sinyal 1 mum ERKEN (gelecek bilgisi!) | 1658 | 0.234 | 10.1 | 389 | portföy 163.0% |
| Normal | 1659 | -0.070 | -3.1 | -116 | portföy -25.4% |
| Sinyal 1 mum geç | 1653 | -0.075 | -3.4 | -124 | portföy -26.9% |
| Sinyal 2 mum geç | 1652 | -0.070 | -3.2 | -116 | portföy -25.5% |
| Maliyet: maliyetsiz | 1659 | -0.021 | -0.9 | -35 | portföy -8.7% |
| Maliyet: yalniz_komisyon | 1659 | -0.048 | -2.1 | -80 | portföy -18.4% |
| Maliyet: tam | 1659 | -0.070 | -3.1 | -116 | portföy -25.4% |
| Maliyet: maker_benzeri | 1659 | -0.044 | -1.9 | -73 | portföy -17.0% |
| Maliyet: sabit_fonlama | 1659 | -0.070 | -3.1 | -116 | portföy -25.4% |
