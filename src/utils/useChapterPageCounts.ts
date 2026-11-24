import { useEffect, useState } from 'react';
import { Chapter } from '../types';

interface Params {
    chapters: Chapter[];
    enabled: boolean;
    pageWidth: number;
    pageHeight: number;
    pageGap: number;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textAlign: string;
    letterSpacing: number;
}

/**
 * Считает количество страниц в КАЖДОЙ главе в текущей раскладке (шрифт, поля, размер экрана),
 * измеряя главы в скрытом контейнере с теми же CSS-колонками, что и в читалке.
 * Нужен для сквозной нумерации страниц по всей книге.
 *
 * Возвращает массив: counts[i] — число страниц главы i (0 — ещё не измерена).
 */
export function useChapterPageCounts(p: Params): number[] {
    const [counts, setCounts] = useState<number[]>([]);

    useEffect(() => {
        if (!p.enabled || p.chapters.length === 0 || p.pageWidth <= 0) {
            setCounts([]);
            return;
        }

        let cancelled = false;
        const host = document.createElement('div');
        host.className = 'reader-text reader-columns';
        host.setAttribute('aria-hidden', 'true');
        Object.assign(host.style, {
            position: 'fixed',
            left: '-100000px',
            top: '0',
            visibility: 'hidden',
            pointerEvents: 'none',
            width: `${p.pageWidth}px`,
            height: `${p.pageHeight}px`,
            columnWidth: `${p.pageWidth}px`,
            columnGap: `${p.pageGap}px`,
            columnFill: 'auto',
            overflow: 'hidden',
            fontFamily: p.fontFamily,
            fontSize: `${p.fontSize}px`,
            lineHeight: String(p.lineHeight),
            textAlign: p.textAlign,
            letterSpacing: `${p.letterSpacing}em`,
        });
        document.body.appendChild(host);

        const result: number[] = new Array(p.chapters.length).fill(0);
        let i = 0;

        // Измеряем по одной главе за тик, чтобы не фризить интерфейс
        const step = () => {
            if (cancelled) return;
            const started = performance.now();
            while (i < p.chapters.length && performance.now() - started < 12) {
                host.innerHTML = p.chapters[i].content || '';
                const w = host.scrollWidth;
                result[i] = Math.max(1, Math.round((w + p.pageGap) / (p.pageWidth + p.pageGap)));
                i++;
            }
            if (i < p.chapters.length) {
                setTimeout(step, 0);
            } else {
                host.innerHTML = '';
                setCounts(result.slice());
            }
        };
        const t = setTimeout(step, 400); // даём основной главе отрисоваться первой

        return () => {
            cancelled = true;
            clearTimeout(t);
            host.remove();
        };
    }, [
        p.chapters,
        p.enabled,
        p.pageWidth,
        p.pageHeight,
        p.pageGap,
        p.fontFamily,
        p.fontSize,
        p.lineHeight,
        p.textAlign,
        p.letterSpacing,
    ]);

    return counts;
}