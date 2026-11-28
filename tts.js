// 🔊 Sesli okuma (kitabı dinleme): telefonun kendi Türkçe sesi (Web Speech API) ve oynatıcı.
//
// 3.5.3: İndirilebilir Piper / MMS sesleri kaldırıldı — telefon hızına yakın koşullarda ilk sese kadar 23 sn / 77 sn
// sürdü ve kullanıcının telefonunda okumadı. Önceki sürümde indirilmiş ses dosyaları (kn-voices önbelleği) silinir.
// Okuma, okuyucudan çıkınca da sürer (alttaki küçük oynatıcı), ⏹ ile durur. Okunan metin hiçbir yere gönderilmez
// (tarayıcının "yerel değil" bildirdiği sesler hariç; listede 🌐 ile işaretlenir).
import * as DB from './db.js?v=3.5.3';
import { $, esc, toast, go, openSheet } from './ui.js?v=3.5.3';

// ================= Ayarlar =================
export const TTS_DEFAULT = { voice: '', rate: 1, pitch: 1, pause: 'normal' };
export function ttsPrefs() { const p = { ...TTS_DEFAULT, ...(DB.getSettings().tts || {}) }; delete p.engine; return p; }
// Önceki sürümde indirilmiş ses dosyalarını telefondan sil (yer açılsın)
try { if ('caches' in window) caches.delete('kn-voices').catch(() => {}); } catch (e) { /* yok say */ }
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

/** Ayarlarda "dene" için: tek cümle */
export async function trySample(text = 'Merhaba, bu kitabı sizin için bu sesle okuyacağım.') {
  if (!systemSupported()) { toast('Bu tarayıcı sesli okumayı desteklemiyor'); return; }
  const p = ttsPrefs();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); const v = await systemVoice(p);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'tr-TR';
  u.rate = p.rate; u.pitch = p.pitch; speechSynthesis.speak(u);
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
let wake = null;
export const ttsActive = (bookId) => !!P && (!bookId || P.source.bookId === bookId);
export const ttsPlaying = () => !!P && P.playing;
export const ttsCurrent = () => (P ? P.list[P.idx] : null);
/** Test ve hata ayıklama için: oynatıcının durumu (yalnızca okuma) */
export const ttsState = () => (P ? { idx: P.idx, total: P.list.length, playing: P.playing, pdfPage: (P.list[P.idx] || {}).pdfPage } : null);
export function setView(v) { view = v; if (!v) refreshMini(); }

async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P && P.playing) keepAwake(true); });

/** Okumayı başlat (ya da yeni listeyle yeniden başlat) */
export async function ttsStart(source, list, idx = 0) {
  if (!systemSupported()) { toast('Bu tarayıcı sesli okumayı desteklemiyor'); return; }
  halt();
  P = { source, list, idx: Math.max(0, Math.min(idx, list.length - 1)), playing: true, token: 0 };
  keepAwake(true); refreshMini(); notify();
  playCurrent();
}
/** Okuyucu yeniden açıldığında: listeyi yenile, çalan cümle kesilmeden devam etsin */
export function ttsReplaceList(list, idx) { if (!P) return; P.list = list; P.idx = idx; P.replaced = true; }
/** Kullanıcı elle sayfa çevirdi: bulunduğu sayfadan yeniden başlat */
export function ttsJump(list, idx) { if (!P) return; const was = P.playing; halt(); P.list = list; P.idx = idx; P.playing = was; if (was) playCurrent(); notify(); }
export function ttsPause() { if (!P || !P.playing) return; P.playing = false; P.token++; haltAudio(); keepAwake(false); notify(); refreshMini(); }
export function ttsResume() { if (!P || P.playing) return; P.playing = true; keepAwake(true); notify(); refreshMini(); playCurrent(); }
export function ttsToggle() { if (P && P.playing) ttsPause(); else ttsResume(); }
export function ttsStop() {
  if (!P) return;
  const s = P.list[P.idx]; if (s && P.source.save) P.source.save(s);
  halt(); P = null; keepAwake(false); if (view) view.onClear(); notify(); refreshMini();
}
export function ttsSkip(d) { if (!P) return; P.token++; haltAudio(); P.idx = Math.max(0, Math.min(P.list.length - 1, P.idx + d)); if (P.playing) playCurrent(); notify(); }
/** Hız / ses değişince: o anki cümleden yeniden */
export function ttsRestartCurrent() { if (!P) return; if (P.playing) { P.token++; haltAudio(); playCurrent(); } }
function halt() { if (!P) return; P.token++; haltAudio(); }
function haltAudio() {
  if (systemSupported()) speechSynthesis.cancel();
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
    if (more && more.length) { P.list = more; P.idx = 0; } else { toast('Sesli okuma bitti'); ttsStop(); return; }
  }
  const tok = ++P.token;
  const s = P.list[P.idx];
  if (P.source.save && !view) P.source.save(s);
  if (view) view.onSentence(s);
  speakSystem(s, tok);
}
function wordAt(s, part, frac) {
  const ws = wordsOf(part.text); if (!ws.length) return;
  // kelimeleri uzunluklarına göre zamana yay
  const tot = ws.reduce((t, w) => t + w.len + 1, 0); let acc = 0, k = 0;
  for (; k < ws.length; k++) { acc += ws[k].len + 1; if (acc / tot >= frac) break; }
  const w = ws[Math.min(k, ws.length - 1)];
  if (P.lastWord !== part.off + w.start) { P.lastWord = part.off + w.start; view.onWord(s, part.off + w.start, w.len); }
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
  return `<div class="field"><span>Okuyucu ses</span>
      ${vs.length > 1 ? `<select id="${idp}-voice">${vs.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === p.voice ? 'selected' : ''}>${esc(voiceLabel(v))}</option>`).join('')}</select>`
        : vs.length ? `<div class="eng-row on"><span><b>${esc(voiceGender(vs[0]) + vs[0].name)}</b><small>${vs[0].localService ? '📱 Telefonun Türkçe sesi · ücretsiz' : '🌐 İnternet üzerinden çalışan ses · okunan cümleler sesin sağlayıcısına gider'}</small></span></div>`
        : `<p class="hint">Bu tarayıcıda Türkçe ses bulunamadı.</p><button type="button" class="btn sm" data-rescan>🔄 Sesleri yeniden ara</button>`}
      <p class="hint">Telefonda başka Türkçe ses yüklüyse (telefon ayarlarındaki “Metin okuma” bölümü) burada listelenir.</p></div>
    <div class="field"><span>Okuma hızı: <b id="${idp}-rate-v">${fmt1(p.rate)}×</b></span><input type="range" id="${idp}-rate" min="0.5" max="2" step="0.1" value="${p.rate}"></div>
    <div class="field"><span>Duraklama (virgül, cümle ve paragraf araları)</span><div class="seg">${Object.keys(PAUSES).map((k) => `<button type="button" class="${p.pause === k ? 'on' : ''}" data-pause="${k}">${PAUSE_LABEL[k]}</button>`).join('')}</div></div>
    <div class="field"><span>Ses tonu: <b id="${idp}-pitch-v">${fmt1(p.pitch)}</b></span>
      <div class="seg" style="margin-bottom:6px">${[[0.7, '🔉 Kalın'], [1, 'Normal'], [1.3, '🔊 İnce']].map(([v, l]) => `<button type="button" class="${Math.abs(p.pitch - v) < 0.05 ? 'on' : ''}" data-pitch="${v}">${l}</button>`).join('')}</div>
      <input type="range" id="${idp}-pitch" min="0.5" max="1.5" step="0.1" value="${p.pitch}"></div>
    <button type="button" class="btn block" data-tts-try>🔊 Sesi dene</button>
    <p class="hint">Ses ücretsizdir ve telefonun kendi sesidir. Okuma, uygulamanın başka bölümüne geçince sürer; ekran kilitlenince telefon okumayı durdurur.</p>`;
}
/** Paneli bağla; rerender: paneli yeniden çizen fonksiyon */
export function bindVoiceFields(root, idp, rerender, onChange) {
  const set = (patch) => { const p = { ...ttsPrefs(), ...patch }; saveTts(p); if (onChange) onChange(p); };
  const vSel = root.querySelector(`#${idp}-voice`); if (vSel) vSel.onchange = () => { set({ voice: vSel.value }); ttsRestartCurrent(); };
  const rate = root.querySelector(`#${idp}-rate`);
  if (rate) { rate.oninput = () => { root.querySelector(`#${idp}-rate-v`).textContent = fmt1(parseFloat(rate.value)) + '×'; }; rate.onchange = () => { set({ rate: parseFloat(rate.value) }); ttsRestartCurrent(); }; }
  const pitch = root.querySelector(`#${idp}-pitch`);
  if (pitch) { pitch.oninput = () => { root.querySelector(`#${idp}-pitch-v`).textContent = fmt1(parseFloat(pitch.value)); }; pitch.onchange = () => { set({ pitch: parseFloat(pitch.value) }); ttsRestartCurrent(); }; }
  root.querySelectorAll('[data-pitch]').forEach((b) => { b.onclick = () => { set({ pitch: parseFloat(b.dataset.pitch) }); ttsRestartCurrent(); rerender(); setTimeout(() => trySample('Bu ses tonuyla okuyacağım.'), 50); }; });
  root.querySelectorAll('[data-pause]').forEach((b) => { b.onclick = () => { set({ pause: b.dataset.pause }); ttsRestartCurrent(); rerender(); }; });
  const t = root.querySelector('[data-tts-try]'); if (t) t.onclick = () => trySample().catch((e) => toast('⚠️ ' + e.message));
  const rs = root.querySelector('[data-rescan]'); if (rs) rs.onclick = () => { toast('Sesler aranıyor…'); setTimeout(rerender, 300); };
}
export async function openVoiceSheet() {
  const s = openSheet({ title: '🗣️ Ses, hız ve duraklama', body: '<div id="tvs"></div>' });
  const draw = async () => { const box = s.querySelector('#tvs'); if (!box) return; box.innerHTML = await voiceFieldsHtml('tvs'); bindVoiceFields(box, 'tvs', draw, () => notify()); };
  draw();
}
