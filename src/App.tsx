import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Headphones } from 'lucide-react';
import { Book, ReaderSettings } from './types';
import { 
  getStoredBooks, 
  getStoredSettings, 
  saveStoredSettings,
  getBookById
} from './services/storage';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { AudiobookLibraryView } from './components/audio/AudiobookLibraryView';
import { MiniAudioPlayer } from './components/audio/MiniAudioPlayer';
import { AudioPlayerModal } from './components/audio/AudioPlayerModal';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext';
import { SyncDialog } from './components/SyncDialog';
import { SourceCodeModal } from './components/SourceCodeModal';
import { UpdateBanner } from './components/UpdateBanner';
import { useUpdateCheck } from './utils/useUpdateCheck';
import { READER_THEMES } from './utils/themeConfig';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { 
  initAndroidBackNavigation, 
  registerExitToastCallback, 
  pushBackHandler 
} from './utils/androidBackNavigation';

function AppContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [mainTab, setMainTab] = useState<'books' | 'audiobooks'>('books');
  const [isBooksAtRoot, setIsBooksAtRoot] = useState<boolean>(true);
  const [isAudiobooksAtRoot, setIsAudiobooksAtRoot] = useState<boolean>(true);
  const [settings, setSettings] = useState<ReaderSettings>(getStoredSettings());
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showSourceCodeModal, setShowSourceCodeModal] = useState<boolean>(false);
  const updateCheck = useUpdateCheck();
  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const stripRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const currentDragPx = useRef<number>(0);
  const mainTabRef = useRef<'books' | 'audiobooks'>(mainTab);
  mainTabRef.current = mainTab;

  const { currentTrack, isFullPlayerOpen } = useAudioPlayer();

  const refreshBooks = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    const loaded = await getStoredBooks();
    setBooks(loaded);
    if (showSpinner) setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshBooks(true);
  }, [refreshBooks]);

  useEffect(() => {
    initAndroidBackNavigation();
    registerExitToastCallback((show) => {
      setShowExitToast(show);
    });
  }, []);

  const canSwipe = !isFullPlayerOpen && ((mainTab === 'books' && isBooksAtRoot) || (mainTab === 'audiobooks' && isAudiobooksAtRoot));

  const switchToTab = useCallback((targetTab: 'books' | 'audiobooks') => {
    if (targetTab === mainTabRef.current) return;
    setMainTab(targetTab);
    mainTabRef.current = targetTab;
    if (stripRef.current) {
      stripRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)';
      stripRef.current.style.transform = targetTab === 'books' ? 'translate3d(0%, 0, 0)' : 'translate3d(-50%, 0, 0)';
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (stripRef.current && !isDraggingRef.current) {
      stripRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)';
      stripRef.current.style.transform = mainTab === 'books' ? 'translate3d(0%, 0, 0)' : 'translate3d(-50%, 0, 0)';
    }
  }, [mainTab]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canSwipe) {
      touchStartPos.current = null;
      isHorizontalSwipe.current = false;
      return;
    }
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isHorizontalSwipe.current = null;
    currentDragPx.current = 0;
  }, [canSwipe]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canSwipe || !touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          isHorizontalSwipe.current = true;
          isDraggingRef.current = true;
        } else {
          isHorizontalSwipe.current = false;
        }
      }
    }

    if (isHorizontalSwipe.current) {
      let constrainedDx = dx;
      if (mainTabRef.current === 'books' && dx > 0) {
        constrainedDx = dx * 0.25;
      } else if (mainTabRef.current === 'audiobooks' && dx < 0) {
        constrainedDx = dx * 0.25;
      }

      currentDragPx.current = constrainedDx;
      if (stripRef.current) {
        const basePercent = mainTabRef.current === 'books' ? 0 : -50;
        stripRef.current.style.transition = 'none';
        stripRef.current.style.transform = `translate3d(calc(${basePercent}% + ${constrainedDx / 2}px), 0, 0)`;
      }
    }
  }, [canSwipe]);

  const handleTouchEnd = useCallback(() => {
    if (!canSwipe || !touchStartPos.current || !isHorizontalSwipe.current) {
      touchStartPos.current = null;
      isHorizontalSwipe.current = null;
      currentDragPx.current = 0;
      isDraggingRef.current = false;
      return;
    }

    const dx = currentDragPx.current;
    const dt = Date.now() - touchStartPos.current.time;
    const velocity = Math.abs(dx) / (dt || 1);

    touchStartPos.current = null;
    isHorizontalSwipe.current = null;
    isDraggingRef.current = false;

    const threshold = 45;
    let targetTab: 'books' | 'audiobooks' = mainTabRef.current;

    if (mainTabRef.current === 'books' && (dx < -threshold || (dx < -20 && velocity > 0.25))) {
      targetTab = 'audiobooks';
    } else if (mainTabRef.current === 'audiobooks' && (dx > threshold || (dx > 20 && velocity > 0.25))) {
      targetTab = 'books';
    }

    if (stripRef.current) {
      stripRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)';
      const targetPercent = targetTab === 'books' ? 0 : -50;
      stripRef.current.style.transform = `translate3d(${targetPercent}%, 0, 0)`;
    }

    if (targetTab !== mainTabRef.current) {
      mainTabRef.current = targetTab;
      setMainTab(targetTab);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15);
        }
      } catch {}
    }
  }, [canSwipe]);

  const handleTouchCancel = useCallback(() => {
    touchStartPos.current = null;
    isHorizontalSwipe.current = null;
    currentDragPx.current = 0;
    isDraggingRef.current = false;
    if (stripRef.current) {
      stripRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)';
      const targetPercent = mainTabRef.current === 'books' ? 0 : -50;
      stripRef.current.style.transform = `translate3d(${targetPercent}%, 0, 0)`;
    }
  }, []);

  useEffect(() => {
    if (!activeBook && mainTab === 'audiobooks' && isAudiobooksAtRoot) {
      const unreg = pushBackHandler(() => {
        switchToTab('books');
        return true;
      });
      return unreg;
    }
  }, [activeBook, mainTab, isAudiobooksAtRoot, switchToTab]);

  const handleOpenBook = useCallback(async (book: Book) => {
    try {
      const fullBook = await getBookById(book.id);
      setActiveBook(fullBook || book);
    } catch {
      setActiveBook(book);
    }
  }, []);

  const handleCloseBook = useCallback(() => {
    setActiveBook(null);
    refreshBooks(false);
  }, [refreshBooks]);

  const handleOpenSync = useCallback(() => {
    setShowSyncModal(true);
  }, []);

  const handleCloseSync = useCallback(() => {
    setShowSyncModal(false);
  }, []);

  useEffect(() => {
    if (showSyncModal) {
      const unreg = pushBackHandler(() => {
        setShowSyncModal(false);
        return true;
      });
      return unreg;
    }
  }, [showSyncModal]);

  useEffect(() => {
    if (showSourceCodeModal) {
      const unreg = pushBackHandler(() => {
        setShowSourceCodeModal(false);
        return true;
      });
      return unreg;
    }
  }, [showSourceCodeModal]);

  const handleOpenSourceCode = useCallback(() => {
    setShowSourceCodeModal(true);
  }, []);

  const handleCloseSourceCode = useCallback(() => {
    setShowSourceCodeModal(false);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveStoredSettings(updated);
      return updated;
    });
  }, []);

  const handleUpdateBookProgress = useCallback((
    bookId: string,
    chapterIdx: number,
    scrollPercent: number,
    totalPercent: number
  ) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          return {
            ...b,
            currentChapterIndex: chapterIdx,
            currentScrollPercent: scrollPercent,
            progressPercent: Math.round(totalPercent),
            lastReadTimestamp: Date.now(),
          };
        }
        return b;
      })
    );
  }, []);

  const currentTheme = READER_THEMES[settings.theme] || READER_THEMES.paper;

  useEffect(() => {
    const isDark = currentTheme.isDark;

    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
    document.body.style.backgroundColor = currentTheme.bg;

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', currentTheme.bg);

    try {
      if (Capacitor.isPluginAvailable('StatusBar')) {
        StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light,
        }).catch(() => {});
        StatusBar.setBackgroundColor({
          color: currentTheme.bg,
        }).catch(() => {});
      }
    } catch {
    }
  }, [currentTheme]);

  return (
    <div
      id="ereader-root-app"
      className="relative w-full h-[100dvh] flex flex-col overflow-hidden font-sans select-none transition-colors duration-200"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {settings.brightness < 100 && (
        <div
          className="fixed inset-0 pointer-events-none z-[9999] transition-opacity"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${((100 - settings.brightness) / 100) * 0.72})`,
          }}
        />
      )}

      {isLoading ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center transition-colors"
          style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
        >
          <div
            className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: currentTheme.accent, borderTopColor: 'transparent' }}
          />
          <p className="text-xs font-semibold opacity-70">Загрузка библиотеки...</p>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {activeBook ? (
            <motion.div
              key={`reader-${activeBook.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full h-full"
            >
              <ReaderView
                book={activeBook}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onBackToLibrary={handleCloseBook}
                onUpdateBookProgress={handleUpdateBookProgress}
              />
            </motion.div>
          ) : (
            <div className="relative w-full h-full flex flex-col overflow-hidden">
              <div
                id="main-tabs-swipe-viewport"
                className="flex-1 w-full h-full overflow-hidden relative select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <div
                  ref={stripRef}
                  id="main-tabs-sliding-strip"
                  className="w-[200%] h-full flex flex-row will-change-transform"
                  style={{
                    transform: mainTab === 'books' ? 'translate3d(0%, 0, 0)' : 'translate3d(-50%, 0, 0)',
                    transition: 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)',
                  }}
                >
                  <div
                    className="w-1/2 min-w-[50%] h-full overflow-hidden"
                    aria-hidden={mainTab !== 'books'}
                  >
                    <LibraryView
                      books={books}
                      theme={currentTheme}
                      settings={settings}
                      onUpdateSettings={handleUpdateSettings}
                      onOpenBook={handleOpenBook}
                      onRefreshBooks={refreshBooks}
                      onOpenSync={handleOpenSync}
                      onOpenSourceCode={handleOpenSourceCode}
                      onIsAtRootChange={setIsBooksAtRoot}
                    />
                  </div>

                  <div
                    className="w-1/2 min-w-[50%] h-full overflow-hidden"
                    aria-hidden={mainTab !== 'audiobooks'}
                  >
                    <AudiobookLibraryView
                      theme={currentTheme}
                      settings={settings}
                      onUpdateSettings={handleUpdateSettings}
                      onOpenSourceCode={handleOpenSourceCode}
                      onOpenSync={handleOpenSync}
                      bottomPadding={currentTrack ? 128 : 64}
                      onIsAtRootChange={setIsAudiobooksAtRoot}
                    />
                  </div>
                </div>
              </div>

              <div
                id="main-bottom-navigation"
                className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t backdrop-blur-lg flex items-center justify-around px-6 select-none transition-colors"
                style={{
                  backgroundColor: currentTheme.isDark
                    ? 'rgba(18, 18, 18, 0.95)'
                    : 'rgba(255, 255, 255, 0.96)',
                  borderColor: currentTheme.border,
                  color: currentTheme.text,
                }}
              >
                <button
                  id="tab-btn-books"
                  onClick={() => switchToTab('books')}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer relative ${
                    mainTab === 'books'
                      ? 'text-amber-500 font-bold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
                      mainTab === 'books' ? 'bg-amber-500/15' : ''
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight flex items-center gap-1">
                    Книги
                    {books.length > 0 && (
                      <span className="text-[10px] opacity-75">({books.length})</span>
                    )}
                  </span>
                </button>

                <button
                  id="tab-btn-audiobooks"
                  onClick={() => switchToTab('audiobooks')}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all cursor-pointer relative ${
                    mainTab === 'audiobooks'
                      ? 'text-amber-500 font-bold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
                      mainTab === 'audiobooks' ? 'bg-amber-500/15' : ''
                    }`}
                  >
                    <Headphones className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight">
                    Аудиокниги
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <MiniAudioPlayer
        theme={currentTheme}
        bottomOffset={activeBook ? 24 : 68}
      />

      <AudioPlayerModal theme={currentTheme} />

      {showSyncModal && (
        <SyncDialog
          onClose={handleCloseSync}
          onRefreshLibrary={refreshBooks}
          isDark={currentTheme.isDark}
        />
      )}

      <AnimatePresence>
        {showSourceCodeModal && (
          <SourceCodeModal theme={currentTheme} update={updateCheck} onClose={handleCloseSourceCode} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {updateCheck.showBanner && updateCheck.latest && !showSourceCodeModal && !activeBook && (
          <UpdateBanner
            theme={currentTheme}
            version={updateCheck.latest.version}
            currentVersion={updateCheck.currentVersion}
            onOpen={handleOpenSourceCode}
            onDismiss={updateCheck.dismissBanner}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ duration: 0.16 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none"
          >
            <div className="px-4 py-2.5 rounded-full bg-neutral-900/95 text-neutral-100 text-xs font-semibold shadow-2xl border border-neutral-700/80 backdrop-blur-md flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Нажмите «Назад» ещё раз для выхода</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AudioPlayerProvider>
      <AppContent />
    </AudioPlayerProvider>
  );
}
