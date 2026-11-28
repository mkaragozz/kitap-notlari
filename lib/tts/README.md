# Sesli okuma motoru (yalnızca kullanıcı "İndir" deyince yüklenir)

| Dosya | Kaynak | Lisans |
|---|---|---|
| ort.wasm.min.js, ort-wasm-simd-threaded.mjs, ort-wasm-simd-threaded.wasm | npm `onnxruntime-web@1.20.1` (Microsoft) | MIT — `onnxruntime.LICENSE` |
| piper_phonemize.wasm, piper_phonemize.data | npm `@diffusionstudio/piper-wasm@1.0.0` (kaynak: github.com/diffusion-studio/piper-wasm), rhasspy/piper-phonemize + espeak-ng derlemesi | piper-phonemize: MIT (`piper-phonemize.LICENSE.md`); içerdiği espeak-ng ve espeak-ng verileri: **GPL-3.0** (`espeak-ng.COPYING`) |
| piper_phonemize_loader.js | npm `@mintplex-labs/piper-tts-web@1.0.5` içindeki Emscripten yükleyicisi (değiştirilmeden) | paket: MIT; yüklediği bileşen GPL-3.0 (yukarıda) |

GPL-3.0 gereği: espeak-ng kaynak kodu https://github.com/espeak-ng/espeak-ng, piper-phonemize kaynak kodu
https://github.com/rhasspy/piper-phonemize, wasm derlemesinin kaynağı https://github.com/diffusion-studio/piper-wasm adresindedir.
Bu uygulamanın kaynak kodu da herkese açıktır: https://github.com/mkaragozz/kitap-notlari
