// 📔 Günlük: yönlendirici başlıklarla gün içinde istediğiniz kadar "an" yazın.
// Her an yazıldığı saatle kaydedilir; gün sonunda hepsi tek bir sayfa olarak okunur.
// Ruh hâli, fotoğraf, takvim ve "geçen yıl bugün" hatırlatması.
import * as DB from './db.js?v=3.5.4';
import * as EX from './export.js?v=3.5.4';
import * as Lock from './lock.js?v=3.5.4';
import { $, esc, safeSrc, view, toast, openSheet, closeSheet, confirmDialog, rerender, go, today, fmtTime, fmtDateTime,
  longDate, addDays, parseDate, localDate, MONTHS, pickFiles, loadImage, dataUrlToBlob } from './ui.js?v=3.5.4';

// Hazır başlıklar. Kullanıcı bunların adını/emojisini değiştirebilir, gizleyebilir;
// ayrıca kendi başlıklarını ekleyebilir (DB 'prompts' deposunda saklanır, yedeğe dahildir).
export const BUILTIN = [
  { id: 'place', e: '📍', l: 'Bugün nereye gittim', ph: 'Bugün nerelere gittiniz, kimlerle?' },
  { id: 'saw', e: '👀', l: 'Ne gördüm', ph: 'Gördüğünüz bir manzara, bir yüz, bir an…' },
  { id: 'event', e: '⚡', l: 'Önemli bir olay', ph: 'Bugün ne oldu? Nasıl gelişti?' },
  { id: 'mind', e: '💭', l: 'Aklımdan geçen', ph: 'Bugün aklınızı meşgul eden düşünceler…' },
  { id: 'feel', e: '❤️', l: 'Nasıl hissettim', ph: 'O anki duygularınız…' },
  { id: 'remember', e: '📌', l: 'Bunu unutmamalıyım', ph: 'İleride hatırlamak istediğiniz şey…' },
  { id: 'free', e: '✍️', l: 'Serbest yazı', ph: 'İçinizden geldiği gibi yazın…' },
];
const BUILTIN_IDS = new Set(BUILTIN.map((p) => p.id));
const EMOJIS = ['😊', '🙏', '🌅', '🌙', '☀️', '🌧️', '🌳', '🌊', '⛰️', '🏠', '🚶', '🚗', '✈️', '🕌', '📚', '📖', '✏️', '🎓', '💼', '🏃', '⚽', '🍽️', '☕', '🎵', '🎬', '👨‍👩‍👧', '👶', '🧑‍🤝‍🧑', '💬', '📞', '🎁', '🎉', '💡', '🎯', '✅', '⭐', '🌟', '💪', '😌', '😢', '😡', '🤔', '🤲', '🕊️', '🌹', '📷', '💰', '🩺'];

/** Görünen başlık listesi: hazır başlıklar (değişiklikleriyle, gizlenenler hariç) + kendi başlıklarınız */
export function prompts({ withHidden = false } = {}) {
  const recs = new Map(DB.promptRecords().map((r) => [r.id, r]));
  const out = BUILTIN.map((b) => { const r = recs.get(b.id) || {}; return { ...b, e: r.e || b.e, l: r.l || b.l, hidden: !!r.hidden, builtin: true }; });
  DB.promptRecords().filter((r) => !BUILTIN_IDS.has(r.id)).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    .forEach((r) => out.push({ id: r.id, e: r.e || '🔖', l: r.l || 'Başlık', ph: r.ph || 'Yazın…', hidden: !!r.hidden, builtin: false }));
  return withHidden ? out : out.filter((p) => !p.hidden);
}
/** Bir yazının başlığı: güncel başlık; silinmişse yazıya kaydedilen kopya; o da yoksa Serbest yazı */
export function getPrompt(id, m = null) {
  const p = prompts({ withHidden: true }).find((x) => x.id === id);
  if (p) return p;
  if (m && m.pl) return { id, e: m.pe || '🔖', l: m.pl, ph: 'Yazın…' };
  return prompts({ withHidden: true }).find((x) => x.id === 'free');
}

export const MOODS = [['😄', 'Çok iyi'], ['🙂', 'İyi'], ['😐', 'Normal'], ['😔', 'Üzgün'], ['😢', 'Çok kötü']];

function lockBtn() { return Lock.enabled() ? '<button class="btn sm ghost" data-act="lock-now" title="Kilitle">🔒</button>' : ''; }
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

/** Aynı gün-ay, önceki yıllar */
function onThisDay(date) {
  const md = date.slice(5);
  const years = new Set(DB.moments().filter((m) => m.date.slice(5) === md && m.date < date).map((m) => m.date));
  return [...years].sort().reverse();
}

export function renderJournal(date) {
  if (!Lock.isOpen('journal')) { Lock.renderLockScreen(view, 'Günlük'); return; }
  const t = today();
  if (!isDate(date)) date = t;
  const ms = DB.momentsOn(date);
  const day = DB.getDay(date);
  const isToday = date === t;
  const past = onThisDay(date);
  let h = `<div class="topbar"><h1>📔 Günlük</h1>${lockBtn()}<a class="btn sm" href="#/journal-cal/${date.slice(0, 7)}">📅 Takvim</a></div>
    <div class="day-nav"><button class="btn sm" data-act="jday" data-d="${addDays(date, -1)}" aria-label="Önceki gün">‹</button>
      <div class="day-title"><b>${esc(longDate(date))}</b>${isToday ? '<span class="badge today">Bugün</span>' : `<button class="btn sm ghost" data-act="jday" data-d="${t}">Bugüne dön</button>`}</div>
      <button class="btn sm" data-act="jday" data-d="${addDays(date, 1)}" ${date >= t ? 'disabled' : ''} aria-label="Sonraki gün">›</button></div>`;
  past.forEach((d) => {
    const n = DB.momentsOn(d).length;
    const yrs = parseDate(date).getFullYear() - parseDate(d).getFullYear();
    h += `<a class="banner sky" href="#/journal/${d}"><span style="font-size:22px">🕰️</span><span class="grow"><b>${yrs === 1 ? 'Geçen yıl' : yrs + ' yıl önce'} bugün</b> ${n} şey yazmışsınız. Okumak için dokunun.</span><span>›</span></a>`;
  });
  h += `<div class="card mood-card"><span class="small muted" style="font-weight:800">${isToday ? 'Bugün' : 'O gün'} genel olarak nasıldınız?</span>
    <div class="moods">${MOODS.map(([e, l]) => `<button class="${day && day.mood === e ? 'on' : ''}" data-act="mood" data-d="${date}" data-m="${e}" title="${l}">${e}<small>${l}</small></button>`).join('')}</div></div>
    <div class="section-title">✏️ Yazmak için bir başlık seçin <button class="btn sm ghost" data-act="prompts-manage" style="margin-left:auto">⚙️ Başlıklar</button></div>
    <div class="prompt-grid">${prompts().map((p) => `<button class="prompt-btn" data-act="moment-new" data-d="${date}" data-p="${p.id}"><span>${p.e}</span>${esc(p.l)}</button>`).join('')}
      <button class="prompt-btn add" data-act="prompt-new"><span>＋</span>Yeni başlık ekle</button></div>`;
  if (!ms.length) {
    h += `<div class="empty small"><div class="e">📖</div><h3>${isToday ? 'Bugün' : 'Bu gün'} henüz bir şey yazmadınız</h3><p>Yukarıdaki başlıklardan birine dokunun. Gün içinde istediğiniz kadar yazabilirsiniz; her biri yazdığınız saatle kaydedilir.</p></div>`;
  } else {
    h += `<div class="section-title">📖 ${isToday ? 'Bugünün' : 'O günün'} sayfası <span class="count">${ms.length}</span></div>
      <article class="day-page"><h2>${esc(longDate(date))} ${day && day.mood ? day.mood : ''}</h2>
      ${ms.map((m) => momentHtml(m, date)).join('')}</article>`;
  }
  view.innerHTML = h;
}

function momentHtml(m, date) {
  const p = getPrompt(m.prompt, m);
  const otherDay = m.at && localDate(new Date(m.at)) !== date;
  return `<section class="moment">
    <div class="m-head"><span class="m-time">${esc(fmtTime(m.at))}</span><span class="m-label">${p.e} ${esc(m.title || p.l)}</span>
      <span class="m-act"><button data-act="moment-edit" data-id="${m.id}" aria-label="Düzenle">✏️</button></span></div>
    ${otherDay ? `<div class="small muted">Yazılış: ${esc(fmtDateTime(m.at))}</div>` : ''}
    ${m.text ? `<div class="m-text">${esc(m.text)}</div>` : ''}
    ${m.photos && m.photos.length ? `<div class="m-photos">${m.photos.map((ph) => `<img src="${safeSrc(ph.data)}" alt="" data-act="photo-view" data-id="${m.id}" data-ph="${ph.id}" loading="lazy">`).join('')}</div>` : ''}
    </section>`;
}

async function resizePhoto(file) {
  const img = await loadImage(file);
  const max = 1600;
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { id: DB.uid(), data: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height };
}

function openMomentEditor({ id = null, date = today(), prompt = 'free' } = {}) {
  const m = id ? { ...DB.getMoment(id) } : { date, prompt, text: '', photos: [] };
  if (id && !m.id) return;
  let photos = [...(m.photos || [])];
  const p = getPrompt(m.prompt, m);
  const list = prompts();
  if (!list.some((x) => x.id === p.id)) list.unshift(p);
  const s = openSheet({
    title: `${p.e} ${m.title || p.l}`,
    body: `<p class="hint">${id ? `Yazılış: ${esc(fmtDateTime(m.at))}` : `🕒 ${esc(fmtDateTime(new Date().toISOString()))} olarak kaydedilecek${date !== today() ? ` · ${esc(longDate(date))} sayfasına` : ''}.`}</p>
      <label class="field"><span>Başlık</span><select id="m-prompt">${list.map((x) => `<option value="${x.id}" ${x.id === m.prompt ? 'selected' : ''}>${x.e} ${esc(x.l)}</option>`).join('')}</select></label>
      <label class="field"><textarea id="m-text" class="serif" rows="8" placeholder="${esc(p.ph)}">${esc(m.text || '')}</textarea></label>
      <div class="field"><span>Fotoğraflar</span><div class="m-photos edit" id="m-photos"></div>
        <div class="row-actions"><button type="button" class="btn sm" data-x="cam">📷 Fotoğraf çek</button><button type="button" class="btn sm" data-x="gal">🖼️ Galeriden seç</button></div>
        <p class="hint">İpucu: Fotoğrafı telefonun kendi kamerasıyla çekip “Galeriden seç” ile eklerseniz fotoğraf galeride de kalır.</p></div>`,
    foot: `${id ? '<button class="btn danger" data-x="del" style="flex:0 0 auto">🗑️</button>' : ''}<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  const paint = () => {
    $('#m-photos', s).innerHTML = photos.map((ph) => `<div class="ph"><img src="${safeSrc(ph.data)}" alt=""><button type="button" data-rm="${ph.id}" aria-label="Kaldır">×</button></div>`).join('');
  };
  paint();
  $('#m-prompt', s).onchange = (e) => { $('#m-text', s).placeholder = getPrompt(e.target.value).ph; };
  s.addEventListener('click', async (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { photos = photos.filter((x) => x.id !== rm.dataset.rm); paint(); return; }
    const x = e.target.closest('[data-x]'); if (!x) return;
    if (x.dataset.x === 'cam' || x.dataset.x === 'gal') {
      const files = await pickFiles({ multiple: x.dataset.x === 'gal', capture: x.dataset.x === 'cam' });
      for (const f of files) { try { photos.push(await resizePhoto(f)); } catch (err) { toast('Bir fotoğraf açılamadı'); } }
      paint();
    }
    if (x.dataset.x === 'save') {
      const text = $('#m-text', s).value.trim();
      if (!text && !photos.length) { toast('Bir şey yazın ya da fotoğraf ekleyin'); return; }
      m.prompt = $('#m-prompt', s).value; m.text = text; m.photos = photos;
      const cur = getPrompt(m.prompt, m); m.pe = cur.e; m.pl = cur.l; // başlık sonradan silinse de yazıda kalsın
      if (!m.at) m.at = new Date().toISOString(); else m.editedAt = new Date().toISOString();
      await DB.save('moments', m);
      await closeSheet(); toast('Günlüğe kaydedildi ✓'); rerender();
    }
    if (x.dataset.x === 'del') {
      if (await confirmDialog('Bu yazı günlükten silinsin mi?', 'Sil')) { await DB.remove('moments', m.id); toast('Silindi'); rerender(); }
    }
  });
  setTimeout(() => $('#m-text', s).focus(), 250);
}

async function savePhoto(ph, name) {
  const blob = dataUrlToBlob(ph.data);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    try {
      const file = new File([blob], name, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Fotoğraf kaydedildi ✓ (Galeri → İndirilenler)', 3500);
}

function viewPhoto(momentId, phId) {
  const m = DB.getMoment(momentId); if (!m) return;
  const ph = (m.photos || []).find((x) => x.id === phId); if (!ph) return;
  const s = openSheet({
    title: `📷 ${longDate(m.date)} · ${fmtTime(m.at)}`, wide: true,
    body: `<img class="photo-full" src="${safeSrc(ph.data)}" alt="">`,
    foot: `<button class="btn" data-act="close-sheet">Kapat</button><button class="btn primary" data-x="dl">⬇️ Telefona kaydet</button>`,
  });
  $('[data-x="dl"]', s).onclick = () => savePhoto(ph, `gunluk-${m.date}-${fmtTime(m.at).replace(':', '')}.jpg`);
}

// ---- Takvim ----
export function renderJournalCal(ym) {
  if (!Lock.isOpen('journal')) { Lock.renderLockScreen(view, 'Günlük'); return; }
  if (!/^\d{4}-\d{2}$/.test(ym || '')) ym = today().slice(0, 7);
  const [y, mo] = ym.split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const daysIn = new Date(y, mo, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Pazartesi başlangıçlı
  const prev = localDate(new Date(y, mo - 2, 1)).slice(0, 7), next = localDate(new Date(y, mo, 1)).slice(0, 7);
  const t = today();
  const byDate = new Map();
  DB.moments().forEach((m) => { if (m.date.startsWith(ym)) byDate.set(m.date, (byDate.get(m.date) || 0) + 1); });
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${ym}-${String(d).padStart(2, '0')}`;
    const n = byDate.get(ds) || 0;
    const mood = (DB.getDay(ds) || {}).mood;
    const future = ds > t;
    cells += future ? `<span class="cal-d future">${d}</span>`
      : `<a class="cal-d ${n ? 'has' : ''} ${ds === t ? 'today' : ''}" href="#/journal/${ds}"><b>${d}</b>${mood ? `<i>${mood}</i>` : n ? '<i class="dot"></i>' : ''}</a>`;
  }
  const monthDays = [...byDate.keys()].length;
  view.innerHTML = `<div class="topbar"><button class="back" data-act="back" aria-label="Geri">‹</button><h1>📅 Takvim</h1>${lockBtn()}</div>
    <div class="day-nav"><a class="btn sm" href="#/journal-cal/${prev}">‹</a><div class="day-title"><b>${MONTHS[mo - 1]} ${y}</b></div><a class="btn sm ${next > t.slice(0, 7) ? 'disabled' : ''}" href="#/journal-cal/${next}">›</a></div>
    <div class="card cal"><div class="cal-grid head">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((x) => `<span>${x}</span>`).join('')}</div><div class="cal-grid">${cells}</div></div>
    <p class="hint">Bu ay <b>${monthDays}</b> gün yazdınız. Yazdığınız günler renkli, ruh hâlinizi seçtiyseniz yüz ifadesiyle görünür.</p>
    <div class="row-actions"><a class="btn primary" href="#/journal/${t}" style="flex:1">✏️ Bugünün sayfası</a><button class="btn teal" data-act="journal-export" data-ym="${ym}" ${monthDays ? '' : 'disabled'}>⬇️ Bu ayı dışa aktar</button></div>`;
}

function exportMonth(ym) {
  const [y, mo] = ym.split('-').map(Number);
  const dates = [...new Set(DB.moments().filter((m) => m.date.startsWith(ym)).map((m) => m.date))].sort();
  if (!dates.length) { toast('Bu ay yazılmış bir şey yok'); return; }
  const title = `Günlüğüm: ${MONTHS[mo - 1]} ${y}`;
  const s = openSheet({
    title: '⬇️ ' + title,
    body: `<label class="check"><input type="checkbox" id="ex-ph" checked> Fotoğrafları da ekle</label>
      <div class="choice-grid mt"><button class="choice c6" data-f="pdf"><span class="e">🖨️</span>PDF / Yazdır</button><button class="choice c2" data-f="docx"><span class="e">📝</span>Word</button></div>
      <p class="hint mt">PDF için açılan yazdırma ekranında hedef olarak <b>“PDF olarak kaydet”</b>i seçin.</p>`,
  });
  s.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const withPh = $('#ex-ph', s).checked;
    const days = dates.map((d) => ({
      date: d, label: longDate(d), mood: (DB.getDay(d) || {}).mood || '',
      moments: DB.momentsOn(d).map((m) => ({ at: m.at, promptLabel: `${getPrompt(m.prompt, m).e} ${getPrompt(m.prompt, m).l}`, text: m.text, photos: withPh ? m.photos || [] : [] })),
    }));
    if (b.dataset.f === 'pdf') { await closeSheet(); EX.printHtml(EX.buildJournalPrintHtml(title, days)); return; }
    try {
      b.disabled = true;
      const blob = await EX.buildJournalDocx(title, days);
      const r = await EX.saveFile(blob, `${EX.safeName(title)}.docx`);
      if (r !== 'cancelled') toast('Dosya hazır ✓');
    } catch (err) { toast(err.message, 5000); }
    b.disabled = false;
  });
}

// ---- Başlık ekleme / düzenleme ----
function firstEmoji(str) {
  const t = String(str || '').trim();
  if (!t) return '';
  try { const seg = new Intl.Segmenter('tr', { granularity: 'grapheme' }); return [...seg.segment(t)][0].segment; } catch (e) { return [...t][0]; }
}
function openPromptEditor(id = null, onDone = null) {
  const cur = id ? prompts({ withHidden: true }).find((x) => x.id === id) : null;
  let emoji = cur ? cur.e : '😊';
  const s = openSheet({
    title: cur ? 'Başlığı düzenle' : '＋ Yeni günlük başlığı',
    body: `<div class="pe-preview"><span id="pe-e">${emoji}</span><b id="pe-l">${esc(cur ? cur.l : 'Başlık adı')}</b></div>
      <label class="field"><span>Başlık adı</span><input id="pe-name" maxlength="40" value="${esc(cur ? cur.l : '')}" placeholder="ör. Bugün şükrettiklerim"></label>
      <div class="field"><span>Emoji: aşağıdan seçin ya da klavyenizin emoji tuşuyla yazın</span>
        <div style="display:flex;gap:8px;align-items:center"><input id="pe-emoji" class="input" style="width:80px;text-align:center;font-size:24px" value="${emoji}" aria-label="Emoji"><span class="small muted">Kendi emojinizi buraya yazabilirsiniz</span></div>
        <div class="emoji-grid">${EMOJIS.map((x) => `<button type="button" data-em="${x}" class="${x === emoji ? 'on' : ''}">${x}</button>`).join('')}</div></div>
      ${cur && cur.builtin ? '' : `<label class="field"><span>Yazı kutusundaki ipucu (isteğe bağlı)</span><input id="pe-ph" maxlength="80" value="${esc(cur && !cur.builtin ? cur.ph : '')}" placeholder="ör. Bugün neler için minnettarsınız?"></label>`}
      ${cur && cur.builtin ? '<p class="hint">Bu hazır bir başlık; adını ve emojisini değiştirebilirsiniz.</p>' : ''}`,
    foot: `<button class="btn" data-act="close-sheet">Vazgeç</button><button class="btn primary" data-x="save">💾 Kaydet</button>`,
  });
  const paint = () => {
    $('#pe-e', s).textContent = emoji;
    $('#pe-l', s).textContent = $('#pe-name', s).value.trim() || 'Başlık adı';
    s.querySelectorAll('[data-em]').forEach((b) => b.classList.toggle('on', b.dataset.em === emoji));
  };
  $('#pe-name', s).oninput = paint;
  $('#pe-emoji', s).oninput = (e) => { const f = firstEmoji(e.target.value); if (f) { emoji = f; e.target.value = f; paint(); } };
  s.addEventListener('click', (e) => {
    const b = e.target.closest('[data-em]'); if (!b) return;
    emoji = b.dataset.em; $('#pe-emoji', s).value = emoji; paint();
  });
  $('[data-x="save"]', s).onclick = async () => {
    const l = $('#pe-name', s).value.trim();
    if (!l) { toast('Başlık adını yazın'); $('#pe-name', s).focus(); return; }
    const ph = $('#pe-ph', s) ? $('#pe-ph', s).value.trim() : '';
    const rec = (cur && DB.promptRecords().find((r) => r.id === cur.id)) || (cur ? { id: cur.id } : {});
    Object.assign(rec, { e: emoji, l, hidden: cur ? cur.hidden : false });
    if (!cur || !cur.builtin) rec.ph = ph;
    await DB.save('prompts', rec);
    await closeSheet();
    toast(cur ? 'Başlık güncellendi ✓' : 'Yeni başlık eklendi ✓');
    if (onDone) onDone(); else rerender();
  };
  setTimeout(() => $('#pe-name', s).focus(), 250);
}

export function managePrompts() {
  const all = prompts({ withHidden: true });
  const s = openSheet({
    title: '⚙️ Günlük başlıkları',
    body: `<p class="hint">Kendi başlıklarınızı ekleyin, adlarını ve emojilerini değiştirin. Kullanmadığınız hazır başlıkları gizleyebilirsiniz; eski yazılarınız etkilenmez.</p>
      ${all.map((p) => `<div class="nb-item ${p.hidden ? 'dim' : ''}"><span>${p.e} ${esc(p.l)}${p.builtin ? '' : ' <small class="muted">(benim)</small>'}</span>
        <button class="btn sm" data-ed="${p.id}" aria-label="Düzenle">✏️</button>
        ${p.builtin ? `<button class="btn sm" data-hide="${p.id}">${p.hidden ? '👁️ Göster' : '🙈 Gizle'}</button>` : `<button class="btn sm danger" data-del="${p.id}" aria-label="Sil">🗑️</button>`}</div>`).join('')}
      <button class="btn primary block mt" data-x="new">＋ Yeni başlık ekle</button>`,
  });
  s.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-ed]'), hide = e.target.closest('[data-hide]'), del = e.target.closest('[data-del]');
    if (ed) openPromptEditor(ed.dataset.ed, () => { managePrompts(); rerender(); });
    if (e.target.closest('[data-x="new"]')) openPromptEditor(null, () => { managePrompts(); rerender(); });
    if (hide) {
      const id = hide.dataset.hide;
      const rec = DB.promptRecords().find((r) => r.id === id) || { id };
      rec.hidden = !rec.hidden;
      if (rec.hidden && prompts().length <= 1) { toast('En az bir başlık görünür kalmalı'); return; }
      await DB.save('prompts', rec); managePrompts(); rerender();
    }
    if (del) {
      const p = all.find((x) => x.id === del.dataset.del);
      if (await confirmDialog(`“${p.l}” başlığı silinsin mi? Bu başlıkla yazdığınız eski yazılar silinmez.`, 'Sil')) {
        await DB.remove('prompts', p.id); toast('Başlık silindi'); rerender();
      }
    }
  });
}

export const JOURNAL_ACTIONS = {
  'prompt-new': () => openPromptEditor(),
  'prompts-manage': () => managePrompts(),
  jday: (el) => { if (!el.disabled) go('#/journal/' + el.dataset.d); },
  mood: async (el) => {
    const d = el.dataset.d;
    const cur = DB.getDay(d);
    const mood = cur && cur.mood === el.dataset.m ? '' : el.dataset.m;
    await DB.save('days', { ...(cur || {}), id: d, mood });
    rerender();
  },
  'moment-new': (el) => openMomentEditor({ date: el.dataset.d, prompt: el.dataset.p }),
  'moment-edit': (el) => openMomentEditor({ id: el.dataset.id }),
  'photo-view': (el) => viewPhoto(el.dataset.id, el.dataset.ph),
  'journal-export': (el) => exportMonth(el.dataset.ym),
};
