// Dışa aktarma: PDF (yazdır), Word (.docx), Excel (.xlsx), dosya kaydetme.
// Kitap notları, düşünceler ve günlük için.

const DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/+esm';
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Kütüphane yüklenemedi (internet bağlantısını kontrol edin).'));
    document.head.appendChild(s);
  });
}

// ---------- Dosya kaydetme (telefonda paylaş menüsü, bilgisayarda indir) ----------
export async function saveFile(blob, filename) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    // paylaşım başarısızsa normal indirmeye düş
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export function safeName(s) {
  return String(s || 'kitap').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'kitap';
}

// ---------- Kaynak gösterimi: "Yazar, Kitap, s. X" ----------
/** Biçimli parçalar döner: [{t:'metin', i:true/false}] (i = italik) */
export function citation(book, page) {
  const out = [];
  if (book.author) out.push({ t: book.author + ', ', i: false });
  out.push({ t: book.title, i: true });
  if (page) out.push({ t: `, s. ${page}`, i: false });
  return out;
}
export const citationText = (book, page) => citation(book, page).map((p) => p.t).join('');
export const citationHtml = (book, page) => citation(book, page).map((p) => (p.i ? `<i>${esc(p.t)}</i>` : esc(p.t))).join('');

/** Alıntının kaynak / dipnot satırı: "Yazar, Kitap, PDF s. 45 (dosya: kitap.pdf)" */
export function sourceText(book, q) {
  if (!q || !q.src) return '';
  const head = [book && book.author, book && book.title].filter(Boolean).join(', ');
  return `${head}${q.src.where ? ', ' + q.src.where : ''}${q.src.file ? ` (dosya: ${q.src.file})` : ''}`;
}

export function pageLabel(q) {
  if (!q.page) return '';
  return q.pageEnd && q.pageEnd !== q.page ? `${q.page}–${q.pageEnd}` : String(q.page);
}

export function bookMetaLine(b) {
  return [
    b.author,
    b.translator && `Çev. ${b.translator}`,
    b.publisher,
    b.city,
    b.year,
    b.edition && `${b.edition}. baskı`,
    b.isbn && `ISBN ${b.isbn}`,
  ].filter(Boolean).join(' · ');
}

// Basit markdown (özet için)
export function mdToHtml(md) {
  const lines = String(md || '').split(/\r?\n/);
  let html = '', inList = false;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
  for (const raw of lines) {
    const l = raw.trim();
    const li = l.match(/^(?:[-*•]|\d+[.)])\s+(.*)/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (!l) continue;
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { const lvl = Math.min(4, h[1].length + 1); html += `<h${lvl}>${inline(h[2])}</h${lvl}>`; }
    else html += `<p>${inline(l)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

const STAR_TXT = ['', '⭐ Önemli', '⭐⭐ Çok önemli', '⭐⭐⭐ Müthiş tespit'];
const pad2 = (n) => String(n).padStart(2, '0');
function dt(iso) { if (!iso) return ''; const d = new Date(iso); return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function hm(iso) { if (!iso) return ''; const d = new Date(iso); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

function sortByPage(qs) {
  return [...qs].sort((a, b) => (parseInt(a.page, 10) || 1e9) - (parseInt(b.page, 10) || 1e9) || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

/** opt: { minStars, rereadOnly, comments, tags } */
function selectQuotes(quotes, opt) {
  return sortByPage(quotes.filter((q) => (q.stars || 0) >= (opt.minStars || 0)
    && (!opt.rereadOnly || (q.reread && !q.reread.done))
    && (q.text || (opt.comments && q.comment))));
}

// ---------- PDF / Yazdır ----------
export function buildPrintHtml(book, toc, quotes, opt) {
  const qs = selectQuotes(quotes, opt);
  let h = `<article class="print-doc">`;
  h += `<header class="pd-head"><h1>${esc(book.title)}</h1>${book.subtitle ? `<p class="pd-sub">${esc(book.subtitle)}</p>` : ''}<p class="pd-meta">${esc(bookMetaLine(book))}</p>`;
  if (book.startDate || book.endDate) h += `<p class="pd-meta">Okuma: ${esc(book.startDate || '?')} → ${esc(book.endDate || '…')}</p>`;
  h += `</header>`;
  if (opt.summary && book.summary) h += `<section><h2>Özet</h2>${mdToHtml(book.summary)}</section>`;
  if (opt.toc && toc && toc.length) {
    h += `<section><h2>İçindekiler</h2><ul class="pd-toc">`;
    toc.forEach((t) => { h += `<li style="padding-left:${((t.level || 1) - 1) * 18}px"><span>${esc(t.title)}</span><span>${esc(t.page || '')}</span></li>`; });
    h += `</ul></section>`;
  }
  if (qs.length) {
    h += `<section><h2>Alıntılar</h2>`;
    qs.forEach((q, i) => {
      const pl = pageLabel(q);
      h += `<div class="pd-q">`;
      if (q.text) h += `<blockquote>${esc(q.text).replace(/\n/g, '<br>')}</blockquote>`;
      h += `<p class="pd-ref"><sup>${i + 1}</sup> ${pl ? `s. ${esc(pl)}` : ''}${q.chapter ? ` — ${esc(q.chapter)}` : ''}${q.stars ? ` <span class="pd-stars">${STAR_TXT[q.stars]}</span>` : ''}</p>`;
      if (q.src) h += `<p class="pd-ref">📎 Kaynak: ${esc(sourceText(book, q))}</p>`;
      if (opt.comments && q.comment) h += `<p class="pd-comment"><b>💭 Yorumum:</b> ${esc(q.comment).replace(/\n/g, '<br>')}</p>`;
      if (opt.tags && q.tags && q.tags.length) h += `<p class="pd-tags">${q.tags.map((t) => '#' + esc(t)).join(' ')}</p>`;
      h += `</div>`;
    });
    h += `</section>`;
  }
  h += `<footer class="pd-foot">Kaynak: ${citationHtml(book)}</footer>`;
  h += `</article>`;
  return h;
}

export function printHtml(html) {
  const area = document.getElementById('print-area');
  area.innerHTML = html;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); area.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 80);
}

// ---------- Word ----------
let docxMod = null;
async function getDocx() {
  try { docxMod = docxMod || (await import(DOCX_URL)); } catch (e) { throw new Error('Word kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'); }
  return docxMod;
}
const DOC_STYLES = { default: { document: { run: { font: 'Calibri', size: 23 } } } };

function runsFromCitation(D, parts, size, color) {
  return parts.map((p) => new D.TextRun({ text: p.t, italics: p.i, size, color }));
}
function textRuns(D, text, opts = {}) {
  return String(text || '').split(/\n/).flatMap((line, i) => (i ? [new D.TextRun({ ...opts, text: line, break: 1 })] : [new D.TextRun({ ...opts, text: line })]));
}

function mdToDocx(D, md) {
  const out = [];
  const inlineRuns = (s) => {
    const runs = [];
    const re = /\*\*(.+?)\*\*/g; let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) runs.push(new D.TextRun(s.slice(last, m.index)));
      runs.push(new D.TextRun({ text: m[1], bold: true }));
      last = m.index + m[0].length;
    }
    if (last < s.length) runs.push(new D.TextRun(s.slice(last)));
    return runs;
  };
  for (const raw of String(md || '').split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    const h = l.match(/^(#{1,4})\s+(.*)/);
    const li = l.match(/^(?:[-*•]|\d+[.)])\s+(.*)/);
    if (h) out.push(new D.Paragraph({ text: h[2].replace(/\*\*/g, ''), heading: D.HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } }));
    else if (li) out.push(new D.Paragraph({ children: inlineRuns(li[1]), bullet: { level: 0 } }));
    else out.push(new D.Paragraph({ children: inlineRuns(l), spacing: { after: 120 } }));
  }
  return out;
}

export async function buildDocx(sections, opt) {
  // sections: [{book, toc, quotes}]
  const D = await getDocx();
  const children = [];
  const footnotes = {};
  let fn = 1;
  sections.forEach(({ book, toc, quotes }, si) => {
    if (si > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(new D.Paragraph({ text: book.title, heading: D.HeadingLevel.TITLE }));
    if (book.subtitle) children.push(new D.Paragraph({ children: [new D.TextRun({ text: book.subtitle, italics: true, size: 26 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: bookMetaLine(book), color: '555555', size: 20 })], spacing: { after: 240 } }));

    if (opt.summary && book.summary) {
      children.push(new D.Paragraph({ text: 'Özet', heading: D.HeadingLevel.HEADING_1 }));
      children.push(...mdToDocx(D, book.summary));
    }
    if (opt.toc && toc && toc.length) {
      children.push(new D.Paragraph({ text: 'İçindekiler', heading: D.HeadingLevel.HEADING_1 }));
      toc.forEach((t) => children.push(new D.Paragraph({
        indent: { left: ((t.level || 1) - 1) * 360 },
        tabStops: [{ type: D.TabStopType.RIGHT, position: 9000, leader: 'dot' }],
        children: [new D.TextRun(t.title), new D.TextRun({ text: '\t' + (t.page || '') })],
      })));
    }
    const qs = selectQuotes(quotes, opt);
    if (qs.length) {
      children.push(new D.Paragraph({ text: 'Alıntılar', heading: D.HeadingLevel.HEADING_1 }));
      qs.forEach((q) => {
        const pl = pageLabel(q);
        if (q.text) {
          const runs = textRuns(D, q.text);
          if (opt.footnotes) {
            footnotes[fn] = { children: [new D.Paragraph({ children: q.src ? [new D.TextRun(sourceText(book, q))] : runsFromCitation(D, citation(book, pl)) })] };
            runs.push(new D.FootnoteReferenceRun(fn));
            fn++;
          }
          children.push(new D.Paragraph({
            children: runs,
            indent: { left: 360 },
            border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: '7C5CFF', space: 10 } },
            spacing: { before: 200, after: 40 },
          }));
        }
        const refRuns = [new D.TextRun({ text: '↳ ', color: '7C5CFF', size: 18 })];
        if (pl) refRuns.push(new D.TextRun({ text: `s. ${pl}`, size: 18, color: '555555' }));
        if (q.chapter) refRuns.push(new D.TextRun({ text: ` — ${q.chapter}`, size: 18, color: '555555' }));
        if (q.stars) refRuns.push(new D.TextRun({ text: `  ${STAR_TXT[q.stars]}`, size: 18, color: 'B7791F' }));
        children.push(new D.Paragraph({ children: refRuns, indent: { left: 360 }, spacing: { before: q.text ? 0 : 200, after: 80 } }));
        if (q.src) children.push(new D.Paragraph({ indent: { left: 360 }, children: [new D.TextRun({ text: '📎 Kaynak: ' + sourceText(book, q), size: 18, color: '555555' })] }));
        if (opt.comments && q.comment) children.push(new D.Paragraph({ indent: { left: 360 }, children: [new D.TextRun({ text: '💭 Yorumum: ', bold: true, size: 20 }), ...textRuns(D, q.comment, { italics: true, size: 20 })] }));
        if (opt.tags && q.tags && q.tags.length) children.push(new D.Paragraph({ indent: { left: 360 }, children: [new D.TextRun({ text: q.tags.map((t) => '#' + t).join('  '), size: 18, color: '0FB9A8' })] }));
      });
    }
    children.push(new D.Paragraph({ spacing: { before: 300 }, children: [new D.TextRun({ text: 'Kaynak: ', bold: true, size: 20 }), ...runsFromCitation(D, citation(book), 20)] }));
  });

  const doc = new D.Document({
    creator: 'Kitap & Notlarım',
    title: sections.length === 1 ? sections[0].book.title : 'Kitap & Notlarım',
    styles: DOC_STYLES,
    footnotes,
    sections: [{ properties: {}, children }],
  });
  return D.Packer.toBlob(doc);
}

// ---------- Excel ----------
export async function buildXlsx(sections, opt) {
  await loadScript(XLSX_URL);
  const X = window.XLSX;
  const wb = X.utils.book_new();
  const qRows = [];
  sections.forEach(({ book, quotes }) => {
    selectQuotes(quotes, opt).forEach((q) => qRows.push({
      'Kitap': book.title,
      'Yazar': book.author || '',
      'Alıntı': q.text || '',
      'Sayfa': pageLabel(q),
      'Bölüm': q.chapter || '',
      'Önem': STAR_TXT[q.stars || 0],
      'Etiketler': opt.tags ? (q.tags || []).join(', ') : '',
      'Yorumum': opt.comments ? q.comment || '' : '',
      'Tekrar oku': q.reread ? (q.reread.done ? 'Okundu' : (q.reread.due || 'Evet')) : '',
      'Kaynak': citationText(book, pageLabel(q)),
      'Eklenme': (q.createdAt || '').slice(0, 10),
    }));
  });
  const ws1 = X.utils.json_to_sheet(qRows.length ? qRows : [{ 'Bilgi': 'Seçilen ölçütlerde kayıt yok' }]);
  ws1['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 80 }, { wch: 8 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 40 }, { wch: 11 }];
  X.utils.book_append_sheet(wb, ws1, 'Alıntılar');

  const bRows = sections.map(({ book, quotes }) => ({
    'Kitap': book.title, 'Alt başlık': book.subtitle || '', 'Yazar': book.author || '', 'Çevirmen': book.translator || '',
    'Yayınevi': book.publisher || '', 'Basım yeri': book.city || '', 'Yıl': book.year || '', 'Baskı': book.edition || '',
    'ISBN': book.isbn || '', 'Sayfa sayısı': book.pages || '', 'Konu': book.categories || '', 'Durum': book.status || '', 'Başlama': book.startDate || '',
    'Bitiş': book.endDate || '', 'Puan': book.rating || '', 'Alıntı sayısı': quotes.length,
  }));
  X.utils.book_append_sheet(wb, X.utils.json_to_sheet(bRows), 'Kitaplar');

  if (opt.toc) {
    const tRows = [];
    sections.forEach(({ book, toc }) => (toc || []).forEach((t) => tRows.push({ 'Kitap': book.title, 'Seviye': t.level || 1, 'Başlık': t.title, 'Sayfa': t.page || '' })));
    if (tRows.length) X.utils.book_append_sheet(wb, X.utils.json_to_sheet(tRows), 'İçindekiler');
  }
  if (opt.summary) {
    const sRows = sections.filter((s) => s.book.summary).map(({ book }) => ({ 'Kitap': book.title, 'Özet': book.summary }));
    if (sRows.length) X.utils.book_append_sheet(wb, X.utils.json_to_sheet(sRows), 'Özetler');
  }
  const arr = X.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------- Düşünceler ----------
/** groups: [{ name, thoughts: [...] }] */
export function buildThoughtsPrintHtml(title, groups) {
  let h = `<article class="print-doc"><header class="pd-head"><h1>${esc(title)}</h1><p class="pd-meta">Dışa aktarma: ${esc(dt(new Date().toISOString()))}</p></header>`;
  groups.forEach((g) => {
    if (!g.thoughts.length) return;
    h += `<section><h2>📓 ${esc(g.name)}</h2>`;
    g.thoughts.forEach((t) => {
      h += `<div class="pd-thought"><h3>${esc(t.title || 'Başlıksız düşünce')}${t.stars ? ` <span class="pd-stars">${STAR_TXT[t.stars]}</span>` : ''}</h3>`;
      (t.parts || []).forEach((p) => { h += `<p class="pd-part"><span class="pd-time">${esc(dt(p.at))}</span><br>${esc(p.text).replace(/\n/g, '<br>')}</p>`; });
      if (t.tags && t.tags.length) h += `<p class="pd-tags">${t.tags.map((x) => '#' + esc(x)).join(' ')}</p>`;
      h += `</div>`;
    });
    h += `</section>`;
  });
  return h + `</article>`;
}
export async function buildThoughtsDocx(title, groups) {
  const D = await getDocx();
  const children = [new D.Paragraph({ text: title, heading: D.HeadingLevel.TITLE })];
  groups.forEach((g) => {
    if (!g.thoughts.length) return;
    children.push(new D.Paragraph({ text: g.name, heading: D.HeadingLevel.HEADING_1 }));
    g.thoughts.forEach((t) => {
      children.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.TextRun(t.title || 'Başlıksız düşünce'), ...(t.stars ? [new D.TextRun({ text: '  ' + STAR_TXT[t.stars], size: 20, color: 'B7791F' })] : [])] }));
      (t.parts || []).forEach((p) => {
        children.push(new D.Paragraph({ children: [new D.TextRun({ text: dt(p.at), size: 18, color: '7C5CFF', bold: true })], spacing: { before: 120 } }));
        children.push(new D.Paragraph({ children: textRuns(D, p.text), spacing: { after: 80 } }));
      });
      if (t.tags && t.tags.length) children.push(new D.Paragraph({ children: [new D.TextRun({ text: t.tags.map((x) => '#' + x).join('  '), size: 18, color: '0FB9A8' })] }));
    });
  });
  const doc = new D.Document({ creator: 'Kitap & Notlarım', title, styles: DOC_STYLES, sections: [{ children }] });
  return D.Packer.toBlob(doc);
}

// ---------- Günlük ----------
/** days: [{ date, label, mood, moments: [{at, promptLabel, text, photos:[{data,w,h}]}] }] */
export function buildJournalPrintHtml(title, days) {
  let h = `<article class="print-doc"><header class="pd-head"><h1>${esc(title)}</h1></header>`;
  days.forEach((d) => {
    h += `<section class="pd-day"><h2>${esc(d.label)} ${d.mood || ''}</h2>`;
    d.moments.forEach((m) => {
      h += `<div class="pd-moment"><p class="pd-mhead"><span class="pd-time">${esc(hm(m.at))}</span> · <b>${esc(m.promptLabel)}</b></p>`;
      if (m.text) h += `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>`;
      if (m.photos && m.photos.length) h += `<div class="pd-photos">${m.photos.map((p) => `<img src="${p.data}" alt="">`).join('')}</div>`;
      h += `</div>`;
    });
    h += `</section>`;
  });
  return h + `</article>`;
}
function dataUrlBytes(dataUrl) {
  const bin = atob(dataUrl.split(',')[1] || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
export async function buildJournalDocx(title, days) {
  const D = await getDocx();
  const children = [new D.Paragraph({ text: title, heading: D.HeadingLevel.TITLE })];
  days.forEach((d) => {
    children.push(new D.Paragraph({ text: `${d.label} ${d.mood || ''}`.trim(), heading: D.HeadingLevel.HEADING_1 }));
    d.moments.forEach((m) => {
      children.push(new D.Paragraph({ spacing: { before: 160 }, children: [new D.TextRun({ text: hm(m.at) + '  ', bold: true, color: '7C5CFF', size: 20 }), new D.TextRun({ text: m.promptLabel, bold: true, size: 20 })] }));
      if (m.text) children.push(new D.Paragraph({ children: textRuns(D, m.text), spacing: { after: 80 } }));
      (m.photos || []).forEach((p) => {
        const w = 420, hgt = p.w && p.h ? Math.round((420 * p.h) / p.w) : 315;
        try { children.push(new D.Paragraph({ children: [new D.ImageRun({ data: dataUrlBytes(p.data), transformation: { width: w, height: hgt } })] })); } catch (e) { /* görsel eklenemedi */ }
      });
    });
  });
  const doc = new D.Document({ creator: 'Kitap & Notlarım', title, styles: DOC_STYLES, sections: [{ children }] });
  return D.Packer.toBlob(doc);
}
