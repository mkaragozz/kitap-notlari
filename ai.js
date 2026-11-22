// Claude API ile yazı tanıma (OCR), kitap bilgisi çıkarma, anlamsal arama ve özet.
// API anahtarı yalnızca bu cihazda (tarayıcı belleğinde) saklanır.
import { getSettings } from './db.js';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.39.0/+esm';
let sdkPromise = null;

export function hasKey() {
  return !!getSettings().apiKey;
}

async function getClient() {
  const { apiKey } = getSettings();
  if (!apiKey) {
    const e = new Error('Yapay zekâ özellikleri için Ayarlar sayfasından Claude API anahtarınızı girin.');
    e.code = 'NO_KEY';
    throw e;
  }
  sdkPromise = sdkPromise || import(SDK_URL);
  const mod = await sdkPromise;
  const Anthropic = mod.default || mod.Anthropic;
  return { client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 }), mod, Anthropic };
}

function friendlyError(err, Anthropic) {
  const status = err && err.status;
  if (status === 401) return 'API anahtarı geçersiz. Ayarlar sayfasından kontrol edin.';
  if (status === 403) return 'Bu API anahtarının bu işleme izni yok.';
  if (status === 429) return 'Çok fazla istek gönderildi ya da kredi limiti doldu. Biraz sonra tekrar deneyin.';
  if (status === 400) return 'İstek reddedildi: ' + ((err.error && err.error.error && err.error.error.message) || err.message);
  if (status >= 500) return 'Claude sunucusu şu an yanıt veremiyor. Biraz sonra tekrar deneyin.';
  if (err && /fetch|network|Failed/i.test(err.message || '')) return 'İnternet bağlantısı yok ya da bağlantı kesildi.';
  return (err && err.message) || 'Bilinmeyen bir hata oluştu.';
}

async function ask({ system, content, schema, effort = 'low', maxTokens = 16000 }) {
  const { client, Anthropic } = await getClient();
  const { model } = getSettings();
  const params = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort },
  };
  if (schema) params.output_config.format = { type: 'json_schema', schema };
  // Güvenlik filtresi bir isteği yanlışlıkla reddederse sunucu tarafında yedek modele geç
  if (/opus|sonnet|fable/.test(model)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  let msg;
  try {
    msg = params.betas ? await client.beta.messages.create(params) : await client.messages.create(params);
  } catch (err) {
    throw new Error(friendlyError(err, Anthropic));
  }
  if (msg.stop_reason === 'refusal') throw new Error('Claude bu isteği işleyemedi. Farklı bir görselle tekrar deneyin.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Yanıt çok uzun olduğu için yarıda kesildi. Daha az sayfa ile tekrar deneyin.');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!schema) return text.trim();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('Yanıt okunamadı, lütfen tekrar deneyin.'); }
}

// Anahtarı denemek için çok küçük bir istek (yanıt içeriği önemsiz, 200 dönmesi yeterli)
export async function testKey() {
  const { client, Anthropic } = await getClient();
  try {
    await client.messages.create({ model: getSettings().model, max_tokens: 64, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'Sadece "tamam" yaz.' }] });
  } catch (err) {
    throw new Error(friendlyError(err, Anthropic));
  }
}

// Görseli küçültüp JPEG base64'e çevirir (maliyeti ve süreyi azaltır)
export async function imageToBase64(blob, maxSide = 1800, quality = 0.86) {
  const bmp = await loadImage(blob);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality).split(',')[1];
}

export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Görsel açılamadı.')); };
    img.src = url;
  });
}

function imgBlock(b64) {
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } };
}

const OCR_SYSTEM = `Kitap sayfası fotoğraflarından metin aktaran titiz bir asistansın.
Kurallar:
- Metni harfi harfine aktar. Türkçe karakterleri (ç, ğ, ı, İ, ö, ş, ü, â, î, û) doğru yaz.
- Kelime düzeltme, özetleme, yorum ekleme yapma.
- Satır sonundaki heceleme tirelerini birleştir (ör. "dü-\\nşünce" → "düşünce"); paragraf aralarını koru.
- Sayfa başlığı, üst bilgi, alt bilgi ve sayfa numarası metne dahil edilmez.
- Sayfada basılı bir sayfa numarası görüyorsan "page" alanına yaz, görmüyorsan boş bırak.`;

const OCR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['passages', 'marked'],
  properties: {
    marked: { type: 'boolean', description: 'Sayfada altı çizili / işaretli kısım bulundu mu' },
    passages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'page'],
        properties: { text: { type: 'string' }, page: { type: 'string' } },
      },
    },
  },
};

/** mode: 'marked' (sadece altı çizili/işaretli yerler) | 'all' (tüm metin) */
export async function ocrPassages(blob, mode) {
  const b64 = await imageToBase64(blob);
  const instr = mode === 'marked'
    ? 'Bu sayfada okuyucunun kurşun kalemle altını çizdiği, fosforlu kalemle boyadığı, kenarına çizgi ya da işaret koyduğu yerleri bul. Her işaretli bölümü ayrı bir pasaj olarak, cümleyi anlamlı olacak şekilde tamamlayarak ver. Hiç işaret yoksa görünen metnin tamamını tek pasaj olarak ver ve marked=false yap.'
    : 'Bu görseldeki metnin tamamını tek bir pasaj olarak aktar. marked=false yap.';
  return ask({ system: OCR_SYSTEM, content: [imgBlock(b64), { type: 'text', text: instr }], schema: OCR_SCHEMA, effort: 'low' });
}

const TOC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'page', 'level'],
        properties: {
          title: { type: 'string' },
          page: { type: 'string' },
          level: { type: 'integer', description: '1 = ana bölüm, 2 = alt başlık, 3 = daha alt başlık' },
        },
      },
    },
  },
};

export async function ocrToc(blobs) {
  const imgs = [];
  for (const b of blobs) imgs.push(imgBlock(await imageToBase64(b)));
  const text = 'Bu görseller bir kitabın içindekiler sayfalarıdır (sırayla). Tüm başlıkları sırasıyla, sayfa numaralarıyla ve hiyerarşi seviyesiyle (bölüm/alt başlık) çıkar. Noktalı çizgileri alma. Sayfa numarası yoksa boş bırak.';
  const res = await ask({ system: OCR_SYSTEM, content: [...imgs, { type: 'text', text }], schema: TOC_SCHEMA, effort: 'low' });
  return res.items || [];
}

const BOOK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'subtitle', 'author', 'translator', 'publisher', 'city', 'year', 'edition', 'isbn', 'pages'],
  properties: {
    title: { type: 'string' }, subtitle: { type: 'string' }, author: { type: 'string' },
    translator: { type: 'string' }, publisher: { type: 'string' }, city: { type: 'string' },
    year: { type: 'string' }, edition: { type: 'string', description: 'Baskı sayısı, yalnızca rakam (ör. 12)' },
    isbn: { type: 'string', description: 'Yalnızca rakam ve X' }, pages: { type: 'string', description: 'Toplam sayfa sayısı, biliniyorsa' },
  },
};

export async function bookInfoFromImages(blobs) {
  const imgs = [];
  for (const b of blobs) imgs.push(imgBlock(await imageToBase64(b, 1600)));
  const text = 'Bu görseller bir kitabın kapağı, arka kapağı ya da künye (yayın bilgileri) sayfasıdır. Kitap adı, alt başlık, yazar(lar), çevirmen, yayınevi, basım yeri, basım yılı, kaçıncı baskı olduğu, ISBN ve toplam sayfa sayısını çıkar. Görselde olmayan alanları boş bırak, tahmin etme. Birden çok yazar varsa virgülle ayır.';
  return ask({ system: OCR_SYSTEM, content: [...imgs, { type: 'text', text }], schema: BOOK_SCHEMA, effort: 'low' });
}

const SEARCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['matches'],
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'reason'],
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
};

/** entries: [{id, line}] — kısa metin satırları */
export async function semanticSearch(query, entries) {
  const list = entries.map((e) => `[${e.id}] ${e.line}`).join('\n');
  const system = 'Bir okuyucunun kişisel kitap notları arşivinde anlamsal arama yapıyorsun. Okuyucu bir konuyu, fikri ya da hatırladığı bir cümleyi tarif eder; sen kelimeler birebir geçmese bile anlamca ilgili kayıtları bulursun. Yalnızca listede bulunan kimlikleri (köşeli parantez içindeki) kullan.';
  const text = `ARŞİV:\n${list}\n\nARANAN: "${query}"\n\nAnlamca en ilgili en fazla 15 kaydı, en ilgiliden başlayarak döndür. Her biri için neden ilgili olduğunu Türkçe, tek kısa cümleyle açıkla. Gerçekten ilgili kayıt yoksa boş liste döndür.`;
  const res = await ask({ system, content: [{ type: 'text', text }], schema: SEARCH_SCHEMA, effort: 'low' });
  return res.matches || [];
}

export async function summarize(book, toc, quotes) {
  const meta = [
    `Kitap: ${book.title}${book.subtitle ? ' — ' + book.subtitle : ''}`,
    book.author && `Yazar: ${book.author}`,
    book.translator && `Çevirmen: ${book.translator}`,
    book.publisher && `Yayınevi: ${book.publisher}`,
    book.year && `Yıl: ${book.year}`,
    `Tür: ${book.isNovel ? 'Roman / kurgu' : 'Kurgu dışı'}`,
  ].filter(Boolean).join('\n');
  const tocText = toc && toc.length
    ? toc.map((t) => `${'  '.repeat(Math.max(0, (t.level || 1) - 1))}${t.title}${t.page ? ' (s. ' + t.page + ')' : ''}`).join('\n')
    : '(İçindekiler girilmemiş)';
  const qText = quotes.length
    ? quotes.map((q) => {
      const kind = q.kind === 'not' ? 'NOT' : q.kind === 'tekrar' ? 'TEKRAR OKUNACAK' : 'ALINTI';
      let s = `- [${kind}${q.page ? ', s. ' + q.page + (q.pageEnd ? '–' + q.pageEnd : '') : ''}${q.chapter ? ', ' + q.chapter : ''}] ${q.text || ''}`;
      if (q.comment) s += `\n  Okuyucunun yorumu: ${q.comment}`;
      if (q.tags && q.tags.length) s += `\n  Etiketler: ${q.tags.join(', ')}`;
      return s;
    }).join('\n')
    : '(Alıntı yok)';

  const system = 'Türkçe yazan, titiz ve dürüst bir kitap özeti editörüsün. Okuyucunun kendi notlarından yola çıkarak kalıcı, tekrar okunabilir bir özet hazırlarsın.';
  const novel = book.isNovel
    ? 'Kitap bir roman/kurgu eseri: "## Konu ve Olay Örgüsü", "## Karakterler", "## Temalar", "## Öne Çıkan Alıntılar", "## Okuyucunun Notlarından Çıkan Düşünceler", "## Değerlendirme" başlıklarını kullan.'
    : 'Şu başlıkları kullan: "## Genel Bakış", "## Bölüm Bölüm" (içindekiler varsa her ana bölüm için kısa paragraf), "## Ana Fikirler" (madde işaretli), "## Öne Çıkan Alıntılar", "## Okuyucunun Notlarından Çıkan Temalar", "## Sonuç".';
  const text = `${meta}\n\nİÇİNDEKİLER:\n${tocText}\n\nOKUYUCUNUN NOTLARI (sayfa sırasıyla):\n${qText}\n\nGÖREV: Bu kitabın genel bir özetini hazırla.
- Öncelikle okuyucunun notlarına ve içindekiler bölümüne dayan.
- Kitabı kendi bilginden tanıyorsan genel bağlam ekleyebilirsin; ancak notlarda olmayan bilgileri "(genel bilgi)" diye işaretle. Emin olmadığın şeyi yazma.
- Alıntıları ve fikirleri anarken sayfa numarasını (s. 45) biçiminde ver.
- ${novel}
- Biçim: "## " ile başlık, "- " ile madde, **kalın** vurgular. Başka işaretleme kullanma. Girizgâh ya da kapanış cümlesi ekleme.`;
  return ask({ system, content: [{ type: 'text', text }], effort: 'medium', maxTokens: 16000 });
}
