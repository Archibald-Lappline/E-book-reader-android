import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCcw, 
  Download, 
  Trash2, 
  AlertTriangle, 
  Check, 
  BookOpen, 
  FileArchive,
  Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import { exportFile } from '../utils/fileExport';
import { Book } from '../types';
import { resetAllBooksProgress, deleteAllBooks } from '../services/storage';
import { ReaderThemeConfig } from '../types';
import { tr } from '../i18n';

interface LibraryActionsModalProps {
  books: Book[];
  theme: ReaderThemeConfig;
  onRefreshLibrary: () => void;
  onClose: () => void;
}

export const LibraryActionsModal: React.FC<LibraryActionsModalProps> = ({
  books,
  theme,
  onRefreshLibrary,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleResetAllProgress = async () => {
    try {
      await resetAllBooksProgress();
      showToast(tr("Прогресс всех книг сброшен на 0%"));
      onRefreshLibrary();
    } catch (err) {
      console.error(err);
      showToast(tr("Ошибка при сбросе прогресса"));
    }
  };

  const handleExportAllBooks = async () => {
    if (books.length === 0) {
      showToast(tr("В библиотеке нет книг для экспорта"));
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();

      for (const book of books) {
        const safeTitle = (book.title || tr("Книга"))
          .replace(/[\\/:*?"<>|]/g, '_')
          .trim();
        const ext = book.format === 'pdf' ? 'txt' : book.format;
        const filename = tr`${safeTitle} - ${book.author || 'Автор'}.${ext}`;

        // Build file content from chapters without progress metadata
        let content = '';
        if (book.chapters && book.chapters.length > 0) {
          content = book.chapters
            .map((ch) => {
              const textContent = ch.content
                ? ch.content
                    .replace(/<br\s*[\/]?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<[^>]+>/g, '')
                    .trim()
                : '';
              return `\n\n========================================\n${ch.title}\n========================================\n\n${textContent}`;
            })
            .join('\n\n');
        } else {
          content = `${book.title}\n${book.author}\n\n${book.description || ''}`;
        }

        zip.file(filename, content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `Библиотека_книги_${new Date().toISOString().slice(0, 10)}.zip`;

      const result = await exportFile({
        filename,
        content: blob,
        mimeType: 'application/zip',
        title: tr`Экспорт ${books.length} книг`,
      });

      showToast(result.message);
    } catch (err) {
      console.error('Export error', err);
      showToast(tr("Ошибка при экспорте файлов"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllBooks();
      showToast(tr("Все книги успешно удалены"));
      onRefreshLibrary();
      setTimeout(onClose, 600);
    } catch (err) {
      console.error(err);
      showToast(tr("Ошибка при удалении"));
    }
  };

  return (
    <div
      id="library-actions-modal-backdrop"
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        id="library-actions-modal"
        className="w-full max-w-sm rounded-3xl border shadow-2xl p-5 overflow-hidden relative flex flex-col"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-inherit/20">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: theme.accent,
                color: theme.isDark ? '#000' : '#fff',
              }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{tr("Управление библиотекой")}</h2>
              <p className="text-[11px] opacity-65">
                {books.length} {books.length === 1 ? tr("книга") : books.length < 5 ? tr("книги") : tr("книг")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {notification && (
          <div className="my-2 p-2 rounded-xl bg-amber-500/20 text-amber-500 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30">
            <Check className="w-3.5 h-3.5" />
            <span>{notification}</span>
          </div>
        )}

        <div className="py-3 space-y-2.5">
          {/* Action 1: Reset Progress */}
          <button
            id="btn-action-reset-progress"
            onClick={handleResetAllProgress}
            className="w-full p-3 rounded-2xl border border-inherit/20 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold">{tr("Очистить прогресс всех книг")}</h4>
              <p className="text-[10px] opacity-65">{tr("Сбросить страницы и % чтения на 0%")}</p>
            </div>
          </button>

          {/* Action 2: Export Books */}
          <button
            id="btn-action-export-books"
            onClick={handleExportAllBooks}
            disabled={isExporting || books.length === 0}
            className="w-full p-3 rounded-2xl border border-inherit/20 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
              {isExporting ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Download className="w-4.5 h-4.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold">{tr("Экспорт всех книг (файлы)")}</h4>
              <p className="text-[10px] opacity-65">{tr("Скачать исходные файлы книг в ZIP архиве")}</p>
            </div>
          </button>

          {/* Action 3: Delete All */}
          {!confirmDelete ? (
            <button
              id="btn-action-delete-all-prompt"
              onClick={() => setConfirmDelete(true)}
              disabled={books.length === 0}
              className="w-full p-3 rounded-2xl border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">{tr("Удалить все книги")}</h4>
                <p className="text-[10px] opacity-65">{tr("Полностью очистить локальную библиотеку")}</p>
              </div>
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{tr`Удалить все ${books.length} книг?`}</span>
              </div>
              <p className="text-[11px] opacity-75 leading-tight">
                {tr("Это действие необратимо. Книги и заметки будут стёрты.")}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  id="btn-action-delete-all-confirm"
                  onClick={handleDeleteAll}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {tr("Да, удалить все")}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl border border-inherit/30 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  {tr("Отмена")}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
