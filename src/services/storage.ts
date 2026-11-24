import { Book, Note, Bookmark, ReaderSettings } from '../types';
import { DEFAULT_READER_SETTINGS } from '../utils/themeConfig';
import { normalizeChapterTitles } from './parser';

const DB_NAME = 'AndroidReaderDB';
const DB_VERSION = 3;
const STORE_BOOKS = 'books';
const STORE_NOTES = 'notes';
const STORE_BOOKMARKS = 'bookmarks';
const STORE_COMIC_PAGES = 'comic_pages';
const STORE_COMIC_ARCHIVES = 'comic_archives';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notesStore = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        notesStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
        const bookmarksStore = db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'id' });
        bookmarksStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_COMIC_PAGES)) {
        const comicStore = db.createObjectStore(STORE_COMIC_PAGES, { keyPath: 'id' });
        comicStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_COMIC_ARCHIVES)) {
        db.createObjectStore(STORE_COMIC_ARCHIVES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const SAMPLE_BOOK_IDS = [
  'master-i-margarita',
  'alice-in-wonderland',
  'little-prince',
  'study-in-scarlet'
];

async function purgeSampleBooksOnce(db: IDBDatabase): Promise<void> {
  if (localStorage.getItem('sample_templates_purged_v2')) {
    return;
  }
  try {
    const tx = db.transaction([STORE_BOOKS, STORE_NOTES, STORE_BOOKMARKS], 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    for (const id of SAMPLE_BOOK_IDS) {
      store.delete(id);
    }
    localStorage.setItem('sample_templates_purged_v2', 'true');
  } catch (err) {
    console.warn('Failed to purge sample books', err);
  }
}

export async function getStoredBooks(): Promise<Book[]> {
  try {
    const db = await openDatabase();
    await purgeSampleBooksOnce(db);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKS);
      const req = store.getAll();

      req.onsuccess = () => {
        const books = (req.result as Book[]) || [];
        // Filter out any leftover sample books if they exist
        const userBooks = books.filter((b) => !SAMPLE_BOOK_IDS.includes(b.id));
        const repaired = userBooks.map((b) => {
          if (b.format === 'cbz') {
            // Strip out massive base64 image strings from library view state to prevent browser lag & memory leaks,
            // but preserve lightweight entry filenames if present
            const cleanChapters = (b.chapters || []).map((ch, idx) => {
              const raw = ch.content || '';
              const isHeavy = raw.length > 500 || raw.startsWith('data:') || raw.includes('<img');
              return {
                id: ch.id || `cbz-ch-${idx}`,
                title: ch.title || `Страница ${idx + 1}`,
                content: isHeavy ? '' : raw,
              };
            });
            return {
              ...b,
              chapters: cleanChapters,
            };
          }
          return {
            ...b,
            chapters: normalizeChapterTitles(b.chapters || []),
          };
        });
        resolve(repaired);
      };

      req.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.error('Failed to get books from IndexedDB', err);
    return [];
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKS);
      const req = store.get(id);
      req.onsuccess = () => {
        const book = req.result as Book | undefined;
        if (book) {
          resolve({
            ...book,
            chapters: normalizeChapterTitles(book.chapters || []),
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to get book by id', err);
    return null;
  }
}

export async function saveBook(book: Book): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.put(book);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBookFromDB(bookId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BOOKS, STORE_NOTES, STORE_BOOKMARKS, STORE_COMIC_PAGES, STORE_COMIC_ARCHIVES], 'readwrite');
    tx.objectStore(STORE_BOOKS).delete(bookId);

    const notesIndex = tx.objectStore(STORE_NOTES).index('bookId');
    const notesReq = notesIndex.getAllKeys(bookId);
    notesReq.onsuccess = () => {
      for (const key of notesReq.result) {
        tx.objectStore(STORE_NOTES).delete(key);
      }
    };

    const bookmarksIndex = tx.objectStore(STORE_BOOKMARKS).index('bookId');
    const bmReq = bookmarksIndex.getAllKeys(bookId);
    bmReq.onsuccess = () => {
      for (const key of bmReq.result) {
        tx.objectStore(STORE_BOOKMARKS).delete(key);
      }
    };

    const comicIndex = tx.objectStore(STORE_COMIC_PAGES).index('bookId');
    const comicReq = comicIndex.getAllKeys(bookId);
    comicReq.onsuccess = () => {
      for (const key of comicReq.result) {
        tx.objectStore(STORE_COMIC_PAGES).delete(key);
      }
    };

    // Also delete comic archive blob if stored
    tx.objectStore(STORE_COMIC_ARCHIVES).delete(bookId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMultipleBooksFromDB(bookIds: string[]): Promise<void> {
  if (!bookIds || bookIds.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORE_BOOKS, STORE_NOTES, STORE_BOOKMARKS, STORE_COMIC_PAGES, STORE_COMIC_ARCHIVES],
      'readwrite'
    );
    const bookStore = tx.objectStore(STORE_BOOKS);
    const notesStore = tx.objectStore(STORE_NOTES);
    const bmStore = tx.objectStore(STORE_BOOKMARKS);
    const comicStore = tx.objectStore(STORE_COMIC_PAGES);
    const archiveStore = tx.objectStore(STORE_COMIC_ARCHIVES);

    const notesIndex = notesStore.index('bookId');
    const bmIndex = bmStore.index('bookId');
    const comicIndex = comicStore.index('bookId');

    for (const id of bookIds) {
      bookStore.delete(id);
      archiveStore.delete(id);

      const nReq = notesIndex.getAllKeys(id);
      nReq.onsuccess = () => {
        for (const k of nReq.result) notesStore.delete(k);
      };

      const bReq = bmIndex.getAllKeys(id);
      bReq.onsuccess = () => {
        for (const k of bReq.result) bmStore.delete(k);
      };

      const cReq = comicIndex.getAllKeys(id);
      cReq.onsuccess = () => {
        for (const k of cReq.result) comicStore.delete(k);
      };
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetMultipleBooksProgress(bookIds: string[]): Promise<void> {
  if (!bookIds || bookIds.length === 0) return;
  const idSet = new Set(bookIds);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.openCursor();

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const book = cursor.value as Book;
        if (idSet.has(book.id)) {
          book.currentChapterIndex = 0;
          book.currentScrollPercent = 0;
          book.progressPercent = 0;
          cursor.update(book);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function toggleFavoriteMultipleBooks(bookIds: string[], setFavorite?: boolean): Promise<void> {
  if (!bookIds || bookIds.length === 0) return;
  const idSet = new Set(bookIds);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.openCursor();

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const book = cursor.value as Book;
        if (idSet.has(book.id)) {
          book.isFavorite = typeof setFavorite === 'boolean' ? setFavorite : !book.isFavorite;
          cursor.update(book);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveComicArchive(bookId: string, archiveBlob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMIC_ARCHIVES, 'readwrite');
    const store = tx.objectStore(STORE_COMIC_ARCHIVES);
    const req = store.put({ id: bookId, blob: archiveBlob });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getComicArchive(bookId: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_COMIC_ARCHIVES, 'readonly');
      const store = tx.objectStore(STORE_COMIC_ARCHIVES);
      const req = store.get(bookId);
      req.onsuccess = () => {
        const res = req.result as { id: string; blob: Blob } | undefined;
        resolve(res?.blob || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to get comic archive', err);
    return null;
  }
}

export async function deleteComicArchive(bookId: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_COMIC_ARCHIVES, 'readwrite');
    const store = tx.objectStore(STORE_COMIC_ARCHIVES);
    store.delete(bookId);
  } catch (err) {
    console.warn('Failed to delete comic archive', err);
  }
}

export async function saveComicPages(bookId: string, pageBlobs: Blob[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMIC_PAGES, 'readwrite');
    const store = tx.objectStore(STORE_COMIC_PAGES);
    pageBlobs.forEach((blob, index) => {
      store.put({
        id: `${bookId}-p-${index}`,
        bookId,
        pageIndex: index,
        blob,
      });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getComicPages(bookId: string): Promise<Blob[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_COMIC_PAGES, 'readonly');
      const store = tx.objectStore(STORE_COMIC_PAGES);
      const index = store.index('bookId');
      const req = index.getAll(bookId);
      req.onsuccess = () => {
        const items = (req.result as { pageIndex: number; blob: Blob }[]) || [];
        items.sort((a, b) => a.pageIndex - b.pageIndex);
        resolve(items.map((i) => i.blob));
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get comic pages', err);
    return [];
  }
}

export async function deleteComicPages(bookId: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_COMIC_PAGES, 'readwrite');
    const store = tx.objectStore(STORE_COMIC_PAGES);
    const index = store.index('bookId');
    const req = index.getAllKeys(bookId);
    req.onsuccess = () => {
      for (const key of req.result) {
        store.delete(key);
      }
    };
  } catch (err) {
    console.warn('Failed to delete comic pages', err);
  }
}

export async function updateReadingProgress(
  bookId: string,
  chapterIndex: number,
  scrollPercent: number,
  progressPercent: number
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.get(bookId);

    req.onsuccess = () => {
      const book = req.result as Book | undefined;
      if (book) {
        book.currentChapterIndex = chapterIndex;
        book.currentScrollPercent = scrollPercent;
        book.progressPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));
        book.lastReadTimestamp = Date.now();
        store.put(book);
      }
    };
  } catch (err) {
    console.error('Failed to update progress', err);
  }
}

export async function getBookNotes(bookId?: string): Promise<Note[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const store = tx.objectStore(STORE_NOTES);
      const cleanNotes = (rawList: Note[]) => {
        return (rawList || []).filter(
          (n) => n && typeof n.selectedText === 'string' && n.selectedText.trim().length > 0 && n.color
        );
      };
      if (bookId) {
        const index = store.index('bookId');
        const req = index.getAll(bookId);
        req.onsuccess = () => resolve(cleanNotes(req.result));
        req.onerror = () => resolve([]);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(cleanNotes(req.result));
        req.onerror = () => resolve([]);
      }
    });
  } catch (err) {
    console.error('Failed to get notes', err);
    return [];
  }
}

export async function saveNote(note: Note): Promise<void> {
  // Reject notes without selected text or color
  if (!note || !note.selectedText || !note.selectedText.trim() || !note.color) {
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    const store = tx.objectStore(STORE_NOTES);
    const req = store.put(note);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    const store = tx.objectStore(STORE_NOTES);
    const req = store.delete(noteId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getBookBookmarks(bookId?: string): Promise<Bookmark[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKMARKS);
      if (bookId) {
        const index = store.index('bookId');
        const req = index.getAll(bookId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }
    });
  } catch (err) {
    console.error('Failed to get bookmarks', err);
    return [];
  }
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKMARKS);
    const req = store.put(bookmark);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKMARKS);
    const req = store.delete(bookmarkId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const SETTINGS_KEY = 'android_reader_settings';

export function getStoredSettings(): ReaderSettings {
  try {
    const val = localStorage.getItem(SETTINGS_KEY);
    if (val) {
      return { ...DEFAULT_READER_SETTINGS, ...JSON.parse(val) };
    }
  } catch (err) {
    console.warn('Could not read settings from localStorage', err);
  }
  return DEFAULT_READER_SETTINGS;
}

export function saveStoredSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not write settings to localStorage', err);
  }
}

export async function createFullBackupJson(): Promise<string> {
  const books = await getStoredBooks();
  const notes = await getBookNotes();
  const bookmarks = await getBookBookmarks();
  const settings = getStoredSettings();

  const backupData = {
    version: 1,
    exportTimestamp: Date.now(),
    device: 'E-Reader App',
    books,
    notes,
    bookmarks,
    settings,
  };

  return JSON.stringify(backupData, null, 2);
}

export async function restoreFromBackupJson(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.books || !Array.isArray(data.books)) {
      throw new Error('Invalid backup file format');
    }

    const db = await openDatabase();
    const tx = db.transaction([STORE_BOOKS, STORE_NOTES, STORE_BOOKMARKS], 'readwrite');

    const bookStore = tx.objectStore(STORE_BOOKS);
    for (const b of data.books) {
      bookStore.put(b);
    }

    if (Array.isArray(data.notes)) {
      const noteStore = tx.objectStore(STORE_NOTES);
      for (const n of data.notes) {
        noteStore.put(n);
      }
    }

    if (Array.isArray(data.bookmarks)) {
      const bmStore = tx.objectStore(STORE_BOOKMARKS);
      for (const bm of data.bookmarks) {
        bmStore.put(bm);
      }
    }

    if (data.settings) {
      saveStoredSettings(data.settings);
    }

    return true;
  } catch (err) {
    console.error('Restore failed', err);
    return false;
  }
}

export async function resetBookProgress(bookId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.get(bookId);

    req.onsuccess = () => {
      const book = req.result as Book | undefined;
      if (book) {
        book.currentChapterIndex = 0;
        book.currentScrollPercent = 0;
        book.progressPercent = 0;
        book.lastReadTimestamp = Date.now();
        store.put(book);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function resetAllBooksProgress(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.openCursor();

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const book = cursor.value as Book;
        book.currentChapterIndex = 0;
        book.currentScrollPercent = 0;
        book.progressPercent = 0;
        cursor.update(book);
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAllBooks(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BOOKS, STORE_NOTES, STORE_BOOKMARKS], 'readwrite');
    tx.objectStore(STORE_BOOKS).clear();
    tx.objectStore(STORE_NOTES).clear();
    tx.objectStore(STORE_BOOKMARKS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
