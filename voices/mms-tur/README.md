# Meta MMS Türkçe sesi (facebook/mms-tts-tur), ONNX biçiminde

- Kaynak: https://huggingface.co/facebook/mms-tts-tur — © Meta Platforms, Inc.
- Lisans: **CC BY-NC 4.0** (https://creativecommons.org/licenses/by-nc/4.0/) — ticari kullanım yoktur.
- Değişiklik: Model, `transformers` VitsModel'den `torch.onnx.export` (opset 17) ile ONNX'e dönüştürüldü; ağırlıklar değiştirilmedi.
  GitHub'ın 100 MB dosya sınırı nedeniyle `mms_tur.onnx.part0` + `mms_tur.onnx.part1` olarak bölündü; uygulama indirince birleştirir.
- `mms_vocab.json`: modelin kendi sözlüğü (tokenizer vocab).
