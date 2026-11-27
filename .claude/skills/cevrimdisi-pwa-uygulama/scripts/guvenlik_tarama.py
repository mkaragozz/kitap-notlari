#!/usr/bin/env python3
"""Çevrimdışı PWA için statik güvenlik taraması (yalnızca okur, hiçbir dosyayı değiştirmez).

Kullanım:  python3 guvenlik_tarama.py <proje-klasörü> [--lib lib]
Çıktı: bulgular önem sırasıyla (YÜKSEK / ORTA / BİLGİ). Çıkış kodu: YÜKSEK bulgu varsa 1.

Bu bir sezgisel (heuristic) tarayıcıdır: yanlış alarm verebilir, her şeyi yakalayamaz. Her bulguyu
koda bakarak doğrula; "bulgu yok" demek "açık yok" demek değildir. Bağımlılık açıkları için ayrıca
`npm audit` çalıştır (bkz. SKILL.md → Güvenlik taraması).
"""
import base64
import hashlib
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
LIB = 'lib'
if '--lib' in sys.argv:
    LIB = sys.argv[sys.argv.index('--lib') + 1]

findings = []  # (önem, dosya:satır, açıklama)
def add(sev, where, msg):
    findings.append((sev, where, msg))

src_files = [p for p in root.rglob('*') if p.suffix in ('.js', '.html', '.mjs')
             and LIB not in p.relative_to(root).parts and '.claude' not in p.parts and 'node_modules' not in p.parts]

# Güvenli sayılan yardımcılar: metni HTML'e kaçışlayan ya da sabit HTML üreten fonksiyonlar.
SAFE_CALL = re.compile(r'^\s*(esc|safeSrc|cleanHtml|sanitize\w*|highlight|escapeHtml|encodeURIComponent|words|fmt\w*|String\(Number|Number|Math\.|parseInt|\w+\.length|\w+Html\(|\w+Card\(|\w+Badge\()')
RECORD_FIELD = re.compile(r'\b[a-z]{1,4}\.(title|name|text|body|comment|author|note|data|src|url|cover|desc\w*|label|emoji|category|chapter|publisher|value|fileName|tags?)\b')

for p in src_files:
    rel = p.relative_to(root)
    text = p.read_text(encoding='utf-8', errors='replace')
    lines = text.split('\n')
    for i, line in enumerate(lines, 1):
        w = f'{rel}:{i}'
        # 1) Değerlendirme ile kod çalıştırma
        if re.search(r'\beval\s*\(|new Function\s*\(|setTimeout\(\s*[\'"`]|setInterval\(\s*[\'"`]', line):
            add('YÜKSEK', w, 'eval / new Function / metinden zamanlayıcı: kod enjeksiyonu riski')
        # 2) Satır içi olay işleyicisi (CSP 'unsafe-inline' ister, XSS yüzeyi)
        if re.search(r'\son[a-z]+\s*=\s*["\'\\]', line) and p.suffix != '.mjs':
            add('ORTA', w, 'satır içi olay işleyicisi (onclick= / onerror=): addEventListener ve data-* kullan')
        # 3) Canlı belgede ayrıştırma: <img onerror> temizlemeden ÖNCE çalışır
        if re.search(r"document\.createElement\(['\"](div|span|p|section)['\"]\)[^;\n]*;[^;\n]*\.innerHTML\s*=", line):
            add('YÜKSEK', w, 'güvenilmeyen HTML canlı belgede ayrıştırılıyor: document.implementation.createHTMLDocument() ya da DOMParser kullan')
        # 4) Kaçışlanmamış kayıt alanı HTML şablonunda
        if '<' in line and '${' in line:
            if 'guvenlik-ok' in line:  # elle doğrulanmış satır: '// guvenlik-ok: neden' yorumu
                continue
            # yalnızca en içteki ${...} ifadeleri (iç içe şablonlar ayrı ayrı denetlenir)
            for m in re.finditer(r'\$\{([^{}`]*)\}', line):
                expr = m.group(1)
                if SAFE_CALL.match(expr):
                    continue
                if RECORD_FIELD.search(expr) and 'esc(' not in expr:
                    add('ORTA', w, f'kaçışlanmamış olabilir: ${{{expr.strip()[:70]}}} → esc() ile sar ya da güvenli olduğunu doğrula')
        # 5) target=_blank rel=noopener olmadan
        if 'target="_blank"' in line and 'noopener' not in line:
            add('ORTA', w, 'target="_blank" rel="noopener noreferrer" olmadan')
        # 6) Gizli anahtar benzeri değerler
        if re.search(r'(api[_-]?key|secret|token|password)\s*[:=]\s*[\'"][A-Za-z0-9_\-]{16,}', line, re.I) or re.search(r'AIza[0-9A-Za-z_\-]{30,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}', line):
            add('YÜKSEK', w, 'koda gömülü anahtar/parola benzeri değer: istemci koduna sır konmaz')
        # 7) Dış kaynaktan betik (tedarik zinciri)
        for m in re.finditer(r'(?:src=|import\(|loadScript\(|import .* from )\s*[\'"`](https?://[^\'"`]+)', line):
            if 'integrity=' not in line:
                add('ORTA', w, f'dış kaynaktan kod yükleniyor ({m.group(1)[:60]}): lib/ altına kopyala ya da SRI (integrity) ekle')
        # 8) Düz HTTP
        if re.search(r'["\'`]http://(?!localhost|127\.0\.0\.1|www\.w3\.org)', line):
            add('BİLGİ', w, 'http:// adres: https kullan')
        # 9) PIN/parolayı düz metin saklama ipucu
        if re.search(r'localStorage\.setItem\([^)]*(pin|pass|parola|sifre)', line, re.I):
            add('YÜKSEK', w, "PIN/parola localStorage'a düz yazılıyor olabilir: tuzlu özet sakla")

# 10) index.html: CSP var mı, satır içi betik özeti tutuyor mu
idx = root / 'index.html'
if idx.exists():
    h = idx.read_text(encoding='utf-8')
    m = re.search(r'http-equiv="Content-Security-Policy"\s+content="([^"]+)"', h)
    if not m:
        add('YÜKSEK', 'index.html', 'Content-Security-Policy yok')
    else:
        csp = m.group(1)
        for bad in ("'unsafe-eval'", "script-src *", "'unsafe-inline' 'self'"):
            if bad in csp:
                add('ORTA', 'index.html', f'CSP gevşek: {bad}')
        if "object-src 'none'" not in csp:
            add('ORTA', 'index.html', "CSP'de object-src 'none' yok")
        if 'script-src' in csp and "'unsafe-inline'" in csp.split('script-src')[1].split(';')[0]:
            add('ORTA', 'index.html', "script-src 'unsafe-inline' içeriyor")
        for body in re.findall(r'<script>(.*?)</script>', h, re.S):
            hv = "'sha256-" + base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode() + "'"
            if hv not in csp:
                add('YÜKSEK', 'index.html', f'satır içi <script> özeti CSP ile uyuşmuyor; beklenen {hv} (betik değiştiyse CSP\'yi güncelle)')
    if 'name="referrer"' not in h:
        add('BİLGİ', 'index.html', '<meta name="referrer" content="no-referrer"> yok')

# 11) pdf.js: GHSA-wgrm-67xf-hhpq (<= 4.1.392) önerilen önlem
for p in src_files:
    t = p.read_text(encoding='utf-8', errors='replace')
    for i, line in enumerate(t.split('\n'), 1):
        if 'getDocument(' in line and 'isEvalSupported' not in line:
            add('YÜKSEK', f'{p.relative_to(root)}:{i}', 'pdf.js getDocument isEvalSupported:false olmadan (GHSA-wgrm-67xf-hhpq)')

# 12) lib/ lisans dosyaları
libdir = root / LIB
if libdir.exists():
    for f in libdir.glob('*.js'):
        base = f.name.split('.')[0]
        if not any(l.name.startswith(base.split('-')[0]) and 'LICENSE' in l.name.upper() for l in libdir.iterdir()) and 'worker' not in f.name:
            add('BİLGİ', f'{LIB}/{f.name}', 'lisans dosyası bulunamadı: kütüphanenin lisans metnini yanına koy')

order = {'YÜKSEK': 0, 'ORTA': 1, 'BİLGİ': 2}
findings.sort(key=lambda x: (order[x[0]], x[1]))
for sev, w, msg in findings:
    print(f'[{sev}] {w} — {msg}')
cnt = {k: sum(1 for f in findings if f[0] == k) for k in order}
print(f'\nÖzet: YÜKSEK {cnt["YÜKSEK"]} · ORTA {cnt["ORTA"]} · BİLGİ {cnt["BİLGİ"]}  (sezgisel tarama; her bulguyu koda bakarak doğrula)')
sys.exit(1 if cnt['YÜKSEK'] else 0)
