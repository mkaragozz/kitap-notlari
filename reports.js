// 📊 Raporlar: okuma istatistikleri (PIN ile kilitlenebilir).
// Haftalık / aylık / yıllık / seçilen tarih aralığı; bitirilen kitap, e-kitap ve makaleler; her kitabın kaç günde
// okunduğu; okuma hızı (sayfa/gün); dönem dönem bitirilen sayısı; okuyucuda geçen süre; Pareto (80/20) grafikleri.
// Ayrıca Günlük, Düşüncelerim ve Blog: yazı sayıları, yazılan günler, ruh hâli dağılımı, yazma etkinliği.
// Grafikler tek eksenli SVG; her çubuğun üzerine gelince/dokununca değeri görünür; altında tablo görünümü.
import * as DB from './db.js?v=3.5.4';
import * as EX from './export.js?v=3.5.4';
import * as Lock from './lock.js?v=3.5.4';
import { $, esc, view, rerender, today, fmtDate, localDate, parseDate, MONTHS } from './ui.js?v=3.5.4';

const state = { preset: 'month', from: '', to: '' };
const DAY = 864e5;
const MON_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function range() {
  const t = parseDate(today());
  if (state.preset === 'week') { const d = new Date(t); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return [localDate(d), today()]; }
  if (state.preset === 'month') return [`${today().slice(0, 7)}-01`, today()];
  if (state.preset === 'year') return [`${today().slice(0, 4)}-01-01`, today()];
  if (state.preset === 'last12') { const d = new Date(t); d.setMonth(d.getMonth() - 11, 1); return [localDate(d), today()]; }
  if (state.preset === 'all') {
    const dates = DB.books().concat(DB.articles()).map((b) => b.endDate || b.startDate).filter(Boolean).sort();
    return [dates[0] || today(), today()];
  }
  return [state.from || today(), state.to || today()];
}
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY) + 1;
const typeOf = (b) => (b.kind === 'article' ? 'Makale' : b.fileId ? 'E-kitap' : 'Kitap');

function collect() {
  const [from, to] = range();
  const inR = (d) => d && d >= from && d <= to;
  const all = DB.books().concat(DB.articles());
  const finished = all.filter((b) => b.status === 'bitti' && inR(b.endDate)).sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
  const rows = finished.map((b) => {
    const days = b.startDate && b.endDate && b.startDate <= b.endDate ? daysBetween(b.startDate, b.endDate) : null;
    const pages = parseInt(b.pages, 10) || null;
    return { b, type: typeOf(b), days, pages, speed: days && pages ? Math.round((pages / days) * 10) / 10 : null };
  });
  const log = DB.readlog().filter((l) => inR(l.date));
  const quotes = DB.allQuotes().filter((q) => inR((q.createdAt || '').slice(0, 10)));
  // Yazma: günlük anları, düşünce parçaları, blog yazıları (yazıldıkları güne göre)
  const day = (iso) => (iso ? localDate(new Date(iso)) : '');
  const moments = DB.moments().filter((m) => inR(m.date));
  const thoughtParts = [];
  DB.thoughts().forEach((t) => (t.parts || []).forEach((pt, i) => { if (inR(day(pt.at))) thoughtParts.push({ t, pt, first: i === 0, date: day(pt.at) }); }));
  const posts = DB.posts().filter((x) => inR(day(x.createdAt)));
  const moods = DB.S.days ? [...DB.S.days.values()].filter((d) => !d.deleted && d.mood && inR(d.id)) : [];
  return { from, to, rows, log, quotes, moments, thoughtParts, posts, moods };
}
const plainText = (html) => String(html || '').replace(/<[^>]+>/g, ' ');
const wordCount = (txt) => (String(txt || '').match(/\S+/g) || []).length;

// ---------- Grafikler (SVG) ----------
const VB_W = 400; // telefon genişliğine yakın: yazılar küçülmesin
function niceMax(v) { if (v <= 5) return Math.max(1, Math.ceil(v)); const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
/** Dikey çubuk grafiği: [{label, value, tip}] */
function columnChart(data, { unit = '', h = 220 } = {}) {
  if (!data.length) return '<p class="muted small">Bu aralıkta veri yok.</p>';
  const L = 34, R = 8, T = 14, B = 34, W = VB_W - L - R, H = h - T - B;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const bw = W / data.length, barW = Math.max(4, Math.min(42, bw - 4));
  const ticks = [0, max / 2, max];
  const every = Math.ceil(data.length / 8);
  let s = `<svg class="chart" viewBox="0 0 ${VB_W} ${h}" role="img"><g class="grid">${ticks.map((t) => `<line x1="${L}" x2="${VB_W - R}" y1="${T + H - (t / max) * H}" y2="${T + H - (t / max) * H}"/><text x="${L - 6}" y="${T + H - (t / max) * H + 4}" text-anchor="end">${Math.round(t * 10) / 10}</text>`).join('')}</g>`;
  data.forEach((d, i) => {
    const x = L + i * bw + (bw - barW) / 2, bh = (d.value / max) * H, y = T + H - bh;
    s += `<g class="bar"><rect class="hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${H}"/>${d.value ? `<path d="M${x},${T + H}V${y + 4}q0,-4 4,-4h${barW - 8}q4,0 4,4V${T + H}z"/>` : ''}
      <title>${esc(d.tip || `${d.label}: ${d.value}${unit}`)}</title>${d.value && data.length <= 12 ? `<text class="val" x="${x + barW / 2}" y="${y - 4}" text-anchor="middle">${Math.round(d.value * 10) / 10}</text>` : ''}
      ${i % every === 0 ? `<text class="lbl" x="${x + barW / 2}" y="${h - 14}" text-anchor="middle">${esc(d.label)}</text>` : ''}</g>`;
  });
  return s + '</svg>';
}
/** Gruplu sütun grafiği: series = [{name, cls, values[]}], labels[] — tek eksen, lejantlı */
function groupedChart(labels, series, { h = 230 } = {}) {
  const total = series.reduce((a, x) => a + x.values.reduce((b, v) => b + v, 0), 0);
  if (!total) return '<p class="muted small">Bu aralıkta yazı yok.</p>';
  const L = 34, R = 8, T = 14, B = 52, W = VB_W - L - R, H = h - T - B;
  const max = niceMax(Math.max(...series.flatMap((x) => x.values), 1));
  const gw = W / labels.length, inner = Math.max(6, Math.min(54, gw - 6)), bw = Math.max(2, inner / series.length - 2);
  const every = Math.ceil(labels.length / 8);
  let s = `<svg class="chart" viewBox="0 0 ${VB_W} ${h}" role="img"><g class="grid">${[0, max / 2, max].map((t) => `<line x1="${L}" x2="${VB_W - R}" y1="${T + H - (t / max) * H}" y2="${T + H - (t / max) * H}"/><text x="${L - 6}" y="${T + H - (t / max) * H + 4}" text-anchor="end">${Math.round(t * 10) / 10}</text>`).join('')}</g>`;
  labels.forEach((lab, i) => {
    const gx = L + i * gw + (gw - inner) / 2;
    s += `<g class="bar"><rect class="hit" x="${L + i * gw}" y="${T}" width="${gw}" height="${H}"/><title>${esc(`${lab}: ${series.map((x) => `${x.name} ${x.values[i]}`).join(', ')}`)}</title>`;
    series.forEach((x, k) => {
      const v = x.values[i]; if (!v) return;
      const bh = (v / max) * H, xx = gx + k * (bw + 2), y = T + H - bh, r = Math.min(3, bw / 2);
      s += `<path class="${x.cls}" d="M${xx},${T + H}V${y + r}q0,-${r} ${r},-${r}h${Math.max(0, bw - 2 * r)}q${r},0 ${r},${r}V${T + H}z"/>`;
    });
    if (i % every === 0) s += `<text class="lbl" x="${gx + inner / 2}" y="${h - 38}" text-anchor="middle">${esc(lab)}</text>`;
    s += '</g>';
  });
  let lx = L;
  s += `<g class="legend">${series.map((x) => { const g = `<rect x="${lx}" y="${h - 16}" width="12" height="10" rx="2" class="${x.cls}"/><text x="${lx + 16}" y="${h - 7}">${esc(x.name)}</text>`; lx += 26 + x.name.length * 7; return g; }).join('')}</g>`;
  return s + '</svg>';
}

/** Yatay çubuk grafiği (uzun adlar için): [{label, value, tip}] */
function barChart(data, { unit = '' } = {}) {
  if (!data.length) return '<p class="muted small">Bu aralıkta veri yok.</p>';
  const rowH = 26, L = 128, R = 62, T = 6, h = T + data.length * rowH + 6, W = VB_W - L - R;
  const max = Math.max(...data.map((d) => d.value), 1);
  let s = `<svg class="chart" viewBox="0 0 ${VB_W} ${h}" role="img">`;
  data.forEach((d, i) => {
    const y = T + i * rowH, bw = Math.max(8, (d.value / max) * W);
    const name = d.label.length > 18 ? d.label.slice(0, 17) + '…' : d.label;
    s += `<g class="bar"><rect class="hit" x="0" y="${y}" width="${VB_W}" height="${rowH}"/><text class="lbl" x="${L - 8}" y="${y + 17}" text-anchor="end">${esc(name)}</text>
      <path d="M${L},${y + 5}h${bw - 4}q4,0 4,4v8q0,4 -4,4h-${bw - 4}z"/><text class="val" x="${L + bw + 6}" y="${y + 17}">${Math.round(d.value * 10) / 10}${unit}</text><title>${esc(d.tip || `${d.label}: ${d.value}${unit}`)}</title></g>`;
  });
  return s + '</svg>';
}
/** Pareto: büyükten küçüğe pay (%) çubukları + birikimli % çizgisi, tek % ekseni; %80'e ulaşan ilk grup vurgulanır */
function paretoChart(items, noun, groupNoun = 'kategori') {
  const total = items.reduce((a, x) => a + x.value, 0);
  if (!total) return { svg: '<p class="muted small">Bu aralıkta veri yok.</p>', note: '' };
  const data = [...items].sort((a, b) => b.value - a.value);
  const top = data.slice(0, 8);
  if (data.length > 8) top.push({ label: 'Diğer', value: data.slice(8).reduce((a, x) => a + x.value, 0) });
  let cum = 0;
  const pts = top.map((d) => { cum += d.value; return { ...d, share: (d.value / total) * 100, cum: (cum / total) * 100 }; });
  const k80 = pts.findIndex((p) => p.cum >= 80 - 1e-9) + 1;
  const h = 250, L = 38, R = 10, T = 14, B = 44, W = VB_W - L - R, H = h - T - B;
  const bw = W / pts.length, barW = Math.max(6, Math.min(44, bw - 6));
  const y = (pct) => T + H - (pct / 100) * H;
  let s = `<svg class="chart" viewBox="0 0 ${VB_W} ${h}" role="img"><g class="grid">${[0, 50, 100].map((t) => `<line x1="${L}" x2="${VB_W - R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">%${t}</text>`).join('')}
    <line class="p80" x1="${L}" x2="${VB_W - R}" y1="${y(80)}" y2="${y(80)}"/><text class="p80t" x="${VB_W - R}" y="${y(80) - 5}" text-anchor="end">%80</text></g>`;
  pts.forEach((p, i) => {
    const x = L + i * bw + (bw - barW) / 2, yy = y(p.share);
    s += `<g class="bar ${i < k80 ? 'vital' : 'rest'}"><rect class="hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${H}"/><path d="M${x},${T + H}V${yy + 4}q0,-4 4,-4h${barW - 8}q4,0 4,4V${T + H}z"/>
      <title>${esc(`${p.label}: ${p.value} ${noun} (%${Math.round(p.share)}), birikimli %${Math.round(p.cum)}`)}</title>
      <text class="lbl" x="${x + barW / 2}" y="${h - 26}" text-anchor="middle">${esc(p.label.length > 7 ? p.label.slice(0, 6) + '…' : p.label)}</text></g>`;
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${L + i * bw + bw / 2},${y(p.cum)}`).join('');
  s += `<path class="cum" d="${line}"/>${pts.map((p, i) => `<circle class="cumdot" cx="${L + i * bw + bw / 2}" cy="${y(p.cum)}" r="4"><title>Birikimli: %${Math.round(p.cum)}</title></circle>`).join('')}`;
  s += `<g class="legend"><rect x="${L}" y="${h - 14}" width="12" height="10" rx="2" class="lg-bar"/><text x="${L + 16}" y="${h - 5}">Pay (%)</text><line x1="${L + 80}" x2="${L + 100}" y1="${h - 9}" y2="${h - 9}" class="cum"/><text x="${L + 104}" y="${h - 5}">Birikimli (%)</text></g></svg>`;
  const groupShare = Math.round((k80 / data.length) * 100);
  const note = data.length > 1 ? `<p class="pareto-note">${noun === 'alıntı' ? 'Alıntılarınızın' : 'Okuduklarınızın'} <b>%${Math.round(pts[k80 - 1].cum)}</b> kadarı <b>${k80} ${groupNoun}</b> üzerinde toplanıyor: ${pts.slice(0, k80).map((p) => `<b>${esc(p.label)}</b>`).join(', ')}. Bu ${k80} ${groupNoun}, toplam ${data.length} ${groupNoun} içinde <b>%${groupShare}</b> kadar yer tutuyor.</p>` : '';
  return { svg: s, note };
}

// ---------- Rapor sayfası ----------
function periodLabel(from, to) { return from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`; }
function buckets(from, to) {
  const days = daysBetween(from, to);
  const out = [];
  if (days <= 31) { for (let d = parseDate(from); d <= parseDate(to); d.setDate(d.getDate() + 1)) { const k = localDate(d); out.push({ key: k, label: `${d.getDate()}`, test: (x) => x === k }); } return { unit: 'gün', list: out }; }
  if (days <= 120) {
    const d = parseDate(from); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd);
    for (; d <= parseDate(to); d.setDate(d.getDate() + 7)) { const s = localDate(d); const e = new Date(d); e.setDate(e.getDate() + 6); const ee = localDate(e); out.push({ key: s, label: `${d.getDate()} ${MON_SHORT[d.getMonth()]}`, test: (x) => x >= s && x <= ee }); }
    return { unit: 'hafta', list: out };
  }
  const d = parseDate(from); d.setDate(1);
  for (; d <= parseDate(to); d.setMonth(d.getMonth() + 1)) { const ym = localDate(d).slice(0, 7); out.push({ key: ym, label: `${MON_SHORT[d.getMonth()]}${d.getMonth() === 0 || out.length === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ''}`, test: (x) => x && x.startsWith(ym) }); }
  return { unit: 'ay', list: out };
}

function reportHtml({ forPrint = false } = {}) {
  const { from, to, rows, log, quotes, moments, thoughtParts, posts, moods } = collect();
  const n = (t) => rows.filter((r) => r.type === t).length;
  const withDays = rows.filter((r) => r.days), withSpeed = rows.filter((r) => r.speed);
  const avgDays = withDays.length ? Math.round(withDays.reduce((a, r) => a + r.days, 0) / withDays.length) : null;
  const avgSpeed = withSpeed.length ? Math.round(withSpeed.reduce((a, r) => a + r.speed, 0) / withSpeed.length) : null;
  const pages = rows.reduce((a, r) => a + (r.pages || 0), 0);
  const minutes = Math.round(log.reduce((a, l) => a + (l.minutes || 0), 0));
  const span = daysBetween(from, to);
  const perMonth = Math.round((rows.length / Math.max(1, span / 30.44)) * 10) / 10;
  const bk = buckets(from, to);
  const finishedSeries = bk.list.map((x) => ({ label: x.label, value: rows.filter((r) => x.test(r.b.endDate)).length, tip: `${x.label}: ${rows.filter((r) => x.test(r.b.endDate)).length} bitirilen` }));
  const minuteSeries = bk.list.map((x) => { const v = Math.round(log.filter((l) => x.test(l.date)).reduce((a, l) => a + l.minutes, 0)); return { label: x.label, value: v, tip: `${x.label}: ${v} dk okuma` }; });
  const durData = withDays.sort((a, b) => b.days - a.days).slice(0, 15).map((r) => ({ label: r.b.title, value: r.days, tip: `${r.b.title}: ${r.days} günde (${fmtDate(r.b.startDate)} → ${fmtDate(r.b.endDate)})` }));
  const spdData = withSpeed.sort((a, b) => b.speed - a.speed).slice(0, 15).map((r) => ({ label: r.b.title, value: r.speed, tip: `${r.b.title}: günde ${r.speed} sayfa (${r.pages} sayfa / ${r.days} gün)` }));
  // Pareto verileri
  const catMap = new Map();
  rows.forEach((r) => { const ts = (r.b.topics || []).map((id) => DB.getTopic(id)).filter(Boolean); (ts.length ? ts : [{ name: 'Kategorisiz' }]).forEach((t) => catMap.set(t.name, (catMap.get(t.name) || 0) + 1)); });
  const autMap = new Map();
  rows.forEach((r) => { const a = (r.b.author || 'Bilinmiyor').split(',')[0].trim(); autMap.set(a, (autMap.get(a) || 0) + 1); });
  const qMap = new Map();
  quotes.forEach((q) => { const b = DB.getBook(q.bookId); if (b) qMap.set(b.title, (qMap.get(b.title) || 0) + 1); });
  const toItems = (m) => [...m.entries()].map(([label, value]) => ({ label, value }));
  const pCat = paretoChart(toItems(catMap), 'eser', 'kategori'), pAut = paretoChart(toItems(autMap), 'eser', 'yazar'), pQ = paretoChart(toItems(qMap), 'alıntı', 'kitap');
  // Yazma istatistikleri
  const jDays = new Set(moments.map((m) => m.date)).size;
  const newThoughts = thoughtParts.filter((x) => x.first).length, addParts = thoughtParts.length - newThoughts;
  const donePosts = posts.filter((x) => x.status === 'done').length;
  const words = moments.reduce((a, m) => a + wordCount(m.text), 0) + thoughtParts.reduce((a, x) => a + wordCount(x.pt.text), 0) + posts.reduce((a, x) => a + wordCount(plainText(x.body)), 0);
  const writeChart = groupedChart(bk.list.map((x) => x.label), [
    { name: 'Günlük', cls: 's1', values: bk.list.map((x) => moments.filter((m) => x.test(m.date)).length) },
    { name: 'Düşünce', cls: 's2', values: bk.list.map((x) => thoughtParts.filter((t) => x.test(t.date)).length) },
    { name: 'Blog', cls: 's3', values: bk.list.map((x) => posts.filter((p) => x.test(localDate(new Date(p.createdAt)))).length) },
  ]);
  const MOODS = [['😄', 'Çok iyi'], ['🙂', 'İyi'], ['😐', 'Normal'], ['😔', 'Üzgün'], ['😢', 'Çok kötü']];
  const moodData = MOODS.map(([e, l]) => ({ label: `${e} ${l}`, value: moods.filter((d) => d.mood === e).length, tip: `${l}: ${moods.filter((d) => d.mood === e).length} gün` }));
  const nbCount = new Map();
  thoughtParts.forEach((x) => { const nb = x.t.notebookId && DB.getNotebook(x.t.notebookId); const k = nb ? nb.name : 'Deftersiz'; nbCount.set(k, (nbCount.get(k) || 0) + 1); });
  const catCount = new Map();
  posts.forEach((x) => { const k = x.category || 'Kategorisiz'; catCount.set(k, (catCount.get(k) || 0) + 1); });
  const tile = (v, l, sub = '') => `<div class="rp-tile"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const sec = (title, body, hint = '') => `<section class="rp-sec"><h3>${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ''}${body}</section>`;
  const table = `<div class="rp-table-wrap"><table class="rp-table"><thead><tr><th>Eser</th><th>Tür</th><th>Başlama</th><th>Bitiş</th><th>Gün</th><th>Sayfa</th><th>Sayfa/gün</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><b>${esc(r.b.title)}</b><br><small>${esc(r.b.author || '')}</small></td><td>${r.type}</td><td>${fmtDate(r.b.startDate) || '—'}</td><td>${fmtDate(r.b.endDate)}</td><td>${r.days ?? '—'}</td><td>${r.pages ?? '—'}</td><td>${r.speed ?? '—'}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Bu aralıkta bitirilen eser yok.</td></tr>'}</tbody></table></div>`;
  return `<div class="rp ${forPrint ? 'print' : ''}">
    ${forPrint ? `<h1>📊 Okuma Raporum</h1><p class="pd-meta">${periodLabel(from, to)} · Kitap & Notlarım</p>` : `<p class="rp-period">${periodLabel(from, to)}</p>`}
    <div class="rp-tiles">${tile(rows.length, 'Bitirilen', `${n('Kitap')} kitap · ${n('E-kitap')} e-kitap · ${n('Makale')} makale`)}${tile(perMonth, 'Ayda ortalama')}${tile(avgDays ?? '—', 'Ort. gün / eser')}${tile(avgSpeed ?? '—', 'Ort. sayfa / gün')}${tile(pages || '—', 'Okunan sayfa')}${tile(minutes ? (minutes >= 120 ? `${Math.round(minutes / 6) / 10} sa` : `${minutes} dk`) : '—', 'Okuyucuda geçen süre')}${tile(quotes.length, 'Kaydedilen alıntı')}</div>
    ${sec(`Bitirilen eserler (${bk.unit} bazında)`, columnChart(finishedSeries))}
    ${sec('Her eser kaç günde okundu', barChart(durData, { unit: ' gün' }), 'Başlama ve bitiş tarihine göre. Kitabın Bilgiler sekmesinden tarihleri düzeltebilirsiniz.')}
    ${sec('Okuma hızı (sayfa / gün)', barChart(spdData), 'Sayfa sayısı ve okuma süresi belli olan eserler.')}
    ${sec(`Okuyucuda geçen süre (dakika, ${bk.unit} bazında)`, columnChart(minuteSeries, { unit: ' dk' }), 'Uygulamanın içinde e-kitap ve makale okurken geçen süre.')}
    ${sec('Pareto: kategoriler', pCat.svg + pCat.note, 'Okuduklarınızın %80\'i hangi kategorilerden geliyor? Koyu çubuklar %80\'e ulaşan grup.')}
    ${sec('Pareto: yazarlar', pAut.svg + pAut.note)}
    ${sec('Pareto: en çok alıntı yaptığınız kitaplar', pQ.svg + pQ.note, 'Bu aralıkta kaydettiğiniz alıntıların hangi kitaplarda yoğunlaştığı.')}
    ${sec('Bitirilen eserler tablosu', table)}
    <h2 class="rp-h2">✍️ Yazma: Günlük, Düşüncelerim, Blog</h2>
    <div class="rp-tiles">${tile(moments.length, '📔 Günlük yazısı', `${jDays} günde yazıldı`)}${tile(newThoughts, '💡 Yeni düşünce', addParts ? `+${addParts} ekleme` : '')}${tile(posts.length, '✍️ Blog yazısı', `${donePosts} tamamlandı · ${posts.length - donePosts} taslak`)}${tile(words.toLocaleString('tr-TR'), 'Yazılan kelime', 'üç bölümün toplamı')}</div>
    ${sec(`Yazma etkinliği (${bk.unit} bazında)`, writeChart, 'Günlük yazıları, düşünce ve eklemeleri, blog yazıları; yazıldıkları güne göre.')}
    ${sec('Günlük: ruh hâli dağılımı', moods.length ? barChart(moodData, { unit: ' gün' }) : '<p class="muted small">Bu aralıkta ruh hâli seçilmemiş.</p>', 'Günlükte seçtiğiniz yüz ifadelerine göre.')}
    ${thoughtParts.length ? sec('Düşünceler: defterlere göre', barChart(toItems(nbCount).sort((a, b) => b.value - a.value))) : ''}
    ${posts.length ? sec('Blog: kategorilere göre', barChart(toItems(catCount).sort((a, b) => b.value - a.value))) : ''}
  </div>`;
}

export function renderReports() {
  if (!Lock.isOpen('reports')) { Lock.renderLockScreen(view, 'Raporlar'); return; }
  const presets = [['week', 'Bu hafta'], ['month', 'Bu ay'], ['year', 'Bu yıl'], ['last12', 'Son 12 ay'], ['all', 'Tümü'], ['custom', 'Tarih seç']];
  const [f, t] = range();
  view.innerHTML = `<div class="topbar"><button class="back mob-only" data-act="back" aria-label="Geri">‹</button><h1>📊 Raporlar</h1>${Lock.enabled() && Lock.isLockedSection('reports') ? '<button class="btn sm ghost" data-act="lock-now" title="Kilitle">🔒</button>' : ''}<button class="btn sm teal" data-act="report-pdf">🖨️ PDF</button></div>
    <div class="pill-row">${presets.map(([k, l]) => `<button class="pill ${state.preset === k ? 'on' : ''}" data-act="report-preset" data-p="${k}">${l}</button>`).join('')}</div>
    ${state.preset === 'custom' ? `<div class="rp-dates"><label>Başlangıç<input type="date" id="rp-from" value="${f}" max="${today()}"></label><label>Bitiş<input type="date" id="rp-to" value="${t}" max="${today()}"></label></div>` : ''}
    ${reportHtml()}`;
  const a = $('#rp-from'), b = $('#rp-to');
  if (a) { const upd = () => { state.from = a.value; state.to = b.value; if (state.from && state.to && state.from <= state.to) rerender(); }; a.onchange = upd; b.onchange = upd; }
}

export const REPORT_ACTIONS = {
  'report-preset': (el) => { state.preset = el.dataset.p; if (state.preset === 'custom' && !state.from) { const [f, t] = range(); state.from = `${today().slice(0, 7)}-01`; state.to = t; void f; } rerender(); },
  'report-pdf': () => EX.printHtml(`<article class="print-doc">${reportHtml({ forPrint: true })}</article>`),
};
