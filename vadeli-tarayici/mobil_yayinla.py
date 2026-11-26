#!/usr/bin/env python3
"""Telefon sürümünü (mobil/) yayın deposuna kopyalar: python3 mobil_yayinla.py ../../vadeli
Kaynak burada (testler: tests/test_mobil_esdeger.py); https://mkaragozz.github.io/vadeli/ yayın deposundan sunulur."""
import shutil
import sys
from pathlib import Path

kaynak = Path(__file__).resolve().parent / "mobil"
hedef = Path(sys.argv[1] if len(sys.argv) > 1 else "../../vadeli").resolve()
if not (hedef / ".git").exists():
    sys.exit(f"{hedef} bir git deposu değil")
for p in kaynak.rglob("*"):
    if p.is_file():
        y = hedef / p.relative_to(kaynak)
        y.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, y)
(hedef / ".nojekyll").write_text("")
print(f"kopyalandı → {hedef}")
