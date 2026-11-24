import React, { useState } from 'react';
import { 
  X, 
  Bookmark as BookmarkIcon, 
  Edit3, 
  Trash2, 
  Download, 
  Search, 
  BookOpen, 
  Share2, 
  Copy, 
  Check,
  Tag
} from 'lucide-react';
import { Note, Bookmark } from '../types';
import { COLOR_NAMES_RU } from '../utils/highlight';
import { exportFile } from '../utils/fileExport';

interface NotesDrawerProps {
  bookTitle: string;
  notes: Note[];
  bookmarks: Bookmark[];
  onSelectNote: (note: Note) => void;
  onSelectBookmark: (bookmark: Bookmark) => void;
  onDeleteNote: (noteId: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  bookTitle,
  notes,
  bookmarks,
  onSelectNote,
  onSelectBookmark,
  onDeleteNote,
  onDeleteBookmark,
  onClose,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filteredNotes = notes.filter((n) => {
    const matchesSearch = 
      n.selectedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.noteText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColor = !selectedColorFilter || n.color === selectedColorFilter;
    return matchesSearch && matchesColor;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const handleExportMarkdown = async () => {
    if (notes.length === 0) return;
    let md = `# Заметки и цитаты: ${bookTitle}\n\n`;
    notes.forEach((n, idx) => {
      md += `### ${idx + 1}. ${n.chapterTitle}\n`;
      md += `> «${n.selectedText}»\n\n`;
      if (n.noteText) {
        md += `**Заметка:** ${n.noteText}\n\n`;
      }
      md += `*Дата: ${new Date(n.createdAt).toLocaleDateString()}*\n\n---\n\n`;
    });

    const safeFilename = `${bookTitle.replace(/[^\wа-яА-ЯёЁ\s-]/gi, '_')}-заметки.md`;

    try {
      const result = await exportFile({
        filename: safeFilename,
        content: md,
        mimeType: 'text/markdown',
        title: `Заметки: ${bookTitle}`,
      });

      setExportNotice(result.message);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(md);
      setExportNotice('Заметки скопированы в буфер обмена!');
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const colorBadges: Record<string, string> = {
    yellow: 'bg-yellow-400/20 text-yellow-500 border-yellow-500/30',
    green: 'bg-emerald-400/20 text-emerald-500 border-emerald-500/30',
    blue: 'bg-sky-400/20 text-sky-500 border-sky-500/30',
    pink: 'bg-pink-400/20 text-pink-500 border-pink-500/30',
    purple: 'bg-purple-400/20 text-purple-500 border-purple-500/30',
  };

  return (
    <div
      id="notes-drawer-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        id="notes-drawer"
        className={`w-full max-w-full md:max-w-md h-full flex flex-col shadow-2xl transition-transform ${
          isDark ? 'bg-neutral-900 text-neutral-100 border-l border-neutral-800' : 'bg-white text-stone-900 border-l border-stone-200'
        }`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-inherit/40 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Заметки и закладки</span>
            </h2>
            <p className="text-xs opacity-60 truncate">{bookTitle}</p>
          </div>
          <button
            id="btn-close-notes"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Закрыть заметки"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-inherit/30 px-4">
          <button
            id="tab-notes"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Заметки ({notes.length})
          </button>
          <button
            id="tab-bookmarks"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'bookmarks'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <BookmarkIcon className="w-4 h-4" />
            Закладки ({bookmarks.length})
          </button>
        </div>

        {activeTab === 'notes' && (
          <div className="p-3 border-b border-inherit/20 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-40" />
              <input
                id="input-search-notes"
                type="text"
                placeholder="Поиск по цитатам и мыслям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-neutral-800 border border-inherit/30 focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] opacity-60 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Цвет:
              </span>
              <button
                onClick={() => setSelectedColorFilter(null)}
                className={`px-2 py-0.5 text-[10px] rounded-full border ${
                  !selectedColorFilter ? 'bg-amber-500 text-white border-amber-500 font-bold' : 'opacity-60 hover:opacity-100 border-inherit'
                }`}
              >
                Все
              </button>
              {['yellow', 'green', 'blue', 'pink', 'purple'].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColorFilter(selectedColorFilter === c ? null : c)}
                  title={COLOR_NAMES_RU[c] || c}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                    c === 'yellow' ? 'bg-yellow-400' :
                    c === 'green' ? 'bg-emerald-400' :
                    c === 'blue' ? 'bg-sky-400' :
                    c === 'pink' ? 'bg-pink-400' : 'bg-purple-400'
                  } ${selectedColorFilter === c ? 'ring-2 ring-amber-500 scale-125' : 'hover:scale-110'}`}
                />
              ))}

              {notes.length > 0 && (
                <button
                  id="btn-export-notes"
                  onClick={handleExportMarkdown}
                  className="ml-auto text-[11px] flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-semibold cursor-pointer transition-colors"
                  title="Экспорт / Поделиться заметками"
                >
                  <Share2 className="w-3.5 h-3.5" /> Экспорт
                </button>
              )}
            </div>

            {exportNotice && (
              <div className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl text-center animate-fade-in">
                {exportNotice}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'notes' ? (
            filteredNotes.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center opacity-60 text-xs">
                <Edit3 className="w-8 h-8 mb-2 stroke-1" />
                <p>Пока нет заметок</p>
                <p className="text-[11px] mt-1 opacity-70">
                  Выделите любой текст в книге, чтобы добавить заметку или цветную цитату!
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  id={`note-card-${note.id}`}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDark
                      ? 'bg-neutral-800/60 border-neutral-800 hover:border-neutral-700'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold opacity-70 truncate">
                      {note.chapterTitle}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        colorBadges[note.color] || colorBadges.yellow
                      }`}
                    >
                      {COLOR_NAMES_RU[note.color] || note.color}
                    </span>
                  </div>

                  <blockquote className="text-xs italic border-l-2 border-amber-500/60 pl-2.5 my-1.5 opacity-90 line-clamp-3">
                    «{note.selectedText}»
                  </blockquote>

                  {note.noteText && (
                    <p className="text-xs font-medium mt-2 text-amber-500/90 dark:text-amber-300/90">
                      💬 {note.noteText}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-inherit/20 text-[11px]">
                    <span className="opacity-50">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(note.selectedText, note.id)}
                        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
                        title="Скопировать"
                      >
                        {copiedNoteId === note.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-70" />
                        )}
                      </button>
                      <button
                        onClick={() => onSelectNote(note)}
                        className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 font-semibold hover:bg-amber-500/25"
                      >
                        Перейти
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-rose-400 hover:text-rose-500 rounded-md"
                        title="Удалить заметку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : bookmarks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center opacity-60 text-xs">
              <BookmarkIcon className="w-8 h-8 mb-2 stroke-1" />
              <p>Нет закладок</p>
              <p className="text-[11px] mt-1 opacity-70">
                Нажмите на иконку флажка в верхней панели чтения, чтобы сохранить место!
              </p>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                id={`bookmark-card-${bm.id}`}
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-neutral-800/60 border-neutral-800' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer pr-2"
                  onClick={() => onSelectBookmark(bm)}
                >
                  <p className="text-xs font-semibold">{bm.chapterTitle}</p>
                  <p className="text-[10px] opacity-60 mt-0.5">
                    {new Date(bm.createdAt).toLocaleString()} · {Math.round(bm.progressPercent)}% прочитано
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectBookmark(bm)}
                    className="p-1.5 text-amber-500 hover:bg-amber-500/15 rounded-lg"
                    title="Перейти к закладке"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteBookmark(bm.id)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg"
                    title="Удалить закладку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
