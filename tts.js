// 🔊 Sesli okuma (kitabı dinleme): ses motorları, indirilebilir sesler ve oynatıcı.
//
// Üç ses: 📱 telefonun kendi sesi (Web Speech API), ⬇️ Piper Türkçe (erkek), ⬇️ Meta MMS Türkçe.
// İndirilebilir sesler yalnızca kullanıcı "İndir" deyince bu sitenin kendi dosyalarından (lib/tts, voices/)
// indirilir, parmak izleri (SHA-256) doğrulanır ve telefonda saklanır; sonra internetsiz çalışır, metin
// hiçbir yere gönderilmez. Okuma, okuyucudan çıkınca da sürer (alttaki küçük oynatıcı), ⏹ ile durur.
import * as DB from './db.js?v=3.5.2';
import { $, esc, toast, go, openSheet } from './ui.js?v=3.5.2';

// ================= Ayarlar =================
export const TTS_DEFAULT = { engine: 'system', voice: '', rate: 1, pitch: 1, pause: 'normal' };
export function ttsPrefs() { return { ...TTS_DEFAULT, ...(DB.getSettings().tts || {}) }; }
function saveTts(p) { DB.setSettings({ tts: p }); }
// Duraklama (saniye): virgül/noktalı virgül arası · cümle sonu · paragraf sonu
export const PAUSES = { short: { c: 0.15, s: 0.35, p: 0.6 }, normal: { c: 0.28, s: 0.6, p: 0.95 }, long: { c: 0.45, s: 0.9, p: 1.4 } };
const PAUSE_LABEL = { short: 'Kısa', normal: 'Normal', long: 'Uzun' };
const fmt1 = (x) => x.toFixed(1).replace('.', ',');

// ================= Telefonun sesi (Web Speech API) =================
export const systemSupported = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const isTr = (v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('tr');
/** Yalnızca Türkçe sesler; geç gelen sesler için 4 sn'ye kadar bekler */
export function systemVoices(wait = 4000) {
  if (!systemSupported()) return Promise.resolve([]);
  const pick = () => speechSynthesis.getVoices().filter(isTr).sort((a, b) => (b.localService - a.localService) || (b.default - a.default) || a.name.localeCompare(b.name));
  const now = pick();
  if (now.length) return Promise.resolve(now);
  return new Promise((ok) => {
    let done = false;
    const fin = () => { if (done) return; done = true; speechSynthesis.removeEventListener('voiceschanged', on); ok(pick()); };
    const on = () => { if (pick().length) fin(); };
    speechSynthesis.addEventListener('voiceschanged', on);
    setTimeout(fin, wait);
  });
}
function voiceGender(v) { const n = v.name || ''; if (/female|kad[ıi]n|woman|frau|femme/i.test(n)) return '👩 '; if (/\bmale|erkek|\bman\b|mann|homme/i.test(n)) return '👨 '; return ''; }
function voiceLabel(v) { return `${voiceGender(v)}${v.name}${v.localService ? ' · 📱 cihazda' : ' · 🌐 internet'}`; }
async function systemVoice(p) {
  const vs = await systemVoices(1500);
  return vs.find((v) => v.voiceURI === p.voice) || vs.find((v) => v.localService && v.default) || vs.find((v) => v.localService) || vs[0] || null;
}

// ================= İndirilebilir sesler =================
const VCACHE = 'kn-voices';
const abs = (u) => new URL(u, location.href).href;
const F = (u, size, sha) => ({ u, size, sha });
const ENGINE = [
  F('lib/tts/ort.wasm.min.js', 49026, 'e66568724f8848e57cc2a56e4bea3a5b86ce3ff81b2da11eac8ed7ab02b27bd4'),
  F('lib/tts/ort-wasm-simd-threaded.mjs', 24618, '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8'),
  F('lib/tts/ort-wasm-simd-threaded.wasm', 11246032, '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea'),
];
export const NEURAL = {
  piper: {
    name: 'Piper Türkçe (👨 erkek)', short: 'Piper', sr: 22050,
    license: 'Ses verisi CC BY-NC-SA 4.0 (ticari kullanım yok); telaffuz bileşeni espeak-ng GPL-3.0.',
    files: [...ENGINE,
      F('lib/tts/piper_phonemize_loader.js', 158217, 'b5ac96981729547606fd026b8e3829aad81e9e3c22308869d50473259c563283'),
      F('lib/tts/piper_phonemize.wasm', 635212, 'b777cd107a91d2bcc6a1ea46f2c26a662a7407394fe84589198aeaa83dd7a9d6'),
      F('lib/tts/piper_phonemize.data', 18077249, '29f1025eb23a5b5c192cd14a6efbce4509402ff265405072ee6f7d1a09b78f8c'),
      F('voices/piper-tr/tr_TR-dfki-medium.onnx.json', 4960, '13ebd7810f1b61b5027583cf3131a0a233b6ea81c38f2200ebc4ff41c3cca039'),
      F('voices/piper-tr/tr_TR-dfki-medium.onnx', 63201294, '2844717f524ab965d3fe86e60562cbb601d3e456836efcc2196cc3a14112a8fb')],
  },
  mms: {
    name: 'Meta MMS Türkçe', short: 'MMS', sr: 16000, slow: true,
    license: 'Meta MMS, CC BY-NC 4.0 (ticari kullanım yok).',
    files: [...ENGINE,
      F('voices/mms-tur/mms_vocab.json', 400, '7ae1cc616a7b6519d69ce77fe7dc24d0c78ed61d62b82fa938ae8d3b50dea316'),
      F('voices/mms-tur/mms_tur.onnx.part0', 58000000, '2275daa6c69730169f24f004c6f79c9953999093874243169789752d089e2008'),
      F('voices/mms-tur/mms_tur.onnx.part1', 56244244, 'aca2d4d5a36d3e43c12c36b14fad49a3bbb0ed70d51ba797fbe946a85237a82f')],
  },
};
export const neuralSize = (id) => NEURAL[id].files.reduce((t, f) => t + f.size, 0);
export const mb = (n) => Math.round(n / 1e6);
const MIME = { js: 'text/javascript', mjs: 'text/javascript', wasm: 'application/wasm', json: 'application/json' };
const mimeOf = (u) => MIME[u.split('.').pop()] || 'application/octet-stream';
async function hex(buf) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join(''); }

export async function neuralInstalled(id) {
  if (!('caches' in window)) return false;
  try {
    const c = await caches.open(VCACHE);
    for (const f of NEURAL[id].files) if (!(await c.match(abs(f.u)))) return false;
    return true;
  } catch (e) { return false; }
}
const downloading = {};
/** Dosyaları indirir, parmak izini doğrular, telefonda saklar. onProgress(yüklenen, toplam) */
export async function neuralDownload(id, onProgress) {
  if (downloading[id]) return downloading[id];
  downloading[id] = (async () => {
    const c = await caches.open(VCACHE);
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* yok say */ }
    const files = NEURAL[id].files, total = neuralSize(id);
    let base = 0;
    for (const f of files) {
      if (await c.match(abs(f.u))) { base += f.size; onProgress && onProgress(base, total); continue; }
      const res = await fetch(abs(f.u), { cache: 'no-store' });
      if (!res.ok) throw new Error(`İndirilemedi (${res.status}): ${f.u.split('/').pop()}`);
      const rd = res.body.getReader(); const chunks = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onProgress && onProgress(base + got, total); }
      const blob = new Blob(chunks, { type: mimeOf(f.u) });
      const h = await hex(await blob.arrayBuffer());
      if (h !== f.sha) throw new Error(`Dosya doğrulanamadı (parmak izi uyuşmuyor): ${f.u.split('/').pop()}. Lütfen tekrar deneyin.`);
      await c.put(abs(f.u), new Response(blob, { headers: { 'Content-Type': mimeOf(f.u), 'Content-Length': String(blob.size) } }));
      base += f.size;
    }
    return true;
  })().finally(() => { delete downloading[id]; });
  return downloading[id];
}
export async function neuralRemove(id) {
  const c = await caches.open(VCACHE);
  const keep = new Set();
  for (const k of Object.keys(NEURAL)) if (k !== id && await neuralInstalled(k)) NEURAL[k].files.forEach((f) => keep.add(f.u));
  for (const f of NEURAL[id].files) if (!keep.has(f.u)) await c.delete(abs(f.u));
  engines[id] = null;
  const p = ttsPrefs(); if (p.engine === id) { p.engine = 'system'; saveTts(p); }
}
async function cached(u) {
  const c = await caches.open(VCACHE); const r = await c.match(abs(u));
  if (!r) throw new Error('Ses dosyası telefonda bulunamadı; Ayarlar → 📖 Okuma görünümü → Sesli okuma bölümünden yeniden indirin.');
  return r.arrayBuffer();
}
function loadScript(src) {
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Ses motoru yüklenemedi')); document.head.appendChild(s); });
}
let ortP = null;
function loadOrt() {
  ortP = ortP || (async () => {
    if (!window.ort) await loadScript(abs('lib/tts/ort.wasm.min.js'));
    window.ort.env.wasm.wasmPaths = abs('lib/tts/');
    window.ort.env.wasm.numThreads = 1;
    return window.ort;
  })().catch((e) => { ortP = null; throw e; });
  return ortP;
}
const engines = { piper: null, mms: null };
async function getEngine(id) {
  if (engines[id]) return engines[id];
  const ort = await loadOrt();
  if (id === 'piper') {
    const cfg = JSON.parse(new TextDecoder().decode(await cached('voices/piper-tr/tr_TR-dfki-medium.onnx.json')));
    const sess = await ort.InferenceSession.create(await cached('voices/piper-tr/tr_TR-dfki-medium.onnx'), { executionProviders: ['wasm'] });
    const wasmBinary = await cached('lib/tts/piper_phonemize.wasm');
    const data = await cached('lib/tts/piper_phonemize.data');
    const { createPiperPhonemize } = await import(abs('lib/tts/piper_phonemize_loader.js'));
    const phonemize = (text) => new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Telaffuz zaman aşımı')), 15000);
      createPiperPhonemize({
        print: (d) => { clearTimeout(t); try { resolve(JSON.parse(d).phoneme_ids); } catch (e) { reject(e); } },
        printErr: () => {},
        wasmBinary: wasmBinary.slice(0),
        getPreloadedPackage: () => data.slice(0),
        locateFile: (u) => abs('lib/tts/' + u),
      }).then((m) => m.callMain(['-l', cfg.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data'])).catch((e) => { clearTimeout(t); reject(e); });
    });
    engines.piper = {
      sr: cfg.audio.sample_rate,
      async synth(text, rate) {
        const ids = await phonemize(text);
        const out = await sess.run({
          input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
          input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
          scales: new ort.Tensor('float32', Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale / rate, cfg.inference.noise_w]), [3]),
        });
        return out.output.data;
      },
    };
  } else {
    const vocab = JSON.parse(new TextDecoder().decode(await cached('voices/mms-tur/mms_vocab.json')));
    const a = new Uint8Array(await cached('voices/mms-tur/mms_tur.onnx.part0')), b = new Uint8Array(await cached('voices/mms-tur/mms_tur.onnx.part1'));
    const model = new Uint8Array(a.length + b.length); model.set(a, 0); model.set(b, a.length);
    const sess = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
    engines.mms = {
      sr: 16000,
      async synth(text) {
        const ids = [0];
        for (const ch of text.toLowerCase()) if (vocab[ch] !== undefined) ids.push(vocab[ch], 0);
        if (ids.length < 3) return new Float32Array(0);
        const n = ids.length;
        const out = await sess.run({ input_ids: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, n]), attention_mask: new ort.Tensor('int64', new BigInt64Array(n).fill(1n), [1, n]) });
        return out.waveform.data;
      },
    };
  }
  return engines[id];
}
/** Ayarlarda "dene" için: tek cümle */
export async function trySample(text = 'Merhaba, bu kitabı sizin için bu sesle okuyacağım.') {
  const p = ttsPrefs();
  stopAll();
  if (p.engine === 'system') { const u = new SpeechSynthesisUtterance(text); const v = await systemVoice(p); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'tr-TR'; u.rate = p.rate; u.pitch = p.pitch; speechSynthesis.speak(u); return; }
  toast('Ses hazırlanıyor…');
  const e = await getEngine(p.engine);
  const pcm = await e.synth(text, p.rate);
  const a = sampleAudio || (sampleAudio = new Audio());
  a.src = URL.createObjectURL(wav([pcm], e.sr)); a.preservesPitch = true; a.playbackRate = p.engine === 'mms' ? p.rate : 1; a.play().catch(() => {});
}
let sampleAudio = null;
function stopAll() { if (systemSupported()) speechSynthesis.cancel(); if (sampleAudio) sampleAudio.pause(); }

// ================= Ses dosyası (WAV) =================
function wav(parts, sr) {
  const n = parts.reduce((t, p) => t + p.length, 0);
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let o = 44;
  for (const p of parts) for (let i = 0; i < p.length; i++) { const s = Math.max(-1, Math.min(1, p[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([buf], { type: 'audio/wav' });
}

// ================= Cümle ve parça bölme =================
export function splitSentences(text) {
  const out = [];
  if (window.Intl && Intl.Segmenter) {
    for (const s of new Intl.Segmenter('tr', { granularity: 'sentence' }).segment(text)) out.push({ start: s.index, end: s.index + s.segment.length });
  } else {
    const re = /[^.!?…]+[.!?…]*["'”’)]*\s*/g; let m;
    while ((m = re.exec(text))) { if (!m[0]) break; out.push({ start: m.index, end: m.index + m[0].length }); }
  }
  // çok uzun cümleleri doğal yerlerden böl: önce ; : sonra virgül
  const res = [];
  out.forEach(({ start, end }) => {
    let a = start;
    while (end - a > 400) {
      const seg = text.slice(a, a + 380);
      let cut = Math.max(seg.lastIndexOf(';'), seg.lastIndexOf(':'));
      if (cut < 120) cut = seg.lastIndexOf(',');
      const c = cut > 60 ? a + cut + 1 : a + 380;
      res.push({ start: a, end: c }); a = c;
    }
    res.push({ start: a, end });
  });
  return res.filter(({ start, end }) => text.slice(start, end).trim().length > 0);
}
/** Cümleyi virgül / noktalı virgül / iki noktadan parçalara böl (duraklama için); off = cümle içindeki başlangıç */
export function partsOf(text) {
  const parts = []; const re = /[^,;:]+[,;:]?\s*/g; let m;
  while ((m = re.exec(text))) { if (!m[0]) break; const t = m[0].trim(); if (t) parts.push({ text: t, off: m.index + (m[0].length - m[0].trimStart().length) }); }
  // çok kısa parçaları birleştir (ör. "Evet," gibi tek kelimeler ayrı ayrı okunmasın)
  const merged = [];
  parts.forEach((p) => { const last = merged[merged.length - 1]; if (last && (last.text.length < 12 || p.text.length < 6)) { last.text = text.slice(last.off, p.off + p.text.length).trim(); } else merged.push({ ...p }); });
  return merged.length ? merged : [{ text: text.trim(), off: 0 }];
}
function wordsOf(text) { const out = []; const re = /\S+/g; let m; while ((m = re.exec(text))) out.push({ start: m.index, len: m[0].length }); return out; }

// ================= Oynatıcı =================
// source: { bookId, title, more(): Promise<list|null>, href(s), save(s) }
// sentence: { text, para, parts?, range?, frac?, pdfPage? }
// view (okuyucu açıkken): { bookId, onSentence(s), onWord(s, start, len), onClear() }
let P = null;
let view = null;
let audio = null;
let wake = null;
export const ttsActive = (bookId) => !!P && (!bookId || P.source.bookId === bookId);
export const ttsPlaying = () => !!P && P.playing;
export const ttsCurrent = () => (P ? P.list[P.idx] : null);
/** Test ve hata ayıklama için: oynatıcının durumu (yalnızca okuma) */
export const ttsState = () => (P ? { idx: P.idx, total: P.list.length, engine: P.engine, playing: P.playing, pdfPage: (P.list[P.idx] || {}).pdfPage } : null);
export function setView(v) { view = v; if (!v) refreshMini(); }

async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P && P.playing) keepAwake(true); });

function mediaSession(on) {
  if (!('mediaSession' in navigator)) return;
  try {
    if (!on) { navigator.mediaSession.playbackState = 'none'; return; }
    navigator.mediaSession.metadata = new MediaMetadata({ title: P.source.title || 'Kitap', artist: 'Kitap & Notlarım · sesli okuma', artwork: [{ src: abs('icon-192.png'), sizes: '192x192', type: 'image/png' }] });
    navigator.mediaSession.playbackState = P.playing ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => ttsResume());
    navigator.mediaSession.setActionHandler('pause', () => ttsPause());
    navigator.mediaSession.setActionHandler('stop', () => ttsStop());
    navigator.mediaSession.setActionHandler('nexttrack', () => ttsSkip(1));
    navigator.mediaSession.setActionHandler('previoustrack', () => ttsSkip(-1));
  } catch (e) { /* desteklenmiyor */ }
}

/** Okumayı başlat (ya da yeni listeyle yeniden başlat) */
export async function ttsStart(source, list, idx = 0) {
  const p = ttsPrefs();
  if (p.engine !== 'system' && !(await neuralInstalled(p.engine))) { p.engine = 'system'; saveTts(p); }
  if (p.engine === 'system' && !systemSupported()) { toast('Bu tarayıcı sesli okumayı desteklemiyor'); return; }
  halt();
  P = { source, list, idx: Math.max(0, Math.min(idx, list.length - 1)), playing: true, token: 0, engine: p.engine, cache: new Map() };
  keepAwake(true); mediaSession(true); refreshMini(); notify();
  if (p.engine !== 'system' && !engines[p.engine]) toast('Ses hazırlanıyor… (ilk seferde birkaç saniye sürer)');
  playCurrent();
}
/** Okuyucu yeniden açıldığında: listeyi yenile, çalan cümle kesilmeden devam etsin */
export function ttsReplaceList(list, idx) { if (!P) return; P.list = list; P.idx = idx; P.cache = new Map(); P.replaced = true; }
/** Kullanıcı elle sayfa çevirdi: bulunduğu sayfadan yeniden başlat */
export function ttsJump(list, idx) { if (!P) return; const was = P.playing; halt(true); P.list = list; P.idx = idx; P.cache = new Map(); P.playing = was; if (was) playCurrent(); notify(); }
export function ttsPause() { if (!P || !P.playing) return; P.playing = false; P.token++; haltAudio(); keepAwake(false); mediaSession(true); notify(); refreshMini(); }
export function ttsResume() { if (!P || P.playing) return; P.playing = true; keepAwake(true); mediaSession(true); notify(); refreshMini(); playCurrent(); }
export function ttsToggle() { if (P && P.playing) ttsPause(); else ttsResume(); }
export function ttsStop() {
  if (!P) return;
  const s = P.list[P.idx]; if (s && P.source.save) P.source.save(s);
  halt(); P = null; keepAwake(false); mediaSession(false); if (view) view.onClear(); notify(); refreshMini();
}
export function ttsSkip(d) { if (!P) return; P.token++; haltAudio(); P.idx = Math.max(0, Math.min(P.list.length - 1, P.idx + d)); if (P.playing) playCurrent(); notify(); }
/** Hız / ses değişince: o anki cümleden yeniden */
export function ttsRestartCurrent() { if (!P) return; P.cache = new Map(); P.engine = ttsPrefs().engine; if (P.playing) { P.token++; haltAudio(); playCurrent(); } }
function halt(keep) { if (!P) return; P.token++; haltAudio(); if (!keep) { P.cache = new Map(); } }
function haltAudio() {
  if (systemSupported()) speechSynthesis.cancel();
  if (audio) { audio.onended = null; audio.pause(); }
  cancelAnimationFrame(rafId);
  clearTimeout(gapTimer);
}
let listeners = [];
export function onTtsChange(fn) { listeners.push(fn); }
function notify() { listeners.forEach((f) => { try { f(); } catch (e) { /* yok say */ } }); }

let rafId = 0, gapTimer = 0;
async function playCurrent() {
  if (!P || !P.playing) return;
  if (P.idx >= P.list.length) {
    const more = P.source.more ? await P.source.more(P.list[P.list.length - 1]) : null;
    if (!P) return;
    if (more && more.length) { P.list = more; P.idx = 0; P.cache = new Map(); } else { toast('Sesli okuma bitti'); ttsStop(); return; }
  }
  const tok = ++P.token;
  const s = P.list[P.idx];
  if (P.source.save && !view) P.source.save(s);
  if (view) view.onSentence(s);
  if (P.engine === 'system') return speakSystem(s, tok);
  try {
    const r = await render(P.idx);
    if (!P || P.token !== tok || !P.playing) return;
    prefetch(P.idx + 1); prefetch(P.idx + 2);
    audio = audio || new Audio();
    audio.preservesPitch = true;
    audio.src = r.url;
    audio.playbackRate = P.engine === 'mms' ? ttsPrefs().rate : 1;
    audio.onended = () => { if (P && P.token === tok && P.playing) { P.idx++; P.replaced = false; playCurrent(); } };
    await audio.play();
    const loop = () => {
      if (!P || P.token !== tok) return;
      const t = audio.currentTime;
      const seg = r.segs.find((g) => t >= g.t0 && t < g.t1) || null;
      if (seg && view && !P.replaced) {
        const frac = (t - seg.t0) / Math.max(0.01, seg.t1 - seg.t0);
        wordAt(s, seg.part, frac);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  } catch (e) {
    if (!P || P.token !== tok) return;
    P.playing = false; notify(); refreshMini();
    toast('Sesli okuma durdu: ' + (e.message || e));
  }
}
function wordAt(s, part, frac) {
  const ws = wordsOf(part.text); if (!ws.length) return;
  // kelimeleri uzunluklarına göre zamana yay
  const tot = ws.reduce((t, w) => t + w.len + 1, 0); let acc = 0, k = 0;
  for (; k < ws.length; k++) { acc += ws[k].len + 1; if (acc / tot >= frac) break; }
  const w = ws[Math.min(k, ws.length - 1)];
  if (P.lastWord !== part.off + w.start) { P.lastWord = part.off + w.start; view.onWord(s, part.off + w.start, w.len); }
}
function prefetch(i) { if (P && i < P.list.length && P.engine !== 'system') render(i).catch(() => {}); }
/** Cümleyi seslendir: parçalar arasına ve sona sessizlik ekle; tek WAV + zaman bölütleri */
function render(i) {
  const key = i + '|' + P.engine;
  if (P.cache.has(key)) return P.cache.get(key);
  const s = P.list[i], p = ttsPrefs(), pz = PAUSES[p.pause] || PAUSES.normal;
  const pr = (async () => {
    const e = await getEngine(P.engine);
    const parts = s.parts || partsOf(s.text);
    const chunks = [], segs = []; let t = 0;
    const speed = P.engine === 'mms' ? p.rate : 1;
    for (let k = 0; k < parts.length; k++) {
      const pcm = await e.synth(parts[k].text, p.rate);
      const d = pcm.length / e.sr;
      segs.push({ part: parts[k], t0: t, t1: t + d }); // ses dosyasının kendi zamanı (playbackRate'ten bağımsız)
      chunks.push(pcm); t += d;
      const gap = k < parts.length - 1 ? pz.c : (s.para ? pz.p : pz.s);
      const sil = new Float32Array(Math.round(gap * e.sr * speed)); chunks.push(sil); t += sil.length / e.sr; // hızlandırılınca da ara aynı kalsın
    }
    return { url: URL.createObjectURL(wav(chunks, e.sr)), segs };
  })();
  P.cache.set(key, pr);
  if (P.cache.size > 6) { const k0 = P.cache.keys().next().value; P.cache.get(k0).then((r) => URL.revokeObjectURL(r.url)).catch(() => {}); P.cache.delete(k0); }
  return pr;
}
async function speakSystem(s, tok) {
  const p = ttsPrefs(), pz = PAUSES[p.pause] || PAUSES.normal;
  const v = await systemVoice(p);
  const parts = s.parts || partsOf(s.text);
  let k = 0;
  const next = () => {
    if (!P || P.token !== tok || !P.playing) return;
    if (k >= parts.length) { gapTimer = setTimeout(() => { if (P && P.token === tok && P.playing) { P.idx++; P.replaced = false; playCurrent(); } }, (s.para ? pz.p : pz.s) * 1000); return; }
    const part = parts[k++];
    const u = new SpeechSynthesisUtterance(part.text);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'tr-TR';
    u.rate = p.rate; u.pitch = p.pitch;
    let boundary = false; const t0 = performance.now();
    const est = Math.max(0.6, part.text.length / (14 * p.rate)); // tahmini süre (sn): kelime sınırı gelmezse
    u.onboundary = (e) => { if (!P || P.token !== tok || (e.name && e.name !== 'word') || !view || P.replaced) return; boundary = true; const ci = e.charIndex || 0; const m = /^\S+/.exec(part.text.slice(ci)); if (m) view.onWord(s, part.off + ci, m[0].length); };
    const loop = () => { if (!P || P.token !== tok) return; if (!boundary && view && !P.replaced) wordAt(s, part, Math.min(0.999, (performance.now() - t0) / 1000 / est)); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    u.onend = () => { cancelAnimationFrame(rafId); if (!P || P.token !== tok || !P.playing) return; if (k < parts.length) gapTimer = setTimeout(next, pz.c * 1000); else next(); };
    u.onerror = (e) => { if (!P || P.token !== tok) return; if (e.error === 'interrupted' || e.error === 'canceled') return; P.playing = false; notify(); refreshMini(); toast('Sesli okuma durdu: ' + e.error); };
    speechSynthesis.speak(u);
  };
  next();
}

// ================= Alttaki küçük oynatıcı (okuyucu dışında) =================
function refreshMini() {
  let el = document.getElementById('tts-mini');
  const show = !!P && !document.body.classList.contains('reading');
  if (!show) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'tts-mini'; el.className = 'tts-mini';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tm]'); if (!b || !P) return;
      if (b.dataset.tm === 'toggle') ttsToggle();
      if (b.dataset.tm === 'stop') ttsStop();
      if (b.dataset.tm === 'open') go(P.source.href(P.list[P.idx]));
    });
    document.body.appendChild(el);
  }
  el.hidden = false;
  el.innerHTML = `<span class="tm-t">🔊 ${esc(P.source.title || 'Sesli okuma')}</span>
    <button data-tm="toggle" aria-label="${P.playing ? 'Duraklat' : 'Devam'}">${P.playing ? '⏸' : '▶'}</button>
    <button data-tm="stop" aria-label="Durdur">⏹</button>
    <button data-tm="open" aria-label="Kitaba dön">📖</button>`;
}
export function ttsMiniRefresh() { refreshMini(); }

// ================= Ses / hız / ton paneli (okuyucu ve Ayarlar ortak) =================
export async function voiceFieldsHtml(idp = 'tv') {
  const p = ttsPrefs();
  const vs = await systemVoices();
  const inst = { piper: await neuralInstalled('piper'), mms: await neuralInstalled('mms') };
  const eng = (id, label, sub, ok) => `<label class="eng-row ${p.engine === id ? 'on' : ''}"><input type="radio" name="${idp}-eng" value="${id}" ${p.engine === id ? 'checked' : ''} ${ok ? '' : 'disabled'}>
      <span><b>${label}</b><small>${sub}</small></span></label>`;
  const nrow = (id) => {
    const n = NEURAL[id];
    return inst[id]
      ? eng(id, `⬇️ ${esc(n.name)}`, `İndirildi · internetsiz çalışır${n.slow ? ' · telefonunuzda yavaş kalabilir' : ''} · <a href="#" data-dl-rm="${id}">Sil</a>`, true)
      : `<div class="eng-row dl"><span><b>⬇️ ${esc(n.name)}</b><small>Bir kerelik yaklaşık ${mb(neuralSize(id))} MB${n.slow ? ' · telefonunuzda yavaş kalabilir' : ''}. ${esc(n.license)}</small></span><button type="button" class="btn sm" data-dl="${id}">İndir</button></div><div class="dl-bar" id="${idp}-bar-${id}" hidden><i></i><span></span></div>`;
  };
  return `<div class="field"><span>Okuyucu ses</span>
      ${eng('system', '📱 Telefonun sesi', vs.length ? `${vs.length} Türkçe ses · hemen kullanılır` : 'Bu tarayıcıda Türkçe ses bulunamadı', vs.length > 0)}
      ${p.engine === 'system' && vs.length > 1 ? `<select id="${idp}-voice" class="mt-s">${vs.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === p.voice ? 'selected' : ''}>${esc(voiceLabel(v))}</option>`).join('')}</select>` : ''}
      ${vs.length ? '' : `<button type="button" class="btn sm mt-s" data-rescan>🔄 Sesleri yeniden ara</button>`}
      ${nrow('piper')}${nrow('mms')}</div>
    <div class="field"><span>Okuma hızı: <b id="${idp}-rate-v">${fmt1(p.rate)}×</b></span><input type="range" id="${idp}-rate" min="0.5" max="2" step="0.1" value="${p.rate}"></div>
    <div class="field"><span>Duraklama (virgül, cümle ve paragraf araları)</span><div class="seg">${Object.keys(PAUSES).map((k) => `<button type="button" class="${p.pause === k ? 'on' : ''}" data-pause="${k}">${PAUSE_LABEL[k]}</button>`).join('')}</div></div>
    ${p.engine === 'system' ? `<div class="field"><span>Ses tonu: <b id="${idp}-pitch-v">${fmt1(p.pitch)}</b></span>
      <div class="seg" style="margin-bottom:6px">${[[0.7, '🔉 Kalın'], [1, 'Normal'], [1.3, '🔊 İnce']].map(([v, l]) => `<button type="button" class="${Math.abs(p.pitch - v) < 0.05 ? 'on' : ''}" data-pitch="${v}">${l}</button>`).join('')}</div>
      <input type="range" id="${idp}-pitch" min="0.5" max="1.5" step="0.1" value="${p.pitch}"></div>` : '<p class="hint">Bu seste ton ayarı yoktur.</p>'}
    <button type="button" class="btn block" data-tts-try>🔊 Sesi dene</button>
    <p class="hint">Tüm sesler ücretsizdir. İndirilen sesler bu uygulamanın kendi sitesinden gelir, telefonda saklanır ve metni hiçbir yere göndermez. Telefonun sesi ekran kilitlenince durur; indirilen seslerde okuma kilit ekranında sürebilir (telefona bağlı).</p>`;
}
/** Paneli bağla; rerender: paneli yeniden çizen fonksiyon */
export function bindVoiceFields(root, idp, rerender, onChange) {
  const set = (patch) => { const p = { ...ttsPrefs(), ...patch }; saveTts(p); if (onChange) onChange(p); };
  root.querySelectorAll(`input[name="${idp}-eng"]`).forEach((r) => { r.onchange = () => { set({ engine: r.value }); ttsRestartCurrent(); rerender(); }; });
  const vSel = root.querySelector(`#${idp}-voice`); if (vSel) vSel.onchange = () => { set({ voice: vSel.value }); ttsRestartCurrent(); };
  const rate = root.querySelector(`#${idp}-rate`);
  if (rate) { rate.oninput = () => { root.querySelector(`#${idp}-rate-v`).textContent = fmt1(parseFloat(rate.value)) + '×'; }; rate.onchange = () => { set({ rate: parseFloat(rate.value) }); ttsRestartCurrent(); }; }
  const pitch = root.querySelector(`#${idp}-pitch`);
  if (pitch) { pitch.oninput = () => { root.querySelector(`#${idp}-pitch-v`).textContent = fmt1(parseFloat(pitch.value)); }; pitch.onchange = () => { set({ pitch: parseFloat(pitch.value) }); ttsRestartCurrent(); }; }
  root.querySelectorAll('[data-pitch]').forEach((b) => { b.onclick = () => { set({ pitch: parseFloat(b.dataset.pitch) }); ttsRestartCurrent(); rerender(); setTimeout(() => trySample('Bu ses tonuyla okuyacağım.'), 50); }; });
  root.querySelectorAll('[data-pause]').forEach((b) => { b.onclick = () => { set({ pause: b.dataset.pause }); ttsRestartCurrent(); rerender(); }; });
  const t = root.querySelector('[data-tts-try]'); if (t) t.onclick = () => trySample().catch((e) => toast('⚠️ ' + e.message));
  const rs = root.querySelector('[data-rescan]'); if (rs) rs.onclick = () => { toast('Sesler aranıyor…'); setTimeout(rerender, 300); };
  root.querySelectorAll('[data-dl-rm]').forEach((a) => { a.onclick = async (e) => { e.preventDefault(); if (!confirm(`${NEURAL[a.dataset.dlRm].name} telefondan silinsin mi? (İstediğiniz zaman yeniden indirebilirsiniz.)`)) return; await neuralRemove(a.dataset.dlRm); toast('Silindi'); rerender(); }; });
  root.querySelectorAll('[data-dl]').forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.dl;
      const c = navigator.connection;
      if (c && (c.type === 'cellular' || c.saveData) && !confirm(`Yaklaşık ${mb(neuralSize(id))} MB indirilecek ve mobil veri kullanıyor görünüyorsunuz. Devam edilsin mi?`)) return;
      if (!c && !confirm(`Yaklaşık ${mb(neuralSize(id))} MB indirilecek. Mümkünse Wi-Fi kullanın. Devam edilsin mi?`)) return;
      const bar = root.querySelector(`#${idp}-bar-${id}`); if (bar) bar.hidden = false;
      b.disabled = true; b.textContent = 'İniyor…';
      try {
        await neuralDownload(id, (got, tot) => { if (bar) { bar.querySelector('i').style.width = Math.round((got / tot) * 100) + '%'; bar.querySelector('span').textContent = `${mb(got)} / ${mb(tot)} MB`; } });
        set({ engine: id }); toast(`✓ ${NEURAL[id].name} indirildi ve seçildi`); ttsRestartCurrent(); rerender();
      } catch (e) { toast('⚠️ ' + e.message); b.disabled = false; b.textContent = 'İndir'; }
    };
  });
}
export async function openVoiceSheet() {
  const s = openSheet({ title: '🗣️ Ses, hız ve duraklama', body: '<div id="tvs"></div>' });
  const draw = async () => { const box = s.querySelector('#tvs'); if (!box) return; box.innerHTML = await voiceFieldsHtml('tvs'); bindVoiceFields(box, 'tvs', draw, () => notify()); };
  draw();
}
