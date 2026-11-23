// PIN kilidi: Ayarlar'da seçilen bölümleri (Günlük, Düşünceler, not defterleri, alışveriş listesi) korur.
// Tek PIN ve tek kurtarma kodu vardır; kilit bir kez açılınca tüm kilitli bölümler açılır.
// PIN cihazda açık metin olarak değil, tuzlanmış SHA-256 özeti olarak saklanır.
// Not: Bu bir "meraklı gözlere karşı" kilittir; veriler cihazda şifrelenmiş değildir.
import * as DB from './db.js?v=3.0';
import { $, $$, esc, toast, openSheet, closeSheet, rerender } from './ui.js?v=3.0';

const idleMs = () => (parseInt(DB.getSettings().lockMinutes, 10) || 5) * 60 * 1000;
let unlocked = false;
let lastActive = Date.now();
let fails = 0;
let blockedUntil = 0;

export function enabled() { const p = DB.getSettings().pin; return !!(p && p.hash); }
/** Bölüm kilitli olarak işaretli mi? (PIN açık olmasa da ayar olarak) */
export function isLockedSection(section) { return (DB.getSettings().locks || []).includes(section); }
/** Bölüm şu an açık mı? section verilmezse: tüm kilitler açık mı */
export function isOpen(section) {
  if (!enabled()) return true;
  if (section && !isLockedSection(section)) return true;
  checkIdle();
  return unlocked;
}
export function lock() { unlocked = false; }
export function setSectionLocked(section, on) {
  const cur = new Set(DB.getSettings().locks || []);
  if (on) cur.add(section); else cur.delete(section);
  DB.setSettings({ locks: [...cur] });
}

function checkIdle() { if (unlocked && Date.now() - lastActive > idleMs()) unlocked = false; }
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { checkIdle(); lastActive = Date.now(); }, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { const was = unlocked; checkIdle(); if (was && !unlocked) rerender(); } });
setInterval(() => { const was = unlocked; checkIdle(); if (was && !unlocked) rerender(); }, 30000);

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function newRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(8); crypto.getRandomValues(a);
  const s = [...a].map((b) => chars[b % chars.length]).join('');
  return s.slice(0, 4) + '-' + s.slice(4);
}
const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function storePin(pin) {
  const salt = randomHex(16);
  const code = newRecoveryCode();
  const prev = DB.getSettings().pin || {};
  DB.setSettings({ pin: { ...prev, salt, hash: await sha(salt + ':' + pin), recHash: await sha(salt + ':rec:' + cleanCode(code)) } });
  return code;
}
async function checkPin(pin) { const p = DB.getSettings().pin; return !!p && (await sha(p.salt + ':' + pin)) === p.hash; }
async function checkCode(code) { const p = DB.getSettings().pin; return !!p && (await sha(p.salt + ':rec:' + cleanCode(code))) === p.recHash; }

// ---- PIN tuş takımı ----
function padHtml(label) {
  return `<div class="pin-box"><div class="pin-label">${esc(label)}</div>
    <div class="pin-dots">${[0, 1, 2, 3].map(() => '<i></i>').join('')}</div>
    <div class="pin-err small"></div>
    <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-n="${n}">${n}</button>`).join('')}<span></span><button type="button" data-n="0">0</button><button type="button" data-n="del" aria-label="Sil">⌫</button></div></div>`;
}
/** Tuş takımını bağlar; 4 hane girilince onDone(pin) çağrılır. */
function bindPad(root, onDone) {
  let val = '';
  const dots = $$('.pin-dots i', root);
  const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
  const press = async (n) => {
    if (n === 'del') { val = val.slice(0, -1); paint(); return; }
    if (val.length >= 4) return;
    val += n; paint();
    if (val.length === 4) { const v = val; setTimeout(async () => { const keep = await onDone(v); if (!keep) { val = ''; paint(); } }, 120); }
  };
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) press(b.dataset.n); });
  const onKey = (e) => { if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; } if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('del'); };
  document.addEventListener('keydown', onKey);
  return { error: (msg) => { $('.pin-err', root).textContent = msg; root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); } };
}

/** Kilit ekranını verilen kapsayıcıya çizer. */
export function renderLockScreen(container, sectionName) {
  container.innerHTML = `<div class="lock-screen"><div class="lock-ico">🔒</div><h2>${esc(sectionName)} kilitli</h2>
    <p class="muted small">Devam etmek için PIN'inizi girin.</p>${padHtml('')}
    <button class="btn ghost sm mt" data-x="forgot">PIN'i unuttum</button></div>`;
  const box = $('.pin-box', container);
  const pad = bindPad(box, async (pin) => {
    if (Date.now() < blockedUntil) { pad.error(`Çok fazla deneme. ${Math.ceil((blockedUntil - Date.now()) / 1000)} sn bekleyin.`); return false; }
    if (await checkPin(pin)) { unlocked = true; lastActive = Date.now(); fails = 0; rerender(); return true; }
    fails++;
    if (fails >= 5) { blockedUntil = Date.now() + 30000; fails = 0; pad.error('5 hatalı deneme. 30 saniye bekleyin.'); }
    else pad.error('PIN yanlış');
    return false;
  });
  $('[data-x="forgot"]', container).onclick = () => recoverFlow();
}

function recoverFlow() {
  const s = openSheet({
    title: 'PIN\'i unuttum',
    body: `<p>PIN'i ilk kurduğunuzda size gösterilen <b>kurtarma kodunu</b> yazın (ör. <code>K7M4-9QX2</code>).</p>
      <label class="field"><span>Kurtarma kodu</span><input id="rec-code" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX"></label>`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="ok">Devam</button>`,
  });
  $('[data-x="ok"]', s).onclick = async () => {
    if (!(await checkCode($('#rec-code', s).value))) { toast('Kurtarma kodu yanlış'); return; }
    await closeSheet();
    setPinFlow({ title: 'Yeni PIN belirleyin', afterRecovery: true });
  };
}

/** Yeni PIN belirleme (iki kez sorulur), ardından yeni kurtarma kodunu gösterir. */
export function setPinFlow({ title = 'PIN belirleyin', afterRecovery = false, onDone = null } = {}) {
  let first = '';
  const s = openSheet({ title, body: `<div id="pin-area">${padHtml('4 haneli yeni PIN')}</div>` });
  const area = $('#pin-area', s);
  const step1 = () => {
    area.innerHTML = padHtml('4 haneli yeni PIN');
    bindPad($('.pin-box', area), (pin) => { first = pin; step2(); return true; });
  };
  const step2 = () => {
    area.innerHTML = padHtml('PIN\'i tekrar girin');
    const pad = bindPad($('.pin-box', area), async (pin) => {
      if (pin !== first) { pad.error('PIN\'ler aynı değil, baştan girin'); setTimeout(step1, 900); return true; }
      const code = await storePin(pin);
      unlocked = true; lastActive = Date.now();
      showCode(code);
      return true;
    });
  };
  const showCode = (code) => {
    const s2 = openSheet({
      title: '🔑 Kurtarma kodunuz',
      body: `<p>PIN'i unutursanız bu kodla yeni PIN belirleyebilirsiniz. <b>Bu kod bir daha gösterilmeyecek.</b> Bir kâğıda yazın ya da güvenli bir yere kaydedin.</p>
        <div class="rec-code">${esc(code)}</div>
        ${afterRecovery ? '<p class="hint">Eski kurtarma kodunuz artık geçersiz.</p>' : ''}
        <label class="check"><input type="checkbox" id="rec-ok"> Kodu bir yere yazdım</label>`,
      foot: `<button class="btn primary" data-x="done" disabled>Tamam</button>`,
      locked: true,
    });
    $('#rec-ok', s2).onchange = (e) => { $('[data-x="done"]', s2).disabled = !e.target.checked; };
    $('[data-x="done"]', s2).onclick = async () => { await closeSheet(); toast('PIN kilidi açık ✓'); if (onDone) onDone(); rerender(); };
  };
  step1();
}

/** Mevcut PIN'i sorar; doğruysa onOk çağrılır. */
export function askPin(title, onOk) {
  const s = openSheet({ title, body: padHtml('Mevcut PIN') });
  const pad = bindPad($('.pin-box', s), async (pin) => {
    if (await checkPin(pin)) { await closeSheet(); onOk(); return true; }
    pad.error('PIN yanlış'); return false;
  });
}

/** Kilidi bir alt sayfada açar (ör. arama sayfasından) */
export function unlockFlow(onOk) {
  const s = openSheet({ title: '🔒 Kilidi aç', body: padHtml('PIN') });
  const pad = bindPad($('.pin-box', s), async (pin) => {
    if (Date.now() < blockedUntil) { pad.error(`Çok fazla deneme. ${Math.ceil((blockedUntil - Date.now()) / 1000)} sn bekleyin.`); return false; }
    if (await checkPin(pin)) { unlocked = true; lastActive = Date.now(); fails = 0; await closeSheet(); if (onOk) onOk(); return true; }
    fails++;
    if (fails >= 5) { blockedUntil = Date.now() + 30000; fails = 0; pad.error('5 hatalı deneme. 30 saniye bekleyin.'); } else pad.error('PIN yanlış');
    return false;
  });
}
export function disablePin() {
  askPin('PIN kilidini kapat', () => { DB.setSettings({ pin: null }); unlocked = false; toast('PIN kilidi kapatıldı'); rerender(); });
}
/** Kurtarma kodunu yeniler (PIN sorulur), yenisini gösterir */
export function regenCode() {
  askPin('Kurtarma kodunu yenile', async () => {
    const p = DB.getSettings().pin;
    const chars = newRecoveryCode();
    DB.setSettings({ pin: { ...p, recHash: await sha(p.salt + ':rec:' + cleanCode(chars)) } });
    const s = openSheet({
      title: '🔑 Yeni kurtarma kodunuz',
      body: `<p>Eski kod artık geçersiz. <b>Bu kod bir daha gösterilmeyecek</b>, bir yere yazın.</p><div class="rec-code">${esc(chars)}</div>
        <label class="check"><input type="checkbox" id="rec-ok"> Kodu bir yere yazdım</label>`,
      foot: `<button class="btn primary" data-x="done" disabled>Tamam</button>`, locked: true,
    });
    $('#rec-ok', s).onchange = (e) => { $('[data-x="done"]', s).disabled = !e.target.checked; };
    $('[data-x="done"]', s).onclick = () => closeSheet();
  });
}
export function changePin() {
  askPin('PIN\'i değiştir', () => setPinFlow({ title: 'Yeni PIN belirleyin' }));
}
