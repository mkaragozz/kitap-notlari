// Dışa aktarma: PDF (yazdır), Word (.docx), Excel (.xlsx), kaynakça biçimleri, dosya kaydetme.

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

// ---------- Kaynakça biçimleri ----------
function splitAuthors(a) {
  return String(a || '').split(/\s*(?:;|,|&| ve | and )\s*/).map((x) => x.trim()).filter(Boolean);
}
function nameParts(full) {
  const p = full.split(/\s+/);
  const last = p.pop() || '';
  return { first: p.join(' '), last };
}
const trUpper = (s) => s.toLocaleUpperCase('tr');
function initials(first) {
  return first.split(/[\s-]+/).filter(Boolean).map((w) => trUpper(w[0]) + '.').join(' ');
}
function ordinalEd(ed) { return ed && String(ed) !== '1' ? `${ed}. bs.` : ''; }

/** Biçimli parçalar döner: [{t:'metin', i:true/false}] (i = italik) */
export function citation(book, style, page) {
  const authors = splitAuthors(book.author);
  const title = book.title + (book.subtitle ? ': ' + book.subtitle : '');
  const pg = page ? String(page) : '';
  const out = [];
  const T = (t) => out.push({ t, i: false });
  const I = (t) => out.push({ t, i: true });

  if (style === 'apa') {
    const names = authors.map((a) => { const n = nameParts(a); return n.first ? `${n.last}, ${initials(n.first)}` : n.last; });
    let au = names.length <= 1 ? (names[0] || '') : names.length === 2 ? `${names[0]} & ${names[1]}` : names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
    if (au) T(au + ' ');
    T(`(${book.year || 't.y.'}). `);
    I(title);
    const extra = [book.translator ? `Çev. ${book.translator}` : '', ordinalEd(book.edition)].filter(Boolean).join('; ');
    T((extra ? ` (${extra})` : '') + '. ');
    if (book.publisher) T(book.publisher + '.');
    if (pg) T(` s. ${pg}.`);
  } else if (style === 'mla') {
    if (authors.length) {
      const n = nameParts(authors[0]);
      let au = n.first ? `${n.last}, ${n.first}` : n.last;
      if (authors.length === 2) au += `, ve ${authors[1]}`;
      if (authors.length > 2) au += ', vd.';
      T(au + '. ');
    }
    I(title); T('. ');
    if (book.translator) T(`Çev. ${book.translator}, `);
    if (book.edition && String(book.edition) !== '1') T(`${book.edition}. bs., `);
    T([book.publisher, book.year].filter(Boolean).join(', ') + (pg ? `, s. ${pg}.` : '.'));
  } else if (style === 'chicago') {
    if (authors.length) {
      const n = nameParts(authors[0]);
      let au = n.first ? `${n.last}, ${n.first}` : n.last;
      if (authors.length > 1) au += ', ' + authors.slice(1).join(', ');
      T(au + '. ');
    }
    I(title); T('. ');
    if (book.translator) T(`Çev. ${book.translator}. `);
    if (book.edition && String(book.edition) !== '1') T(`${book.edition}. bs. `);
    const place = [book.city, book.publisher].filter(Boolean).join(': ');
    T([place, book.year].filter(Boolean).join(', ') + '.');
    if (pg) T(` s. ${pg}.`);
  } else {
    // Kısa: Yazar, Kitap, s. X
    if (book.author) T(book.author + ', ');
    I(book.title);
    if (pg) T(`, s. ${pg}`);
  }
  return out;
}
export const citationText = (book, style, page) => citation(book, style, page).map((p) => p.t).join('');
export const citationHtml = (book, style, page) => citation(book, style, page).map((p) => (p.i ? `<i>${esc(p.t)}</i>` : esc(p.t))).join('');

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

const KIND_LABEL = { alinti: 'Alıntı', not: 'Not', tekrar: 'Tekrar okunacak' };

function sortByPage(qs) {
  return [...qs].sort((a, b) => (parseInt(a.page, 10) || 1e9) - (parseInt(b.page, 10) || 1e9) || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function selectQuotes(quotes, opt) {
  return sortByPage(quotes.filter((q) => (q.kind === 'alinti' && opt.quotes) || (q.kind === 'not' && opt.notes) || (q.kind === 'tekrar' && opt.reread)));
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
    h += `<section><h2>Alıntılar ve Notlar</h2>`;
    qs.forEach((q, i) => {
      h += `<div class="pd-q"><blockquote>${esc(q.text || '').replace(/\n/g, '<br>')}</blockquote>`;
      const pl = pageLabel(q);
      const ref = opt.style === 'page' ? (pl ? `s. ${esc(pl)}` : '') : citationHtml(book, opt.style, pl);
      h += `<p class="pd-ref"><sup>${i + 1}</sup> ${ref}${q.chapter ? ` — ${esc(q.chapter)}` : ''}${q.kind !== 'alinti' ? ` <span class="pd-kind">(${KIND_LABEL[q.kind]})</span>` : ''}</p>`;
      if (opt.comments && q.comment) h += `<p class="pd-comment"><b>Notum:</b> ${esc(q.comment)}</p>`;
      if (opt.tags && q.tags && q.tags.length) h += `<p class="pd-tags">${q.tags.map((t) => '#' + esc(t)).join(' ')}</p>`;
      h += `</div>`;
    });
    h += `</section>`;
  }
  h += `<footer class="pd-foot">Kaynak: ${citationHtml(book, opt.style === 'page' ? 'apa' : opt.style)}</footer>`;
  h += `</article>`;
  return h;
}

export function printHtml(html) {
  const area = document.getElementById('print-area');
  area.innerHTML = html;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); area.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}

// ---------- Word ----------
let docxMod = null;
async function getDocx() { docxMod = docxMod || (await import(DOCX_URL)); return docxMod; }

function runsFromCitation(D, parts, size, color) {
  return parts.map((p) => new D.TextRun({ text: p.t, italics: p.i, size, color }));
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
      children.push(new D.Paragraph({ text: 'Alıntılar ve Notlar', heading: D.HeadingLevel.HEADING_1 }));
      qs.forEach((q) => {
        const pl = pageLabel(q);
        const textRuns = String(q.text || '').split(/\n/).flatMap((line, i) => (i ? [new D.TextRun({ text: line, break: 1 })] : [new D.TextRun(line)]));
        if (opt.footnotes) {
          const parts = opt.style === 'page' ? citation(book, 'short', pl) : citation(book, opt.style, pl);
          footnotes[fn] = { children: [new D.Paragraph({ children: runsFromCitation(D, parts) })] };
          textRuns.push(new D.FootnoteReferenceRun(fn));
          fn++;
        }
        children.push(new D.Paragraph({
          children: textRuns,
          indent: { left: 360 },
          border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: '7C5CFF', space: 10 } },
          spacing: { before: 200, after: 40 },
        }));
        // Sayfa bilgisi: alıntının hemen altında
        const refParts = opt.style === 'page' ? (pl ? [{ t: `s. ${pl}`, i: false }] : []) : citation(book, opt.style, pl);
        const refRuns = [new D.TextRun({ text: '↳ ', color: '7C5CFF', size: 18 }), ...runsFromCitation(D, refParts, 18, '555555')];
        if (q.chapter) refRuns.push(new D.TextRun({ text: ` — ${q.chapter}`, size: 18, color: '555555' }));
        if (q.kind !== 'alinti') refRuns.push(new D.TextRun({ text: ` (${KIND_LABEL[q.kind]})`, size: 18, color: 'D9480F' }));
        children.push(new D.Paragraph({ children: refRuns, indent: { left: 360 }, spacing: { after: 80 } }));
        if (opt.comments && q.comment) children.push(new D.Paragraph({ indent: { left: 360 }, children: [new D.TextRun({ text: 'Notum: ', bold: true, size: 20 }), new D.TextRun({ text: q.comment, italics: true, size: 20 })] }));
        if (opt.tags && q.tags && q.tags.length) children.push(new D.Paragraph({ indent: { left: 360 }, children: [new D.TextRun({ text: q.tags.map((t) => '#' + t).join('  '), size: 18, color: '0FB9A8' })] }));
      });
    }
    children.push(new D.Paragraph({ spacing: { before: 300 }, children: [new D.TextRun({ text: 'Kaynak: ', bold: true, size: 20 }), ...runsFromCitation(D, citation(book, opt.style === 'page' ? 'apa' : opt.style), 20)] }));
  });

  const doc = new D.Document({
    creator: 'Kitap Notlarım',
    title: sections.length === 1 ? sections[0].book.title : 'Kitap Notlarım',
    styles: { default: { document: { run: { font: 'Calibri', size: 23 } } } },
    footnotes,
    sections: [{ properties: {}, children }],
  });
  return D.Packer.toBlob(doc);
}

export async function buildBibliographyDocx(books, style) {
  const D = await getDocx();
  const sorted = [...books].sort((a, b) => (a.author || a.title).localeCompare(b.author || b.title, 'tr'));
  const children = [new D.Paragraph({ text: 'Kaynakça', heading: D.HeadingLevel.TITLE })];
  sorted.forEach((b) => children.push(new D.Paragraph({
    children: runsFromCitation(D, citation(b, style)),
    indent: { left: 720, hanging: 720 }, spacing: { after: 120 },
  })));
  const doc = new D.Document({ styles: { default: { document: { run: { font: 'Calibri', size: 23 } } } }, sections: [{ children }] });
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
      'Tür': KIND_LABEL[q.kind] || '',
      'Alıntı / Not': q.text || '',
      'Sayfa': pageLabel(q),
      'Bölüm': q.chapter || '',
      'Etiketler': (q.tags || []).join(', '),
      'Yorumum': q.comment || '',
      'Kaynak gösterimi': citationText(book, opt.style === 'page' ? 'apa' : opt.style, pageLabel(q)),
      'Eklenme': (q.createdAt || '').slice(0, 10),
    }));
  });
  const ws1 = X.utils.json_to_sheet(qRows.length ? qRows : [{ 'Bilgi': 'Seçilen türde kayıt yok' }]);
  ws1['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 80 }, { wch: 8 }, { wch: 24 }, { wch: 22 }, { wch: 40 }, { wch: 50 }, { wch: 11 }];
  X.utils.book_append_sheet(wb, ws1, 'Alıntılar');

  const bRows = sections.map(({ book, quotes }) => ({
    'Kitap': book.title, 'Alt başlık': book.subtitle || '', 'Yazar': book.author || '', 'Çevirmen': book.translator || '',
    'Yayınevi': book.publisher || '', 'Basım yeri': book.city || '', 'Yıl': book.year || '', 'Baskı': book.edition || '',
    'ISBN': book.isbn || '', 'Sayfa sayısı': book.pages || '', 'Durum': book.status || '', 'Başlama': book.startDate || '',
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
