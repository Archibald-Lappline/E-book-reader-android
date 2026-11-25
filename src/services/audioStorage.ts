import { AudiobookTrack, AudiobookCollection } from '../types';
import { tr } from '../i18n';

const DB_NAME = 'AndroidAudioReaderDB';
const DB_VERSION = 1;
const STORE_COLLECTIONS = 'collections';
const STORE_TRACKS = 'tracks';

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const trackStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        trackStore.createIndex('collectionId', 'collectionId', { unique: false });
        trackStore.createIndex('orderIndex', 'orderIndex', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function cleanupLegacyStarterDemo(db: IDBDatabase) {
  try {
    const tx = db.transaction([STORE_COLLECTIONS, STORE_TRACKS], 'readwrite');
    tx.objectStore(STORE_COLLECTIONS).delete('col-tolstoy-stories');
    const trackStore = tx.objectStore(STORE_TRACKS);
    const index = trackStore.index('collectionId');
    const req = index.getAllKeys('col-tolstoy-stories');
    req.onsuccess = () => {
      const keys = req.result;
      for (const k of keys) {
        trackStore.delete(k);
      }
    };
  } catch {
    // Ignore cleanup error
  }
}

export async function getAudioCollections(): Promise<AudiobookCollection[]> {
  try {
    const db = await openAudioDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
      const store = tx.objectStore(STORE_COLLECTIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        let collections = (req.result as AudiobookCollection[]) || [];
        if (collections.some((c) => c.id === 'col-tolstoy-stories')) {
          cleanupLegacyStarterDemo(db);
          collections = collections.filter((c) => c.id !== 'col-tolstoy-stories');
        }
        resolve(collections);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get audio collections', err);
    return [];
  }
}

export async function saveAudioCollection(col: AudiobookCollection): Promise<void> {
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
    const store = tx.objectStore(STORE_COLLECTIONS);
    const req = store.put(col);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioCollection(id: string, deleteTracks = true): Promise<void> {
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const stores = deleteTracks ? [STORE_COLLECTIONS, STORE_TRACKS] : [STORE_COLLECTIONS];
    const tx = db.transaction(stores, 'readwrite');
    
    // Delete collection
    tx.objectStore(STORE_COLLECTIONS).delete(id);

    if (deleteTracks) {
      const trackStore = tx.objectStore(STORE_TRACKS);
      const index = trackStore.index('collectionId');
      const req = index.getAllKeys(id);
      req.onsuccess = () => {
        const keys = req.result;
        for (const k of keys) {
          trackStore.delete(k);
        }
      };
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioTracks(): Promise<AudiobookTrack[]> {
  try {
    const db = await openAudioDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();
      req.onsuccess = () => {
        let tracks = (req.result as AudiobookTrack[]) || [];
        tracks = tracks.filter((t) => t.collectionId !== 'col-tolstoy-stories');
        resolve(tracks);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get audio tracks', err);
    return [];
  }
}

export async function getTracksByCollection(collectionId: string): Promise<AudiobookTrack[]> {
  try {
    const db = await openAudioDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const index = store.index('collectionId');
      const req = index.getAll(collectionId);
      req.onsuccess = () => {
        const tracks = (req.result as AudiobookTrack[]) || [];
        tracks.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        resolve(tracks);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get tracks by collection', err);
    return [];
  }
}

export async function getAudioTrackById(id: string): Promise<AudiobookTrack | null> {
  try {
    const db = await openAudioDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as AudiobookTrack) || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to get audio track by id', err);
    return null;
  }
}

export async function saveAudioTrack(track: AudiobookTrack): Promise<void> {
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.put(track);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioTrack(id: string): Promise<void> {
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMultipleAudioTracks(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetTracksProgress(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();
    req.onsuccess = () => {
      const tracks = req.result as AudiobookTrack[];
      for (const track of tracks) {
        if (idSet.has(track.id)) {
          track.currentTime = 0;
          track.progressPercent = 0;
          track.lastListenedTimestamp = 0;
          store.put(track);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function moveTracksToCollection(
  ids: string[],
  collectionId: string | null | undefined
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();
    req.onsuccess = () => {
      const tracks = req.result as AudiobookTrack[];
      for (const track of tracks) {
        if (idSet.has(track.id)) {
          if (collectionId) {
            track.collectionId = collectionId;
          } else {
            delete track.collectionId;
          }
          store.put(track);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateTracksOrder(orderedTrackIds: string[]): Promise<void> {
  if (!orderedTrackIds || orderedTrackIds.length === 0) return;
  const db = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const orderMap = new Map<string, number>();
    orderedTrackIds.forEach((id, index) => {
      orderMap.set(id, index);
    });

    const req = store.getAll();
    req.onsuccess = () => {
      const tracks = req.result as AudiobookTrack[];
      for (const track of tracks) {
        if (orderMap.has(track.id)) {
          track.orderIndex = orderMap.get(track.id);
          store.put(track);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateTrackProgress(
  trackId: string,
  currentTime: number,
  duration?: number
): Promise<void> {
  try {
    const db = await openAudioDatabase();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const getReq = store.get(trackId);

    getReq.onsuccess = () => {
      const track = getReq.result as AudiobookTrack;
      if (!track) return;

      const dur = duration && duration > 0 ? duration : track.duration || 1;
      const safeTime = Math.max(0, Math.min(dur, currentTime));
      const percent = Math.min(100, Math.max(0, Math.round((safeTime / dur) * 100)));

      track.currentTime = safeTime;
      track.duration = dur;
      track.progressPercent = percent;
      track.lastListenedTimestamp = Date.now();

      store.put(track);
    };
  } catch (err) {
    console.error('Failed to update track progress', err);
  }
}

/**
 * Reads audio file metadata (duration) using browser Audio element
 */
export function getAudioFileDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
      };

      const onLoaded = () => {
        const dur = audio.duration;
        cleanup();
        resolve(Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 60);
      };

      const onError = () => {
        cleanup();
        resolve(60); // Fallback estimate
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      audio.src = url;
    } catch {
      resolve(60);
    }
  });
}

/**
 * Format bytes to readable string (e.g. 24.5 МБ)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return tr("0 Б");
  const k = 1024;
  const sizes = [tr("Б"), tr("КБ"), tr("МБ"), tr("ГБ")];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats seconds into mm:ss or hh:mm:ss
 */
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
