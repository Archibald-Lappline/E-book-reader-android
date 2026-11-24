import React, { useState, useRef, useEffect } from 'react';
import { OverlayPortal } from './OverlayPortal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  LayoutGrid, 
  List as ListIcon, 
  Star, 
  Clock, 
  Trash2, 
  Upload, 
  RefreshCw, 
  MoreVertical, 
  FolderDown, 
  ArrowUpDown, 
  Github, 
  AlertCircle, 
  X,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  CheckSquare,
  Square,
  Smartphone
} from 'lucide-react';
import { Book, BookFormat, ReaderSettings, ReaderThemeConfig } from '../types';
import { parseBookFile } from '../services/parser';
import {
  saveBook,
  deleteBookFromDB,
  resetBookProgress,
  saveComicArchive,
  deleteMultipleBooksFromDB,
  resetMultipleBooksProgress,
  toggleFavoriteMultipleBooks
} from '../services/storage';
import { AppAppearanceModal } from './AppAppearanceModal';
import { LibraryActionsModal } from './LibraryActionsModal';
import { pushBackHandler } from '../utils/androidBackNavigation';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface LibraryViewProps {
  books: Book[];
  theme: ReaderThemeConfig;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onOpenBook: (book: Book) => void;
  onRefreshBooks: () => void;
  onOpenSync: () => void;
  onOpenAndroidCode: () => void;
  onIsAtRootChange?: (isAtRoot: boolean) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  theme,
  settings,
  onUpdateSettings,
  onOpenBook,
  onRefreshBooks,
  onOpenSync,
  onOpenAndroidCode,
  onIsAtRootChange,
}) => {
  const isDark = theme.isDark;
  const { currentTrack } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'reading' | 'completed' | 'favorites'>('all');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'title' | 'author'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('ereader_view_mode') as 'grid' | 'list') || 'grid';
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Multi-selection state for books
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showLibraryActionsModal, setShowLibraryActionsModal] = useState(false);

  const [duplicateModal, setDuplicateModal] = useState<{
    newBook: Book;
    existingBook: Book;
    onResolve: (action: 'replace' | 'duplicate' | 'skip') => void;
  } | null>(null);

  const openDetails = (book: Book) => setSelectedBookForDetails(book);
  const closeDetails = () => setSelectedBookForDetails(null);

  const openAppearance = () => setShowAppearanceModal(true);
  const closeAppearance = () => setShowAppearanceModal(false);

  const openLibraryActions = () => setShowLibraryActionsModal(true);
  const closeLibraryActions = () => setShowLibraryActionsModal(false);

  // Notify parent whether user is at root of Books library (no details modal, selection mode, or dialog open)
  const isAtRoot = selectedBookForDetails === null && !isSelectionMode && !showAppearanceModal && !showLibraryActionsModal && !duplicateModal;

  useEffect(() => {
    onIsAtRootChange?.(isAtRoot);
  }, [isAtRoot, onIsAtRootChange]);

  // Android Back Gesture handling for Library modals and drawers
  useEffect(() => {
    if (selectedBookIds.size > 0 || isSelectionMode) {
      const unreg = pushBackHandler(() => {
        setSelectedBookIds(new Set());
        setIsSelectionMode(false);
        return true;
      });
      return unreg;
    }
    if (selectedBookForDetails || showAppearanceModal || showLibraryActionsModal || duplicateModal || searchQuery) {
      const unreg = pushBackHandler(() => {
        if (duplicateModal) {
          setDuplicateModal(null);
          return true;
        }
        if (selectedBookForDetails) {
          setSelectedBookForDetails(null);
          return true;
        }
        if (showAppearanceModal) {
          setShowAppearanceModal(false);
          return true;
        }
        if (showLibraryActionsModal) {
          setShowLibraryActionsModal(false);
          return true;
        }
        if (searchQuery) {
          setSearchQuery('');
          return true;
        }
        return false;
      });
      return unreg;
    }
  }, [selectedBookIds, isSelectionMode, selectedBookForDetails, showAppearanceModal, showLibraryActionsModal, duplicateModal, searchQuery]);

  // Batch actions for books
  const toggleSelectBook = (bookId: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      setIsSelectionMode(next.size > 0);
      return next;
    });
  };

  // Long-press handling for card selection (Android-native UX)
  const longPressTimerRef = useRef<{ [key: string]: number }>({});
  const isLongPressTriggeredRef = useRef<{ [key: string]: boolean }>({});
  const touchStartPosRef = useRef<{ [key: string]: { x: number; y: number } }>({});

  const handleCardTouchStart = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    isLongPressTriggeredRef.current[id] = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartPosRef.current[id] = { x: clientX, y: clientY };

    if (longPressTimerRef.current[id]) {
      clearTimeout(longPressTimerRef.current[id]);
    }

    longPressTimerRef.current[id] = window.setTimeout(() => {
      isLongPressTriggeredRef.current[id] = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      setIsSelectionMode(true);
      toggleSelectBook(id);
    }, 450);
  };

  const handleCardTouchMove = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    const start = touchStartPosRef.current[id];
    if (!start) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientX - start.x) > 10 || Math.abs(clientY - start.y) > 10) {
      if (longPressTimerRef.current[id]) {
        clearTimeout(longPressTimerRef.current[id]);
        delete longPressTimerRef.current[id];
      }
    }
  };

  const handleCardTouchEnd = (id: string) => {
    if (longPressTimerRef.current[id]) {
      clearTimeout(longPressTimerRef.current[id]);
      delete longPressTimerRef.current[id];
    }
  };

  const toggleSelectAll = (list: Book[]) => {
    setSelectedBookIds((prev) => {
      const allSelected = list.length > 0 && list.every((b) => prev.has(b.id));
      if (allSelected) {
        setIsSelectionMode(false);
        return new Set();
      }
      const next = new Set(prev);
      list.forEach((b) => next.add(b.id));
      setIsSelectionMode(true);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedBookIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBatchDeleteBooks = async () => {
    const ids = Array.from<string>(selectedBookIds);
    if (ids.length === 0) return;
    if (window.confirm(`Удалить выбранные книги (${ids.length} шт.) из библиотеки?`)) {
      await deleteMultipleBooksFromDB(ids);
      showToast(`Удалено книг: ${ids.length}`);
      clearSelection();
      onRefreshBooks();
    }
  };

  const handleBatchResetProgress = async () => {
    const ids = Array.from<string>(selectedBookIds);
    if (ids.length === 0) return;
    await resetMultipleBooksProgress(ids);
    showToast(`Прогресс сброшен на 0% для ${ids.length} книг`);
    clearSelection();
    onRefreshBooks();
  };

  const handleBatchToggleFavorites = async () => {
    const ids = Array.from<string>(selectedBookIds);
    if (ids.length === 0) return;
    await toggleFavoriteMultipleBooks(ids);
    showToast(`Обновлено избранное для ${ids.length} книг`);
    onRefreshBooks();
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('ereader_view_mode', mode);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter books:
  // "читаю": books with progressPercent >= 1 (0% is excluded)
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.genre && b.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const isCompleted = (b.progressPercent || 0) >= 100 || (b as any).isFinished || (b as any).isCompleted;
    const matchesStatus =
      activeFilter === 'all'
        ? true
        : activeFilter === 'reading'
        ? (b.progressPercent || 0) >= 1 && !isCompleted
        : activeFilter === 'completed'
        ? isCompleted
        : b.isFavorite;

    const matchesFormat = !selectedFormat || b.format === selectedFormat;

    return matchesSearch && matchesStatus && matchesFormat;
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'recent') return (b.lastReadTimestamp || 0) - (a.lastReadTimestamp || 0);
    if (sortBy === 'progress') return (b.progressPercent || 0) - (a.progressPercent || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'author') return a.author.localeCompare(b.author);
    return 0;
  });

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setImportStatus(`Импорт ${files.length} книг...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setImportStatus(`Обработка: ${file.name}`);
        const parsed = await parseBookFile(file);

        // Check if identical or duplicate book already exists
        const existing = books.find(
          (b) =>
            b.title.trim().toLowerCase() === parsed.title.trim().toLowerCase() &&
            (b.author.trim().toLowerCase() === parsed.author.trim().toLowerCase() || b.fileSize === parsed.fileSize)
        );

        if (existing) {
          const action = await new Promise<'replace' | 'duplicate' | 'skip'>((resolve) => {
            setDuplicateModal({
              newBook: parsed,
              existingBook: existing,
              onResolve: (chosen) => {
                setDuplicateModal(null);
                resolve(chosen);
              },
            });
          });

          if (action === 'replace') {
            parsed.id = existing.id;
            parsed.currentChapterIndex = existing.currentChapterIndex;
            parsed.currentScrollPercent = existing.currentScrollPercent;
            parsed.progressPercent = existing.progressPercent;
            parsed.isFavorite = existing.isFavorite;
            await saveBook(parsed);
            if (parsed.format === 'cbz') {
              await saveComicArchive(parsed.id, file);
            }
          } else if (action === 'duplicate') {
            parsed.id = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            parsed.title = `${parsed.title} (копия)`;
            await saveBook(parsed);
            if (parsed.format === 'cbz') {
              await saveComicArchive(parsed.id, file);
            }
          }
        } else {
          await saveBook(parsed);
          if (parsed.format === 'cbz') {
            await saveComicArchive(parsed.id, file);
          }
        }
      }
      onRefreshBooks();
    } catch (err: any) {
      console.error('Import error', err);
      alert('Ошибка импорта: ' + (err.message || 'Не удалось прочитать файл'));
    } finally {
      setIsImporting(false);
      setImportStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    const updated = { ...book, isFavorite: !book.isFavorite };
    await saveBook(updated);
    onRefreshBooks();
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('Удалить эту книгу из библиотеки?')) {
      await deleteBookFromDB(bookId);
      setSelectedBookForDetails(null);
      onRefreshBooks();
    }
  };

  const handleResetSingleBookProgress = async (bookId: string) => {
    await resetBookProgress(bookId);
    onRefreshBooks();
    setSelectedBookForDetails((prev) =>
      prev ? { ...prev, currentChapterIndex: 0, currentScrollPercent: 0, progressPercent: 0 } : null
    );
  };

  const formatColorBadges: Record<BookFormat, string> = {
    epub: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    fb2: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pdf: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    txt: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    md: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    cbz: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div
      id="library-view"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleImportFiles(e.dataTransfer.files);
      }}
      className="relative w-full h-full flex flex-col overflow-hidden select-none transition-colors duration-200"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Top App Bar with Safe Area Inset */}
      <div
        id="library-top-app-bar"
        className="border-b transition-colors shrink-0"
        style={{
          paddingTop: isMobile ? 'max(env(safe-area-inset-top, 0px), 48px)' : '14px',
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 border-b border-inherit/15">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Clickable Book Icon -> Opens App Appearance Settings */}
            <button
              id="btn-app-appearance"
              onClick={openAppearance}
              className="w-10 h-10 min-w-[40px] rounded-2xl flex items-center justify-center font-bold shadow-xs active:scale-95 transition-all cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: theme.accent,
                color: isDark ? '#000' : '#fff',
              }}
              title="Настройки темы, анимации и листания страниц"
            >
              <BookOpen className="w-5 h-5" />
            </button>

            {/* Clickable Book Counter -> Opens Library Actions Modal */}
            <button
              id="btn-library-actions"
              onClick={openLibraryActions}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:scale-102 active:scale-95 transition-all cursor-pointer shadow-2xs"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
              }}
              title="Управление библиотекой: сброс прогресса, экспорт файлов, удаление"
            >
              <span className="font-bold">{books.length}</span>
              <span className="opacity-70 font-normal">
                {books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              id="btn-open-android-code"
              onClick={onOpenAndroidCode}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
              title="Релиз на GitHub и сборка APK"
            >
              <Github className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Релиз & APK</span>
            </button>

            <button
              id="btn-open-sync"
              onClick={onOpenSync}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-amber-500 transition-colors active:scale-95 cursor-pointer"
              title="Синхронизация прогресса"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              id="btn-toggle-view-mode"
              onClick={() => handleSetViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors active:scale-95 cursor-pointer"
              title={viewMode === 'grid' ? 'Список' : 'Сетка'}
            >
              {viewMode === 'grid' ? <ListIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-3.5 sm:px-6 py-2.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
              }}
            >
              <Search className="w-4 h-4 opacity-50 shrink-0" />
              <input
                id="input-library-search"
                type="text"
                placeholder="Поиск по названию, автору или жанру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-xs sm:text-sm placeholder:opacity-50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="opacity-50 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none text-xs font-medium py-2 pl-2.5 pr-7 rounded-2xl border cursor-pointer outline-none shadow-xs"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <option value="recent">Недавние</option>
                <option value="progress">По прогрессу</option>
                <option value="title">По названию</option>
                <option value="author">По автору</option>
              </select>
              <ArrowUpDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'Все книги' },
              { id: 'reading', label: 'Читаю' },
              { id: 'completed', label: 'Прочитанные' },
              { id: 'favorites', label: 'Избранные' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-filter-${tab.id}`}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            <div className="h-4 w-[1px] bg-inherit/25 mx-1" />

            {['epub', 'fb2', 'pdf', 'txt', 'md', 'cbz'].map((fmt) => {
              const isSelected = selectedFormat === fmt;
              return (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(isSelected ? null : fmt)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono uppercase font-bold border transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500'
                      : 'border-inherit/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        id="library-scroll-container"
        className="flex-1 overflow-y-auto p-3.5 sm:p-6"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 32px)',
        }}
      >
        {isDragging && (
          <div className="absolute inset-4 rounded-3xl border-2 border-dashed border-amber-500 bg-amber-500/10 backdrop-blur-xs flex flex-col items-center justify-center z-40 pointer-events-none">
            <Upload className="w-12 h-12 text-amber-500 animate-bounce mb-2" />
            <p className="text-base font-bold text-amber-500">Отпустите файлы для добавления</p>
            <p className="text-xs opacity-75">EPUB, FB2, PDF, TXT, MD, CBZ</p>
          </div>
        )}

        {isImporting && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-semibold flex items-center gap-2.5 animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{importStatus || 'Импорт книг...'}</span>
          </div>
        )}

        {sortedBooks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[300px]">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3 shadow-inner"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
              }}
            >
              <FolderDown className="w-8 h-8 opacity-40 text-amber-500" />
            </div>
            <h3 className="font-bold text-base mb-1">
              {searchQuery || activeFilter !== 'all' ? 'Ничего не найдено' : 'Библиотека пуста'}
            </h3>
            <p className="text-xs opacity-60 max-w-xs mb-4">
              {searchQuery || activeFilter !== 'all'
                ? 'Попробуйте сбросить фильтры поиска'
                : 'Нажмите «Добавить книгу» или перетащите файлы книг на экран'}
            </p>
            {(searchQuery || activeFilter !== 'all' || selectedFormat) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setSelectedFormat(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-neutral-950 shadow-xs cursor-pointer"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key={`grid-${activeFilter}-${selectedFormat || 'all'}-${sortBy}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5 pb-24"
              >
                {sortedBooks.map((book) => {
                  const hasProgress = (book.progressPercent || 0) > 0;
                  const isSelected = selectedBookIds.has(book.id);
                  return (
                    <div
                      key={book.id}
                      id={`book-card-${book.id}`}
                      onClick={() => {
                        if (isLongPressTriggeredRef.current[book.id]) {
                          isLongPressTriggeredRef.current[book.id] = false;
                          return;
                        }
                        if (isSelectionMode) {
                          toggleSelectBook(book.id);
                        } else {
                          onOpenBook(book);
                        }
                      }}
                      onTouchStart={(e) => handleCardTouchStart(book.id, e)}
                      onTouchMove={(e) => handleCardTouchMove(book.id, e)}
                      onTouchEnd={() => handleCardTouchEnd(book.id)}
                      onTouchCancel={() => handleCardTouchEnd(book.id)}
                      onMouseDown={(e) => handleCardTouchStart(book.id, e)}
                      onMouseMove={(e) => handleCardTouchMove(book.id, e)}
                      onMouseUp={() => handleCardTouchEnd(book.id)}
                      onMouseLeave={() => handleCardTouchEnd(book.id)}
                      className={`group flex flex-col rounded-2xl border p-2 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98] relative will-change-transform ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 shadow-md ring-2 ring-amber-500/60'
                          : ''
                      }`}
                      style={{
                        backgroundColor: isSelected ? undefined : theme.cardBg,
                        borderColor: isSelected ? undefined : theme.border,
                      }}
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-xs mb-2 bg-neutral-800">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                          loading="lazy"
                          decoding="async"
                        />
                        <span
                          className={`absolute left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border shadow-xs transition-all ${
                            isSelected || isSelectionMode ? 'top-8.5' : 'top-1.5'
                          } ${formatColorBadges[book.format]}`}
                        >
                          {book.format}
                        </span>

                        {/* Selection Badge (Android-native long-press selection indicator) */}
                        {isSelected ? (
                          <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center shadow-md z-20">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isSelectionMode ? (
                          <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-black/60 border border-white/50 text-white/50 flex items-center justify-center z-20">
                            <Square className="w-3 h-3" />
                          </div>
                        ) : null}

                        <button
                          onClick={(e) => handleToggleFavorite(e, book)}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/55 backdrop-blur-xs text-white shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer z-10"
                          title={book.isFavorite ? 'В избранном' : 'Добавить в избранное'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${book.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white/80 hover:text-white'}`}
                          />
                        </button>

                        {(book.progressPercent || 0) >= 100 && (
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500 text-neutral-950 shadow-md z-10 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            Прочитано
                          </span>
                        )}

                        {hasProgress && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                            <div
                              className={`h-full ${(book.progressPercent || 0) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, book.progressPercent || 0)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-xs line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-[11px] opacity-60 truncate mt-0.5">{book.author}</p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] opacity-65 mt-2 pt-1 border-t border-inherit/15">
                          {(book.progressPercent || 0) >= 100 ? (
                            <span className="font-semibold text-emerald-500 flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              Прочитано
                            </span>
                          ) : (
                            <span className="font-mono">{Math.round(book.progressPercent || 0)}% прочитано</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(book);
                            }}
                            className="p-1 -mr-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                            title="Действия с книгой"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key={`list-${activeFilter}-${selectedFormat || 'all'}-${sortBy}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="space-y-2.5 pb-24 max-w-4xl mx-auto"
              >
                {sortedBooks.map((book) => {
                  const isSelected = selectedBookIds.has(book.id);
                  return (
                    <div
                      key={book.id}
                      id={`book-list-item-${book.id}`}
                      onClick={() => {
                        if (isLongPressTriggeredRef.current[book.id]) {
                          isLongPressTriggeredRef.current[book.id] = false;
                          return;
                        }
                        if (isSelectionMode) {
                          toggleSelectBook(book.id);
                        } else {
                          onOpenBook(book);
                        }
                      }}
                      onTouchStart={(e) => handleCardTouchStart(book.id, e)}
                      onTouchMove={(e) => handleCardTouchMove(book.id, e)}
                      onTouchEnd={() => handleCardTouchEnd(book.id)}
                      onTouchCancel={() => handleCardTouchEnd(book.id)}
                      onMouseDown={(e) => handleCardTouchStart(book.id, e)}
                      onMouseMove={(e) => handleCardTouchMove(book.id, e)}
                      onMouseUp={() => handleCardTouchEnd(book.id)}
                      onMouseLeave={() => handleCardTouchEnd(book.id)}
                      className={`p-3 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-transform duration-150 active:scale-[0.99] shadow-xs will-change-transform ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500/60'
                          : ''
                      }`}
                      style={{
                        backgroundColor: isSelected ? undefined : theme.cardBg,
                        borderColor: isSelected ? undefined : theme.border,
                      }}
                    >
                      {/* Selection indicator only when selected or selection mode is active */}
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : isSelectionMode ? (
                        <div className="w-6 h-6 rounded-lg border-2 border-inherit/40 bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                          <Square className="w-3 h-3 opacity-40" />
                        </div>
                      ) : null}

                      <div className="w-13 aspect-[2/3] rounded-lg overflow-hidden bg-neutral-800 shrink-0 shadow-xs relative">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <span
                          className={`absolute bottom-0 inset-x-0 text-center text-[8px] font-mono uppercase font-bold py-0.5 ${
                            formatColorBadges[book.format]
                          }`}
                        >
                          {book.format}
                        </span>
                        {(book.progressPercent || 0) >= 100 && (
                          <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider bg-emerald-500 text-neutral-950 shadow-xs z-10 flex items-center">
                            <Check className="w-2 h-2 stroke-[2.5]" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm truncate">{book.title}</h3>
                        <p className="text-[11px] opacity-60 truncate mt-0.5">{book.author}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-32 sm:w-48 h-1.5 rounded-full bg-neutral-700/30 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(book.progressPercent || 0) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, book.progressPercent || 0)}%` }}
                            />
                          </div>
                          {(book.progressPercent || 0) >= 100 ? (
                            <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              Прочитано
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono opacity-70">
                              {Math.round(book.progressPercent || 0)}% прочитано
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleToggleFavorite(e, book)}
                          className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title={book.isFavorite ? 'В избранном' : 'Добавить в избранное'}
                        >
                          <Star
                            className={`w-4 h-4 ${book.isFavorite ? 'fill-amber-400 text-amber-400' : 'opacity-40'}`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(book);
                          }}
                          className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 transition-colors cursor-pointer"
                          title="Действия с книгой"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Floating Action Button */}
      {!isSelectionMode && (
        <div
          className="absolute right-5 sm:right-6 z-30 transition-all duration-200"
          style={{
            bottom: currentTrack ? '142px' : '82px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".epub,.fb2,.txt,.md,.cbz,.pdf,.zip"
            onChange={(e) => handleImportFiles(e.target.files)}
            className="hidden"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            id="btn-fab-add-book"
            onClick={() => fileInputRef.current?.click()}
            className="h-14 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-xl shadow-amber-500/30 flex items-center gap-2.5 transition-all group cursor-pointer"
            title="Добавить книги (EPUB, FB2, TXT, MD, CBZ)"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
            <span className="text-sm font-bold tracking-tight">Добавить книгу</span>
          </motion.button>
        </div>
      )}

      {/* Book Actions / Details Sheet (from 3-dots) */}
      <OverlayPortal>
        <AnimatePresence>
          {selectedBookForDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
              onClick={closeDetails}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border shadow-2xl overflow-hidden"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-4 pb-3 border-b border-inherit/20">
                  <div className="w-18 aspect-[2/3] rounded-xl overflow-hidden shadow-md bg-neutral-800 shrink-0">
                    <img
                      src={selectedBookForDetails.coverUrl}
                      alt={selectedBookForDetails.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                            formatColorBadges[selectedBookForDetails.format]
                          }`}
                        >
                          .{selectedBookForDetails.format}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {selectedBookForDetails.fileSize}
                        </span>
                      </div>
                      <h2 className="font-bold text-sm leading-snug line-clamp-2">
                        {selectedBookForDetails.title}
                      </h2>
                      <p className="text-xs opacity-70 mt-0.5">{selectedBookForDetails.author}</p>
                    </div>

                    <p className="text-[11px] font-mono text-amber-500 font-semibold mt-2">
                      Прогресс: {Math.round(selectedBookForDetails.progressPercent || 0)}% · {selectedBookForDetails.chapters.length} глав
                    </p>
                  </div>
                </div>

                {selectedBookForDetails.description && (
                  <p className="text-xs opacity-80 my-3 leading-relaxed line-clamp-3">
                    {selectedBookForDetails.description}
                  </p>
                )}

                {/* Action Buttons: Read, Reset Progress, Delete */}
                <div className="flex items-center gap-2 pt-3">
                  <button
                    id="btn-sheet-read"
                    onClick={() => {
                      const b = selectedBookForDetails;
                      setSelectedBookForDetails(null);
                      onOpenBook(b);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" /> Читать
                  </button>

                  <button
                    id="btn-sheet-reset-progress"
                    onClick={() => handleResetSingleBookProgress(selectedBookForDetails.id)}
                    className="p-3 rounded-2xl border border-amber-500/35 text-amber-500 hover:bg-amber-500/15 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Сбросить прогресс чтения (0%)"
                  >
                    <RotateCcw className="w-4.5 h-4.5" />
                    <span className="text-xs font-semibold hidden min-[360px]:inline">Сбросить</span>
                  </button>

                  <button
                    id="btn-sheet-delete"
                    onClick={() => handleDeleteBook(selectedBookForDetails.id)}
                    className="p-3 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title="Удалить из библиотеки"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </OverlayPortal>

      {/* Duplicate Book Warning Modal */}
      <OverlayPortal>
        <AnimatePresence>
          {duplicateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-sm rounded-3xl p-5 border shadow-2xl"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-500 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Файл уже существует</h3>
                    <p className="text-xs opacity-60">Обнаружена похожая или идентичная книга</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/25 border border-inherit/10 my-3 text-xs space-y-1">
                  <div className="font-semibold line-clamp-1">«{duplicateModal.newBook.title}»</div>
                  <div className="opacity-70">
                    {duplicateModal.newBook.author} · {duplicateModal.newBook.fileSize}
                  </div>
                  <div className="text-[11px] text-amber-500 font-medium">
                    В библиотеке: прогресс {Math.round(duplicateModal.existingBook.progressPercent)}%
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    id="btn-duplicate-replace"
                    onClick={() => duplicateModal.onResolve('replace')}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Заменить существующую книгу
                  </button>
                  <button
                    id="btn-duplicate-add-copy"
                    onClick={() => duplicateModal.onResolve('duplicate')}
                    className="w-full py-2.5 rounded-xl border border-inherit/20 text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Добавить как отдельную копию
                  </button>
                  <button
                    id="btn-duplicate-skip"
                    onClick={() => duplicateModal.onResolve('skip')}
                    className="w-full py-2 rounded-xl text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Пропустить (не добавлять)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </OverlayPortal>

      {/* App Appearance Modal (Theme, Brightness, Animation) */}
      <OverlayPortal>
        <AnimatePresence>
          {showAppearanceModal && (
            <AppAppearanceModal
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onClose={closeAppearance}
            />
          )}
        </AnimatePresence>
      </OverlayPortal>

      {/* Library Actions Modal (Reset All Progress, Export Books, Delete All) */}
      <OverlayPortal>
        <AnimatePresence>
          {showLibraryActionsModal && (
            <LibraryActionsModal
              books={books}
              theme={theme}
              onRefreshLibrary={onRefreshBooks}
              onClose={closeLibraryActions}
            />
          )}
        </AnimatePresence>
      </OverlayPortal>

      {/* FLOATING BATCH ACTIONS BAR FOR BOOKS */}
      {(() => {
        const isAllSelected =
          sortedBooks.length > 0 &&
          sortedBooks.every((b) => selectedBookIds.has(b.id));

        return (
          <OverlayPortal>
            <AnimatePresence>
              {selectedBookIds.size > 0 && (
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  id="books-batch-action-bar"
                  className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-auto max-w-xl mx-auto z-40 p-2 sm:p-2.5 rounded-3xl bg-neutral-950/95 text-white border border-neutral-800 shadow-2xl backdrop-blur-md flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 select-none"
                  style={{ bottom: '24px' }}
                >
                  {/* Selected Count & Toggle All */}
                  <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 shrink-0">
                    <span className="text-[11px] font-bold bg-amber-500 text-neutral-950 px-2 py-0.5 rounded-full">
                      {selectedBookIds.size}
                    </span>
                    <button
                      onClick={() => toggleSelectAll(sortedBooks)}
                      className="text-[11px] font-semibold opacity-80 hover:opacity-100 underline decoration-dotted cursor-pointer px-1"
                      title={isAllSelected ? 'Снять выделение со всех' : 'Выделить все книги'}
                    >
                      {isAllSelected ? 'Снять' : 'Все'}
                    </button>
                  </div>

                  <div className="h-4 w-px bg-white/20 shrink-0" />

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* В избранное */}
                    <button
                      id="btn-batch-favorite"
                      onClick={handleBatchToggleFavorites}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-amber-300"
                      title="Добавить или убрать из избранного"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">Избранное</span>
                    </button>

                    {/* Сбросить прогресс */}
                    <button
                      id="btn-batch-reset-book-progress"
                      onClick={handleBatchResetProgress}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-sky-400"
                      title="Сбросить прогресс чтения выбранных книг на 0%"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Сброс</span>
                    </button>

                    {/* Удалить */}
                    <button
                      id="btn-batch-delete-books"
                      onClick={handleBatchDeleteBooks}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Удалить выбранные книги из библиотеки"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Удалить</span>
                    </button>

                    {/* Отмена */}
                    <button
                      onClick={clearSelection}
                      className="p-1.5 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer ml-0.5"
                      title="Закрыть выбор"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </OverlayPortal>
        );
      })()}

      {/* TOAST ALERT */}
      <OverlayPortal>
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="fixed left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-2 pointer-events-none z-[99999] select-none"
              style={{
                top: 'max(calc(env(safe-area-inset-top, 0px) + 64px), 80px)',
              }}
            >
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </OverlayPortal>
    </div>
  );
};
