import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  List,
  Type,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  X
} from 'lucide-react';
import { Book, Note, Bookmark, ReaderSettings, PageTransitionEffect } from '../types';
import { READER_THEMES } from '../utils/themeConfig';
import { applyHighlightsToHtml } from '../utils/highlight';
import { SettingsSheet } from './SettingsSheet';
import { NotesDrawer } from './NotesDrawer';
import { TocDrawer } from './TocDrawer';
import { TextSelectionToolbar } from './TextSelectionToolbar';
import { BookSearchModal } from './BookSearchModal';
import { CbzComicReader } from './CbzComicReader';
import {
  CelebrationModal,
  PAGE_MILESTONE_INTERVAL,
  BOOK_FINISHED_GIF_SRC,
  PAGE_MILESTONE_GIF_SRC,
} from './CelebrationModal';
import { useChapterPageCounts } from '../utils/useChapterPageCounts';
import { pushBackHandler } from '../utils/androidBackNavigation';
import {
  updateReadingProgress,
  getBookNotes,
  saveNote,
  deleteNote,
  getBookBookmarks,
  saveBookmark,
  deleteBookmark,
  getComicPages,
  getBookById
} from '../services/storage';
import { tr } from '../i18n';

interface ReaderViewProps {
  book: Book;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onBackToLibrary: () => void;
  onUpdateBookProgress: (bookId: string, chapterIdx: number, scrollPercent: number, totalPercent: number) => void;
}

const getFontFamily = (family: string) => {
  switch (family) {
    case 'literata': return "'Literata', Georgia, serif";
    case 'ptserif': return "'PT Serif', Georgia, serif";
    case 'merriweather': return "'Merriweather', Georgia, serif";
    case 'lora': return "'Lora', Georgia, serif";
    case 'ptsans': return "'PT Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    case 'roboto': return "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif";
    case 'mono': return "'JetBrains Mono', monospace";
    case 'dyslexic': return "'OpenDyslexic', 'OpenDyslexicCyrillic', 'Comic Sans MS', system-ui, sans-serif";
    default: return "'Literata', Georgia, serif";
  }
};

export const ReaderView: React.FC<ReaderViewProps> = ({
                                                        book,
                                                        settings,
                                                        onUpdateSettings,
                                                        onBackToLibrary,
                                                        onUpdateBookProgress,
                                                      }) => {
  const chapters = book.chapters || [];
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(
      Math.min(Math.max(0, book.currentChapterIndex || 0), Math.max(0, chapters.length - 1))
  );
  const [currentPageInChapter, setCurrentPageInChapter] = useState<number>(0);
  const [totalPagesInChapter, setTotalPagesInChapter] = useState<number>(1);
  const [showBars, setShowBars] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [showBookCompleted, setShowBookCompleted] = useState<boolean>(false);
  // Уведомление «каждая N-я страница книги» (хранит номер страницы, на которой сработало)
  const [milestonePage, setMilestonePage] = useState<number | null>(null);
  const shownMilestonesRef = useRef<Set<number>>(new Set());
  const [turnAnimation, setTurnAnimation] = useState<{
    id: number;
    direction: 'next' | 'prev';
    type: PageTransitionEffect;
    outgoingHtml: string;
    outgoingScrollLeft: number;
  } | null>(null);
  const animTimeoutRef = useRef<any>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPos, setSelectionPos] = useState<{ top: number; left: number; bottom?: number; right?: number } | null>(null);
  const [activeNotePopup, setActiveNotePopup] = useState<Note | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number; isEdge: boolean } | null>(null);

  const isWritingNoteRef = useRef<boolean>(false);
  const isSelectingPointerDownRef = useRef<boolean>(false);
  const selectionDebounceTimerRef = useRef<number | null>(null);
  const lastSelectionTimestampRef = useRef<number>(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingGoToLastPageRef = useRef<boolean>(false);
  const isInitialProgressRestored = useRef<boolean>(false);

  const isProgrammaticScrollRef = useRef<boolean>(false);
  const currentPageInChapterRef = useRef<number>(0);
  currentPageInChapterRef.current = currentPageInChapter;
  const activeSelectionRangeRef = useRef<Range | null>(null);

  // Exact page navigation locator reference
  const pendingTargetJumpRef = useRef<{
    chapterIndex: number;
    noteId?: string;
    text?: string;
    prefixContext?: string;
    suffixContext?: string;
    charIndex?: number;
    contextSnippet?: string;
    matchIndexInChapter?: number;
    pageIndexInChapter?: number;
  } | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 700,
  });

  const currentTheme = READER_THEMES[settings.theme] || READER_THEMES.paper;
  const currentChapter = chapters[currentChapterIdx] || chapters[0] || { id: 'empty', title: tr("Начало книги"), content: tr("<p>Текст книги...</p>") };

  // CBZ comic / manga dedicated page extraction
  const isCbzBook = book.format === 'cbz';
  const [comicPages, setComicPages] = useState<string[]>([]);
  const comicProgressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isCbzBook) {
      setComicPages([]);
      return;
    }

    let isMounted = true;
    const createdUrls: string[] = [];

    // Optional legacy fallback extraction for books with inline base64 or stored blobs
    async function loadLegacyPages() {
      try {
        let pageUrls: string[] = [];

        // Check if chapters contain inline data URLs or img tags
        let bookChapters = chapters;
        if (!bookChapters || bookChapters.length === 0 || bookChapters.every((c) => !c.content)) {
          const fullBook = await getBookById(book.id);
          if (fullBook && fullBook.chapters && fullBook.chapters.length > 0) {
            bookChapters = fullBook.chapters;
          }
        }

        if (bookChapters && bookChapters.length > 0) {
          for (const ch of bookChapters) {
            if (!ch.content) continue;
            const trimmed = ch.content.trim();
            if (trimmed.startsWith('data:') || trimmed.startsWith('http') || trimmed.startsWith('blob:')) {
              pageUrls.push(trimmed);
              continue;
            }
            const rx = /<img[^>]+src="([^">]+)"/gi;
            let m: RegExpExecArray | null;
            while ((m = rx.exec(ch.content)) !== null) {
              pageUrls.push(m[1]);
            }
          }
        }

        if (pageUrls.length === 0) {
          const blobs = await getComicPages(book.id);
          if (blobs && blobs.length > 0) {
            pageUrls = blobs.map((b) => {
              const u = URL.createObjectURL(b);
              createdUrls.push(u);
              return u;
            });
          }
        }

        if (isMounted && pageUrls.length > 0) {
          setComicPages(pageUrls);
        }
      } catch (err) {
        console.warn('Legacy comic pages check complete', err);
      }
    }

    loadLegacyPages();

    return () => {
      isMounted = false;
      createdUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      if (comicProgressTimerRef.current) {
        window.clearTimeout(comicProgressTimerRef.current);
      }
    };
  }, [isCbzBook, book.id, chapters]);

  const initialComicPage = useMemo(() => {
    if (!isCbzBook) return 0;
    const total = book.totalPages || book.chapters?.length || comicPages.length || 0;
    if (total <= 0) return 0;
    if (book.currentChapterIndex > 0 && book.currentChapterIndex < total) {
      return book.currentChapterIndex;
    }
    if (book.progressPercent > 0) {
      return Math.min(
          total - 1,
          Math.floor((book.progressPercent / 100) * total)
      );
    }
    return 0;
  }, [isCbzBook, book.currentChapterIndex, book.totalPages, book.chapters, comicPages.length, book.progressPercent]);

  // Debounce comic progress updates to eliminate heavy IndexedDB disk write freezes during fast page turns
  const handleComicPageChange = useCallback(
      (pageIdx: number, total: number) => {
        if (total <= 0) return;
        const progress = Math.min(100, Math.round(((pageIdx + 1) / total) * 100));

        if (comicProgressTimerRef.current) {
          window.clearTimeout(comicProgressTimerRef.current);
        }
        comicProgressTimerRef.current = window.setTimeout(() => {
          onUpdateBookProgress(book.id, pageIdx, 0, progress);
          updateReadingProgress(book.id, pageIdx, 0, progress);
        }, 700);
      },
      [book.id, onUpdateBookProgress]
  );

  const renderedHtml = useMemo(() => {
    const chapterNotes = notes.filter((n) => n.chapterIndex === currentChapterIdx);
    let html = applyHighlightsToHtml(currentChapter.content, chapterNotes);

    if (activeSearchTerm && activeSearchTerm.trim().length >= 2) {
      const term = activeSearchTerm.trim();
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi');
      html = html.replace(
          regex,
          `<mark class="search-match bg-amber-400/50 text-inherit px-0.5 rounded-xs ring-1 ring-amber-500 font-bold">$1</mark>`
      );
    }

    return html;
  }, [currentChapter.content, notes, currentChapterIdx, activeSearchTerm]);

  const loadNotesAndBookmarks = useCallback(async () => {
    const loadedNotes = await getBookNotes(book.id);
    const loadedBookmarks = await getBookBookmarks(book.id);
    setNotes(loadedNotes);
    setBookmarks(loadedBookmarks);
  }, [book.id]);

  useEffect(() => {
    loadNotesAndBookmarks();
  }, [loadNotesAndBookmarks]);

  useEffect(() => {
    const found = bookmarks.some((bm) => bm.chapterIndex === currentChapterIdx);
    setIsBookmarked(found);
  }, [bookmarks, currentChapterIdx]);

  const paddingHorizontal = settings.marginHorizontal;
  // Ensure content leaves generous clearance for status bar and gesture pill
  const paddingTop = isMobile ? 52 : 36;
  const paddingBottom = isMobile ? 44 : 36;
  const pageGap = 32;

  const pageWidth = Math.max(260, dimensions.width - paddingHorizontal * 2);
  const pageHeight = Math.max(260, dimensions.height - paddingTop - paddingBottom);

  // Число страниц в каждой главе — для сквозной нумерации страниц по всей книге
  const chapterPageCounts = useChapterPageCounts({
    chapters,
    enabled: !isCbzBook,
    pageWidth,
    pageHeight,
    pageGap,
    fontFamily: getFontFamily(settings.fontFamily),
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    textAlign: settings.textAlign,
    letterSpacing: settings.letterSpacing,
  });

  /** Номер (с 1) первой страницы главы idx в сквозной нумерации книги минус 1 (= число страниц до неё). */
  const getPagesBeforeChapter = useCallback(
      (idx: number) => {
        const measured = chapterPageCounts.filter((c) => c > 0);
        const avg = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : 1;
        let sum = 0;
        for (let i = 0; i < idx; i++) {
          sum += chapterPageCounts[i] > 0 ? chapterPageCounts[i] : avg;
        }
        return Math.round(sum);
      },
      [chapterPageCounts]
  );

  useEffect(() => {
    if (!viewportRef.current) return;
    const updateSize = () => {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  const recalculatePages = useCallback(() => {
    if (!contentRef.current || pageWidth <= 0) return;
    const scrollWidth = contentRef.current.scrollWidth;
    const total = Math.max(1, Math.round((scrollWidth + pageGap) / (pageWidth + pageGap)));
    setTotalPagesInChapter((prevTotal) => (prevTotal !== total ? total : prevTotal));

    setCurrentPageInChapter((prev) => {
      if (pendingGoToLastPageRef.current) {
        const lastPage = Math.max(0, total - 1);
        if (contentRef.current) {
          contentRef.current.scrollLeft = lastPage * (pageWidth + pageGap);
        }
        return lastPage;
      }
      return prev >= total ? Math.max(0, total - 1) : prev;
    });
  }, [pageWidth, pageGap]);

  // Helper to locate exact page of a note, search match, bookmark, or character position
  const locateAndJumpToTarget = useCallback(
      (target: {
        chapterIndex: number;
        noteId?: string;
        text?: string;
        prefixContext?: string;
        suffixContext?: string;
        charIndex?: number;
        contextSnippet?: string;
        matchIndexInChapter?: number;
        pageIndexInChapter?: number;
      }) => {
        if (!contentRef.current || pageWidth <= 0) return false;
        const currentScrollWidth = contentRef.current.scrollWidth;
        const pageStep = pageWidth + pageGap;
        const calcTotal = Math.max(1, Math.round((currentScrollWidth + pageGap) / pageStep));
        const containerRect = contentRef.current.getBoundingClientRect();
        const currentScrollLeft = contentRef.current.scrollLeft || 0;

        const jumpToPage = (targetPage: number, highlightEl?: HTMLElement) => {
          const safePage = Math.max(0, Math.min(calcTotal - 1, targetPage));
          isProgrammaticScrollRef.current = true;
          currentPageInChapterRef.current = safePage;
          setCurrentPageInChapter(safePage);
          if (contentRef.current) {
            contentRef.current.scrollLeft = safePage * pageStep;
          }
          if (highlightEl) {
            highlightEl.classList.remove('note-target-focused');
            void highlightEl.offsetWidth; // trigger reflow
            highlightEl.classList.add('note-target-focused');
            setTimeout(() => {
              highlightEl.classList.remove('note-target-focused');
            }, 2200);
          }
          setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 250);
          return true;
        };

        const jumpToRelativeX = (relX: number, highlightEl?: HTMLElement) => {
          // Multi-column page calculation: column k starts at k * pageStep and ends at k * pageStep + pageWidth
          const targetPage = Math.max(0, Math.min(calcTotal - 1, Math.floor((relX + 4) / pageStep)));
          return jumpToPage(targetPage, highlightEl);
        };

        // 1. Direct NOTE ID match: every note is rendered as <mark data-note-id="..."> in DOM!
        if (target.noteId) {
          const marks = Array.from(contentRef.current.querySelectorAll(`[data-note-id="${target.noteId}"]`)) as HTMLElement[];
          if (marks.length > 0) {
            const firstMark = marks[0];
            const rects = Array.from(firstMark.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
            const firstRect = rects.length > 0 ? rects[0] : firstMark.getBoundingClientRect();
            if (firstRect.width > 0 || firstRect.height > 0 || firstRect.left !== 0) {
              const relX = (firstRect.left - containerRect.left) + currentScrollLeft;
              return jumpToRelativeX(relX, firstMark);
            }
          }
        }

        // 2. Search match by index:
        if (typeof target.matchIndexInChapter === 'number' && target.matchIndexInChapter >= 0) {
          const marks = contentRef.current.querySelectorAll('mark.search-match');
          if (marks.length > target.matchIndexInChapter) {
            const mark = marks[target.matchIndexInChapter] as HTMLElement;
            const rects = Array.from(mark.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
            const firstRect = rects.length > 0 ? rects[0] : mark.getBoundingClientRect();
            if (firstRect.width > 0 || firstRect.height > 0 || firstRect.left !== 0) {
              const relX = (firstRect.left - containerRect.left) + currentScrollLeft;
              return jumpToRelativeX(relX, mark);
            }
          }
        }

        // 3. Match against existing highlights in the chapter by note text or snippet
        if (target.text && target.text.trim().length > 0) {
          const cleanSnippet = target.text.replace(/\s+/g, ' ').trim().toLowerCase();
          const highlights = Array.from(contentRef.current.querySelectorAll('mark.reader-highlight')) as HTMLElement[];
          for (const h of highlights) {
            const hText = (h.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (hText === cleanSnippet || (cleanSnippet.length >= 6 && (hText.includes(cleanSnippet) || cleanSnippet.includes(hText)))) {
              const rects = Array.from(h.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
              const firstRect = rects.length > 0 ? rects[0] : h.getBoundingClientRect();
              if (firstRect.width > 0 || firstRect.height > 0 || firstRect.left !== 0) {
                const relX = (firstRect.left - containerRect.left) + currentScrollLeft;
                return jumpToRelativeX(relX, h);
              }
            }
          }
        }

        // 4. Exact text search in DOM text nodes using context and charIndex
        const searchText = (target.text || target.contextSnippet || '').trim();
        if (searchText.length > 0) {
          const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
          const textNodes: Array<{ node: Text; start: number; end: number; val: string }> = [];
          let fullText = '';
          let n: Node | null;
          while ((n = walker.nextNode())) {
            const tNode = n as Text;
            const val = tNode.nodeValue || '';
            textNodes.push({
              node: tNode,
              start: fullText.length,
              end: fullText.length + val.length,
              val,
            });
            fullText += val;
          }

          const occurrences: number[] = [];
          let pos = 0;
          while ((pos = fullText.indexOf(searchText, pos)) !== -1) {
            occurrences.push(pos);
            pos += Math.max(1, searchText.length);
          }

          if (occurrences.length === 0) {
            const lowerFull = fullText.toLowerCase();
            const lowerSearch = searchText.toLowerCase();
            pos = 0;
            while ((pos = lowerFull.indexOf(lowerSearch, pos)) !== -1) {
              occurrences.push(pos);
              pos += Math.max(1, lowerSearch.length);
            }
          }

          if (occurrences.length > 0) {
            let chosenMatchStart = occurrences[0];
            if (occurrences.length > 1) {
              if (target.prefixContext || target.suffixContext) {
                const pref = (target.prefixContext || '').slice(-20);
                const suff = (target.suffixContext || '').slice(0, 20);
                let bestScore = -1;
                for (const occ of occurrences) {
                  let score = 0;
                  if (pref && fullText.slice(Math.max(0, occ - pref.length), occ).includes(pref)) score += 2;
                  if (suff && fullText.slice(occ + searchText.length, occ + searchText.length + suff.length).includes(suff)) score += 2;
                  if (typeof target.charIndex === 'number') {
                    score -= Math.abs(occ - target.charIndex) / 1000;
                  }
                  if (score > bestScore) {
                    bestScore = score;
                    chosenMatchStart = occ;
                  }
                }
              } else if (typeof target.charIndex === 'number' && target.charIndex >= 0) {
                let bestDist = Math.abs(occurrences[0] - target.charIndex);
                for (const occ of occurrences) {
                  const dist = Math.abs(occ - target.charIndex);
                  if (dist < bestDist) {
                    bestDist = dist;
                    chosenMatchStart = occ;
                  }
                }
              }
            }

            const startEntry = textNodes.find((e) => chosenMatchStart >= e.start && chosenMatchStart < e.end);
            if (startEntry) {
              try {
                const range = document.createRange();
                range.setStart(startEntry.node, chosenMatchStart - startEntry.start);
                const endEntry = textNodes.find((e) => chosenMatchStart + searchText.length > e.start && chosenMatchStart + searchText.length <= e.end) || startEntry;
                const localEnd = endEntry === startEntry
                    ? Math.min(startEntry.val.length, chosenMatchStart - startEntry.start + searchText.length)
                    : Math.min(endEntry.val.length, (chosenMatchStart + searchText.length) - endEntry.start);
                range.setEnd(endEntry.node, localEnd);

                const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
                const firstRect = rects[0] || range.getBoundingClientRect();
                if (firstRect.width > 0 || firstRect.height > 0 || firstRect.left !== 0) {
                  const relX = (firstRect.left - containerRect.left) + currentScrollLeft;
                  return jumpToRelativeX(relX);
                }
              } catch {
                // Range failed, continue
              }
            }
          }
        }

        // 5. Fallback: stored page index from Note/Bookmark
        if (typeof target.pageIndexInChapter === 'number' && target.pageIndexInChapter >= 0) {
          return jumpToPage(target.pageIndexInChapter);
        }

        return false;
      },
      [pageWidth, pageGap]
  );

  useLayoutEffect(() => {
    recalculatePages();

    const checkPendingJump = () => {
      if (pendingTargetJumpRef.current) {
        const pending = pendingTargetJumpRef.current;
        if (pending.chapterIndex === currentChapterIdx) {
          locateAndJumpToTarget(pending);
        }
      }
    };

    checkPendingJump();
    const t1 = setTimeout(() => {
      recalculatePages();
      checkPendingJump();
    }, 50);
    const t2 = setTimeout(() => {
      recalculatePages();
      checkPendingJump();
    }, 150);
    const t3 = setTimeout(() => {
      recalculatePages();
      checkPendingJump();
    }, 300);
    const tClear = setTimeout(() => {
      pendingGoToLastPageRef.current = false;
      if (pendingTargetJumpRef.current && pendingTargetJumpRef.current.chapterIndex === currentChapterIdx) {
        locateAndJumpToTarget(pendingTargetJumpRef.current);
        pendingTargetJumpRef.current = null;
      }
    }, 450);

    if (contentRef.current) {
      const imgs = contentRef.current.querySelectorAll('img');
      imgs.forEach((img) => {
        if (!img.complete) {
          img.addEventListener('load', () => {
            recalculatePages();
            checkPendingJump();
          }, { once: true });
        }
      });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tClear);
    };
  }, [
    currentChapterIdx,
    renderedHtml,
    pageWidth,
    pageHeight,
    settings.fontSize,
    settings.fontFamily,
    settings.lineHeight,
    settings.marginHorizontal,
    recalculatePages,
    locateAndJumpToTarget,
  ]);

  useEffect(() => {
    if (!isInitialProgressRestored.current && totalPagesInChapter > 1 && book.currentScrollPercent > 0) {
      isInitialProgressRestored.current = true;
      const targetPage = Math.min(
          totalPagesInChapter - 1,
          Math.round((book.currentScrollPercent / 100) * (totalPagesInChapter - 1))
      );
      if (targetPage > 0) {
        setCurrentPageInChapter(targetPage);
      }
    }
  }, [totalPagesInChapter, book.currentScrollPercent]);

  useEffect(() => {
    if (!contentRef.current || pageWidth <= 0) return;
    const targetScrollLeft = currentPageInChapter * (pageWidth + pageGap);
    if (Math.abs(contentRef.current.scrollLeft - targetScrollLeft) > 2) {
      try {
        contentRef.current.scrollTo({
          left: targetScrollLeft,
          behavior: 'auto',
        });
      } catch {
        contentRef.current.scrollLeft = targetScrollLeft;
      }
    }
  }, [currentPageInChapter, pageWidth, pageGap]);

  const triggerPageTurn = useCallback(
      (direction: 'next' | 'prev') => {
        const transitionType = settings.pageTransition || 'flip';
        if (transitionType === 'none') {
          setTurnAnimation(null);
          return;
        }

        if (animTimeoutRef.current) {
          clearTimeout(animTimeoutRef.current);
        }

        const currentScroll = contentRef.current
            ? contentRef.current.scrollLeft
            : currentPageInChapter * (pageWidth + pageGap);

        setTurnAnimation({
          id: Date.now(),
          direction,
          type: transitionType,
          outgoingHtml: renderedHtml,
          outgoingScrollLeft: currentScroll,
        });

        animTimeoutRef.current = setTimeout(() => {
          setTurnAnimation(null);
        }, 480);
      },
      [settings.pageTransition, renderedHtml, currentPageInChapter, pageWidth, pageGap]
  );

  const handleNextPage = useCallback(() => {
    // Сквозной номер страницы (с 1), на которую перейдёт читатель
    const maybeShowMilestone = (globalPage: number) => {
      if (settings.showPageMilestone === false) return; // отключено в «Оформлении»
      if (globalPage % PAGE_MILESTONE_INTERVAL !== 0) return;
      const key = globalPage / PAGE_MILESTONE_INTERVAL;
      if (shownMilestonesRef.current.has(key)) return;
      shownMilestonesRef.current.add(key);
      setMilestonePage(globalPage);
    };

    if (currentPageInChapter < totalPagesInChapter - 1) {
      triggerPageTurn('next');
      setCurrentPageInChapter((prev) => prev + 1);
      maybeShowMilestone(getPagesBeforeChapter(currentChapterIdx) + currentPageInChapter + 2);
    } else if (currentChapterIdx < chapters.length - 1) {
      triggerPageTurn('next');
      maybeShowMilestone(getPagesBeforeChapter(currentChapterIdx) + totalPagesInChapter + 1);
      pendingGoToLastPageRef.current = false;
      setCurrentChapterIdx((prev) => prev + 1);
      setCurrentPageInChapter(0);
      if (contentRef.current) {
        contentRef.current.scrollLeft = 0;
      }
    } else {
      setShowBookCompleted(true);
      updateReadingProgress(book.id, currentChapterIdx, 100, 100);
      onUpdateBookProgress(book.id, currentChapterIdx, 100, 100);
    }
  }, [currentPageInChapter, totalPagesInChapter, currentChapterIdx, chapters.length, book.id, onUpdateBookProgress, triggerPageTurn, getPagesBeforeChapter, settings.showPageMilestone]);

  const handlePrevPage = useCallback(() => {
    if (currentPageInChapter > 0) {
      triggerPageTurn('prev');
      setCurrentPageInChapter((prev) => prev - 1);
    } else if (currentChapterIdx > 0) {
      triggerPageTurn('prev');
      pendingGoToLastPageRef.current = true;
      setCurrentPageInChapter(999999);
      setCurrentChapterIdx((prev) => prev - 1);
    }
  }, [currentPageInChapter, currentChapterIdx, triggerPageTurn]);

  const totalChapters = Math.max(1, chapters.length);
  const isLastChapter = currentChapterIdx >= totalChapters - 1;
  const isLastPageInLastChapter = isLastChapter && (totalPagesInChapter <= 1 || currentPageInChapter >= totalPagesInChapter - 1);

  const chapterFraction = totalPagesInChapter > 1
      ? currentPageInChapter / (totalPagesInChapter - 1)
      : (isLastChapter ? 1 : 0);

  const overallProgress = (showBookCompleted || isLastPageInLastChapter)
      ? 100
      : Math.min(99, Math.max(0, Math.round(((currentChapterIdx + chapterFraction) / totalChapters) * 100)));

  const lastReportedProgressRef = useRef<string>('');

  useEffect(() => {
    const chapterScrollPercent = totalPagesInChapter > 1
        ? Math.round((currentPageInChapter / (totalPagesInChapter - 1)) * 100)
        : 0;

    const isFinished = showBookCompleted || (isLastChapter && (totalPagesInChapter <= 1 || currentPageInChapter >= totalPagesInChapter - 1));
    const effectiveProgress = isFinished
        ? 100
        : (overallProgress > 0
            ? overallProgress
            : (totalPagesInChapter > 1 ? Math.round(chapterFraction * 100) : 0));

    const progressKey = `${book.id}-${currentChapterIdx}-${currentPageInChapter}-${totalPagesInChapter}-${effectiveProgress}`;
    if (lastReportedProgressRef.current === progressKey) {
      return;
    }
    lastReportedProgressRef.current = progressKey;

    updateReadingProgress(book.id, currentChapterIdx, chapterScrollPercent, effectiveProgress);
    onUpdateBookProgress(book.id, currentChapterIdx, chapterScrollPercent, effectiveProgress);
  }, [
    book.id,
    currentChapterIdx,
    currentPageInChapter,
    totalPagesInChapter,
    chapterFraction,
    overallProgress,
    showBookCompleted,
    isLastChapter,
    onUpdateBookProgress
  ]);

  const openToc = () => setShowToc(true);
  const closeToc = () => setShowToc(false);

  const openSearch = () => setShowSearch(true);
  const closeSearch = () => setShowSearch(false);

  const openSettings = () => setShowSettings(true);
  const closeSettings = () => setShowSettings(false);

  const openNotes = () => setShowNotes(true);
  const closeNotes = () => setShowNotes(false);

  const allSearchMatches = useMemo(() => {
    if (!activeSearchTerm || activeSearchTerm.trim().length < 2) return [];
    const query = activeSearchTerm.trim().toLowerCase();
    const list: Array<{ chapterIndex: number; matchIndexInChapter: number; charIndex: number }> = [];
    const tempDiv = document.createElement('div');

    chapters.forEach((ch, chIdx) => {
      tempDiv.innerHTML = ch.content;
      const text = (tempDiv.textContent || tempDiv.innerText || '').toLowerCase();
      let startIndex = 0;
      let occurrence = 0;
      while (startIndex < text.length && list.length < 300) {
        const found = text.indexOf(query, startIndex);
        if (found === -1) break;
        list.push({
          chapterIndex: chIdx,
          matchIndexInChapter: occurrence++,
          charIndex: found,
        });
        startIndex = found + Math.max(1, query.length);
      }
    });
    return list;
  }, [activeSearchTerm, chapters]);

  const [activeMatchGlobalIdx, setActiveMatchGlobalIdx] = useState<number>(0);

  const jumpToSearchMatch = useCallback((match: { chapterIndex: number; matchIndexInChapter: number; charIndex: number }) => {
    pendingGoToLastPageRef.current = false;
    pendingTargetJumpRef.current = {
      chapterIndex: match.chapterIndex,
      text: activeSearchTerm,
      charIndex: match.charIndex,
      matchIndexInChapter: match.matchIndexInChapter,
    };

    if (match.chapterIndex === currentChapterIdx) {
      locateAndJumpToTarget(pendingTargetJumpRef.current);
    } else {
      setCurrentChapterIdx(match.chapterIndex);
      setCurrentPageInChapter(0);
    }
  }, [activeSearchTerm, currentChapterIdx, locateAndJumpToTarget]);

  const handleNextSearchMatch = () => {
    if (allSearchMatches.length === 0) return;
    const nextIdx = (activeMatchGlobalIdx + 1) % allSearchMatches.length;
    setActiveMatchGlobalIdx(nextIdx);
    jumpToSearchMatch(allSearchMatches[nextIdx]);
  };

  const handlePrevSearchMatch = () => {
    if (allSearchMatches.length === 0) return;
    const prevIdx = (activeMatchGlobalIdx - 1 + allSearchMatches.length) % allSearchMatches.length;
    setActiveMatchGlobalIdx(prevIdx);
    jumpToSearchMatch(allSearchMatches[prevIdx]);
  };

  const handleSelectSearchMatch = (
      chapterIndex: number,
      query: string,
      charIndex: number,
      contextSnippet?: string,
      matchIndexInChapter?: number
  ) => {
    setActiveSearchTerm(query);
    pendingGoToLastPageRef.current = false;
    pendingTargetJumpRef.current = {
      chapterIndex,
      text: query,
      charIndex,
      contextSnippet,
      matchIndexInChapter,
    };

    setTimeout(() => {
      const idx = allSearchMatches.findIndex(
          (m) => m.chapterIndex === chapterIndex && m.matchIndexInChapter === matchIndexInChapter
      );
      if (idx !== -1) {
        setActiveMatchGlobalIdx(idx);
      }
    }, 60);

    if (chapterIndex === currentChapterIdx) {
      locateAndJumpToTarget({
        chapterIndex,
        text: query,
        charIndex,
        contextSnippet,
        matchIndexInChapter,
      });
    } else {
      setCurrentChapterIdx(chapterIndex);
      setCurrentPageInChapter(0);
    }
  };

  // Lock scroll position strictly to prevent browser multi-column drift during touch/selection
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleContainerScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      const expected = currentPageInChapterRef.current * (pageWidth + pageGap);
      if (Math.abs(container.scrollLeft - expected) > 2) {
        container.scrollLeft = expected;
      }
    };
    container.addEventListener('scroll', handleContainerScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleContainerScroll);
  }, [currentPageInChapter, pageWidth, pageGap]);

  // Re-pin container scrollLeft whenever renderedHtml updates (e.g. after note is saved or search highlighted)
  useLayoutEffect(() => {
    if (contentRef.current && pageWidth > 0 && !pendingTargetJumpRef.current) {
      const targetScroll = currentPageInChapterRef.current * (pageWidth + pageGap);
      contentRef.current.scrollLeft = targetScroll;
    }
  }, [renderedHtml, currentPageInChapter, pageWidth, pageGap]);

  // Intercept all link clicks and note clicks in content
  const handleContentClickCapture = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;

    // Check if user clicked an existing note/highlight
    const highlightEl = target?.closest('mark.reader-highlight') as HTMLElement | null;
    if (highlightEl) {
      e.preventDefault();
      e.stopPropagation();
      const noteId = highlightEl.getAttribute('data-note-id');
      if (noteId) {
        const found = notes.find((n) => n.id === noteId);
        if (found) {
          setActiveNotePopup(found);
          return;
        }
      }
    }

    const anchor = target?.closest('a');
    if (!anchor) return;

    e.preventDefault();
    e.stopPropagation();

    const href = anchor.getAttribute('href') || anchor.getAttribute('xlink:href') || '';
    if (!href || href === '#' || href.startsWith('javascript:')) return;

    if (href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetEl = document.getElementById(targetId) || document.querySelector(`[name="${targetId}"]`);
      if (targetEl && contentRef.current && contentRef.current.contains(targetEl)) {
        const containerRect = contentRef.current.getBoundingClientRect();
        const currentScrollLeft = contentRef.current.scrollLeft || 0;
        const rect = targetEl.getBoundingClientRect();
        const totalX = (rect.left - containerRect.left) + currentScrollLeft;
        const targetPage = Math.max(0, Math.min(totalPagesInChapter - 1, Math.floor((totalX + 2) / (pageWidth + pageGap))));
        setCurrentPageInChapter(targetPage);
        contentRef.current.scrollLeft = targetPage * (pageWidth + pageGap);
      } else {
        const notesChIdx = chapters.findIndex((c) => c.id === 'fb2-notes' || c.title.toLowerCase().includes('примечания'));
        if (notesChIdx !== -1) {
          setCurrentChapterIdx(notesChIdx);
          setCurrentPageInChapter(0);
        }
      }
      return;
    }

    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('Could not open external link', href, err);
    }
  };

  // Android Predictive Back & System Back Gesture Integration (Hierarchical)
  useEffect(() => {
    const handleBack = (): boolean | void => {
      if (activeNotePopup) {
        setActiveNotePopup(null);
        return true;
      }
      if (selectedText || selectionPos) {
        setSelectedText('');
        setSelectionPos(null);
        return true;
      }
      if (showSettings) {
        setShowSettings(false);
        return true;
      }
      if (showNotes) {
        setShowNotes(false);
        return true;
      }
      if (showToc) {
        setShowToc(false);
        return true;
      }
      if (showSearch) {
        setShowSearch(false);
        return true;
      }
      if (showBookCompleted) {
        setShowBookCompleted(false);
        return true;
      }
      if (milestonePage !== null) {
        setMilestonePage(null);
        return true;
      }
      if (showBars) {
        setShowBars(false);
        return true;
      }
      onBackToLibrary();
      return true;
    };

    const unreg = pushBackHandler(handleBack);
    return unreg;
  }, [
    activeNotePopup,
    selectedText,
    selectionPos,
    showSettings,
    showNotes,
    showToc,
    showSearch,
    showBookCompleted,
    milestonePage,
    showBars,
    onBackToLibrary,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeNotePopup) {
        if (e.key === 'Escape') setActiveNotePopup(null);
        return;
      }

      if (showSettings || showNotes || showToc || showSearch || showBookCompleted || milestonePage !== null || selectionPos) {
        if (e.key === 'Escape') {
          setShowSettings(false);
          setShowNotes(false);
          setShowToc(false);
          setShowSearch(false);
          setShowBookCompleted(false);
          setMilestonePage(null);
          setSelectionPos(null);
          setSelectedText('');
        }
        return;
      }

      if (e.key === 'Escape') {
        onBackToLibrary();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNotePopup, showSettings, showNotes, showToc, showSearch, showBookCompleted, milestonePage, selectionPos, onBackToLibrary, handleNextPage, handlePrevPage]);

  // Touch swipe gesture handling for page turning without conflicting with Android system gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const isEdge = touch.clientX < 24 || touch.clientX > window.innerWidth - 24;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      isEdge,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (start.isEdge) return;

    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 1) return;
    if (selectedText) return;

    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const deltaTime = Date.now() - start.time;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && deltaTime < 650) {
      if (deltaX < 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  };

  const lastWheelTimeRef = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 260) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 20) {
      lastWheelTimeRef.current = now;
      if (delta > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  };

  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If click originated inside selection toolbar, do not process click
    if ((e.target as HTMLElement)?.closest('#text-selection-toolbar')) {
      return;
    }
    if (isWritingNoteRef.current) {
      return;
    }

    // On Android/touch, synthesized click event might arrive after text selection.
    // If selection was made recently, ignore this click to prevent dismissing toolbar!
    if (Date.now() - lastSelectionTimestampRef.current < 450) {
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 1) {
      return;
    }
    if (selectedText) {
      setSelectedText('');
      setSelectionPos(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;

    const tapEnabled = settings.tapToTurnPages !== false;
    if (tapEnabled && ratio < 0.25) {
      handlePrevPage();
    } else if (tapEnabled && ratio > 0.75) {
      handleNextPage();
    } else {
      setShowBars((prev) => !prev);
    }
  };

  const checkTextSelection = useCallback(() => {
    // If user is actively typing or interacting with note input, NEVER dismiss
    if (isWritingNoteRef.current) return;

    // Check if focus is inside toolbar
    if (typeof document !== 'undefined' && document.activeElement?.closest('#text-selection-toolbar')) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (selectedText && !isWritingNoteRef.current) {
        setSelectedText('');
        setSelectionPos(null);
      }
      return;
    }
    if (!contentRef.current) return;

    const container = contentRef.current;
    const containerRect = container.getBoundingClientRect();

    try {
      if (selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      // Safe ancestor check
      const ancestor =
          range.commonAncestorContainer.nodeType === Node.TEXT_NODE
              ? range.commonAncestorContainer.parentElement
              : (range.commonAncestorContainer as Element);
      if (!ancestor || !container.contains(ancestor)) {
        const startEl =
            range.startContainer.nodeType === Node.TEXT_NODE
                ? range.startContainer.parentElement
                : (range.startContainer as Element);
        if (!startEl || !container.contains(startEl)) return;
      }

      const rawText = selection.toString().trim();
      if (!rawText || rawText.length < 2) return;

      const bounding = range.getBoundingClientRect();
      if (bounding.width === 0 && bounding.height === 0) {
        const rects = Array.from(range.getClientRects());
        if (rects.length === 0) return;
      }

      // Check if completely offscreen
      if (bounding.right < containerRect.left - 40 || bounding.left > containerRect.right + 40) {
        if (!isWritingNoteRef.current) {
          setSelectedText('');
          setSelectionPos(null);
        }
        return;
      }

      // Valid selection
      activeSelectionRangeRef.current = range.cloneRange();
      setSelectedText(rawText);
      lastSelectionTimestampRef.current = Date.now();
      setSelectionPos({
        top: bounding.top,
        bottom: bounding.bottom,
        left: Math.max(containerRect.left + 24, Math.min(containerRect.right - 24, bounding.left + bounding.width / 2)),
        right: bounding.right,
      });
    } catch {
      // Ignore
    }
  }, [selectedText]);

  useEffect(() => {
    const onSelectionChange = () => {
      // If user is typing in note comment textarea or toolbar has focus, NEVER dismiss toolbar
      if (isWritingNoteRef.current) return;
      if (typeof document !== 'undefined' && document.activeElement?.closest('#text-selection-toolbar')) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (selectedText && !isWritingNoteRef.current) {
          activeSelectionRangeRef.current = null;
          setSelectedText('');
          setSelectionPos(null);
        }
        return;
      }

      // Debounce pop-up so user can finish adjusting selection handles
      if (selectionDebounceTimerRef.current) {
        window.clearTimeout(selectionDebounceTimerRef.current);
      }
      selectionDebounceTimerRef.current = window.setTimeout(() => {
        if (!isWritingNoteRef.current) {
          checkTextSelection();
        }
      }, 160);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (selectionDebounceTimerRef.current) {
        window.clearTimeout(selectionDebounceTimerRef.current);
      }
    };
  }, [checkTextSelection, selectedText]);

  // Handle pointer down/up and touch events for smooth selection finalizing only after user finishes gesture
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleDown = (e: Event) => {
      // If pointer is touching the toolbar itself, don't mark as selecting book text
      if ((e.target as HTMLElement)?.closest('#text-selection-toolbar')) {
        return;
      }
      isSelectingPointerDownRef.current = true;
      setTimeout(() => {
        isSelectingPointerDownRef.current = false;
      }, 700);
    };

    const handleUp = () => {
      isSelectingPointerDownRef.current = false;
      if (isWritingNoteRef.current) return;
      setTimeout(() => {
        checkTextSelection();
      }, 50);
    };

    container.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    window.addEventListener('touchend', handleUp, { passive: true });
    window.addEventListener('mouseup', handleUp, { passive: true });
    window.addEventListener('pointercancel', handleUp, { passive: true });
    window.addEventListener('touchcancel', handleUp, { passive: true });

    return () => {
      container.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [checkTextSelection]);

  const handleSaveHighlight = async (color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple', noteComment = '') => {
    const cleanText = (selectedText || '').trim();
    if (!cleanText || cleanText.length < 2) {
      activeSelectionRangeRef.current = null;
      setSelectedText('');
      setSelectionPos(null);
      return;
    }
    if (!color) return;

    let charIndexInChapter: number | undefined;
    let prefixContext: string | undefined;
    let suffixContext: string | undefined;

    if (activeSelectionRangeRef.current && contentRef.current) {
      try {
        const range = activeSelectionRangeRef.current;
        const preRange = document.createRange();
        preRange.selectNodeContents(contentRef.current);
        preRange.setEnd(range.startContainer, range.startOffset);
        const preText = preRange.toString();
        charIndexInChapter = preText.length;
        prefixContext = preText.slice(-60);

        const postRange = document.createRange();
        postRange.selectNodeContents(contentRef.current);
        postRange.setStart(range.endContainer, range.endOffset);
        suffixContext = postRange.toString().slice(0, 60);
      } catch {
        // Context capture fallback
      }
    }

    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      bookId: book.id,
      chapterIndex: currentChapterIdx,
      chapterTitle: currentChapter.title || tr`Глава ${currentChapterIdx + 1}`,
      selectedText: cleanText,
      noteText: noteComment.trim(),
      color,
      createdAt: Date.now(),
      progressPercent: overallProgress,
      pageIndexInChapter: currentPageInChapter,
      charIndexInChapter,
      prefixContext,
      suffixContext,
    };

    activeSelectionRangeRef.current = null;
    setSelectedText('');
    setSelectionPos(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // Ignore
    }

    await saveNote(newNote);
    await loadNotesAndBookmarks();

    // Re-pin container scrollLeft to avoid any column displacement
    if (contentRef.current && pageWidth > 0) {
      contentRef.current.scrollLeft = currentPageInChapter * (pageWidth + pageGap);
    }
  };

  const handleToggleBookmark = async () => {
    if (isBookmarked) {
      const existing = bookmarks.find((b) => b.chapterIndex === currentChapterIdx);
      if (existing) {
        await deleteBookmark(existing.id);
        await loadNotesAndBookmarks();
      }
    } else {
      let previewText = currentChapter.title;
      if (contentRef.current) {
        const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const val = n.textContent?.trim();
          if (val && val.length > 10) {
            const r = document.createRange();
            r.selectNodeContents(n);
            const rect = r.getBoundingClientRect();
            const containerRect = contentRef.current.getBoundingClientRect();
            if (rect.right >= containerRect.left && rect.left <= containerRect.right) {
              previewText = val.slice(0, 90);
              break;
            }
          }
        }
      }

      const newBm: Bookmark = {
        id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        bookId: book.id,
        chapterIndex: currentChapterIdx,
        chapterTitle: currentChapter.title,
        createdAt: Date.now(),
        progressPercent: overallProgress,
        previewText,
        pageIndexInChapter: currentPageInChapter,
      };
      await saveBookmark(newBm);
      await loadNotesAndBookmarks();
    }
  };

  return (
      <div
          id="reader-view"
          className="relative w-full h-full flex flex-col overflow-hidden select-none transition-colors duration-200"
          style={{
            backgroundColor: currentTheme.bg,
            color: currentTheme.text,
          }}
      >
        {/* Top Controls Bar with Generous Android Safe-Area Inset */}
        <AnimatePresence>
          {showBars && (
              <motion.div
                  initial={{ y: '-100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  id="reader-top-bar"
                  className="absolute top-0 left-0 right-0 px-3.5 sm:px-6 pb-2.5 flex items-center justify-between shadow-md z-40 border-b select-none"
                  style={{
                    paddingTop: isMobile ? 'max(env(safe-area-inset-top, 0px), 48px)' : '14px',
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.border,
                    color: currentTheme.text,
                  }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <button
                      id="btn-reader-back"
                      onClick={onBackToLibrary}
                      className="p-2 -ml-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title={tr("Вернуться в библиотеку")}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-xs font-semibold hidden min-[400px]:inline">{tr("Библиотека")}</span>
                  </button>

                  <div className="min-w-0 truncate ml-1">
                    <h2 className="text-xs sm:text-sm font-bold truncate leading-tight">
                      {book.title}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] opacity-65 truncate">
                      {currentChapter.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                      id="btn-reader-search"
                      onClick={openSearch}
                      className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title={tr("Поиск по книге")}
                  >
                    <Search className="w-5 h-5 opacity-75 hover:opacity-100" />
                  </button>

                  <button
                      id="btn-reader-bookmark"
                      onClick={handleToggleBookmark}
                      className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title={isBookmarked ? tr("Удалить закладку") : tr("Добавить закладку")}
                  >
                    <BookmarkIcon
                        className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'opacity-75'}`}
                    />
                  </button>
                </div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Search highlight & quick navigation bar */}
        {activeSearchTerm && (
            <div
                id="reader-search-nav-bar"
                className="absolute left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-2xl bg-neutral-900/95 text-white border border-neutral-700/80 text-xs font-medium flex items-center gap-2 shadow-2xl backdrop-blur-md select-none"
                style={{
                  top: isMobile ? 'max(env(safe-area-inset-top, 0px), 48px)' : '16px',
                }}
            >
          <span className="truncate max-w-[110px] sm:max-w-[160px] font-semibold text-amber-400">
            «{activeSearchTerm}»
          </span>
              <span className="text-[11px] opacity-75 border-r border-neutral-700 pr-2 whitespace-nowrap">
            {allSearchMatches.length > 0
                ? tr`${activeMatchGlobalIdx + 1} из ${allSearchMatches.length}`
                : tr("0 совпадений")}
          </span>
              <button
                  id="btn-search-prev-match"
                  onClick={handlePrevSearchMatch}
                  disabled={allSearchMatches.length <= 1}
                  className="p-1 rounded-lg hover:bg-white/15 disabled:opacity-30 cursor-pointer active:scale-90 transition-all text-neutral-200"
                  title={tr("Предыдущее совпадение")}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                  id="btn-search-next-match"
                  onClick={handleNextSearchMatch}
                  disabled={allSearchMatches.length <= 1}
                  className="p-1 rounded-lg hover:bg-white/15 disabled:opacity-30 cursor-pointer active:scale-90 transition-all text-neutral-200"
                  title={tr("Следующее совпадение")}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                  id="btn-search-close"
                  onClick={() => {
                    setActiveSearchTerm('');
                    setActiveMatchGlobalIdx(0);
                  }}
                  className="p-1 -mr-1 rounded-lg hover:bg-white/15 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                  title={tr("Сбросить поиск")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
        )}

        {/* Main Reading Viewport: CBZ Comic Mode or Standard Paginated Text Mode */}
        {isCbzBook ? (
            <CbzComicReader
                bookId={book.id}
                totalPages={book.totalPages || book.chapters?.length || comicPages.length || 0}
                initialPage={initialComicPage}
                chapters={chapters && chapters.length > 0 ? chapters : book.chapters}
                pages={comicPages}
                onPageChange={handleComicPageChange}
                theme={currentTheme}
                onToggleUI={() => setShowBars((prev) => !prev)}
            />
        ) : (
            /* Paginated Viewport Container */
            <div
                ref={viewportRef}
                id="reader-paginated-viewport"
                onClick={handleViewportClick}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseUp={() => setTimeout(checkTextSelection, 20)}
                className="relative flex-1 w-full h-full overflow-hidden select-none cursor-default group"
                style={{
                  backgroundColor: currentTheme.bg,
                  color: currentTheme.text,
                  touchAction: 'pan-y pinch-zoom',
                  overscrollBehaviorY: 'contain',
                }}
            >
              <div
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                  style={{
                    paddingLeft: `${paddingHorizontal}px`,
                    paddingRight: `${paddingHorizontal}px`,
                    paddingTop: `${paddingTop}px`,
                    paddingBottom: `${paddingBottom}px`,
                  }}
              >
                <div
                    className="relative pointer-events-auto"
                    style={{
                      width: `${pageWidth}px`,
                      height: `${pageHeight}px`,
                      perspective: '1200px',
                    }}
                >
                  <div
                      ref={contentRef}
                      id="reader-paginated-content"
                      onClickCapture={handleContentClickCapture}
                      className="reader-text reader-columns select-text cursor-text"
                      style={{
                        width: `${pageWidth}px`,
                        height: `${pageHeight}px`,
                        columnWidth: `${pageWidth}px`,
                        columnGap: `${pageGap}px`,
                        columnFill: 'auto',
                        overflowX: 'hidden',
                        overflowY: 'hidden',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        fontFamily: getFontFamily(settings.fontFamily),
                        fontSize: `${settings.fontSize}px`,
                        lineHeight: settings.lineHeight,
                        textAlign: settings.textAlign,
                        letterSpacing: `${settings.letterSpacing}em`,
                        color: currentTheme.text,
                      }}
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />

                  {/* Page Turn Animations */}
                  <AnimatePresence>
                    {turnAnimation && (
                        <motion.div
                            key={turnAnimation.id}
                            initial={
                              turnAnimation.type === 'slide'
                                  ? { x: turnAnimation.direction === 'next' ? 0 : 0 }
                                  : turnAnimation.type === 'fade'
                                      ? { opacity: 1 }
                                      : { rotateY: 0, opacity: 1 }
                            }
                            animate={
                              turnAnimation.type === 'slide'
                                  ? {
                                    x: turnAnimation.direction === 'next' ? -pageWidth - pageGap : pageWidth + pageGap,
                                    opacity: [1, 0.9, 0],
                                  }
                                  : turnAnimation.type === 'fade'
                                      ? { opacity: [1, 0.5, 0] }
                                      : {
                                        rotateY: turnAnimation.direction === 'next' ? -90 : 90,
                                        opacity: [1, 0.95, 0],
                                      }
                            }
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: turnAnimation.type === 'flip' ? 0.38 : 0.28,
                              ease: [0.25, 1, 0.5, 1],
                            }}
                            className="absolute inset-0 pointer-events-none overflow-hidden shadow-2xl rounded-xs"
                            style={{
                              width: `${pageWidth}px`,
                              height: `${pageHeight}px`,
                              willChange: 'transform, opacity',
                              transformOrigin:
                                  turnAnimation.direction === 'next' ? 'left center' : 'right center',
                              backfaceVisibility: 'hidden',
                              backgroundColor: currentTheme.bg,
                              color: currentTheme.text,
                              zIndex: 25,
                            }}
                        >
                          <div
                              ref={(el) => {
                                if (el) {
                                  el.scrollLeft = turnAnimation.outgoingScrollLeft;
                                }
                              }}
                              className="reader-text reader-columns select-none pointer-events-none"
                              style={{
                                width: `${pageWidth}px`,
                                height: `${pageHeight}px`,
                                columnWidth: `${pageWidth}px`,
                                columnGap: `${pageGap}px`,
                                columnFill: 'auto',
                                overflowX: 'hidden',
                                overflowY: 'hidden',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                fontFamily: getFontFamily(settings.fontFamily),
                                fontSize: `${settings.fontSize}px`,
                                lineHeight: settings.lineHeight,
                                textAlign: settings.textAlign,
                                letterSpacing: `${settings.letterSpacing}em`,
                              }}
                              dangerouslySetInnerHTML={{ __html: turnAnimation.outgoingHtml }}
                          />

                          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/25 via-black/8 to-transparent pointer-events-none z-10" />
                          <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/15 to-transparent pointer-events-none z-10" />

                          {turnAnimation.type === 'flip' && (
                              <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: [0, 0.45, 0.75, 0.1] }}
                                  transition={{ duration: 0.42, ease: 'easeInOut' }}
                                  className={`absolute inset-0 pointer-events-none z-20 ${
                                      turnAnimation.direction === 'next'
                                          ? 'bg-gradient-to-r from-transparent via-black/15 to-black/35'
                                          : 'bg-gradient-to-l from-transparent via-black/15 to-black/35'
                                  }`}
                              />
                          )}
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Desktop Side Flip Arrows */}
              {(currentPageInChapter > 0 || currentChapterIdx > 0) && (
                  <button
                      id="btn-desktop-prev-page"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPage();
                      }}
                      className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-75 hover:!opacity-100 transition-all cursor-pointer shadow-md"
                      title={tr("Предыдущая страница")}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
              )}

              {(currentPageInChapter < totalPagesInChapter - 1 || currentChapterIdx < chapters.length - 1) && (
                  <button
                      id="btn-desktop-next-page"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextPage();
                      }}
                      className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-75 hover:!opacity-100 transition-all cursor-pointer shadow-md"
                      title={tr("Следующая страница")}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
              )}

              {/* Footer Page Indicator with Safe Bottom Margin */}
              <div
                  id="reader-page-indicator"
                  className="absolute left-0 right-0 z-20 pointer-events-none select-none flex justify-center text-[11px] opacity-65 font-sans"
                  style={{
                    bottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
                    color: currentTheme.text,
                  }}
              >
                <div className="px-3.5 py-1 rounded-full bg-black/15 dark:bg-white/10 backdrop-blur-xs flex items-center gap-3 shadow-2xs">
                  <span className="truncate max-w-[140px] sm:max-w-xs">{currentChapter.title}</span>
                  <span className="shrink-0 font-medium">
              {tr("Стр.")} {tr`${currentPageInChapter + 1} из ${totalPagesInChapter}`} · {overallProgress}%
            </span>
                </div>
              </div>
            </div>
        )}

        {/* Text Highlight / Quote Contextual Toolbar */}
        <AnimatePresence>
          {selectedText && selectionPos && (
              <TextSelectionToolbar
                  selectedText={selectedText}
                  position={selectionPos}
                  onHighlight={handleSaveHighlight}
                  onNoteModeChange={(isWriting) => {
                    isWritingNoteRef.current = isWriting;
                  }}
                  onClose={() => {
                    isWritingNoteRef.current = false;
                    setSelectedText('');
                    setSelectionPos(null);
                  }}
              />
          )}
        </AnimatePresence>

        {/* Bottom Floating Navigation Toolbar */}
        <AnimatePresence>
          {showBars && !isCbzBook && (
              <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  id="reader-bottom-bar"
                  className="absolute bottom-0 left-0 right-0 pt-2.5 px-3 sm:px-6 shadow-2xl z-40 border-t flex flex-col gap-2 select-none"
                  style={{
                    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.border,
                    color: currentTheme.text,
                  }}
              >
                <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold truncate max-w-[220px] sm:max-w-md">
                {currentChapter.title}
              </span>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] opacity-75">
                    <span>{tr("Стр.")} {currentPageInChapter + 1} / {totalPagesInChapter}</span>
                    <span>•</span>
                    <span>{tr`${overallProgress}% книги`}</span>
                  </div>
                </div>

                {/* Slider with Prev / Next Chapter Buttons */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                      id="btn-slider-prev-chapter"
                      disabled={currentChapterIdx <= 0 && currentPageInChapter <= 0}
                      onClick={handlePrevPage}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 shrink-0 transition-colors cursor-pointer"
                      title={tr("Назад")}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex-1 flex items-center relative py-1">
                    <input
                        id="slider-book-progress"
                        type="range"
                        min="0"
                        max={Math.max(1, chapters.length - 1)}
                        value={currentChapterIdx}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          setCurrentChapterIdx(idx);
                          setCurrentPageInChapter(0);
                        }}
                        className="w-full accent-amber-500 cursor-pointer h-2 rounded-lg bg-neutral-600/30"
                    />
                  </div>

                  <button
                      id="btn-slider-next-chapter"
                      disabled={currentChapterIdx >= chapters.length - 1 && currentPageInChapter >= totalPagesInChapter - 1}
                      onClick={handleNextPage}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 shrink-0 transition-colors cursor-pointer"
                      title={tr("Вперёд")}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Bottom tool buttons: 3 columns (поиск — только в верхней панели) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-inherit/15">
                  <button
                      id="btn-bottom-toc"
                      onClick={openToc}
                      className="py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer opacity-85 hover:opacity-100"
                      title={tr("Оглавление")}
                  >
                    <List className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-medium leading-none">{tr("Главы")}</span>
                  </button>

                  <button
                      id="btn-bottom-settings"
                      onClick={openSettings}
                      className="py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer opacity-85 hover:opacity-100"
                      title={tr("Шрифт и верстка текста")}
                  >
                    <Type className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-medium leading-none">{tr("Шрифт")}</span>
                  </button>

                  <button
                      id="btn-bottom-notes"
                      onClick={openNotes}
                      className="py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer opacity-85 hover:opacity-100 relative"
                      title={tr("Заметки и цитаты")}
                  >
                    <Edit3 className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-medium leading-none">{tr("Заметки")}</span>
                    {notes.length > 0 && (
                        <span className="absolute top-1 right-3 sm:right-6 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[7px] font-bold flex items-center justify-center">
                    {notes.length}
                  </span>
                    )}
                  </button>
                </div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Book Finished Modal */}
        <AnimatePresence>
          {showBookCompleted && (
              <CelebrationModal
                  theme={currentTheme}
                  gifSrc={BOOK_FINISHED_GIF_SRC}
                  title={tr("Книга прочитана!")}
                  badges={[tr("Прогресс: 100%"), tr("Завершено")]}
                  message={tr`Поздравляем! Вы дочитали книгу «${book.title}» до конца.`}
                  secondaryLabel={tr("Остаться")}
                  onSecondary={() => setShowBookCompleted(false)}
                  primaryLabel={tr("В библиотеку")}
                  onPrimary={() => {
                    updateReadingProgress(book.id, currentChapterIdx, 100, 100);
                    onUpdateBookProgress(book.id, currentChapterIdx, 100, 100);
                    onBackToLibrary();
                  }}
              />
          )}
        </AnimatePresence>

        {/* Page Milestone Modal (каждая PAGE_MILESTONE_INTERVAL-я страница книги) */}
        <AnimatePresence>
          {milestonePage !== null && (
              <CelebrationModal
                  theme={currentTheme}
                  gifSrc={PAGE_MILESTONE_GIF_SRC}
                  title={tr`Страница ${milestonePage}!`}
                  badges={[tr`${milestonePage} стр. позади`]}
                  message={tr("Вы листаете дальше — так держать!")}
                  secondaryLabel={tr("Читать дальше")}
                  onSecondary={() => setMilestonePage(null)}
              />
          )}
        </AnimatePresence>

        {/* Font & Text Layout Settings Sheet */}
        {showSettings && (
            <SettingsSheet
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onClose={closeSettings}
            />
        )}

        {/* Notes & Bookmarks Drawer */}
        {showNotes && (
            <NotesDrawer
                bookTitle={book.title}
                notes={notes}
                bookmarks={bookmarks}
                onSelectNote={(note) => {
                  pendingGoToLastPageRef.current = false;
                  const targetJump = {
                    chapterIndex: note.chapterIndex,
                    noteId: note.id,
                    text: note.selectedText,
                    prefixContext: note.prefixContext,
                    suffixContext: note.suffixContext,
                    charIndex: note.charIndexInChapter,
                    contextSnippet: note.selectedText,
                    pageIndexInChapter: note.pageIndexInChapter,
                  };
                  pendingTargetJumpRef.current = targetJump;
                  closeNotes();
                  if (note.chapterIndex === currentChapterIdx) {
                    locateAndJumpToTarget(targetJump);
                  } else {
                    if (contentRef.current) {
                      contentRef.current.scrollLeft = 0;
                    }
                    setCurrentChapterIdx(note.chapterIndex);
                    if (typeof note.pageIndexInChapter === 'number') {
                      setCurrentPageInChapter(note.pageIndexInChapter);
                    } else {
                      setCurrentPageInChapter(0);
                    }
                  }
                }}
                onSelectBookmark={(bm) => {
                  pendingGoToLastPageRef.current = false;
                  const targetJump = {
                    chapterIndex: bm.chapterIndex,
                    text: bm.previewText,
                    prefixContext: bm.prefixContext,
                    suffixContext: bm.suffixContext,
                    charIndex: bm.charIndexInChapter,
                    contextSnippet: bm.previewText,
                    pageIndexInChapter: bm.pageIndexInChapter,
                  };
                  pendingTargetJumpRef.current = targetJump;
                  closeNotes();
                  if (bm.chapterIndex === currentChapterIdx) {
                    locateAndJumpToTarget(targetJump);
                  } else {
                    if (contentRef.current) {
                      contentRef.current.scrollLeft = 0;
                    }
                    setCurrentChapterIdx(bm.chapterIndex);
                    if (typeof bm.pageIndexInChapter === 'number') {
                      setCurrentPageInChapter(bm.pageIndexInChapter);
                    } else {
                      setCurrentPageInChapter(0);
                    }
                  }
                }}
                onDeleteNote={async (noteId) => {
                  await deleteNote(noteId);
                  loadNotesAndBookmarks();
                }}
                onDeleteBookmark={async (bmId) => {
                  await deleteBookmark(bmId);
                  loadNotesAndBookmarks();
                }}
                onClose={closeNotes}
                isDark={currentTheme.isDark}
            />
        )}

        {/* Table of Contents Drawer */}
        {showToc && (
            <TocDrawer
                chapters={chapters}
                currentChapterIndex={currentChapterIdx}
                onSelectChapter={(idx) => {
                  pendingGoToLastPageRef.current = false;
                  pendingTargetJumpRef.current = null;
                  if (contentRef.current) {
                    contentRef.current.scrollLeft = 0;
                  }
                  setCurrentChapterIdx(idx);
                  setCurrentPageInChapter(0);
                  closeToc();
                }}
                onClose={closeToc}
                isDark={currentTheme.isDark}
            />
        )}

        {/* Book In-Text Search Modal */}
        {showSearch && (
            <BookSearchModal
                chapters={chapters}
                currentChapterIndex={currentChapterIdx}
                onSelectMatch={(chIdx, q, charIdx, contextSnippet, matchIndexInChapter) => {
                  handleSelectSearchMatch(chIdx, q, charIdx, contextSnippet, matchIndexInChapter);
                  closeSearch();
                }}
                onClose={closeSearch}
                isDark={currentTheme.isDark}
            />
        )}

        {/* Active Note Details Popup */}
        <AnimatePresence>
          {activeNotePopup && (
              <div
                  id="reader-active-note-modal"
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-xs"
                  onClick={() => setActiveNotePopup(null)}
              >
                <motion.div
                    initial={{ y: 80, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-full max-w-md bg-neutral-900 text-neutral-100 rounded-3xl p-5 shadow-2xl border border-neutral-700/80 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                          className={`w-3.5 h-3.5 rounded-full ${
                              activeNotePopup.color === 'yellow'
                                  ? 'bg-yellow-400'
                                  : activeNotePopup.color === 'green'
                                      ? 'bg-emerald-400'
                                      : activeNotePopup.color === 'blue'
                                          ? 'bg-sky-400'
                                          : activeNotePopup.color === 'pink'
                                              ? 'bg-pink-400'
                                              : 'bg-purple-400'
                          }`}
                      />
                      <span className="text-xs font-bold text-neutral-300 truncate max-w-[240px]">
                    {activeNotePopup.chapterTitle}
                  </span>
                    </div>
                    <button
                        id="btn-close-active-note-popup"
                        onClick={() => setActiveNotePopup(null)}
                        className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <blockquote className="p-3 bg-neutral-800/80 border-l-3 border-amber-400 rounded-r-xl text-xs sm:text-sm italic opacity-90 line-clamp-4 leading-relaxed">
                    «{activeNotePopup.selectedText}»
                  </blockquote>

                  {activeNotePopup.noteText ? (
                      <div className="p-3 bg-neutral-800/40 rounded-xl text-xs space-y-1">
                        <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                          {tr("Ваша заметка")}
                        </div>
                        <div className="text-neutral-200 leading-relaxed">
                          {activeNotePopup.noteText}
                        </div>
                      </div>
                  ) : (
                      <div className="text-xs opacity-50 italic">
                        {tr("Выделенная цитата без дополнительного комментария.")}
                      </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                        id="btn-delete-active-note"
                        onClick={async () => {
                          await deleteNote(activeNotePopup.id);
                          await loadNotesAndBookmarks();
                          setActiveNotePopup(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {tr("Удалить заметку")}
                    </button>

                    <button
                        id="btn-confirm-active-note"
                        onClick={() => setActiveNotePopup(null)}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 cursor-pointer transition-colors"
                    >
                      {tr("Закрыть")}
                    </button>
                  </div>
                </motion.div>
              </div>
          )}
        </AnimatePresence>
      </div>
  );
};