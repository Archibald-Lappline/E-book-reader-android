import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ChevronRight, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { Chapter } from '../types';
import { tr } from '../i18n';

interface SearchMatch {
  chapterIndex: number;
  chapterTitle: string;
  snippetBefore: string;
  matchedText: string;
  snippetAfter: string;
  charIndex: number;
  matchIndexInChapter: number;
}

interface BookSearchModalProps {
  chapters: Chapter[];
  currentChapterIndex: number;
  onSelectMatch: (
    chapterIndex: number,
    query: string,
    charIndex: number,
    contextSnippet: string,
    matchIndexInChapter: number
  ) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const BookSearchModal: React.FC<BookSearchModalProps> = ({
  chapters,
  currentChapterIndex,
  onSelectMatch,
  onClose,
  isDark = true,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Pre-extract clean text for all chapters
  const cleanChapters = useMemo(() => {
    const tempDiv = document.createElement('div');
    return chapters.map((ch, idx) => {
      tempDiv.innerHTML = ch.content;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      return {
        index: idx,
        title: ch.title || tr`Глава ${idx + 1}`,
        text,
      };
    });
  }, [chapters]);

  // Find matches
  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const lowerQuery = trimmed.toLowerCase();
    const results: SearchMatch[] = [];
    const maxResults = 150;

    for (const ch of cleanChapters) {
      if (results.length >= maxResults) break;
      const text = ch.text;
      const lowerText = text.toLowerCase();
      let startIndex = 0;
      let chapterOccurrence = 0;

      while (startIndex < text.length && results.length < maxResults) {
        const foundIdx = lowerText.indexOf(lowerQuery, startIndex);
        if (foundIdx === -1) break;

        const snippetStart = Math.max(0, foundIdx - 36);
        const snippetEnd = Math.min(text.length, foundIdx + lowerQuery.length + 42);

        results.push({
          chapterIndex: ch.index,
          chapterTitle: ch.title,
          snippetBefore: (snippetStart > 0 ? '…' : '') + text.substring(snippetStart, foundIdx),
          matchedText: text.substring(foundIdx, foundIdx + lowerQuery.length),
          snippetAfter: text.substring(foundIdx + lowerQuery.length, snippetEnd) + (snippetEnd < text.length ? '…' : ''),
          charIndex: foundIdx,
          matchIndexInChapter: chapterOccurrence++,
        });

        startIndex = foundIdx + Math.max(1, lowerQuery.length);
      }
    }

    return results;
  }, [query, cleanChapters]);

  const [selectedMatchIdx, setSelectedMatchIdx] = useState<number>(0);

  const getContextSnippet = (m: SearchMatch) => {
    const cleanBefore = m.snippetBefore.replace(/[…\r\n\t]/g, ' ').trim();
    const cleanAfter = m.snippetAfter.replace(/[…\r\n\t]/g, ' ').trim();
    return `${cleanBefore.slice(-20)} ${m.matchedText} ${cleanAfter.slice(0, 20)}`.replace(/\s+/g, ' ').trim();
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const next = (selectedMatchIdx + 1) % matches.length;
    setSelectedMatchIdx(next);
    const m = matches[next];
    onSelectMatch(m.chapterIndex, query.trim(), m.charIndex, getContextSnippet(m), m.matchIndexInChapter);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prev = (selectedMatchIdx - 1 + matches.length) % matches.length;
    setSelectedMatchIdx(prev);
    const m = matches[prev];
    onSelectMatch(m.chapterIndex, query.trim(), m.charIndex, getContextSnippet(m), m.matchIndexInChapter);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-start justify-center p-3 sm:p-6 select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -30, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -30, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[85vh] mt-6 sm:mt-12 ${
          isDark
            ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
            : 'bg-white border-stone-300 text-stone-900'
        }`}
      >
        {/* Header with Search input */}
        <div className="p-4 border-b border-inherit/15 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <Search className="w-4 h-4" />
              <span>{tr("Поиск по книге")}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 opacity-40 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedMatchIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
              placeholder={tr("Введите слово или фразу для поиска...")}
              className={`w-full pl-9 pr-24 py-2.5 rounded-2xl text-xs sm:text-sm font-medium border focus:outline-hidden transition-colors ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-500'
                  : 'bg-stone-100 border-stone-300 text-black placeholder-stone-400 focus:border-amber-600'
              }`}
            />
            {query && (
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full opacity-50 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {matches.length > 0 && (
                  <div className="flex items-center gap-0.5 border-l border-inherit/20 pl-1">
                    <button
                      onClick={handlePrevMatch}
                      className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                      title={tr("Предыдущее совпадение")}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleNextMatch}
                      className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                      title={tr("Следующее совпадение")}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {query.trim().length >= 2 && (
            <div className="flex items-center justify-between text-[11px] opacity-70 px-1">
              <span>{tr("Найдено совпадений:")} <strong className="text-amber-500">{matches.length}</strong></span>
              {matches.length > 0 && (
                <span>{tr("Выбрано:")} {tr`${selectedMatchIdx + 1} из ${matches.length}`}</span>
              )}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {query.trim().length < 2 ? (
            <div className="py-12 text-center opacity-50 text-xs flex flex-col items-center gap-2">
              <Search className="w-8 h-8 opacity-40 stroke-1" />
              <span>{tr("Введите хотя бы 2 символа для поиска")}</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center opacity-60 text-xs">
              {tr`По запросу «${query}» ничего не найдено`}
            </div>
          ) : (
            matches.map((match, idx) => {
              const isSelected = selectedMatchIdx === idx;
              const isCurrentChapter = match.chapterIndex === currentChapterIndex;

              return (
                <div
                  key={`match-${match.chapterIndex}-${match.charIndex}-${idx}`}
                  onClick={() => {
                    setSelectedMatchIdx(idx);
                    onSelectMatch(match.chapterIndex, query.trim(), match.charIndex, getContextSnippet(match), match.matchIndexInChapter);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/15 shadow-sm'
                      : isDark
                      ? 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center justify-between opacity-60 text-[10px] mb-1 font-mono">
                    <span className="truncate font-semibold flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {match.chapterTitle}
                    </span>
                    {isCurrentChapter && (
                      <span className="px-1.5 py-0.2 rounded-sm bg-amber-500/20 text-amber-500 text-[9px] font-bold">
                        {tr("Текущая глава")}
                      </span>
                    )}
                  </div>

                  <p className="leading-relaxed line-clamp-2 text-inherit opacity-90">
                    <span>{match.snippetBefore}</span>
                    <mark className="bg-amber-400 text-neutral-950 font-bold px-1 py-0.5 rounded-sm mx-0.5">
                      {match.matchedText}
                    </mark>
                    <span>{match.snippetAfter}</span>
                  </p>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
