import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Book, Chapter, BookFormat } from '../types';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function generateDefaultCover(title: string, author: string, format: string): string {
  const colors = [
    ['#312e81', '#1e1b4b', '#818cf8'],
    ['#064e3b', '#022c22', '#34d399'],
    ['#701a75', '#3b0764', '#f472b6'],
    ['#7f1d1d', '#450a0a', '#fca5a5'],
    ['#78350f', '#451a03', '#fcd34d'],
  ];
  const hash = (title + author).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color[0]}" />
        <stop offset="100%" stop-color="${color[1]}" />
      </linearGradient>
    </defs>
    <rect width="400" height="600" rx="16" fill="url(#bg)" />
    <rect x="30" y="30" width="340" height="540" rx="8" fill="none" stroke="${color[2]}" stroke-width="2" stroke-opacity="0.3" />
    <text x="200" y="100" font-family="'Literata', serif" font-size="16" font-weight="600" fill="#CBD5E1" text-anchor="middle" letter-spacing="2">${author.toUpperCase() || 'АВТОР'}</text>
    <circle cx="200" cy="240" r="50" fill="${color[2]}" fill-opacity="0.15" stroke="${color[2]}" stroke-width="2" />
    <text x="200" y="255" font-family="'Literata', serif" font-size="40" fill="${color[2]}" text-anchor="middle">📖</text>
    <text x="200" y="380" font-family="'Literata', serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
      ${title.length > 22 ? title.substring(0, 20) + '...' : title}
    </text>
    <rect x="150" y="490" width="100" height="26" rx="13" fill="${color[2]}" fill-opacity="0.2" />
    <text x="200" y="508" font-family="sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">.${format.toUpperCase()}</text>
  </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function decodeTextBuffer(buffer: ArrayBuffer, hintEncoding?: string): string {
  const bytes = new Uint8Array(buffer);
  
  if (hintEncoding) {
    const cleanHint = hintEncoding.toLowerCase().trim();
    try {
      if (cleanHint.includes('1251') || cleanHint.includes('cp1251') || cleanHint.includes('windows-1251')) {
        return new TextDecoder('windows-1251').decode(buffer);
      }
      if (cleanHint.includes('koi8')) {
        return new TextDecoder('koi8-r').decode(buffer);
      }
      if (cleanHint.includes('8859-5')) {
        return new TextDecoder('iso-8859-5').decode(buffer);
      }
      if (cleanHint.includes('utf-8') || cleanHint.includes('utf8')) {
        return new TextDecoder('utf-8').decode(buffer);
      }
      return new TextDecoder(cleanHint).decode(buffer);
    } catch {
      // ignore
    }
  }

  // Check header for <?xml ... encoding="..."?>
  const headerSample = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 600)));
  const xmlEncMatch = headerSample.match(/<\?xml[^>]+encoding=["']([^"']+)["']/i);
  if (xmlEncMatch && xmlEncMatch[1]) {
    const enc = xmlEncMatch[1].toLowerCase();
    try {
      if (enc.includes('1251') || enc.includes('windows-1251')) {
        return new TextDecoder('windows-1251').decode(buffer);
      }
      if (enc.includes('koi8')) {
        return new TextDecoder('koi8-r').decode(buffer);
      }
      if (enc.includes('8859-5')) {
        return new TextDecoder('iso-8859-5').decode(buffer);
      }
      if (enc.includes('utf-8')) {
        return new TextDecoder('utf-8').decode(buffer);
      }
      return new TextDecoder(enc).decode(buffer);
    } catch {
      // ignore
    }
  }

  // Try UTF-8 with fatal check
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    // If UTF-8 validation fails, it's typically Russian CP1251 (windows-1251)
    try {
      return new TextDecoder('windows-1251').decode(buffer);
    } catch {
      return new TextDecoder('utf-8').decode(buffer);
    }
  }
}

export async function parseBookFile(file: File): Promise<Book> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
  const fileSize = formatBytes(file.size);
  const rawTitle = fileName.replace(/\.[^/.]+$/, '');

  if (ext === 'fb2') {
    const buffer = await file.arrayBuffer();
    return parseFb2(decodeTextBuffer(buffer), rawTitle, fileSize);
  } else if (ext === 'epub') {
    return parseEpub(await file.arrayBuffer(), rawTitle, fileSize);
  } else if (ext === 'pdf') {
    return parsePdf(await file.arrayBuffer(), rawTitle, fileSize);
  } else if (ext === 'txt') {
    const buffer = await file.arrayBuffer();
    return parseTxt(decodeTextBuffer(buffer), rawTitle, fileSize);
  } else if (ext === 'md') {
    const buffer = await file.arrayBuffer();
    return parseMarkdown(decodeTextBuffer(buffer), rawTitle, fileSize);
  } else if (ext === 'cbz' || (ext === 'zip' && fileName.toLowerCase().includes('comic'))) {
    return parseCbz(file, rawTitle, fileSize);
  } else if (ext === 'zip') {
    const buffer = await file.arrayBuffer();
    try {
      const zip = await JSZip.loadAsync(buffer);
      const fb2Entry = Object.keys(zip.files).find((p) => p.toLowerCase().endsWith('.fb2'));
      if (fb2Entry) {
        const fb2Buffer = await zip.file(fb2Entry)!.async('arraybuffer');
        return parseFb2(decodeTextBuffer(fb2Buffer), rawTitle, fileSize);
      }
    } catch {
      // not a zip fb2
    }
    return parseCbz(buffer, rawTitle, fileSize);
  } else {
    return parseGenericText(file, rawTitle, ext as BookFormat, fileSize);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function convertFb2Node(node: Node, binaries: Record<string, string>): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  const getChildrenHtml = () => {
    let inner = '';
    el.childNodes.forEach((child) => {
      inner += convertFb2Node(child, binaries);
    });
    return inner;
  };

  switch (tag) {
    case 'p':
      return `<p class="my-2.5 indent-4 text-justify leading-relaxed">${getChildrenHtml()}</p>`;
    case 'title': {
      let titleHtml = '';
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'p') {
          let pText = '';
          child.childNodes.forEach((c) => { pText += convertFb2Node(c, binaries); });
          titleHtml += `<div class="my-1">${pText}</div>`;
        } else {
          titleHtml += convertFb2Node(child, binaries);
        }
      });
      return `<h3 class="text-xl font-bold my-4 text-center text-amber-600 dark:text-amber-400 break-words">${titleHtml}</h3>`;
    }
    case 'subtitle':
      return `<h4 class="text-base font-bold my-3 text-center opacity-90">${getChildrenHtml()}</h4>`;
    case 'epigraph':
      return `<div class="epigraph my-4 ml-auto max-w-sm pl-4 pr-2 border-l-2 border-amber-500/50 italic text-sm opacity-90 space-y-1">${getChildrenHtml()}</div>`;
    case 'cite':
      return `<blockquote class="cite my-4 pl-4 border-l-2 border-neutral-400 dark:border-neutral-600 italic opacity-95 space-y-1">${getChildrenHtml()}</blockquote>`;
    case 'text-author':
      return `<p class="text-right text-xs italic font-medium opacity-80 mt-1 mb-2">— ${getChildrenHtml()}</p>`;
    case 'poem':
      return `<div class="poem my-4 pl-4 border-l-2 border-amber-500/30 italic space-y-2 font-serif">${getChildrenHtml()}</div>`;
    case 'stanza':
      return `<div class="stanza my-2 space-y-1">${getChildrenHtml()}</div>`;
    case 'v':
      return `<div class="verse leading-snug">${getChildrenHtml()}</div>`;
    case 'empty-line':
      return `<div class="h-4 my-1"></div>`;
    case 'image': {
      const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '';
      const imgId = href.replace(/^#/, '');
      if (imgId && binaries[imgId]) {
        return `<div class="my-4 text-center"><img src="${binaries[imgId]}" class="max-w-full max-h-96 mx-auto rounded-xl shadow-md block object-contain" alt="Иллюстрация" /></div>`;
      }
      return '';
    }
    case 'emphasis':
      return `<em>${getChildrenHtml()}</em>`;
    case 'strong':
      return `<strong>${getChildrenHtml()}</strong>`;
    case 'style':
      return `<span>${getChildrenHtml()}</span>`;
    case 'a': {
      const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '';
      const isInternal = href.startsWith('#');
      const inner = getChildrenHtml() || '*';
      return `<a href="${href}" class="text-amber-500 hover:underline font-semibold text-xs align-super mx-0.5" ${isInternal ? '' : 'target="_blank" rel="noopener noreferrer"'}>${inner}</a>`;
    }
    case 'strikethrough':
      return `<s>${getChildrenHtml()}</s>`;
    case 'sub':
      return `<sub>${getChildrenHtml()}</sub>`;
    case 'sup':
      return `<sup>${getChildrenHtml()}</sup>`;
    case 'code':
      return `<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs">${getChildrenHtml()}</code>`;
    case 'table':
      return `<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-neutral-300 dark:border-neutral-700 text-sm">${getChildrenHtml()}</table></div>`;
    case 'tr':
      return `<tr class="border-b border-neutral-200 dark:border-neutral-800">${getChildrenHtml()}</tr>`;
    case 'th':
      return `<th class="p-2 font-bold text-left bg-black/5 dark:bg-white/5 border border-neutral-200 dark:border-neutral-800">${getChildrenHtml()}</th>`;
    case 'td':
      return `<td class="p-2 border border-neutral-200 dark:border-neutral-800">${getChildrenHtml()}</td>`;
    case 'annotation':
      return `<div class="annotation my-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-inherit/20 text-sm italic">${getChildrenHtml()}</div>`;
    default:
      return getChildrenHtml();
  }
}

function extractFb2Sections(
  sectionEl: Element,
  binaries: Record<string, string>,
  chapterList: Chapter[],
  parentTitle = ''
) {
  const childSections = Array.from(sectionEl.children).filter(
    (c) => c.tagName.toLowerCase() === 'section'
  );

  const titleEl = Array.from(sectionEl.children).find(
    (c) => c.tagName.toLowerCase() === 'title'
  );
  let sectionTitle = '';
  if (titleEl) {
    sectionTitle = titleEl.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  const combinedTitle = [parentTitle, sectionTitle].filter(Boolean).join(' · ');

  if (childSections.length > 0) {
    const nonSectionChildren = Array.from(sectionEl.childNodes).filter((n) => {
      if (n.nodeType === Node.ELEMENT_NODE) {
        return (n as Element).tagName.toLowerCase() !== 'section';
      }
      return (n.textContent || '').trim().length > 0;
    });

    let introHtml = '';
    nonSectionChildren.forEach((child) => {
      introHtml += convertFb2Node(child, binaries);
    });

    if (introHtml.replace(/<[^>]+>/g, '').trim().length > 30) {
      chapterList.push({
        id: `fb2-sec-${chapterList.length + 1}`,
        title: combinedTitle || `Часть ${chapterList.length + 1}`,
        content: introHtml,
      });
    }

    childSections.forEach((subSec) => {
      extractFb2Sections(subSec, binaries, chapterList, combinedTitle);
    });
  } else {
    let chapterHtml = '';
    sectionEl.childNodes.forEach((child) => {
      chapterHtml += convertFb2Node(child, binaries);
    });

    if (chapterHtml.trim()) {
      chapterList.push({
        id: `fb2-sec-${chapterList.length + 1}`,
        title: sectionTitle || combinedTitle || '',
        content: chapterHtml,
      });
    }
  }
}

function parseFb2(xmlText: string, defaultTitle: string, fileSize: string): Book {
  const parser = new DOMParser();
  let doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    const sanitizedXml = xmlText.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
    doc = parser.parseFromString(sanitizedXml, 'application/xml');
    if (doc.querySelector('parsererror')) {
      doc = parser.parseFromString(xmlText, 'text/html');
    }
  }

  const titleInfo = doc.querySelector('description title-info');
  const bookTitle = titleInfo?.querySelector('book-title')?.textContent?.trim() || defaultTitle;
  
  const authors: string[] = [];
  titleInfo?.querySelectorAll('author').forEach((authorEl) => {
    const first = authorEl.querySelector('first-name')?.textContent?.trim() || '';
    const last = authorEl.querySelector('last-name')?.textContent?.trim() || '';
    const middle = authorEl.querySelector('middle-name')?.textContent?.trim() || '';
    const full = [first, middle, last].filter(Boolean).join(' ');
    if (full) authors.push(full);
  });
  const author = authors.join(', ') || 'Неизвестный автор';
  const description = titleInfo?.querySelector('annotation')?.textContent?.trim() || '';
  const genre = titleInfo?.querySelector('genre')?.textContent?.trim() || 'Художественная литература';
  const lang = titleInfo?.querySelector('lang')?.textContent?.trim() || 'ru';

  const binaries: Record<string, string> = {};
  doc.querySelectorAll('binary').forEach((binaryEl) => {
    const id = binaryEl.getAttribute('id') || '';
    const contentType = binaryEl.getAttribute('content-type') || 'image/jpeg';
    const base64Data = binaryEl.textContent?.replace(/\s+/g, '') || '';
    if (id && base64Data) {
      binaries[id] = `data:${contentType};base64,${base64Data}`;
    }
  });

  let coverUrl = '';
  const coverImageRef = titleInfo?.querySelector('coverpage image')?.getAttribute('xlink:href') || 
                        titleInfo?.querySelector('coverpage image')?.getAttribute('href');
  if (coverImageRef) {
    const cleanId = coverImageRef.replace(/^#/, '');
    if (binaries[cleanId]) {
      coverUrl = binaries[cleanId];
    }
  }
  if (!coverUrl && Object.keys(binaries).length > 0) {
    const coverKey = Object.keys(binaries).find((k) => k.toLowerCase().includes('cover')) || Object.keys(binaries)[0];
    coverUrl = binaries[coverKey];
  }
  if (!coverUrl) {
    coverUrl = generateDefaultCover(bookTitle, author, 'fb2');
  }

  const chapters: Chapter[] = [];
  const bodies = Array.from(doc.querySelectorAll('body'));
  const mainBody = bodies.find((b) => {
    const name = (b.getAttribute('name') || '').toLowerCase();
    return name !== 'notes' && name !== 'comments';
  }) || bodies[0];

  const notesBody = bodies.find((b) => {
    const name = (b.getAttribute('name') || '').toLowerCase();
    return name === 'notes' || name === 'comments';
  });

  if (mainBody) {
    const topSections = Array.from(mainBody.children).filter(
      (c) => c.tagName.toLowerCase() === 'section'
    );

    if (topSections.length > 0) {
      topSections.forEach((sec) => {
        extractFb2Sections(sec, binaries, chapters);
      });
    } else {
      let bodyHtml = '';
      mainBody.childNodes.forEach((child) => {
        bodyHtml += convertFb2Node(child, binaries);
      });
      if (bodyHtml.trim()) {
        chapters.push({
          id: 'fb2-body-0',
          title: '',
          content: bodyHtml,
        });
      }
    }
  }

  // Handle footnotes / notes body if present
  if (notesBody) {
    let notesHtml = '';
    notesBody.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const noteId = el.getAttribute('id') || '';
        const converted = convertFb2Node(el, binaries);
        if (noteId) {
          notesHtml += `<div id="${noteId}" class="my-3 pt-2 border-t border-inherit/20">${converted}</div>`;
        } else {
          notesHtml += converted;
        }
      }
    });
    if (notesHtml.trim()) {
      chapters.push({
        id: 'fb2-notes',
        title: 'Примечания и сноски',
        content: notesHtml,
      });
    }
  }

  if (chapters.length === 0) {
    let fullHtml = '';
    doc.querySelectorAll('body p').forEach((p) => {
      fullHtml += convertFb2Node(p, binaries);
    });
    chapters.push({
      id: 'ch-0',
      title: '',
      content: fullHtml || '<p>Текст книги не содержит абзацев.</p>',
    });
  }

  return {
    id: `fb2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: bookTitle,
    author,
    format: 'fb2',
    coverUrl,
    description,
    totalPages: Math.max(1, Math.round(chapters.reduce((acc, c) => acc + c.content.length, 0) / 1200)),
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    genre,
    language: lang,
    chapters: normalizeChapterTitles(chapters),
  };
}

function normalizeZipPath(path: string): string {
  const clean = decodeURIComponent(path.trim().replace(/^['"]|['"]$/g, ''));
  const parts = clean.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function findZipFile(zip: JSZip, basePath: string, relativePath: string): JSZip.JSZipObject | null {
  const combined = basePath ? `${basePath.replace(/\/+$/, '')}/${relativePath}` : relativePath;
  const normalized = normalizeZipPath(combined);
  if (zip.file(normalized)) return zip.file(normalized);

  const cleanRel = normalizeZipPath(relativePath);
  if (zip.file(cleanRel)) return zip.file(cleanRel);

  const lowerNorm = normalized.toLowerCase();
  for (const [key, f] of Object.entries(zip.files)) {
    if (key.toLowerCase() === lowerNorm) return f;
  }

  const filename = cleanRel.split('/').pop()?.toLowerCase();
  if (filename) {
    for (const [key, f] of Object.entries(zip.files)) {
      if (key.split('/').pop()?.toLowerCase() === filename) return f;
    }
  }
  return null;
}

async function parseEpub(buffer: ArrayBuffer, defaultTitle: string, fileSize: string): Promise<Book> {
  const zip = await JSZip.loadAsync(buffer);

  const imageCache = new Map<string, string>();
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const lower = path.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(lower)) {
      try {
        const base64 = await zipEntry.async('base64');
        const mime = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.svg')
          ? 'image/svg+xml'
          : lower.endsWith('.webp')
          ? 'image/webp'
          : lower.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;
        imageCache.set(path, dataUrl);
        imageCache.set(lower, dataUrl);
        const filename = path.split('/').pop()?.toLowerCase();
        if (filename && !imageCache.has(filename)) {
          imageCache.set(filename, dataUrl);
        }
      } catch (e) {
        console.warn('Could not read image in EPUB:', path, e);
      }
    }
  }

  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  let opfPath = 'content.opf';
  if (containerXml) {
    const parser = new DOMParser();
    const cDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfile = cDoc.querySelector('rootfile');
    if (rootfile) {
      opfPath = rootfile.getAttribute('full-path') || 'content.opf';
    }
  }

  const opfFile = zip.file(opfPath) || zip.file(normalizeZipPath(opfPath));
  let opfText = '';
  if (opfFile) {
    opfText = await opfFile.async('text');
  } else {
    const anyOpf = Object.keys(zip.files).find((p) => p.endsWith('.opf'));
    if (anyOpf) {
      opfText = await zip.file(anyOpf)!.async('text');
      opfPath = anyOpf;
    }
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfText, 'application/xml');

  const titleEl = opfDoc.querySelector('metadata dc\\:title, metadata title') ||
                  opfDoc.getElementsByTagName('dc:title')[0] ||
                  opfDoc.getElementsByTagName('title')[0];
  const bookTitle = titleEl?.textContent?.trim() || defaultTitle;

  const creatorEl = opfDoc.querySelector('metadata dc\\:creator, metadata creator') ||
                    opfDoc.getElementsByTagName('dc:creator')[0] ||
                    opfDoc.getElementsByTagName('creator')[0];
  const author = creatorEl?.textContent?.trim() || 'Неизвестный автор';

  const descEl = opfDoc.querySelector('metadata dc\\:description, metadata description') ||
                 opfDoc.getElementsByTagName('dc:description')[0] ||
                 opfDoc.getElementsByTagName('description')[0];
  const description = descEl?.textContent?.trim() || '';

  const manifestItems: Record<string, { href: string; mediaType: string }> = {};
  opfDoc.querySelectorAll('manifest item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    if (id && href) {
      manifestItems[id] = { href: decodeURIComponent(href.trim()), mediaType };
    }
  });

  let coverUrl = '';
  let coverHref = '';
  const coverItem = Object.values(manifestItems).find(
    (item) => item.mediaType.startsWith('image/') && (item.href.toLowerCase().includes('cover') || item.mediaType.includes('cover'))
  );
  if (coverItem) {
    coverHref = coverItem.href;
  } else {
    const coverMeta = opfDoc.querySelector('metadata meta[name="cover"]');
    if (coverMeta) {
      const coverId = coverMeta.getAttribute('content');
      if (coverId && manifestItems[coverId]) {
        coverHref = manifestItems[coverId].href;
      }
    }
  }

  if (coverHref) {
    const resolvedPath = opfDir + coverHref;
    coverUrl = imageCache.get(resolvedPath) ||
               imageCache.get(resolvedPath.toLowerCase()) ||
               imageCache.get(coverHref.toLowerCase()) ||
               imageCache.get(coverHref.split('/').pop()?.toLowerCase() || '') || '';
  }

  if (!coverUrl) {
    for (const [key, dataUrl] of imageCache.entries()) {
      if (key.includes('cover')) {
        coverUrl = dataUrl;
        break;
      }
    }
  }

  const tocTitleByHref = new Map<string, string>();

  const ncxItem = Object.values(manifestItems).find(
    (item) => item.mediaType === 'application/x-dtbncx+xml' || item.href.toLowerCase().endsWith('.ncx')
  );
  if (ncxItem) {
    const ncxFile = findZipFile(zip, opfDir, ncxItem.href);
    if (ncxFile) {
      try {
        const ncxXml = await ncxFile.async('text');
        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
        const navPoints = ncxDoc.querySelectorAll('navPoint');
        navPoints.forEach((np) => {
          const text = np.querySelector('navLabel text')?.textContent?.trim();
          const src = np.querySelector('content')?.getAttribute('src');
          if (text && src) {
            const cleanSrc = decodeURIComponent(src.split('#')[0].trim());
            tocTitleByHref.set(cleanSrc.toLowerCase(), text);
            const fn = cleanSrc.split('/').pop()?.toLowerCase();
            if (fn) tocTitleByHref.set(fn, text);
          }
        });
      } catch (e) {
        console.warn('Could not parse NCX TOC', e);
      }
    }
  }

  const navItem = Object.values(manifestItems).find(
    (item) => item.mediaType === 'application/xhtml+xml' && (item.href.toLowerCase().includes('nav') || item.href.toLowerCase().includes('toc'))
  );
  if (navItem) {
    const navFile = findZipFile(zip, opfDir, navItem.href);
    if (navFile) {
      try {
        const navHtml = await navFile.async('text');
        const navDoc = parser.parseFromString(navHtml, 'text/html');
        const links = navDoc.querySelectorAll('nav a, ol a, ul a');
        links.forEach((a) => {
          const text = a.textContent?.trim();
          const href = a.getAttribute('href');
          if (text && href) {
            const cleanHref = decodeURIComponent(href.split('#')[0].trim());
            tocTitleByHref.set(cleanHref.toLowerCase(), text);
            const fn = cleanHref.split('/').pop()?.toLowerCase();
            if (fn) tocTitleByHref.set(fn, text);
          }
        });
      } catch (e) {
        console.warn('Could not parse NAV TOC', e);
      }
    }
  }

  const chapters: Chapter[] = [];
  const spineItems = opfDoc.querySelectorAll('spine itemref');

  for (let i = 0; i < spineItems.length; i++) {
    const idref = spineItems[i].getAttribute('idref');
    if (!idref || !manifestItems[idref]) continue;

    const href = manifestItems[idref].href;
    const fullPath = opfDir + href;
    const file = findZipFile(zip, opfDir, href);
    if (!file) continue;

    try {
      const chapterContent = await file.async('text');
      const { title: chTitle, html: cleanHtml, isCoverPage, coverDataUrl } = cleanAndExtractChapterHtml(
        chapterContent,
        fullPath,
        imageCache
      );

      if (coverDataUrl && !coverUrl) {
        coverUrl = coverDataUrl;
      }

      if (cleanHtml.length > 20) {
        const hrefFilename = href.split('/').pop()?.toLowerCase() || '';
        const tocTitle = tocTitleByHref.get(href.toLowerCase()) ||
                         tocTitleByHref.get(hrefFilename) ||
                         tocTitleByHref.get(fullPath.toLowerCase());

        let finalTitle = tocTitle || chTitle;
        if (!finalTitle || finalTitle.toLowerCase().includes('untitled') || finalTitle.toLowerCase() === 'cover') {
          finalTitle = isCoverPage ? 'Обложка' : '';
        }

        // Keep every valid spine item as its own chapter to avoid losing chapters!
        chapters.push({
          id: `epub-ch-${chapters.length + 1}`,
          title: finalTitle || '',
          content: cleanHtml,
        });
      }
    } catch (e) {
      console.warn('Error reading epub chapter', href, e);
    }
  }

  if (!coverUrl) {
    coverUrl = generateDefaultCover(bookTitle, author, 'epub');
  }

  if (chapters.length === 0) {
    chapters.push({
      id: 'epub-empty',
      title: 'Начало',
      content: '<p>Текст книги загружен.</p>',
    });
  }

  return {
    id: `epub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: bookTitle,
    author,
    format: 'epub',
    coverUrl,
    description,
    totalPages: Math.max(1, Math.round(chapters.reduce((acc, c) => acc + c.content.length, 0) / 1200)),
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    chapters: normalizeChapterTitles(chapters),
  };
}

function cleanAndExtractChapterHtml(
  rawXml: string,
  chapterPath: string,
  imageCache: Map<string, string>
): { title: string; html: string; isCoverPage: boolean; coverDataUrl?: string } {
  let clean = rawXml
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '');

  let chapterTitle = '';
  const titleTagMatch = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTagMatch && titleTagMatch[1].trim()) {
    chapterTitle = titleTagMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  clean = clean.replace(/<head[\s\S]*?<\/head>/gi, '');
  clean = clean
    .replace(/<\/\s*head>/gi, '')
    .replace(/<head[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : clean;

  bodyContent = bodyContent
    .replace(/<\/?\s*html[^>]*>/gi, '')
    .replace(/<\/?\s*body[^>]*>/gi, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${bodyContent}</div>`, 'text/html');
  const container = doc.body.firstElementChild || doc.body;

  const headingEl = container.querySelector('h1, h2, h3, h4, .title, .chapter-title, .chapter_title, .chapter-number');
  if (headingEl && headingEl.textContent?.trim()) {
    let headingText = headingEl.textContent.trim().replace(/\s+/g, ' ');
    if (/^(глава|chapter|часть|раздел)\.?$/i.test(headingText)) {
      const nextEl = headingEl.nextElementSibling;
      if (nextEl && nextEl.textContent?.trim()) {
        const nextText = nextEl.textContent.trim().replace(/\s+/g, ' ');
        if (/^\d+$/.test(nextText) || /^[IVXLCDM]+$/i.test(nextText) || nextText.length < 50) {
          headingText = `${headingText} ${nextText}`;
        }
      }
    }
    chapterTitle = headingText;
  }

  let isCoverPage = false;
  let coverDataUrl = '';

  container.querySelectorAll('*').forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (styleAttr) {
      const cleaned = styleAttr
        .replace(/(?:page-)?break-(?:before|after|inside)\s*:[^;]+;?/gi, '')
        .replace(/height\s*:\s*(?:100vh|100%|[^;]+);?/gi, '')
        .replace(/min-height\s*:\s*[^;]+;?/gi, '')
        .replace(/width\s*:\s*(?:100vw|[^;]+);?/gi, '');
      if (cleaned.trim()) {
        el.setAttribute('style', cleaned);
      } else {
        el.removeAttribute('style');
      }
    }
  });

  const svgs = container.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const svgImg = svg.querySelector('image');
    if (svgImg) {
      const rawSrc = svgImg.getAttribute('xlink:href') || svgImg.getAttribute('href') || svgImg.getAttribute('src');
      if (rawSrc) {
        const newImg = doc.createElement('img');
        newImg.setAttribute('src', rawSrc.trim());
        newImg.setAttribute('alt', 'Обложка');
        newImg.className = 'max-w-full h-auto mx-auto my-4 rounded-xl shadow-lg block object-contain';
        svg.parentNode?.replaceChild(newImg, svg);
      }
    }
  });

  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    const rawSrc = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href');
    if (rawSrc && !rawSrc.startsWith('data:') && !rawSrc.startsWith('http')) {
      const cleanSrc = decodeURIComponent(rawSrc.trim().replace(/^['"]|['"]$/g, ''));
      const resolved = resolveRelativePath(chapterPath, cleanSrc);
      const filename = cleanSrc.split('/').pop()?.toLowerCase() || '';

      const matchedDataUrl = imageCache.get(resolved) ||
                             imageCache.get(resolved.toLowerCase()) ||
                             imageCache.get(cleanSrc) ||
                             imageCache.get(cleanSrc.toLowerCase()) ||
                             imageCache.get(filename);

      if (matchedDataUrl) {
        img.setAttribute('src', matchedDataUrl);
        if (!coverDataUrl) {
          coverDataUrl = matchedDataUrl;
        }
      }
    }
    img.className = 'max-w-full h-auto mx-auto my-4 rounded-xl shadow-md block object-contain';
  });

  const anchors = container.querySelectorAll('a');
  anchors.forEach((a) => {
    const rawHref = a.getAttribute('href') || a.getAttribute('xlink:href') || '';
    if (rawHref.startsWith('javascript:')) {
      a.removeAttribute('href');
      a.removeAttribute('xlink:href');
      return;
    }
    const epubType = a.getAttribute('epub:type') || '';
    if (epubType.includes('noteref') || rawHref.startsWith('#')) {
      a.className = 'text-amber-500 hover:underline font-semibold text-xs align-super mx-0.5';
    } else if (/^https?:\/\//i.test(rawHref)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.className = 'text-amber-500 hover:underline';
    }
  });

  // Apply rich styling to headings, blockquotes, figures, tables in EPUB
  container.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
    const tag = h.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2') {
      h.className = 'text-xl font-bold my-4 text-center text-amber-600 dark:text-amber-400 break-words';
    } else {
      h.className = 'text-lg font-semibold my-3 text-center opacity-95 break-words';
    }
  });

  container.querySelectorAll('blockquote').forEach((bq) => {
    bq.className = 'cite my-4 pl-4 border-l-2 border-neutral-400 dark:border-neutral-600 italic opacity-95 space-y-1';
  });

  container.querySelectorAll('figure').forEach((fig) => {
    fig.className = 'book-illustration my-4 flex flex-col items-center';
  });

  container.querySelectorAll('figcaption').forEach((fc) => {
    fc.className = 'caption text-xs opacity-70 italic mt-1 text-center';
  });

  container.querySelectorAll('table').forEach((tbl) => {
    tbl.className = 'min-w-full border-collapse border border-neutral-300 dark:border-neutral-700 text-xs my-3';
  });

  container.querySelectorAll('p').forEach((p) => {
    if (!p.className) {
      p.className = 'my-2.5 indent-4 text-justify leading-relaxed';
    }
  });

  const textContent = container.textContent?.trim() || '';
  const imgCount = container.querySelectorAll('img').length;
  if (imgCount > 0 && textContent.length < 60 && (
    chapterPath.toLowerCase().includes('cover') ||
    chapterPath.toLowerCase().includes('title') ||
    (titleTagMatch && titleTagMatch[1].toLowerCase().includes('cover'))
  )) {
    isCoverPage = true;
    if (!chapterTitle) chapterTitle = 'Обложка';
  }

  const sanitizedHtml = container.innerHTML
    .replace(/<\/?\s*(html|head|body|meta|link)[^>]*>/gi, '')
    .trim();

  return {
    title: chapterTitle.trim(),
    html: sanitizedHtml,
    isCoverPage,
    coverDataUrl,
  };
}

function resolveRelativePath(basePath: string, relativePath: string): string {
  const cleanRelative = decodeURIComponent(relativePath.trim().replace(/^['"]|['"]$/g, ''));
  if (cleanRelative.startsWith('/')) {
    return cleanRelative.substring(1);
  }
  const stack = basePath.split('/');
  stack.pop();
  const parts = cleanRelative.split('/');
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function formatBookTypography(text: string): string {
  return text
    // Replace three dots with real ellipsis
    .replace(/\.{3}/g, '…')
    // Replace dialogue hyphens with typographic em-dashes
    .replace(/(^|[\r\n])\s*[-–—]\s+/g, '$1— ')
    // Russian quotation marks: opening and closing
    .replace(/"([^"]+)"/g, '«$1»')
    // Replace spaced hyphens with en-dashes
    .replace(/\s+-\s+/g, ' — ');
}

function parseTxt(text: string, defaultTitle: string, fileSize: string): Book {
  const formattedText = formatBookTypography(text);
  const lines = formattedText.split(/\r?\n/);
  const chapters: Chapter[] = [];

  // Patterns for chapter headers:
  // "Глава 1", "ГЛАВА I", "Chapter 5", "Часть 2", "Раздел III", "Том 1", "Книга первая"
  // Named sections: "ПРОЛОГ", "ЭПИЛОГ", "ВВЕДЕНИЕ", "ПРЕДИСЛОВИЕ", "ЗАКЛЮЧЕНИЕ", "ОТ АВТОРА", "СОДЕРЖАНИЕ"
  // Standalone Roman numerals: "I", "II", "III", "IV"...
  // Numbered lines: "1.", "2."
  const chapterPattern = /^(?:Глава|ГЛАВА|Chapter|CHAPTER|Часть|ЧАСТЬ|Раздел|РАЗДЕЛ|Том|ТОМ|Книга|КНИГА|Акт|Сцена)\s+([0-9IVXLCDM]+|[А-ЯA-Z]+[a-zа-я]*)(?:\.|\s*[-:—–]\s*.*)?$/i;
  const namedSectionPattern = /^(?:ПРОЛОГ|ЭПИЛОГ|ВВЕДЕНИЕ|ПРЕДИСЛОВИЕ|ЗАКЛЮЧЕНИЕ|ОТ АВТОРА|ПОСЛЕСЛОВИЕ|СОДЕРЖАНИЕ|PROLOGUE|EPILOGUE|PREFACE|INTRODUCTION)$/i;
  const romanNumeralPattern = /^(?:[IVXLCDM]{1,8})(?:\.|\s*[-:—–]\s*.*)?$/;
  const sceneBreakPattern = /^(?:\*\s*\*\s*\*|\*{3,}|—\s*—\s*—|-{3,}|~{3,})$/;

  const headerIndices: Array<{ lineIndex: number; title: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length > 90) continue;

    if (chapterPattern.test(line) || namedSectionPattern.test(line)) {
      headerIndices.push({ lineIndex: i, title: line });
    } else if (romanNumeralPattern.test(line)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
      // Only treat Roman numeral as chapter if surrounded by empty or short lines
      if (!prevLine && nextLine) {
        headerIndices.push({ lineIndex: i, title: `Глава ${line}` });
      }
    }
  }

  const formatParagraphs = (rawLines: string[]): string => {
    const paras: string[] = [];
    let currentPara: string[] = [];

    for (const l of rawLines) {
      const trimmed = l.trim();
      if (!trimmed) {
        if (currentPara.length > 0) {
          paras.push(currentPara.join(' '));
          currentPara = [];
        }
        continue;
      }

      if (sceneBreakPattern.test(trimmed)) {
        if (currentPara.length > 0) {
          paras.push(currentPara.join(' '));
          currentPara = [];
        }
        paras.push('<div class="scene-break my-6 text-center text-amber-500/70 text-sm tracking-widest select-none">✦ ✦ ✦</div>');
        continue;
      }

      // Check for dialogue dash at start of line
      if (trimmed.startsWith('—') || trimmed.startsWith('–') || trimmed.startsWith('-')) {
        if (currentPara.length > 0) {
          paras.push(currentPara.join(' '));
          currentPara = [];
        }
      }

      currentPara.push(trimmed);
    }

    if (currentPara.length > 0) {
      paras.push(currentPara.join(' '));
    }

    return paras
      .map((p) => {
        if (p.startsWith('<div class="scene-break"')) return p;
        const isDialogue = p.startsWith('—');
        return `<p class="my-2.5 indent-4 text-justify leading-relaxed ${isDialogue ? 'dialogue-line pl-1 font-normal' : ''}">${escapeHtml(p)}</p>`;
      })
      .join('');
  };

  if (headerIndices.length >= 2) {
    for (let h = 0; h < headerIndices.length; h++) {
      const header = headerIndices[h];
      if (h === 0 && header.lineIndex > 0) {
        const preLines = lines.slice(0, header.lineIndex);
        const preContent = formatParagraphs(preLines);
        if (preContent.trim()) {
          chapters.push({
            id: `txt-ch-0`,
            title: 'Предисловие',
            content: preContent,
          });
        }
      }

      const nextHeader = headerIndices[h + 1];
      const endLine = nextHeader ? nextHeader.lineIndex : lines.length;
      const chLines = lines.slice(header.lineIndex + 1, endLine);
      const chContent = formatParagraphs(chLines);

      chapters.push({
        id: `txt-ch-${chapters.length + 1}`,
        title: header.title,
        content: `
          <h2 class="text-xl font-bold my-4 text-center text-amber-600 dark:text-amber-400 break-words">${escapeHtml(header.title)}</h2>
          ${chContent}
        `,
      });
    }
  }

  // Fallback: If no explicit chapter headers detected, chunk long text logically every ~25k characters
  if (chapters.length === 0) {
    const CHUNK_SIZE = 24000;
    if (formattedText.length > CHUNK_SIZE * 1.3) {
      let cursor = 0;
      let partNum = 1;

      while (cursor < formattedText.length) {
        let nextCursor = cursor + CHUNK_SIZE;
        if (nextCursor >= formattedText.length) {
          nextCursor = formattedText.length;
        } else {
          // Find natural paragraph break near nextCursor
          const searchWindow = formattedText.substring(nextCursor - 3000, nextCursor + 3000);
          const breakMatch = searchWindow.match(/\r?\n\r?\n/);
          if (breakMatch && breakMatch.index !== undefined) {
            nextCursor = nextCursor - 3000 + breakMatch.index + breakMatch[0].length;
          }
        }

        const chunkText = formattedText.substring(cursor, nextCursor);
        const chunkLines = chunkText.split(/\r?\n/);
        const content = formatParagraphs(chunkLines);

        chapters.push({
          id: `txt-part-${partNum}`,
          title: `Часть ${partNum}`,
          content: `
            <h2 class="text-xl font-bold my-4 text-center text-amber-600 dark:text-amber-400 break-words">Часть ${partNum}</h2>
            ${content}
          `,
        });

        cursor = nextCursor;
        partNum++;
      }
    } else {
      const content = formatParagraphs(lines);
      chapters.push({
        id: 'txt-ch-1',
        title: defaultTitle,
        content: content || `<p class="my-2.5 indent-4">${escapeHtml(formattedText)}</p>`,
      });
    }
  }

  return {
    id: `txt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: defaultTitle,
    author: 'Автор неизвестен',
    format: 'txt',
    coverUrl: generateDefaultCover(defaultTitle, 'Текстовая книга', 'txt'),
    description: `Файл формата TXT (${fileSize}). Главы и абзацы сформированы автоматически.`,
    totalPages: Math.max(1, Math.round(text.length / 1200)),
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    chapters,
  };
}

function parseMarkdown(mdText: string, defaultTitle: string, fileSize: string): Book {
  const formattedMd = formatBookTypography(mdText);

  // Split markdown by top-level headers (# or ##) to create real book chapters
  const sections = formattedMd.split(/\n(?=#{1,2}\s)/);
  const chapters: Chapter[] = [];

  const renderMarkdownBlock = (block: string): string => {
    let text = block.trim();
    if (!text) return '';

    // Headings
    if (/^#\s+/.test(text)) {
      return `<h2 class="text-2xl font-bold my-5 text-center text-amber-600 dark:text-amber-400 break-words">${renderInlineMarkdown(text.replace(/^#\s+/, ''))}</h2>`;
    }
    if (/^##\s+/.test(text)) {
      return `<h3 class="text-xl font-bold my-4 text-center text-amber-500 dark:text-amber-300 break-words">${renderInlineMarkdown(text.replace(/^##\s+/, ''))}</h3>`;
    }
    if (/^###\s+/.test(text)) {
      return `<h4 class="text-lg font-semibold my-3 opacity-95">${renderInlineMarkdown(text.replace(/^###\s+/, ''))}</h4>`;
    }
    if (/^####\s+/.test(text)) {
      return `<h5 class="text-base font-semibold my-2 opacity-90">${renderInlineMarkdown(text.replace(/^####\s+/, ''))}</h5>`;
    }

    // Horizontal Rule
    if (/^(?:---|\*\*\*|___)$/.test(text)) {
      return '<div class="scene-break my-6 text-center text-amber-500/70 text-sm tracking-widest select-none">✦ ✦ ✦</div>';
    }

    // Fenced Code Block
    if (text.startsWith('```')) {
      const lines = text.split('\n');
      const lang = lines[0].replace(/^```/, '').trim();
      const code = lines.slice(1, lines[lines.length - 1].startsWith('```') ? -1 : undefined).join('\n');
      return `
        <div class="my-4 rounded-xl overflow-hidden border border-neutral-700/60 bg-neutral-900/90 shadow-md">
          ${lang ? `<div class="px-3 py-1 bg-neutral-800/80 text-[10px] font-mono text-amber-400/90 uppercase">${escapeHtml(lang)}</div>` : ''}
          <pre class="p-3 text-xs font-mono overflow-x-auto text-neutral-100 leading-relaxed"><code>${escapeHtml(code)}</code></pre>
        </div>
      `;
    }

    // Blockquote
    if (text.startsWith('>')) {
      const quoteText = text
        .split('\n')
        .map((l) => l.replace(/^>\s?/, ''))
        .join(' ');
      return `<blockquote class="cite my-4 pl-4 border-l-3 border-amber-500/60 italic text-sm opacity-95 space-y-1">${renderInlineMarkdown(quoteText)}</blockquote>`;
    }

    // Unordered List
    if (/^[-*+]\s+/.test(text)) {
      const items = text.split('\n').filter((l) => /^[-*+]\s+/.test(l.trim()));
      const itemsHtml = items
        .map((item) => `<li class="my-1.5 leading-relaxed">${renderInlineMarkdown(item.trim().replace(/^[-*+]\s+/, ''))}</li>`)
        .join('');
      return `<ul class="list-disc list-inside my-3 space-y-1 pl-2 opacity-95">${itemsHtml}</ul>`;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(text)) {
      const items = text.split('\n').filter((l) => /^\d+\.\s+/.test(l.trim()));
      const itemsHtml = items
        .map((item) => `<li class="my-1.5 leading-relaxed">${renderInlineMarkdown(item.trim().replace(/^\d+\.\s+/, ''))}</li>`)
        .join('');
      return `<ol class="list-decimal list-inside my-3 space-y-1 pl-2 opacity-95">${itemsHtml}</ol>`;
    }

    // Table
    if (text.includes('|') && text.split('\n').length >= 2) {
      const lines = text.split('\n').filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
      if (lines.length >= 2) {
        let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-neutral-700/60 text-xs text-left">';
        lines.forEach((line, rIdx) => {
          if (line.includes('---')) return; // separator
          const cells = line.split('|').slice(1, -1);
          tableHtml += '<tr class="border-b border-neutral-700/40">';
          cells.forEach((cell) => {
            const tag = rIdx === 0 ? 'th' : 'td';
            const cText = renderInlineMarkdown(cell.trim());
            tableHtml += `<${tag} class="p-2 border border-neutral-700/40 ${rIdx === 0 ? 'font-bold bg-black/10 dark:bg-white/10' : ''}">${cText}</${tag}>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        return tableHtml;
      }
    }

    // Default Paragraph
    const isDialogue = text.startsWith('—');
    return `<p class="my-2.5 indent-4 text-justify leading-relaxed ${isDialogue ? 'dialogue-line pl-1 font-normal' : ''}">${renderInlineMarkdown(text)}</p>`;
  };

  const renderInlineMarkdown = (inlineText: string): string => {
    let res = escapeHtml(inlineText);

    // Images: ![alt](url)
    res = res.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      return `<div class="book-illustration my-4 text-center"><img src="${url}" alt="${alt}" class="max-w-full max-h-96 mx-auto rounded-xl shadow-md block object-contain" />${alt ? `<span class="caption block text-xs opacity-60 mt-1 italic">${alt}</span>` : ''}</div>`;
    });

    // Links: [title](url)
    res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, title, url) => {
      const isInternal = url.startsWith('#');
      return `<a href="${url}" class="text-amber-500 hover:underline font-semibold mx-0.5" ${isInternal ? '' : 'target="_blank" rel="noopener noreferrer"'}>${title}</a>`;
    });

    // Bold + Italic: ***text***
    res = res.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold: **text** or __text__
    res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    res = res.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    res = res.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // Inline Code: `code`
    res = res.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs text-amber-500 dark:text-amber-300">$1</code>');

    // Footnote marker: [^1]
    res = res.replace(/\[\^(\w+)\]/g, '<sup class="text-amber-500 font-bold mx-0.5 text-[10px]">[$1]</sup>');

    return res;
  };

  sections.forEach((sec, idx) => {
    const trimmed = sec.trim();
    if (!trimmed) return;

    const firstLine = trimmed.split('\n')[0].replace(/^#{1,3}\s*/, '').trim();
    const chapterTitle = firstLine || `Глава ${idx + 1}`;

    const blocks = trimmed.split(/\n\r?\n+/);
    const html = blocks.map(renderMarkdownBlock).join('');

    chapters.push({
      id: `md-ch-${idx + 1}`,
      title: chapterTitle,
      content: html,
    });
  });

  return {
    id: `md-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: defaultTitle,
    author: 'Markdown Book',
    format: 'md',
    coverUrl: generateDefaultCover(defaultTitle, 'Markdown Note', 'md'),
    description: `Книга в формате Markdown (${fileSize}). Поддерживает расширенную типографику, таблицы, списки и формулы.`,
    totalPages: Math.max(1, Math.round(mdText.length / 1000)),
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    chapters: chapters.length > 0 ? chapters : [{ id: 'md-0', title: defaultTitle, content: `<p class="indent-4">${escapeHtml(formattedMd)}</p>` }],
  };
}

async function parsePdf(buffer: ArrayBuffer, defaultTitle: string, fileSize: string): Promise<Book> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let bookTitle = defaultTitle;
  let author = 'Документ PDF';
  try {
    const metadata = await pdfDoc.getMetadata();
    if (metadata?.info) {
      const info = metadata.info as any;
      if (info.Title && typeof info.Title === 'string' && info.Title.trim()) {
        bookTitle = info.Title.trim();
      }
      if (info.Author && typeof info.Author === 'string' && info.Author.trim()) {
        author = info.Author.trim();
      }
    }
  } catch {
    // metadata is optional
  }

  // Generate cover from page 1 rendered to canvas
  let coverUrl = '';
  try {
    const page1 = await pdfDoc.getPage(1);
    const viewport = page1.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const targetWidth = 400;
    const scale = targetWidth / Math.max(viewport.width, 1);
    const scaledViewport = page1.getViewport({ scale });
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const context = canvas.getContext('2d');
    if (context) {
      // @ts-ignore
      await page1.render({ canvasContext: context, viewport: scaledViewport }).promise;
      coverUrl = canvas.toDataURL('image/jpeg', 0.85);
    }
  } catch (err) {
    console.warn('Could not render PDF cover canvas:', err);
  }
  if (!coverUrl) {
    coverUrl = generateDefaultCover(bookTitle, author, 'pdf');
  }

  // Extract PDF Outlines (True Table of Contents)
  interface OutlineNode {
    title: string;
    pageIndex: number;
  }
  const outlineList: OutlineNode[] = [];

  try {
    const rawOutline = await pdfDoc.getOutline();
    if (rawOutline && Array.isArray(rawOutline) && rawOutline.length > 0) {
      const processItems = async (items: any[]) => {
        for (const item of items) {
          if (item.title && item.dest) {
            try {
              let dest = item.dest;
              if (typeof dest === 'string') {
                dest = await pdfDoc.getDestination(dest);
              }
              if (Array.isArray(dest) && dest[0]) {
                const pageRef = dest[0];
                const pageIdx = await pdfDoc.getPageIndex(pageRef);
                if (typeof pageIdx === 'number' && pageIdx >= 0) {
                  outlineList.push({
                    title: item.title.trim(),
                    pageIndex: pageIdx + 1,
                  });
                }
              }
            } catch {
              // ignore invalid dest
            }
          }
          if (item.items && Array.isArray(item.items)) {
            await processItems(item.items);
          }
        }
      };
      await processItems(rawOutline);
    }
  } catch (e) {
    console.debug('No outline found in PDF', e);
  }

  // Helper to extract clean text from a single page with line & paragraph reconstruction
  const extractPageContent = async (pageNum: number): Promise<{ html: string; hasImages: boolean }> => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      if (!textContent.items || textContent.items.length === 0) {
        // Page has no text layer: render as high-fidelity image for scanned books
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // @ts-ignore
          await page.render({ canvasContext: ctx, viewport }).promise;
          const imgData = canvas.toDataURL('image/jpeg', 0.82);
          return {
            html: `<div class="pdf-scanned-page my-3 text-center"><img src="${imgData}" class="max-w-full max-h-[85vh] mx-auto rounded-lg shadow-md object-contain" alt="Страница ${pageNum}" /></div>`,
            hasImages: true,
          };
        }
      }

      // Group text items by Y coordinate to reconstruct true paragraphs
      interface LineItem {
        text: string;
        x: number;
        y: number;
        fontSize: number;
      }
      const linesByY: Map<number, LineItem[]> = new Map();

      for (const item of textContent.items) {
        if ('str' in item && typeof (item as any).str === 'string') {
          const str = (item as any).str;
          if (!str.trim()) continue;
          const transform = (item as any).transform || [12, 0, 0, 12, 0, 0];
          const x = transform[4];
          const y = Math.round(transform[5] / 4) * 4; // snap to 4px tolerance
          const fontSize = Math.abs(transform[0]) || 12;

          if (!linesByY.has(y)) {
            linesByY.set(y, []);
          }
          linesByY.get(y)!.push({ text: str, x, y, fontSize });
        }
      }

      // Sort by Y descending (PDF coordinates origin is bottom-left)
      const sortedYs = Array.from(linesByY.keys()).sort((a, b) => b - a);
      const reconstructedLines: Array<{ text: string; fontSize: number }> = [];

      for (const y of sortedYs) {
        const row = linesByY.get(y)!;
        row.sort((a, b) => a.x - b.x);
        const rowText = row.map((r) => r.text).join(' ').trim();
        const avgFontSize = row.reduce((acc, r) => acc + r.fontSize, 0) / row.length;
        if (rowText) {
          reconstructedLines.push({ text: rowText, fontSize: avgFontSize });
        }
      }

      // Join lines into paragraphs, de-hyphenating line breaks (e.g. "инфор-\nмация" -> "информация")
      let pageHtml = '';
      let currentParagraph = '';
      let baseFontSize = 12;
      if (reconstructedLines.length > 0) {
        baseFontSize = reconstructedLines[Math.floor(reconstructedLines.length / 2)].fontSize;
      }

      for (let i = 0; i < reconstructedLines.length; i++) {
        const line = reconstructedLines[i];
        let t = line.text;

        // Skip standalone page numbers or headers
        if (t === `${pageNum}` && (i === 0 || i === reconstructedLines.length - 1)) {
          continue;
        }

        // Detect prominent heading
        if (line.fontSize >= baseFontSize * 1.35 && t.length < 80) {
          if (currentParagraph) {
            pageHtml += `<p class="my-2.5 indent-4 text-justify leading-relaxed">${escapeHtml(currentParagraph)}</p>`;
            currentParagraph = '';
          }
          pageHtml += `<h3 class="text-lg font-bold my-3 text-amber-600 dark:text-amber-400">${escapeHtml(t)}</h3>`;
          continue;
        }

        // De-hyphenation: if line ends with hyphen, attach next line without space
        if (t.endsWith('-') || t.endsWith('—')) {
          currentParagraph += (currentParagraph ? ' ' : '') + t.slice(0, -1);
        } else {
          currentParagraph += (currentParagraph ? ' ' : '') + t;
          // If paragraph ended with period or exclamation, or big gap to next line
          if (/[.!?…]$/.test(t) || i === reconstructedLines.length - 1) {
            pageHtml += `<p class="my-2.5 indent-4 text-justify leading-relaxed">${escapeHtml(currentParagraph)}</p>`;
            currentParagraph = '';
          }
        }
      }

      if (currentParagraph.trim()) {
        pageHtml += `<p class="my-2.5 indent-4 text-justify leading-relaxed">${escapeHtml(currentParagraph)}</p>`;
      }

      return { html: pageHtml, hasImages: false };
    } catch (err) {
      console.warn(`Error reading page ${pageNum}`, err);
      return { html: `<p class="my-3 opacity-60 italic text-center">[Страница ${pageNum}]</p>`, hasImages: false };
    }
  };

  const chapters: Chapter[] = [];
  const maxPagesToLoad = Math.min(numPages, 400);

  // If Outline exists and has multiple distinct sections, construct chapters by outline!
  if (outlineList.length >= 2) {
    const sortedOutline = [...outlineList].sort((a, b) => a.pageIndex - b.pageIndex);
    for (let o = 0; o < sortedOutline.length; o++) {
      const current = sortedOutline[o];
      const next = sortedOutline[o + 1];
      const startP = current.pageIndex;
      const endP = next ? Math.min(next.pageIndex - 1, maxPagesToLoad) : maxPagesToLoad;

      if (startP > maxPagesToLoad) break;

      let chapterHtml = `<h2 class="text-xl font-bold my-4 text-center text-amber-600 dark:text-amber-400 break-words">${escapeHtml(current.title)}</h2>`;
      for (let p = startP; p <= endP; p++) {
        const { html } = await extractPageContent(p);
        chapterHtml += `
          <div class="pdf-page-block mb-4 pb-2">
            <div class="text-[10px] font-mono opacity-40 mb-1 tracking-wider uppercase">Страница ${p}</div>
            ${html}
          </div>
        `;
      }

      chapters.push({
        id: `pdf-ch-${chapters.length + 1}`,
        title: current.title,
        content: chapterHtml,
      });
    }
  }

  // Fallback: chunk by 5 pages
  if (chapters.length === 0) {
    const pagesPerChapter = 5;
    let currentChapterPagesHtml = '';
    let chapterStartPage = 1;

    for (let pageNum = 1; pageNum <= maxPagesToLoad; pageNum++) {
      const { html } = await extractPageContent(pageNum);
      currentChapterPagesHtml += `
        <div class="pdf-page-block mb-4 pb-2">
          <div class="text-[10px] font-mono opacity-40 mb-1 tracking-wider uppercase">Страница ${pageNum}</div>
          ${html}
        </div>
      `;

      if (pageNum % pagesPerChapter === 0 || pageNum === maxPagesToLoad) {
        chapters.push({
          id: `pdf-ch-${chapters.length + 1}`,
          title: `Страницы ${chapterStartPage}–${pageNum}`,
          content: currentChapterPagesHtml,
        });
        currentChapterPagesHtml = '';
        chapterStartPage = pageNum + 1;
      }
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      id: 'pdf-empty',
      title: defaultTitle,
      content: '<p>Не удалось извлечь содержимое PDF.</p>',
    });
  }

  return {
    id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: bookTitle,
    author,
    format: 'pdf',
    coverUrl,
    description: `PDF документ: ${numPages} стр. (${fileSize}). Поддерживает оглавление и текстовый слой.`,
    totalPages: numPages,
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    chapters,
  };
}

async function createCrispCoverThumbnail(file: JSZip.JSZipObject): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const blob = await file.async('blob');
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800; // 800px provides crisp 2x retina clarity on Pixel 8a and Pixel 10 without pixelation
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            URL.revokeObjectURL(url);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Canvas error fallback
        }
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    });
  } catch (err) {
    console.warn('Cover thumbnail generation failed', err);
    return '';
  }
}

async function parseCbz(source: File | Blob | ArrayBuffer, defaultTitle: string, fileSize: string): Promise<Book> {
  const zip = await JSZip.loadAsync(source);
  const imageNames = Object.keys(zip.files)
    .filter((name) => /\.(jpe?g|png|webp|gif|avif)$/i.test(name) && !name.startsWith('__MACOSX') && !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const bookId = `cbz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let coverUrl = '';

  // Extract ONLY the first page for the cover in crisp high quality
  if (imageNames.length > 0) {
    const firstFile = zip.file(imageNames[0]);
    if (firstFile) {
      coverUrl = await createCrispCoverThumbnail(firstFile);
      if (!coverUrl) {
        try {
          const mime = imageNames[0].toLowerCase().endsWith('.png')
            ? 'image/png'
            : imageNames[0].toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
          const base64 = await firstFile.async('base64');
          coverUrl = `data:${mime};base64,${base64}`;
        } catch {}
      }
    }
  }

  if (!coverUrl) {
    coverUrl = generateDefaultCover(defaultTitle, 'Комикс / Манга', 'cbz');
  }

  // Chapters store page titles and entry filenames inside archive (memory-safe, < 10KB total!)
  const chapters: Chapter[] = imageNames.map((name, i) => ({
    id: `cbz-page-${i}`,
    title: `Страница ${i + 1}`,
    content: name,
  }));

  // Store raw archive in IndexedDB comic_archives store (off-heap)
  try {
    const { saveComicArchive } = await import('./storage');
    const archiveBlob = source instanceof Blob ? source : new Blob([source], { type: 'application/x-cbz' });
    await saveComicArchive(bookId, archiveBlob);
  } catch (err) {
    console.warn('Failed to store comic archive blob', err);
  }

  return {
    id: bookId,
    title: defaultTitle,
    author: 'Графический роман',
    format: 'cbz',
    coverUrl,
    description: `Комикс CBZ: ${chapters.length} страниц.`,
    totalPages: chapters.length,
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    chapters,
  };
}

async function parseGenericText(file: File, defaultTitle: string, format: BookFormat, fileSize: string): Promise<Book> {
  let content = '<p>Документ загружен. Формат: ' + format.toUpperCase() + '</p>';
  try {
    const text = await file.text();
    if (text && text.trim()) {
      content = text.substring(0, 50000).split(/\r?\n\r?\n/).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    }
  } catch {
  }

  return {
    id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: defaultTitle,
    author: 'Пользовательский файл',
    format,
    coverUrl: generateDefaultCover(defaultTitle, format.toUpperCase(), format),
    description: `Файл ${file.name} (${fileSize})`,
    totalPages: 20,
    currentChapterIndex: 0,
    currentScrollPercent: 0,
    progressPercent: 0,
    lastReadTimestamp: Date.now(),
    fileSize,
    chapters: [
      {
        id: 'generic-ch-1',
        title: defaultTitle,
        content,
      },
    ],
  };
}

export function normalizeChapterTitles(chapters: Chapter[]): Chapter[] {
  if (!chapters || chapters.length === 0) {
    return [{ id: 'ch-1', title: '', content: '<p>Текст книги не найден.</p>' }];
  }

  // Preserve valid chapter divisions from EPUB, PDF, FB2, TXT, MD
  return chapters.map((ch, idx) => {
    let t = (ch.title || '').trim().replace(/\s+/g, ' ');
    if (!t) {
      t = `Глава ${idx + 1}`;
    }
    return {
      ...ch,
      title: t,
    };
  });
}
