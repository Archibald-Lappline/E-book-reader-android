import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OverlayPortal } from '../OverlayPortal';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import {
  Headphones,
  Plus,
  Search,
  FolderPlus,
  Upload,
  Play,
  Pause,
  Edit2,
  Trash2,
  Clock,
  Layers,
  ArrowLeft,
  MoreVertical,
  CheckCircle2,
  Music,
  ChevronRight,
  Sparkles,
  Volume2,
  AlertTriangle,
  FileWarning,
  Square,
  Check,
  FolderInput,
  FolderMinus,
  RotateCcw,
  ListChecks,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Github,
  RefreshCw,
} from 'lucide-react';
import { AudiobookCollection, AudiobookTrack, ReaderThemeConfig, ReaderSettings } from '../../types';
import { AppAppearanceModal } from '../AppAppearanceModal';
import {
  getAudioCollections,
  getAudioTracks,
  saveAudioCollection,
  deleteAudioCollection,
  saveAudioTrack,
  deleteAudioTrack,
  deleteMultipleAudioTracks,
  resetTracksProgress,
  moveTracksToCollection,
  updateTracksOrder,
  getAudioFileDuration,
  formatBytes,
  formatAudioTime,
} from '../../services/audioStorage';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { EditCollectionModal } from './EditCollectionModal';
import { EditTrackModal } from './EditTrackModal';
import { BatchCollectionPickerModal } from './BatchCollectionPickerModal';
import { pushBackHandler } from '../../utils/androidBackNavigation';

interface CollectionTrackItemProps {
  track: AudiobookTrack;
  idx: number;
  isCur: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  activeCollection: AudiobookCollection;
  theme: ReaderThemeConfig;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleSelect: (trackId: string) => void;
  onPlay: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const CollectionTrackItem: React.FC<CollectionTrackItemProps> = ({
                                                                   track,
                                                                   idx,
                                                                   isCur,
                                                                   isPlaying,
                                                                   isSelected,
                                                                   isSelectionMode,
                                                                   activeCollection,
                                                                   theme,
                                                                   canMoveUp,
                                                                   canMoveDown,
                                                                   onToggleSelect,
                                                                   onPlay,
                                                                   onEdit,
                                                                   onMoveUp,
                                                                   onMoveDown,
                                                                 }) => {
  const controls = useDragControls();
  const trackCover = track.coverUrl || activeCollection.coverUrl;

  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      onToggleSelect(track.id);
    }, 450);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientX - startPosRef.current.x) > 10 || Math.abs(clientY - startPosRef.current.y) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
      <Reorder.Item
          value={track}
          id={track.id}
          dragListener={false}
          dragControls={controls}
          className={`relative p-3 sm:p-3.5 rounded-2xl border transition-colors flex items-center justify-between gap-2 sm:gap-3 group select-none cursor-pointer ${
              isSelected
                  ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500/50'
                  : isCur
                      ? 'border-amber-500/50 bg-amber-500/10 shadow-sm'
                      : 'border-inherit/20 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{
            backgroundColor: isSelected || isCur ? undefined : theme.cardBg,
            borderColor: isSelected || isCur ? undefined : theme.border,
          }}
          whileDrag={{
            scale: 1.02,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.25)',
            zIndex: 50,
          }}
          onClick={() => {
            if (isLongPressRef.current) {
              isLongPressRef.current = false;
              return;
            }
            if (isSelectionMode) {
              onToggleSelect(track.id);
            } else {
              onPlay();
            }
          }}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onTouchCancel={handleEnd}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
      >
        {/* Drag handle */}
        <div
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEnd();
              controls.start(e);
            }}
            className="touch-none cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-neutral-400 hover:text-amber-500 active:text-amber-500 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Зажмите и перетащите для изменения порядка"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Selection indicator badge only when selected or selection mode is active */}
        {isSelected ? (
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
        ) : isSelectionMode ? (
            <div className="w-6 h-6 rounded-lg border-2 border-inherit/40 bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
              <Square className="w-3 h-3 opacity-40" />
            </div>
        ) : null}

        {/* Play Button + Order Index + Cover */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer ${
                  isCur && isPlaying
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-amber-500 hover:text-neutral-950'
              }`}
              title={isCur && isPlaying ? 'Пауза' : 'Слушать'}
          >
            {isCur && isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
            ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {trackCover && (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-inherit/20 shrink-0">
                <img src={trackCover} alt="" className="w-full h-full object-cover" />
              </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
            <span className="text-[10px] opacity-50 font-mono font-bold bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
              #{idx + 1}
            </span>
              <h4 className="text-xs sm:text-sm font-bold truncate">
                {track.title}
              </h4>
            </div>

            {/* Progress & Duration */}
            <div className="flex items-center gap-2 text-[11px] opacity-70 mt-1">
              <span>{formatAudioTime(track.duration)}</span>
              <span>•</span>
              <span className="font-semibold text-amber-500">
              {track.progressPercent}% прослушано
            </span>
              <span className="text-[10px] opacity-60">({track.fileSize})</span>
            </div>

            {/* Progress Bar Line */}
            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${track.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Up / Down Move Quick Controls & Edit Button */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="hidden md:flex flex-col -space-y-1 opacity-0 group-hover:opacity-70 transition-opacity">
            <button
                disabled={!canMoveUp}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                title="Переместить выше"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
                disabled={!canMoveDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                title="Переместить ниже"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors cursor-pointer"
              title="Редактировать аудиозапись"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </Reorder.Item>
  );
};

interface AudiobookLibraryViewProps {
  theme: ReaderThemeConfig;
  settings?: ReaderSettings;
  onUpdateSettings?: (newSettings: Partial<ReaderSettings>) => void;
  onOpenAndroidCode?: () => void;
  onOpenSync?: () => void;
  bottomPadding?: number;
  onIsAtRootChange?: (isAtRoot: boolean) => void;
}

export const AudiobookLibraryView: React.FC<AudiobookLibraryViewProps> = ({
                                                                            theme,
                                                                            settings,
                                                                            onUpdateSettings,
                                                                            onOpenAndroidCode,
                                                                            onOpenSync,
                                                                            bottomPadding = 90,
                                                                            onIsAtRootChange,
                                                                          }) => {
  const isDark = theme.isDark;
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [collections, setCollections] = useState<AudiobookCollection[]>([]);
  const [tracks, setTracks] = useState<AudiobookTrack[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'collections' | 'all_tracks'>('collections');

  // Batch multi-selection state
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [showBatchCollectionPicker, setShowBatchCollectionPicker] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Long-press handling for track card selection in all tracks tab
  const trackLongPressTimerRef = useRef<{ [key: string]: number }>({});
  const isTrackLongPressTriggeredRef = useRef<{ [key: string]: boolean }>({});
  const trackTouchStartPosRef = useRef<{ [key: string]: { x: number; y: number } }>({});

  const handleTrackTouchStart = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    isTrackLongPressTriggeredRef.current[id] = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    trackTouchStartPosRef.current[id] = { x: clientX, y: clientY };

    if (trackLongPressTimerRef.current[id]) {
      clearTimeout(trackLongPressTimerRef.current[id]);
    }

    trackLongPressTimerRef.current[id] = window.setTimeout(() => {
      isTrackLongPressTriggeredRef.current[id] = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      setIsSelectionMode(true);
      toggleSelectTrack(id);
    }, 450);
  };

  const handleTrackTouchMove = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    const start = trackTouchStartPosRef.current[id];
    if (!start) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientX - start.x) > 10 || Math.abs(clientY - start.y) > 10) {
      if (trackLongPressTimerRef.current[id]) {
        clearTimeout(trackLongPressTimerRef.current[id]);
        delete trackLongPressTimerRef.current[id];
      }
    }
  };

  const handleTrackTouchEnd = (id: string) => {
    if (trackLongPressTimerRef.current[id]) {
      clearTimeout(trackLongPressTimerRef.current[id]);
      delete trackLongPressTimerRef.current[id];
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [editingCollection, setEditingCollection] = useState<AudiobookCollection | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [editingTrack, setEditingTrack] = useState<AudiobookTrack | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: Array<{ file: File; existingTrack: AudiobookTrack }>;
    newFiles: File[];
    targetColId: string | null;
  } | null>(null);

  // Notify parent whether user is at root of AudiobookLibraryView (no collection, selection, or modal open)
  const isAtRoot = selectedCollectionId === null && !isSelectionMode && !showAppearanceModal && !showBatchCollectionPicker && !editingCollection && !isCreatingCollection && !editingTrack && !duplicateWarning;

  useEffect(() => {
    onIsAtRootChange?.(isAtRoot);
  }, [isAtRoot, onIsAtRootChange]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadCollectionIdRef = useRef<string | null>(null);

  const {
    currentTrack,
    currentCollection,
    isPlaying,
    currentTime,
    duration,
    progressPercent,
    playTrack,
    togglePlay,
    updatePlaylist,
  } = useAudioPlayer();

  const loadData = useCallback(async () => {
    const [loadedCols, loadedTracks] = await Promise.all([
      getAudioCollections(),
      getAudioTracks(),
    ]);
    setCollections(loadedCols);
    setTracks(loadedTracks);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep tracks progress in sync with active player in real-time
  useEffect(() => {
    if (currentTrack) {
      setTracks((prev) =>
          prev.map((t) =>
              t.id === currentTrack.id
                  ? { ...t, currentTime, progressPercent, duration: duration || t.duration }
                  : t
          )
      );
    }
  }, [currentTrack, currentTime, duration, progressPercent]);

  // Android Back Gesture handler for collection detail view
  useEffect(() => {
    if (selectedCollectionId) {
      const unreg = pushBackHandler(() => {
        setSelectedCollectionId(null);
        return true;
      });
      return unreg;
    }
  }, [selectedCollectionId]);

  // Android Back Gesture for Modals and Selection Mode
  useEffect(() => {
    if (showBatchCollectionPicker) {
      const unreg = pushBackHandler(() => {
        setShowBatchCollectionPicker(false);
        return true;
      });
      return unreg;
    }
    if (selectedTrackIds.size > 0 || isSelectionMode) {
      const unreg = pushBackHandler(() => {
        setSelectedTrackIds(new Set());
        setIsSelectionMode(false);
        return true;
      });
      return unreg;
    }
    if (editingCollection || isCreatingCollection || editingTrack) {
      const unreg = pushBackHandler(() => {
        setEditingCollection(null);
        setIsCreatingCollection(false);
        setEditingTrack(null);
        return true;
      });
      return unreg;
    }
  }, [showBatchCollectionPicker, selectedTrackIds, isSelectionMode, editingCollection, isCreatingCollection, editingTrack]);

  // Batch selection handlers
  const toggleSelectTrack = useCallback((trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      setIsSelectionMode(next.size > 0);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((list: AudiobookTrack[]) => {
    setSelectedTrackIds((prev) => {
      const allSelected = list.length > 0 && list.every((t) => prev.has(t.id));
      if (allSelected) {
        setIsSelectionMode(false);
        return new Set();
      }
      const next = new Set(prev);
      list.forEach((t) => next.add(t.id));
      setIsSelectionMode(true);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTrackIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleBatchRemoveFromCollection = useCallback(async () => {
    const ids = Array.from<string>(selectedTrackIds);
    if (ids.length === 0) return;
    await moveTracksToCollection(ids, null);
    showToast(`Убрано из сборника: ${ids.length} аудиозаписей`);
    clearSelection();
    await loadData();
  }, [selectedTrackIds, clearSelection, loadData]);

  const handleBatchMoveToCollection = useCallback(async (colId: string) => {
    const ids = Array.from<string>(selectedTrackIds);
    if (ids.length === 0) return;
    await moveTracksToCollection(ids, colId);
    showToast(`Перемещено в сборник: ${ids.length} аудиозаписей`);
    setShowBatchCollectionPicker(false);
    clearSelection();
    await loadData();
  }, [selectedTrackIds, clearSelection, loadData]);

  const handleBatchCreateCollectionAndMove = useCallback(async (title: string, author?: string) => {
    const ids = Array.from<string>(selectedTrackIds);
    if (ids.length === 0) return;
    const newCol: AudiobookCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title,
      author: author || '',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveAudioCollection(newCol);
    await moveTracksToCollection(ids, newCol.id);
    showToast(`Создан сборник «${title}» и добавлено ${ids.length} аудиозаписей`);
    setShowBatchCollectionPicker(false);
    clearSelection();
    await loadData();
  }, [selectedTrackIds, clearSelection, loadData]);

  const handleBatchResetProgress = useCallback(async () => {
    const ids = Array.from<string>(selectedTrackIds);
    if (ids.length === 0) return;
    await resetTracksProgress(ids);
    showToast(`Прогресс сброшен на 0% для ${ids.length} аудиозаписей`);
    clearSelection();
    await loadData();
  }, [selectedTrackIds, clearSelection, loadData]);

  const handleBatchDeleteTracks = useCallback(async () => {
    const ids = Array.from<string>(selectedTrackIds);
    if (ids.length === 0) return;
    if (window.confirm(`Удалить выбранные аудиофайлы (${ids.length} шт.) из памяти?`)) {
      await deleteMultipleAudioTracks(ids);
      showToast(`Удалено: ${ids.length} аудиозаписей`);
      clearSelection();
      await loadData();
    }
  }, [selectedTrackIds, clearSelection, loadData]);

  // Selected collection data
  const activeCollection = collections.find((c) => c.id === selectedCollectionId) || null;
  const activeCollectionTracks = tracks
      .filter((t) => t.collectionId === selectedCollectionId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // Reorder audio files in collection by drag-and-drop
  const handleReorderTracks = async (reordered: AudiobookTrack[]) => {
    // 1. Assign consecutive orderIndex
    const updatedWithOrder = reordered.map((t, idx) => ({
      ...t,
      orderIndex: idx,
    }));

    // 2. Update local state immediately for 60fps responsive UI
    const orderMap = new Map(updatedWithOrder.map((t) => [t.id, t.orderIndex]));
    setTracks((prev) =>
        prev.map((t) =>
            orderMap.has(t.id) ? { ...t, orderIndex: orderMap.get(t.id)! } : t
        )
    );

    // 3. Keep current playback playlist in sync if user is playing this collection
    if (currentCollection && currentCollection.id === selectedCollectionId && updatePlaylist) {
      updatePlaylist(updatedWithOrder);
    }

    // 4. Persist updated order to IndexedDB
    try {
      await updateTracksOrder(updatedWithOrder.map((t) => t.id));
    } catch (err) {
      console.error('Failed to save reordered tracks', err);
    }
  };

  const handleMoveTrack = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeCollectionTracks.length) return;

    const newTracks = [...activeCollectionTracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIndex];
    newTracks[targetIndex] = temp;

    await handleReorderTracks(newTracks);
  };

  // Compute Collection stats in real-time
  const getCollectionStats = (colId: string) => {
    const colTracks = tracks.filter((t) => t.collectionId === colId);
    const totalDuration = colTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalListened = colTracks.reduce((acc, t) => {
      const isCur = currentTrack && currentTrack.id === t.id;
      const listened = isCur ? currentTime : (t.currentTime || 0);
      return acc + listened;
    }, 0);
    const progress =
        totalDuration > 0 ? Math.round((totalListened / totalDuration) * 100) : 0;
    return {
      count: colTracks.length,
      totalDuration,
      progress: Math.min(100, Math.max(0, progress)),
    };
  };

  // Helper to save files into IndexedDB
  const saveFilesToLibrary = async (filesToSave: File[], targetColId: string | null) => {
    setIsUploading(true);
    try {
      const existingInCol = targetColId
          ? tracks.filter((t) => t.collectionId === targetColId)
          : [];
      let baseOrder = existingInCol.length;

      for (let i = 0; i < filesToSave.length; i++) {
        const file = filesToSave[i];
        const dur = await getAudioFileDuration(file);

        // Friendly clean title from filename: "01_Tom_1.mp3" -> "Том 1" or filename without extension
        const cleanName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/^[0-9]+[_\-\s.]+/, '')
            .replace(/[_-]+/g, ' ')
            .trim() || `Аудиозапись ${baseOrder + i + 1}`;

        const newTrack: AudiobookTrack = {
          id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          collectionId: targetColId || undefined,
          title: cleanName,
          author: activeCollection?.author || 'Автор не указан',
          fileName: file.name,
          fileSize: formatBytes(file.size),
          audioBlob: file,
          duration: dur,
          currentTime: 0,
          progressPercent: 0,
          lastListenedTimestamp: 0,
          orderIndex: baseOrder + i,
          addedAt: Date.now(),
        };

        await saveAudioTrack(newTrack);
      }

      await loadData();
    } catch (err) {
      console.error('Error uploading audiobooks', err);
    } finally {
      setIsUploading(false);
      targetUploadCollectionIdRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Upload handler for audio files with duplicate file check
  const handleAudioFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    const targetColId = targetUploadCollectionIdRef.current;

    // Check if any selected files already exist in the library
    const duplicates: Array<{ file: File; existingTrack: AudiobookTrack }> = [];
    const newFiles: File[] = [];

    for (const file of fileList) {
      const cleanFileName = file.name.trim().toLowerCase();
      const existing = tracks.find(
          (t) =>
              t.fileName.trim().toLowerCase() === cleanFileName ||
              (t.fileSize === formatBytes(file.size) &&
                  t.fileName.replace(/\.[^/.]+$/, '').trim().toLowerCase() ===
                  file.name.replace(/\.[^/.]+$/, '').trim().toLowerCase())
      );

      if (existing) {
        duplicates.push({ file, existingTrack: existing });
      } else {
        newFiles.push(file);
      }
    }

    if (duplicates.length > 0) {
      // Pause and ask user for confirmation before uploading duplicates
      setDuplicateWarning({
        duplicates,
        newFiles,
        targetColId,
      });
      return;
    }

    // No duplicates detected -> upload immediately
    await saveFilesToLibrary(fileList, targetColId);
  };

  const handleOpenUploadPicker = (collectionId?: string) => {
    targetUploadCollectionIdRef.current = collectionId || null;
    fileInputRef.current?.click();
  };

  // Collection CRUD
  const handleSaveCollection = async (colData: Partial<AudiobookCollection>) => {
    if (editingCollection) {
      const updated: AudiobookCollection = {
        ...editingCollection,
        ...colData,
        updatedAt: Date.now(),
      };
      await saveAudioCollection(updated);
    } else {
      const newCol: AudiobookCollection = {
        id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: colData.title || 'Новый сборник',
        author: colData.author || '',
        description: colData.description || '',
        coverUrl: colData.coverUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveAudioCollection(newCol);
      setSelectedCollectionId(newCol.id);
    }
    setEditingCollection(null);
    setIsCreatingCollection(false);
    await loadData();
  };

  const handleDeleteCollection = async (id: string) => {
    await deleteAudioCollection(id, true);
    if (selectedCollectionId === id) {
      setSelectedCollectionId(null);
    }
    setEditingCollection(null);
    await loadData();
  };

  // Track CRUD
  const handleSaveTrack = async (updatedData: Partial<AudiobookTrack>) => {
    if (!editingTrack) return;
    const updated: AudiobookTrack = {
      ...editingTrack,
      ...updatedData,
    };
    await saveAudioTrack(updated);
    setEditingTrack(null);
    await loadData();
  };

  const handleDeleteTrack = async (id: string) => {
    await deleteAudioTrack(id);
    setEditingTrack(null);
    await loadData();
  };

  // Play Collection from current or first unplayed track
  const handlePlayCollection = (colId: string) => {
    const colTracks = tracks
        .filter((t) => t.collectionId === colId)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    if (colTracks.length === 0) return;

    const col = collections.find((c) => c.id === colId);

    // 1. First priority: a track that is currently in progress (0% < progress < 98%)
    // If multiple, pick the one most recently listened to
    const inProgressTracks = colTracks.filter(
        (t) => (t.progressPercent ?? 0) > 0 && (t.progressPercent ?? 0) < 98
    );
    let chosenTrack: AudiobookTrack | undefined;

    if (inProgressTracks.length > 0) {
      chosenTrack = inProgressTracks.sort(
          (a, b) => (b.lastListenedTimestamp ?? 0) - (a.lastListenedTimestamp ?? 0)
      )[0];
    }

    // 2. Second priority: the first track that has not yet been completed (< 98%)
    // e.g. if tracks 1 and 2 are 100%, this picks track 3!
    if (!chosenTrack) {
      chosenTrack = colTracks.find((t) => (t.progressPercent ?? 0) < 98);
    }

    // 3. Fallback: if all tracks are completed (>= 98%), restart from the first track
    if (!chosenTrack) {
      chosenTrack = colTracks[0];
    }

    if (!chosenTrack) {
      showToast('В сборнике нет аудиофайлов для воспроизведения');
      return;
    }

    playTrack(chosenTrack, colTracks, col);
  };

  // Filtered collections & tracks
  const filteredCollections = collections.filter((c) => {
    const match =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.author && c.author.toLowerCase().includes(searchQuery.toLowerCase()));
    return match;
  });

  const filteredTracks = tracks.filter((t) => {
    const match =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.author && t.author.toLowerCase().includes(searchQuery.toLowerCase()));
    return match;
  });

  return (
      <div
          id="audiobook-library-view"
          className="w-full h-full flex flex-col overflow-hidden relative select-none"
          style={{
            backgroundColor: theme.bg,
            color: theme.text,
            paddingBottom: `${bottomPadding}px`,
          }}
      >
        {/* Hidden File Input for Audio Files */}
        <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.m4a,.m4b,.aac,.ogg,.wav,.flac,.opus"
            onChange={handleAudioFilesSelected}
            className="hidden"
        />

        {/* TOP HEADER WITH SAFE AREA INSET */}
        <div
            id="audiobook-top-app-bar"
            className="border-b transition-colors shrink-0"
            style={{
              paddingTop: isMobile ? 'max(env(safe-area-inset-top, 0px), 48px)' : '14px',
              backgroundColor: theme.cardBg,
              borderColor: theme.border,
              color: theme.text,
            }}
        >
          {selectedCollectionId && activeCollection ? (
              <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                      id="btn-back-to-collections"
                      onClick={() => setSelectedCollectionId(null)}
                      className="w-10 h-10 min-w-[40px] rounded-2xl border border-inherit/20 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                      title="Назад к сборникам"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold truncate">
                      {activeCollection.title}
                    </h2>
                    <p className="text-[11px] opacity-65 truncate">
                      {activeCollection.author || 'Сборник аудиокниг'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                      id="btn-edit-collection-details"
                      onClick={() => setEditingCollection(activeCollection)}
                      className="p-2 rounded-xl border border-inherit/20 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-xs"
                      title="Редактировать сборник"
                  >
                    <Edit2 className="w-4 h-4 opacity-75" />
                  </button>
                </div>
              </div>
          ) : (
              <>
                <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 border-b border-inherit/15">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Clickable Headphones Icon -> Opens App Appearance Settings */}
                    <button
                        id="btn-app-appearance-audio"
                        onClick={() => setShowAppearanceModal(true)}
                        className="w-10 h-10 min-w-[40px] rounded-2xl flex items-center justify-center font-bold shadow-xs active:scale-95 transition-all cursor-pointer hover:opacity-90"
                        style={{
                          backgroundColor: theme.accent,
                          color: isDark ? '#000' : '#fff',
                        }}
                        title="Настройки темы и оформления приложения"
                    >
                      <Headphones className="w-5 h-5" />
                    </button>

                    {/* Counter Pill */}
                    <div
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                        title="Количество сборников и аудиофайлов в библиотеке"
                    >
                      <span className="font-bold">{collections.length}</span>
                      <span className="opacity-70 font-normal">
                    {collections.length === 1 ? 'сборник' : collections.length < 5 ? 'сборника' : 'сборников'}
                  </span>
                      <span className="opacity-40">•</span>
                      <span className="font-bold">{tracks.length}</span>
                      <span className="opacity-70 font-normal">аудио</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {onOpenAndroidCode && (
                        <button
                            id="btn-open-android-code-audio"
                            onClick={onOpenAndroidCode}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                            title="Релиз на GitHub и сборка APK"
                        >
                          <Github className="w-4 h-4 shrink-0" />
                          <span className="hidden sm:inline">Релиз & APK</span>
                        </button>
                    )}

                    <button
                        id="btn-refresh-audiobooks"
                        onClick={() => loadData()}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-amber-500 transition-colors active:scale-95 cursor-pointer"
                        title="Обновить список аудиокниг"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search & Tabs bar */}
                <div className="px-3.5 sm:px-6 py-2.5 flex items-center gap-2">
                  <div
                      className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      }}
                  >
                    <Search className="w-4 h-4 opacity-50 shrink-0" />
                    <input
                        id="input-audio-search"
                        type="text"
                        placeholder="Поиск аудиокниг по названию или автору..."
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

                  {/* Segmented Switch Tabs */}
                  <div
                      className="flex items-center p-1 rounded-2xl border shrink-0"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      }}
                  >
                    <button
                        id="tab-btn-collections"
                        onClick={() => setActiveTab('collections')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'collections'
                                ? 'bg-amber-500 text-neutral-950 shadow-xs font-bold'
                                : 'opacity-70 hover:opacity-100'
                        }`}
                    >
                      Сборники ({collections.length})
                    </button>
                    <button
                        id="tab-btn-all-tracks"
                        onClick={() => setActiveTab('all_tracks')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'all_tracks'
                                ? 'bg-amber-500 text-neutral-950 shadow-xs font-bold'
                                : 'opacity-70 hover:opacity-100'
                        }`}
                    >
                      Все записи ({tracks.length})
                    </button>
                  </div>
                </div>
              </>
          )}
        </div>

        {/* UPLOADING SPINNER OVERLAY */}
        {isUploading && (
            <div className="px-4 py-2 bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center gap-2 border-b border-amber-500/30 animate-pulse">
              <Upload className="w-4 h-4 animate-bounce" />
              <span>Обработка и сохранение аудиофайлов в память...</span>
            </div>
        )}

        {/* VIEW: INSIDE A SPECIFIC COLLECTION */}
        {selectedCollectionId && activeCollection ? (
            <div data-no-swipe="true" className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 touch-pan-y">
              {/* Collection Header Banner */}
              <div
                  className="p-4 sm:p-5 rounded-3xl border shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-4"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  }}
              >
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-lg border border-inherit/20 shrink-0 bg-neutral-900 group">
                  {activeCollection.coverUrl ? (
                      <img
                          src={activeCollection.coverUrl}
                          alt={activeCollection.title}
                          className="w-full h-full object-cover"
                      />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                        <Headphones className="w-12 h-12 opacity-50" />
                      </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                Сборник аудиокниг
              </span>
                  <h2 className="text-lg sm:text-xl font-bold leading-snug">
                    {activeCollection.title}
                  </h2>
                  {activeCollection.author && (
                      <p className="text-xs opacity-70 mt-0.5">{activeCollection.author}</p>
                  )}
                  {activeCollection.description && (
                      <p className="text-xs opacity-60 mt-1.5 line-clamp-2">
                        {activeCollection.description}
                      </p>
                  )}

                  {/* Stats Bar */}
                  {(() => {
                    const stats = getCollectionStats(activeCollection.id);
                    return (
                        <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                          <button
                              id="btn-play-entire-collection"
                              disabled={stats.count === 0}
                              onClick={() => handlePlayCollection(activeCollection.id)}
                              className="px-4 py-2 rounded-2xl bg-amber-500 text-neutral-950 hover:bg-amber-400 active:scale-95 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>{stats.progress > 0 ? 'Продолжить' : 'Слушать'}</span>
                          </button>

                          <div className="text-xs opacity-75 flex items-center gap-2">
                            <span>{stats.count} томов/глав</span>
                            <span>•</span>
                            <span>{formatAudioTime(stats.totalDuration)}</span>
                            <span>•</span>
                            <span className="font-bold text-amber-500">{stats.progress}% прослушано</span>
                          </div>
                        </div>
                    );
                  })()}
                </div>
              </div>

              {/* List of Tracks in Collection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold opacity-75 uppercase tracking-wider">
                    Содержимое сборника ({activeCollectionTracks.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenUploadPicker(selectedCollectionId)}
                        className="text-xs text-amber-500 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить том
                    </button>
                  </div>
                </div>

                {activeCollectionTracks.length === 0 ? (
                    <div
                        className="py-12 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3"
                        style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Music className="w-6 h-6 opacity-60" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">Сборник пуст</h4>
                        <p className="text-xs opacity-60 mt-1 max-w-xs">
                          Загрузите тома или аудиозаписи (.mp3, .m4a, .aac) прямо в этот сборник
                        </p>
                      </div>
                      <button
                          onClick={() => handleOpenUploadPicker(selectedCollectionId)}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-xs"
                      >
                        Загрузить аудиофайлы
                      </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                      {activeCollectionTracks.length > 1 && (
                          <div className="flex items-center gap-1.5 text-[11px] opacity-60 px-1 py-0.5 select-none">
                            <GripVertical className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Потяните за значок слева для перетаскивания и смены очередности аудиофайлов</span>
                          </div>
                      )}
                      <Reorder.Group
                          axis="y"
                          values={activeCollectionTracks}
                          onReorder={handleReorderTracks}
                          className="space-y-2"
                      >
                        {activeCollectionTracks.map((track, idx) => (
                            <CollectionTrackItem
                                key={track.id}
                                track={track}
                                idx={idx}
                                isCur={currentTrack?.id === track.id}
                                isPlaying={isPlaying}
                                isSelected={selectedTrackIds.has(track.id)}
                                isSelectionMode={isSelectionMode}
                                activeCollection={activeCollection}
                                theme={theme}
                                canMoveUp={idx > 0}
                                canMoveDown={idx < activeCollectionTracks.length - 1}
                                onToggleSelect={toggleSelectTrack}
                                onPlay={() => {
                                  if (currentTrack?.id === track.id) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, activeCollectionTracks, activeCollection);
                                  }
                                }}
                                onEdit={() => setEditingTrack(track)}
                                onMoveUp={() => handleMoveTrack(idx, 'up')}
                                onMoveDown={() => handleMoveTrack(idx, 'down')}
                            />
                        ))}
                      </Reorder.Group>
                    </div>
                )}
              </div>
            </div>
        ) : (
            /* VIEW: MAIN COLLECTIONS & TRACKS LIST */
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {/* TAB 1: COLLECTIONS */}
              {activeTab === 'collections' ? (
                  <div>
                    {filteredCollections.length === 0 ? (
                        <div
                            className="py-14 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3"
                            style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                        >
                          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <FolderPlus className="w-7 h-7 opacity-60" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Нет сборников</h4>
                            <p className="text-xs opacity-60 mt-1 max-w-sm">
                              Создайте сборник для объединения томов книги или загрузите аудиофайлы
                            </p>
                          </div>
                          <button
                              onClick={() => setIsCreatingCollection(true)}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-xs"
                          >
                            Создать первый сборник
                          </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {filteredCollections.map((col) => {
                            const stats = getCollectionStats(col.id);

                            return (
                                <div
                                    key={col.id}
                                    onClick={() => setSelectedCollectionId(col.id)}
                                    className="p-4 rounded-3xl border transition-all cursor-pointer hover:shadow-xl active:scale-[0.99] group flex flex-col justify-between"
                                    style={{
                                      backgroundColor: theme.cardBg,
                                      borderColor: theme.border,
                                    }}
                                >
                                  {/* Cover + Info */}
                                  <div className="flex items-start gap-3.5">
                                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md border border-inherit/20 shrink-0 bg-neutral-900">
                                      {col.coverUrl ? (
                                          <img
                                              src={col.coverUrl}
                                              alt={col.title}
                                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                          />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                                            <Headphones className="w-8 h-8 opacity-60" />
                                          </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-500">
                              {stats.count} томов
                            </span>
                                      <h3 className="text-xs sm:text-sm font-bold truncate leading-tight mt-0.5">
                                        {col.title}
                                      </h3>
                                      {col.author && (
                                          <p className="text-[11px] opacity-65 truncate mt-0.5">{col.author}</p>
                                      )}
                                      <p className="text-[10px] opacity-55 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatAudioTime(stats.totalDuration)}</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Progress Bar & Actions */}
                                  <div className="mt-4 pt-3 border-t border-inherit/15">
                                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                      <span className="opacity-70">Прослушано</span>
                                      <span className="text-amber-500">{stats.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                      <div
                                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                          style={{ width: `${stats.progress}%` }}
                                      />
                                    </div>

                                    <div className="flex items-center justify-between mt-3 pt-1">
                                      <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlayCollection(col.id);
                                          }}
                                          disabled={stats.count === 0}
                                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>{stats.progress > 0 ? 'Продолжить' : 'Слушать'}</span>
                                      </button>

                                      <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCollection(col);
                                          }}
                                          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                                          title="Настройки сборника"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                    )}
                  </div>
              ) : (
                  /* TAB 2: ALL INDIVIDUAL TRACKS */
                  <div className="space-y-2">
                    {filteredTracks.length === 0 ? (
                        <div
                            className="py-14 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3"
                            style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                        >
                          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Music className="w-7 h-7 opacity-60" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">Нет загруженных аудиозаписей</h4>
                            <p className="text-xs opacity-60 mt-1 max-w-sm">
                              Нажмите «Загрузить», чтобы добавить файлы аудиокниг (.mp3, .m4a, .aac)
                            </p>
                          </div>
                          <button
                              onClick={() => handleOpenUploadPicker()}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-xs"
                          >
                            Загрузить аудиофайлы
                          </button>
                        </div>
                    ) : (
                        <>
                          <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-xs font-bold opacity-75 uppercase tracking-wider">
                      Все аудиозаписи ({filteredTracks.length})
                    </span>
                          </div>

                          <div className="space-y-2">
                            {filteredTracks.map((track) => {
                              const isCur = currentTrack?.id === track.id;
                              const parentCol = collections.find((c) => c.id === track.collectionId);
                              const trackCover = track.coverUrl || parentCol?.coverUrl;
                              const isSelected = selectedTrackIds.has(track.id);

                              return (
                                  <div
                                      key={track.id}
                                      onClick={() => {
                                        if (isTrackLongPressTriggeredRef.current[track.id]) {
                                          isTrackLongPressTriggeredRef.current[track.id] = false;
                                          return;
                                        }
                                        if (isSelectionMode) {
                                          toggleSelectTrack(track.id);
                                        } else {
                                          if (isCur) {
                                            togglePlay();
                                          } else {
                                            playTrack(track, filteredTracks, parentCol);
                                          }
                                        }
                                      }}
                                      onTouchStart={(e) => handleTrackTouchStart(track.id, e)}
                                      onTouchMove={(e) => handleTrackTouchMove(track.id, e)}
                                      onTouchEnd={() => handleTrackTouchEnd(track.id)}
                                      onTouchCancel={() => handleTrackTouchEnd(track.id)}
                                      onMouseDown={(e) => handleTrackTouchStart(track.id, e)}
                                      onMouseMove={(e) => handleTrackTouchMove(track.id, e)}
                                      onMouseUp={() => handleTrackTouchEnd(track.id)}
                                      onMouseLeave={() => handleTrackTouchEnd(track.id)}
                                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer select-none ${
                                          isSelected
                                              ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500/50'
                                              : isCur
                                                  ? 'border-amber-500/50 bg-amber-500/10 shadow-sm'
                                                  : 'border-inherit/20 hover:bg-black/5 dark:hover:bg-white/5'
                                      }`}
                                      style={{
                                        backgroundColor: isSelected || isCur ? undefined : theme.cardBg,
                                        borderColor: isSelected || isCur ? undefined : theme.border,
                                      }}
                                  >
                                    {/* Selection indicator only when selected or selection mode is active */}
                                    {isSelected ? (
                                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>
                                    ) : isSelectionMode ? (
                                        <div className="w-6 h-6 rounded-lg border-2 border-inherit/40 bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                                          <Square className="w-3 h-3 opacity-40" />
                                        </div>
                                    ) : null}

                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isCur) {
                                              togglePlay();
                                            } else {
                                              playTrack(track, filteredTracks, parentCol);
                                            }
                                          }}
                                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer ${
                                              isCur && isPlaying
                                                  ? 'bg-amber-500 text-neutral-950'
                                                  : 'bg-black/5 dark:bg-white/10 hover:bg-amber-500 hover:text-neutral-950'
                                          }`}
                                      >
                                        {isCur && isPlaying ? (
                                            <Pause className="w-4 h-4 fill-current" />
                                        ) : (
                                            <Play className="w-4 h-4 fill-current ml-0.5" />
                                        )}
                                      </button>

                                      {trackCover && (
                                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-inherit/20 shrink-0">
                                            <img src={trackCover} alt="" className="w-full h-full object-cover" />
                                          </div>
                                      )}

                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-xs sm:text-sm font-bold truncate">
                                          {track.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] opacity-70 mt-0.5">
                                          {parentCol && (
                                              <>
                                    <span className="text-amber-500 font-semibold truncate max-w-[120px]">
                                      {parentCol.title}
                                    </span>
                                                <span>•</span>
                                              </>
                                          )}
                                          <span>{formatAudioTime(track.duration)}</span>
                                          <span>•</span>
                                          <span className="font-semibold text-amber-500">
                                  {track.progressPercent}% прослушано
                                </span>
                                        </div>

                                        <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                                          <div
                                              className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                              style={{ width: `${track.progressPercent}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingTrack(track);
                                        }}
                                        className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors cursor-pointer shrink-0"
                                        title="Редактировать"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                              );
                            })}
                          </div>
                        </>
                    )}
                  </div>
              )}
            </div>
        )}

        {/* FLOATING ACTION BUTTONS */}
        {!selectedCollectionId && !isSelectionMode && selectedTrackIds.size === 0 && (
            <div
                className="absolute right-5 sm:right-6 z-30 flex flex-col items-end gap-2.5 transition-all duration-200 pointer-events-auto select-none"
                style={{
                  bottom: currentTrack ? '142px' : '82px',
                }}
            >
              {/* Button 1 (Above): "Создать сборник" */}
              <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  id="btn-fab-create-collection"
                  onClick={() => setIsCreatingCollection(true)}
                  className="h-11 px-4 rounded-2xl bg-neutral-900 text-amber-400 dark:bg-neutral-800 dark:text-amber-400 border border-amber-500/35 font-bold text-xs shadow-lg shadow-black/25 flex items-center gap-2 transition-all cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-95"
                  title="Создать новый сборник"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span className="tracking-tight">Создать сборник</span>
              </motion.button>

              {/* Button 2 (Main): "Добавить аудиокнигу" (matched with "Добавить книгу" in LibraryView) */}
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  id="btn-fab-add-audiobook"
                  onClick={() => handleOpenUploadPicker()}
                  className="h-14 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-xl shadow-amber-500/30 flex items-center gap-2.5 transition-all group cursor-pointer"
                  title="Добавить аудиокнигу (MP3, M4B, AAC, FLAC)"
              >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-sm font-bold tracking-tight">Добавить аудиокнигу</span>
              </motion.button>
            </div>
        )}

        {/* EDIT / CREATE COLLECTION MODAL */}
        <OverlayPortal>
          <AnimatePresence>
            {(isCreatingCollection || editingCollection) && (
                <EditCollectionModal
                    collection={editingCollection}
                    theme={theme}
                    onSave={handleSaveCollection}
                    onDelete={handleDeleteCollection}
                    onClose={() => {
                      setIsCreatingCollection(false);
                      setEditingCollection(null);
                    }}
                />
            )}
          </AnimatePresence>
        </OverlayPortal>

        {/* EDIT TRACK MODAL */}
        <OverlayPortal>
          <AnimatePresence>
            {editingTrack && (
                <EditTrackModal
                    track={editingTrack}
                    collections={collections}
                    theme={theme}
                    onSave={handleSaveTrack}
                    onDelete={handleDeleteTrack}
                    onClose={() => setEditingTrack(null)}
                />
            )}
          </AnimatePresence>
        </OverlayPortal>

        {/* DUPLICATE AUDIO WARNING MODAL */}
        <OverlayPortal>
          <AnimatePresence>
            {duplicateWarning && (
                <div
                    id="duplicate-audio-warning-backdrop"
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 select-none"
                    onClick={() => {
                      setDuplicateWarning(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                >
                  <motion.div
                      initial={{ scale: 0.94, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.94, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4"
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base leading-snug">
                          {duplicateWarning.duplicates.length === 1
                              ? 'Этот аудиофайл уже есть в приложении'
                              : 'Найдены повторяющиеся аудиофайлы'}
                        </h3>
                        <p className="text-xs opacity-75 mt-1 leading-relaxed">
                          {duplicateWarning.duplicates.length === 1
                              ? 'Выбранный аудиофайл уже сохранён в вашей медиатеке. Вы хотите пропустить дубликат или загрузить его повторно?'
                              : `Обнаружено ${duplicateWarning.duplicates.length} файлов, которые уже загружены в приложение.`}
                        </p>
                      </div>
                    </div>

                    {/* List of Duplicate Files */}
                    <div
                        className="max-h-48 overflow-y-auto space-y-2 p-2.5 rounded-2xl border"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.04)',
                          borderColor: theme.border,
                        }}
                    >
                      {duplicateWarning.duplicates.map((item, idx) => (
                          <div
                              key={idx}
                              className="p-2 rounded-xl text-xs flex items-center justify-between gap-2 border border-inherit/15"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{item.file.name}</p>
                              <p className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                                <span>{formatBytes(item.file.size)}</span>
                                <span>•</span>
                                <span>Уже в: {item.existingTrack.title}</span>
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 shrink-0">
                        Дубликат
                      </span>
                          </div>
                      ))}
                    </div>

                    {duplicateWarning.newFiles.length > 0 && (
                        <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                      Также выбрано {duplicateWarning.newFiles.length} новых уникальных файлов
                    </span>
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      {duplicateWarning.newFiles.length > 0 ? (
                          <button
                              id="btn-skip-duplicates"
                              onClick={() => {
                                const toUpload = duplicateWarning.newFiles;
                                const target = duplicateWarning.targetColId;
                                setDuplicateWarning(null);
                                saveFilesToLibrary(toUpload, target);
                              }}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-xs cursor-pointer text-center"
                          >
                            Загрузить только новые ({duplicateWarning.newFiles.length})
                          </button>
                      ) : (
                          <button
                              id="btn-skip-duplicates"
                              onClick={() => {
                                setDuplicateWarning(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-xs cursor-pointer text-center"
                          >
                            Не загружать дубликат
                          </button>
                      )}

                      <button
                          id="btn-upload-all-anyway"
                          onClick={() => {
                            const allFiles = [
                              ...duplicateWarning.duplicates.map((d) => d.file),
                              ...duplicateWarning.newFiles,
                            ];
                            const target = duplicateWarning.targetColId;
                            setDuplicateWarning(null);
                            saveFilesToLibrary(allFiles, target);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer text-center ${
                              theme.isDark
                                  ? 'border-neutral-700 hover:bg-white/5 text-neutral-200'
                                  : 'border-stone-300 hover:bg-black/5 text-stone-700'
                          }`}
                      >
                        Всё равно добавить
                      </button>

                      <button
                          id="btn-cancel-duplicate-upload"
                          onClick={() => {
                            setDuplicateWarning(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="py-2.5 px-3 rounded-xl text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-center"
                      >
                        Отмена
                      </button>
                    </div>
                  </motion.div>
                </div>
            )}
          </AnimatePresence>
        </OverlayPortal>

        {/* FLOATING BATCH ACTIONS BAR */}
        {(() => {
          const currentVisibleTracks = selectedCollectionId ? activeCollectionTracks : filteredTracks;
          const isAllSelected =
              currentVisibleTracks.length > 0 &&
              currentVisibleTracks.every((t) => selectedTrackIds.has(t.id));

          const hasAnyInCollection = Array.from(selectedTrackIds).some((id) => {
            const t = tracks.find((track) => track.id === id);
            return Boolean(t?.collectionId);
          });

          return (
              <OverlayPortal>
                <AnimatePresence>
                  {selectedTrackIds.size > 0 && (
                      <motion.div
                          initial={{ y: 60, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 60, opacity: 0 }}
                          id="audio-batch-action-bar"
                          className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-auto max-w-xl mx-auto z-40 p-2 sm:p-2.5 rounded-3xl bg-neutral-950/95 text-white border border-neutral-800 shadow-2xl backdrop-blur-md flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 select-none"
                          style={{ bottom: `${bottomPadding + 8}px` }}
                      >
                        {/* Selected Count & Toggle All */}
                        <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 shrink-0">
                    <span className="text-[11px] font-bold bg-amber-500 text-neutral-950 px-2 py-0.5 rounded-full">
                      {selectedTrackIds.size}
                    </span>
                          <button
                              onClick={() => toggleSelectAll(currentVisibleTracks)}
                              className="text-[11px] font-semibold opacity-80 hover:opacity-100 underline decoration-dotted cursor-pointer px-1"
                              title={isAllSelected ? 'Снять выделение со всех' : 'Выделить все видимые аудиозаписи'}
                          >
                            {isAllSelected ? 'Снять' : 'Все'}
                          </button>
                        </div>

                        <div className="h-4 w-px bg-white/20 shrink-0" />

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          {/* В сборник */}
                          <button
                              id="btn-batch-add-collection"
                              onClick={() => setShowBatchCollectionPicker(true)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-amber-400"
                              title="Добавить выбранные файлы в сборник"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">В сборник</span>
                          </button>

                          {/* Убрать из сборника */}
                          {hasAnyInCollection && (
                              <button
                                  id="btn-batch-remove-collection"
                                  onClick={handleBatchRemoveFromCollection}
                                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-amber-300"
                                  title="Убрать выбранные файлы из сборника"
                              >
                                <FolderMinus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Из сборника</span>
                              </button>
                          )}

                          {/* Сбросить прогресс */}
                          <button
                              id="btn-batch-reset-progress"
                              onClick={handleBatchResetProgress}
                              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-sky-400"
                              title="Сбросить прогресс на 0%"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Сброс</span>
                          </button>

                          {/* Удалить */}
                          <button
                              id="btn-batch-delete"
                              onClick={handleBatchDeleteTracks}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Удалить выбранные файлы из библиотеки"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Удалить</span>
                          </button>

                          {/* Закрыть выбор */}
                          <button
                              onClick={clearSelection}
                              className="p-1.5 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer ml-0.5"
                              title="Закрыть панель выбора"
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

        {/* BATCH COLLECTION PICKER MODAL */}
        <OverlayPortal>
          <AnimatePresence>
            {showBatchCollectionPicker && (
                <BatchCollectionPickerModal
                    collections={collections}
                    selectedCount={selectedTrackIds.size}
                    theme={theme}
                    onSelectCollection={handleBatchMoveToCollection}
                    onCreateCollectionAndMove={handleBatchCreateCollectionAndMove}
                    onClose={() => setShowBatchCollectionPicker(false)}
                />
            )}
          </AnimatePresence>
        </OverlayPortal>

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
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{toastMessage}</span>
                </motion.div>
            )}
          </AnimatePresence>
        </OverlayPortal>

        {/* App Appearance Modal */}
        <OverlayPortal>
          <AnimatePresence>
            {showAppearanceModal && settings && onUpdateSettings && (
                <AppAppearanceModal
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                    onClose={() => setShowAppearanceModal(false)}
                />
            )}
          </AnimatePresence>
        </OverlayPortal>
      </div>
  );
};