export type BookFormat = 'epub' | 'fb2' | 'pdf' | 'txt' | 'md' | 'cbz';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount?: number;
}

export interface Note {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  selectedText: string;
  noteText: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  createdAt: number;
  progressPercent: number;
  pageIndexInChapter?: number;
  charIndexInChapter?: number;
  prefixContext?: string;
  suffixContext?: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  createdAt: number;
  progressPercent: number;
  previewText?: string;
  pageIndexInChapter?: number;
  charIndexInChapter?: number;
  prefixContext?: string;
  suffixContext?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  coverUrl: string;
  description: string;
  totalPages: number;
  currentChapterIndex: number;
  currentScrollPercent: number;
  progressPercent: number;
  lastReadTimestamp: number;
  fileSize: string;
  chapters: Chapter[];
  isFavorite?: boolean;
  language?: string;
  genre?: string;
}

export type ReaderFontFamily =
    | 'literata'
    | 'merriweather'
    | 'lora'
    | 'alegreya'
    | 'roboto'
    | 'jakarta'
    | 'mono'
    | 'dyslexic';

export type ReaderThemeId =
    | 'paper'
    | 'sepia'
    | 'parchment'
    | 'slate'
    | 'oled'
    | 'midnight'
    | 'emerald';

export interface ReaderThemeConfig {
  id: ReaderThemeId;
  name: string;
  bg: string;
  text: string;
  secondaryText: string;
  cardBg: string;
  border: string;
  accent: string;
  isDark: boolean;
}

export type PageTransitionEffect = 'flip' | 'slide' | 'fade' | 'none';

export interface ReaderSettings {
  fontFamily: ReaderFontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  marginHorizontal: number;
  textAlign: 'justify' | 'left';
  theme: ReaderThemeId;
  readingMode: 'scroll' | 'paginated';
  brightness: number;
  showClockBattery: boolean;
  showProgressFooter: boolean;
  pageTransition?: PageTransitionEffect;
  tapToTurnPages?: boolean;
  /** Поздравительное окно на каждой 67-й странице. undefined/true — включено, false — выключено. */
  showPageMilestone?: boolean;
  /** Язык интерфейса приложения. */
  appLanguage?: 'ru' | 'en';
}

export interface SyncStatus {
  lastSyncedTimestamp: number;
  isSyncing: boolean;
  statusText: string;
  itemsCount: number;
}

export interface AudiobookTrack {
  id: string;
  collectionId?: string; // If belongs to a collection (сборник)
  title: string;
  author?: string;
  fileName: string;
  fileSize: string;
  audioBlob?: Blob;
  audioUrl?: string; // Blob URL for active playback session
  duration: number; // Duration in seconds
  currentTime: number; // Current listening position in seconds
  progressPercent: number; // 0 to 100
  lastListenedTimestamp: number;
  coverUrl?: string;
  orderIndex: number;
  addedAt: number;
}

export interface AudiobookCollection {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}