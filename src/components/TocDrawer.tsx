import React from 'react';
import { X, List, CheckCircle2 } from 'lucide-react';
import { Chapter } from '../types';

interface TocDrawerProps {
  chapters: Chapter[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const TocDrawer: React.FC<TocDrawerProps> = ({
  chapters,
  currentChapterIndex,
  onSelectChapter,
  onClose,
  isDark = true,
}) => {
  return (
    <div
      id="toc-drawer-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-start"
      onClick={onClose}
    >
      <div
        id="toc-drawer"
        className={`w-full max-w-full md:max-w-sm h-full flex flex-col shadow-2xl transition-transform ${
          isDark
            ? 'bg-neutral-900 text-neutral-100 border-r border-neutral-800'
            : 'bg-white text-stone-900 border-r border-stone-200'
        }`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-inherit/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-base">Оглавление</h2>
          </div>
          <button
            id="btn-close-toc"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Закрыть оглавление"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {chapters.map((ch, idx) => {
            const isCurrent = idx === currentChapterIndex;
            return (
              <button
                key={ch.id || idx}
                id={`btn-chapter-${idx}`}
                onClick={() => {
                  onSelectChapter(idx);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-all ${
                  isCurrent
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40'
                      : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <span className="font-mono text-[10px] opacity-50 w-5">
                    {idx + 1}.
                  </span>
                  <span className="truncate">{ch.title}</span>
                </div>
                {isCurrent && <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
