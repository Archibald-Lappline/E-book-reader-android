import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Sliders,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Chapter, ReaderThemeConfig } from '../types';
import { getComicArchive, getComicPages } from '../services/storage';
import { tr } from '../i18n';

interface CbzComicReaderProps {
  bookId?: string;
  totalPages?: number;
  initialPage?: number;
  chapters?: Chapter[];
  pages?: string[];
  onPageChange?: (pageIndex: number, totalPages: number) => void;
  theme: ReaderThemeConfig;
  onToggleUI?: () => void;
}

export const CbzComicReader: React.FC<CbzComicReaderProps> = ({
  bookId,
  totalPages = 0,
  initialPage = 0,
  chapters,
  pages,
  onPageChange,
  theme,
  onToggleUI,
}) => {
  // Archive and page caching state
  const zipInstanceRef = useRef<JSZip | null>(null);
  const zipEntryNamesRef = useRef<string[]>([]);
  const pageUrlsCacheRef = useRef<Map<number, string>>(new Map());
  const legacyBlobsRef = useRef<Blob[]>([]);

  const [archiveReady, setArchiveReady] = useState<boolean>(false);
  const [detectedTotalPages, setDetectedTotalPages] = useState<number>(
    totalPages || chapters?.length || pages?.length || 0
  );

  const effectiveTotalPages = Math.max(
    1,
    detectedTotalPages || totalPages || chapters?.length || pages?.length || 1
  );

  const [currentPage, setCurrentPage] = useState<number>(
    Math.max(0, Math.min(effectiveTotalPages - 1, initialPage))
  );

  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);

  // Gesture and view states
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'contain' | 'width'>('contain');
  const [showPageScrubber, setShowPageScrubber] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Initialize archive from IndexedDB off-heap storage (or legacy fallback)
  useEffect(() => {
    let isMounted = true;

    async function initArchive() {
      if (!bookId) {
        setArchiveReady(true);
        return;
      }

      try {
        const archiveBlob = await getComicArchive(bookId);
        if (archiveBlob && isMounted) {
          // JSZip only reads the central directory (~1MB memory regardless of zip size!)
          const zip = await JSZip.loadAsync(archiveBlob);
          zipInstanceRef.current = zip;

          const names = Object.keys(zip.files)
            .filter(
              (name) =>
                /\.(jpe?g|png|webp|gif|avif)$/i.test(name) &&
                !name.startsWith('__MACOSX') &&
                !name.startsWith('.')
            )
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

          zipEntryNamesRef.current = names;
          if (names.length > 0) {
            setDetectedTotalPages((prev) => Math.max(prev, names.length));
          }
        } else {
          // Fallback to comic_pages store (blobs) if archive not present
          const blobs = await getComicPages(bookId);
          if (blobs && blobs.length > 0 && isMounted) {
            legacyBlobsRef.current = blobs;
            setDetectedTotalPages((prev) => Math.max(prev, blobs.length));
          }
        }
      } catch (err) {
        console.warn('Failed to load comic archive in CbzComicReader', err);
      }

      if (isMounted) {
        setArchiveReady(true);
      }
    }

    initArchive();

    return () => {
      isMounted = false;
      // Revoke all created Object URLs on unmount to release GPU textures and memory
      pageUrlsCacheRef.current.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
      });
      pageUrlsCacheRef.current.clear();
      zipInstanceRef.current = null;
    };
  }, [bookId]);

  // 2. Virtual window LRU cache: keep at most [currentPage-1, currentPage, currentPage+1, currentPage+2]
  const evictFarPages = useCallback((currentIdx: number) => {
    const keepMin = Math.max(0, currentIdx - 1);
    const keepMax = currentIdx + 2;

    pageUrlsCacheRef.current.forEach((url, idx) => {
      if (idx < keepMin || idx > keepMax) {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
        pageUrlsCacheRef.current.delete(idx);
      }
    });
  }, []);

  // 3. On-demand page extraction: decompress ONLY the requested page
  const loadPageUrl = useCallback(
    async (pageIdx: number): Promise<string | null> => {
      if (pageIdx < 0) return null;

      // Check cache first
      const cached = pageUrlsCacheRef.current.get(pageIdx);
      if (cached) return cached;

      // Check props.pages array
      if (pages && pages[pageIdx]) {
        pageUrlsCacheRef.current.set(pageIdx, pages[pageIdx]);
        return pages[pageIdx];
      }

      // Check zip archive
      const zip = zipInstanceRef.current;
      if (zip) {
        // Resolve filename in zip
        let entryName = chapters?.[pageIdx]?.content;
        if (!entryName || entryName.startsWith('data:') || entryName.includes('<img')) {
          entryName = zipEntryNamesRef.current[pageIdx];
        }

        if (entryName) {
          const file = zip.file(entryName);
          if (file) {
            try {
              const blob = await file.async('blob');
              const url = URL.createObjectURL(blob);
              pageUrlsCacheRef.current.set(pageIdx, url);
              return url;
            } catch (e) {
              console.warn(`Failed to decompress comic page ${pageIdx}`, e);
            }
          }
        }
      }

      // Check legacy blobs store
      if (legacyBlobsRef.current[pageIdx]) {
        const blob = legacyBlobsRef.current[pageIdx];
        const url = URL.createObjectURL(blob);
        pageUrlsCacheRef.current.set(pageIdx, url);
        return url;
      }

      // Check chapter content string (e.g. data URL or <img src>)
      if (chapters?.[pageIdx]?.content) {
        const raw = chapters[pageIdx].content.trim();
        if (raw.startsWith('data:') || raw.startsWith('http') || raw.startsWith('blob:')) {
          pageUrlsCacheRef.current.set(pageIdx, raw);
          return raw;
        }
        const m = /<img[^>]+src="([^">]+)"/i.exec(raw);
        if (m && m[1]) {
          pageUrlsCacheRef.current.set(pageIdx, m[1]);
          return m[1];
        }
      }

      return null;
    },
    [pages, chapters]
  );

  // 4. Load active page and pre-extract adjacent pages
  useEffect(() => {
    let isMounted = true;
    setIsPageLoading(true);

    loadPageUrl(currentPage).then((url) => {
      if (isMounted) {
        if (url) {
          setCurrentImageUrl(url);
        }
        setIsPageLoading(false);
      }
    });

    // Asynchronously pre-extract next page and previous page
    const timer = window.setTimeout(() => {
      if (!isMounted) return;
      if (currentPage + 1 < effectiveTotalPages) {
        loadPageUrl(currentPage + 1);
      }
      if (currentPage - 1 >= 0) {
        loadPageUrl(currentPage - 1);
      }
      evictFarPages(currentPage);
    }, 40);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [currentPage, archiveReady, loadPageUrl, evictFarPages, effectiveTotalPages]);

  // Sync page changes upward
  useEffect(() => {
    if (onPageChange && effectiveTotalPages > 0) {
      onPageChange(currentPage, effectiveTotalPages);
    }
  }, [currentPage, effectiveTotalPages, onPageChange]);

  // Reset zoom on page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 0 || newPage >= effectiveTotalPages) return;
      setCurrentPage(newPage);
      setScale(1);
      setPan({ x: 0, y: 0 });
    },
    [effectiveTotalPages]
  );

  const handleNextPage = useCallback(() => {
    if (currentPage < effectiveTotalPages - 1) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, effectiveTotalPages, handlePageChange]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, handlePageChange]);

  // Zoom controls
  const zoomIn = () => {
    setScale((prev) => Math.min(4.5, parseFloat((prev + 0.35).toFixed(2))));
  };

  const zoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, parseFloat((prev - 0.35).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Double tap to toggle zoom
  const handleDoubleTap = (clientX: number, clientY: number) => {
    if (scale > 1.05) {
      resetZoom();
    } else {
      if (!containerRef.current) {
        setScale(2.2);
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left - rect.width / 2;
      const offsetY = clientY - rect.top - rect.height / 2;
      setScale(2.2);
      setPan({ x: -offsetX * 0.8, y: -offsetY * 0.8 });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (scale === 1) {
          e.preventDefault();
          handleNextPage();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (scale === 1) {
          e.preventDefault();
          handlePrevPage();
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0' || e.key === 'Escape') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, scale]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || scale > 1) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setScale((prev) => {
        const next = Math.max(1, Math.min(4.5, parseFloat((prev + delta).toFixed(2))));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse drag handling when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gesture handling: pinch-to-zoom & swipe/pan
  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    if (touches.length === 2) {
      // Pinch started
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchScaleRef.current = scale;
      setIsPinching(true);
      setIsDragging(false);
    } else if (touches.length === 1) {
      const touch = touches[0];
      const now = Date.now();

      // Check double-tap
      if (now - lastTapTimeRef.current < 300) {
        handleDoubleTap(touch.clientX, touch.clientY);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      panStartRef.current = { ...pan };

      if (scale > 1) {
        setIsDragging(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    if (touches.length === 2 && initialPinchDistRef.current !== null) {
      // Active pinch-to-zoom
      e.preventDefault();
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const newScale = Math.max(1, Math.min(4.5, initialPinchScaleRef.current * ratio));
      setScale(parseFloat(newScale.toFixed(2)));
      if (newScale === 1) {
        setPan({ x: 0, y: 0 });
      }
    } else if (touches.length === 1 && scale > 1 && isDragging) {
      // Pan image while zoomed
      e.preventDefault();
      const touch = touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
      setIsPinching(false);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      setIsPinching(false);

      // Handle swipe to turn page when scale is 1
      if (scale <= 1.05 && lastTouchRef.current) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;

        // Horizontal swipe detected (dx > 50px and dx > 1.4 * dy)
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx < 0) {
            handleNextPage();
          } else {
            handlePrevPage();
          }
        }
      }
    }
  };

  // Center tap vs Edge tap
  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    if (scale > 1.05) return; // Don't trigger page turn when zoomed

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Left 22% -> Previous page
    if (x < width * 0.22) {
      handlePrevPage();
      return;
    }

    // Right 22% -> Next page
    if (x > width * 0.78) {
      handleNextPage();
      return;
    }

    // Center 56% -> Toggle overlay header/footer
    if (onToggleUI) {
      onToggleUI();
    }
  };

  return (
    <div
      ref={containerRef}
      id="cbz-comic-reader-viewport"
      className="relative w-full h-full overflow-hidden select-none flex items-center justify-center cursor-default"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        touchAction: scale > 1 ? 'none' : 'pan-y',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
    >
      {/* Comic Page Display with Smooth GPU-accelerated Scaling & Pan */}
      <div
        className="w-full h-full flex items-center justify-center p-1 sm:p-3 pointer-events-none"
        style={{
          perspective: '1000px',
        }}
      >
        {currentImageUrl ? (
          <div
            key={`page-${currentPage}`}
            className="relative flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging || isPinching ? 'none' : 'transform 0.16s ease-out',
              willChange: 'transform',
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
          >
            <img
              ref={imageRef}
              src={currentImageUrl}
              alt={tr`Страница ${currentPage + 1}`}
              draggable={false}
              decoding="async"
              loading="eager"
              className={`rounded-lg shadow-2xl select-none transition-opacity duration-150 ${
                fitMode === 'width'
                  ? 'w-full h-auto object-contain'
                  : 'max-w-full max-h-[88vh] object-contain'
              } ${isPageLoading ? 'opacity-80' : 'opacity-100'}`}
            />
            {isPageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-xs rounded-lg">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            )}
          </div>
        ) : isPageLoading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium opacity-70">
              {tr("Загрузка страницы")} {currentPage + 1}...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center opacity-60 text-sm gap-2">
            <Sparkles className="w-8 h-8 text-amber-500" />
            <p>{tr`Страница ${currentPage + 1} не найдена в архиве`}</p>
          </div>
        )}
      </div>

      {/* Floating Zoom & Comic Navigation Toolbar */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-3 py-1.5 rounded-full shadow-2xl border backdrop-blur-md flex items-center gap-1.5 sm:gap-2 transition-all"
          style={{
            backgroundColor: theme.isDark ? 'rgba(24, 24, 27, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          {/* Zoom Out */}
          <button
            id="btn-comic-zoom-out"
            onClick={zoomOut}
            disabled={scale <= 1}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
            title={tr("Отдалить (Ctrl -)")}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Level Indicator / Reset */}
          <button
            id="btn-comic-zoom-reset"
            onClick={resetZoom}
            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              scale > 1
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
            }`}
            title={tr("Сбросить масштаб (100%)")}
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            id="btn-comic-zoom-in"
            onClick={zoomIn}
            disabled={scale >= 4.5}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
            title={tr("Приблизить (Ctrl +)")}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-inherit/25 mx-0.5" />

          {/* Previous Page */}
          <button
            id="btn-comic-prev-page"
            onClick={handlePrevPage}
            disabled={currentPage <= 0}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
            title={tr("Предыдущая страница (←)")}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Counter / Scrubber Toggle */}
          <button
            id="btn-comic-page-scrubber-toggle"
            onClick={() => setShowPageScrubber((prev) => !prev)}
            className="px-2 py-0.5 rounded-lg text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1"
            title={tr("Открыть переход по страницам")}
          >
            <span>{currentPage + 1}</span>
            <span className="opacity-50">/</span>
            <span className="opacity-70">{effectiveTotalPages}</span>
          </button>

          {/* Next Page */}
          <button
            id="btn-comic-next-page"
            onClick={handleNextPage}
            disabled={currentPage >= effectiveTotalPages - 1}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
            title={tr("Следующая страница (→)")}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-inherit/25 mx-0.5 hidden sm:block" />

          {/* Fit Mode Toggle */}
          <button
            id="btn-comic-fit-mode"
            onClick={() => setFitMode((prev) => (prev === 'contain' ? 'width' : 'contain'))}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer hidden sm:block opacity-75 hover:opacity-100"
            title={fitMode === 'contain' ? tr("По ширине экрана") : tr("По высоте экрана")}
          >
            {fitMode === 'contain' ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Page Scrubber Modal / Slider Overlay */}
      <AnimatePresence>
        {showPageScrubber && (
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex flex-col justify-end"
            onClick={() => setShowPageScrubber(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="p-5 rounded-t-3xl border-t shadow-2xl space-y-3"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  {tr("Переход по страницам комикса")}
                </span>
                <span className="font-mono text-amber-500">
                  {tr`Страница ${currentPage + 1} из ${effectiveTotalPages}`}
                </span>
              </div>

              <input
                id="comic-page-slider"
                type="range"
                min={0}
                max={Math.max(0, effectiveTotalPages - 1)}
                value={currentPage}
                onChange={(e) => handlePageChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-black/15 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden"
              />

              <div className="flex justify-between items-center pt-1 text-[11px] opacity-65">
                <span>{tr("1: Начало")}</span>
                <span>
                  {tr`${Math.round(((currentPage + 1) / effectiveTotalPages) * 100)}% прочитано`}
                </span>
                <span>{tr`${effectiveTotalPages}: Конец`}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
