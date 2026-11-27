#!/usr/bin/env bash
# lib/ altındaki tarayıcı kütüphanelerini bilinen güvenlik danışmalarına karşı denetler (GitHub Advisory / npm audit).
# Kullanım: bash bagimlilik_denetimi.sh pdfjs-dist@3.11.174 mammoth@1.13.0 jszip@3.10.1 ...
# Yalnızca kilit dosyası oluşturur; paket kurmaz, kurulum betiği çalıştırmaz. Proje klasörüne dokunmaz.
set -euo pipefail
if [ "$#" -eq 0 ]; then echo "Kullanım: $0 paket@sürüm [paket@sürüm ...]"; exit 2; fi
WORK="$(mktemp -d)"
deps=""
for spec in "$@"; do
  name="${spec%@*}"; ver="${spec##*@}"
  deps="$deps\"$name\":\"$ver\","
done
printf '{"name":"denetim","version":"1.0.0","private":true,"dependencies":{%s}}\n' "${deps%,}" > "$WORK/package.json"
( cd "$WORK" && npm install --package-lock-only --ignore-scripts --silent >/dev/null 2>&1 )
( cd "$WORK" && npm audit --json 2>/dev/null || true ) > "$WORK/audit.json"
python3 - "$WORK/audit.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
v = d.get('vulnerabilities', {})
if not v:
    print('Bilinen danışma bulunamadı (npm audit).')
for name, info in v.items():
    for x in info.get('via', []):
        if isinstance(x, dict):
            print(f"[{info.get('severity', '?').upper()}] {name} {x.get('range')} — {x.get('title')}\n    {x.get('url')}")
    nodes = info.get('nodes', [])
    if nodes:
        print('    konum:', ', '.join(nodes))
print('\nHer bulgu için danışma sayfasını OKU: etkilenen aralık, düzeltilmiş sürüm, önerilen önlem, uygulama o kod yolunu kullanıyor mu?')
print('node_modules/<üst-paket>/node_modules/... konumundaki alt bağımlılıklar tarayıcı paketine girmeyebilir: npm ls <paket> ile kontrol et.')
PY
echo "(geçici klasör: $WORK)"
