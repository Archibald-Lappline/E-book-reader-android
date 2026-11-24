import { Note } from '../types';

export const COLOR_NAMES_RU: Record<string, string> = {
  yellow: 'Жёлтый',
  green: 'Зелёный',
  blue: 'Голубой',
  pink: 'Розовый',
  purple: 'Фиолетовый',
};

interface TextNodeEntry {
  node: Text;
  start: number;
  end: number;
}

/**
 * Finds best match index in fullText using prefix/suffix context, exact matching,
 * and robust multi-paragraph whitespace-flexible token matching.
 */
function findBestMatch(
  fullText: string,
  search: string,
  prefix?: string,
  suffix?: string,
  charIndexHint?: number
): { start: number; len: number } | null {
  if (!search) return null;

  // 1. High confidence: Prefix + Search + Suffix
  if (prefix && suffix) {
    const pTrim = prefix.slice(-24);
    const sTrim = suffix.slice(0, 24);
    const pattern = pTrim + search + sTrim;
    const idx = fullText.indexOf(pattern);
    if (idx !== -1) {
      return { start: idx + pTrim.length, len: search.length };
    }
  }

  // 2. Prefix + Search
  if (prefix) {
    const pTrim = prefix.slice(-20);
    const pattern = pTrim + search;
    const idx = fullText.indexOf(pattern);
    if (idx !== -1) {
      return { start: idx + pTrim.length, len: search.length };
    }
  }

  // 3. Search + Suffix
  if (suffix) {
    const sTrim = suffix.slice(0, 20);
    const pattern = search + sTrim;
    const idx = fullText.indexOf(pattern);
    if (idx !== -1) {
      return { start: idx, len: search.length };
    }
  }

  // 4. Exact occurrences of search
  const occurrences: number[] = [];
  let pos = 0;
  while ((pos = fullText.indexOf(search, pos)) !== -1) {
    occurrences.push(pos);
    pos += Math.max(1, search.length);
  }

  if (occurrences.length === 1) {
    return { start: occurrences[0], len: search.length };
  }

  if (occurrences.length > 1) {
    if (typeof charIndexHint === 'number' && charIndexHint >= 0) {
      let bestIdx = occurrences[0];
      let bestDist = Math.abs(occurrences[0] - charIndexHint);
      for (let i = 1; i < occurrences.length; i++) {
        const dist = Math.abs(occurrences[i] - charIndexHint);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = occurrences[i];
        }
      }
      return { start: bestIdx, len: search.length };
    }
    return { start: occurrences[0], len: search.length };
  }

  // 5. Multi-paragraph and flexible whitespace token matching
  const tokens = search
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length > 0) {
    const escapedTokens = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Between tokens, match any whitespace / newlines
    const patternStr = escapedTokens.join('[\\s\\n\\r\\u00A0\\u200B]+');
    try {
      const rx = new RegExp(patternStr, 'gi');
      const matches: Array<{ start: number; len: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = rx.exec(fullText)) !== null) {
        matches.push({ start: m.index, len: m[0].length });
      }

      if (matches.length === 1) {
        return matches[0];
      }
      if (matches.length > 1) {
        if (typeof charIndexHint === 'number' && charIndexHint >= 0) {
          let best = matches[0];
          let bestDist = Math.abs(matches[0].start - charIndexHint);
          for (let i = 1; i < matches.length; i++) {
            const dist = Math.abs(matches[i].start - charIndexHint);
            if (dist < bestDist) {
              bestDist = dist;
              best = matches[i];
            }
          }
          return best;
        }
        return matches[0];
      }
    } catch {
      // Regex fallback failed
    }
  }

  return null;
}

/**
 * Safely wraps a character slice inside a single text node with a <mark> element.
 */
function wrapTextNodeSlice(
  doc: Document,
  textNode: Text,
  startOffset: number,
  endOffset: number,
  note: Note
): Text | null {
  const text = textNode.nodeValue || '';
  if (startOffset < 0 || endOffset > text.length || startOffset >= endOffset) {
    return null;
  }

  // 1. Split end first if not at boundary
  let middleNode = textNode;
  if (endOffset < text.length) {
    middleNode.splitText(endOffset);
  }

  // 2. Split start
  if (startOffset > 0) {
    middleNode = middleNode.splitText(startOffset);
  }

  // 3. Wrap middleNode with mark
  const parent = middleNode.parentNode;
  if (!parent) return null;

  const mark = doc.createElement('mark');
  mark.className = `reader-highlight reader-highlight-${note.color}`;
  mark.setAttribute('data-note-id', note.id);
  mark.setAttribute(
    'title',
    note.noteText ? `Заметка: ${note.noteText}` : 'Выделенная цитата'
  );

  parent.replaceChild(mark, middleNode);
  mark.appendChild(middleNode);

  return middleNode;
}

export function applyHighlightsToHtml(rawHtml: string, chapterNotes: Note[]): string {
  if (!chapterNotes || chapterNotes.length === 0 || !rawHtml) {
    return rawHtml;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;

    // Apply notes in reverse chronological order or by selection length
    const sorted = [...chapterNotes].sort((a, b) => {
      // If charIndexInChapter is known, sort from end to beginning to avoid offset invalidation
      if (typeof a.charIndexInChapter === 'number' && typeof b.charIndexInChapter === 'number') {
        return b.charIndexInChapter - a.charIndexInChapter;
      }
      return b.selectedText.length - a.selectedText.length;
    });

    for (const note of sorted) {
      const search = note.selectedText.trim();
      if (!search || search.length < 2) continue;

      const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (node.parentElement?.closest('mark.reader-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const textNodes: Text[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) {
        textNodes.push(n as Text);
      }

      let fullText = '';
      const nodeMap: TextNodeEntry[] = [];
      let prevBlockEl: Element | null = null;

      const isBlockTag = (tagName: string) => {
        return [
          'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'li', 'blockquote', 'article', 'section', 'header',
          'footer', 'tr', 'pre', 'br',
          'v', 'stanza', 'poem', 'cite', 'epigraph', 'annotation', 'subtitle', 'title', 'dt', 'dd'
        ].includes(tagName);
      };

      const getNearestBlock = (node: Node): Element | null => {
        let cur = node.parentElement;
        while (cur && cur !== container) {
          if (isBlockTag(cur.tagName.toLowerCase())) return cur;
          cur = cur.parentElement;
        }
        return null;
      };

      for (const tNode of textNodes) {
        const val = tNode.nodeValue || '';
        const currentBlock = getNearestBlock(tNode);
        if (prevBlockEl && currentBlock && prevBlockEl !== currentBlock) {
          // Add virtual newline between separate block elements so search matches multiline selection
          fullText += '\n\n';
        }
        prevBlockEl = currentBlock;

        nodeMap.push({
          node: tNode,
          start: fullText.length,
          end: fullText.length + val.length,
        });
        fullText += val;
      }

      const match = findBestMatch(
        fullText,
        search,
        note.prefixContext,
        note.suffixContext,
        note.charIndexInChapter
      );

      if (!match) continue;

      const matchStart = match.start;
      const matchEnd = match.start + match.len;

      // Find all text node entries overlapping with [matchStart, matchEnd]
      const overlappingNodes = nodeMap.filter(
        (entry) => entry.end > matchStart && entry.start < matchEnd
      );

      if (overlappingNodes.length === 0) continue;

      // Wrap in reverse order so splitting doesn't alter preceding text nodes
      for (let i = overlappingNodes.length - 1; i >= 0; i--) {
        const entry = overlappingNodes[i];
        const localStart = Math.max(0, matchStart - entry.start);
        const localEnd = Math.min(entry.node.nodeValue?.length || 0, matchEnd - entry.start);

        wrapTextNodeSlice(doc, entry.node, localStart, localEnd, note);
      }
    }

    return container.innerHTML;
  } catch (e) {
    console.warn('Failed to parse or apply highlights', e);
    return rawHtml;
  }
}
