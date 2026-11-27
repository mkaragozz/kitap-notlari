#!/usr/bin/env python3
"""Sürümü her yerde birlikte yükseltir: ?v=X.Y ekleri, sw.js V, app.js APP_VERSION.

Kullanım (depo kökünden): python3 .claude/skills/kitap-notlari-bakim/scripts/bump_version.py 3.5.2
lib/ altındaki kütüphane sürüm eklerine (ör. ?v=2.3.8) dokunmaz.
"""
import pathlib
import re
import sys

if len(sys.argv) != 2 or not re.fullmatch(r'\d+\.\d+(\.\d+)?', sys.argv[1]):
    sys.exit('Kullanım: bump_version.py 3.5.2  (üç haneli: büyük.orta.küçük)')
new = sys.argv[1]
root = pathlib.Path('.')
sw = (root / 'sw.js').read_text(encoding='utf-8')
old = re.search(r"const V = '([\d.]+)'", sw).group(1)
if old == new:
    sys.exit(f'Sürüm zaten {new}')

targets = [p for p in root.glob('*.js')] + [root / 'index.html']
changed = []
for p in targets:
    s = p.read_text(encoding='utf-8')
    # Yalnızca tam eşleşen ek: "?v=3.1" değişir, "?v=3.11.174" (kütüphane sürümü) değişmez
    t = re.sub(r'\?v=' + re.escape(old) + r'(?![\d.]*\d)', f'?v={new}', s)
    if p.name == 'sw.js':
        t = t.replace(f"const V = '{old}'", f"const V = '{new}'")
    if p.name == 'app.js':
        t = re.sub(r"APP_VERSION = '[\d.]+'", f"APP_VERSION = '{new}'", t)
    if t != s:
        p.write_text(t, encoding='utf-8')
        changed.append(p.name)

# Doğrulama: eski ek hiçbir yerde kalmamalı
left = [p.name for p in targets if re.search(r'\?v=' + re.escape(old) + r'(?![\d.]*\d)', p.read_text(encoding='utf-8'))]
if left:
    sys.exit(f'HATA: eski ek kaldı: {left}')
print(f'{old} -> {new}; değişen dosyalar: {", ".join(sorted(changed))}')
