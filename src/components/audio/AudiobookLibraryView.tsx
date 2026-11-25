import React, {useState, useEffect, useRef, useCallback} from 'react';
import {OverlayPortal} from '../OverlayPortal';
import {motion, AnimatePresence, Reorder, useDragControls} from 'motion/react';
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
import {AudiobookCollection, AudiobookTrack, ReaderThemeConfig, ReaderSettings} from '../../types';
import {AppAppearanceModal} from '../AppAppearanceModal';
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
import {useAudioPlayer} from '../../context/AudioPlayerContext';
import {EditCollectionModal} from './EditCollectionModal';
import {EditTrackModal} from './EditTrackModal';
import {BatchCollectionPickerModal} from './BatchCollectionPickerModal';
import {pushBackHandler} from '../../utils/androidBackNavigation';
import { tr } from '../../i18n';

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
        startPosRef.current = {x: clientX, y: clientY};

        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch {
                }
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
            <div
                onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEnd();
                    controls.start(e);
                }}
                className="touch-none cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-neutral-400 hover:text-amber-500 active:text-amber-500 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title={tr("Зажмите и перетащите для изменения порядка")}
            >
                <GripVertical className="w-4 h-4"/>
            </div>

            {isSelected ? (
                <div
                    className="w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]"/>
                </div>
            ) : isSelectionMode ? (
                <div
                    className="w-6 h-6 rounded-lg border-2 border-inherit/40 bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Square className="w-3 h-3 opacity-40"/>
                </div>
            ) : null}

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
                    title={isCur && isPlaying ? tr("Пауза") : tr("Слушать")}
                >
                    {isCur && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current"/>
                    ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5"/>
                    )}
                </button>

                {trackCover && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-inherit/20 shrink-0">
                        <img src={trackCover} alt="" className="w-full h-full object-cover"/>
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
            <span
                className="text-[10px] opacity-50 font-mono font-bold bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
              #{idx + 1}
            </span>
                        <h4 className="text-xs sm:text-sm font-bold truncate">
                            {track.title}
                        </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] opacity-70 mt-1">
                        <span>{formatAudioTime(track.duration)}</span>
                        <span>•</span>
                        <span className="font-semibold text-amber-500">
              {tr`${track.progressPercent}% прослушано`}
            </span>
                        <span className="text-[10px] opacity-60">({track.fileSize})</span>
                    </div>

                    <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{width: `${track.progressPercent}%`}}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
                <div className="hidden md:flex flex-col -space-y-1 opacity-0 group-hover:opacity-70 transition-opacity">
                    <button
                        disabled={!canMoveUp}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title={tr("Переместить выше")}
                    >
                        <ArrowUp className="w-3 h-3"/>
                    </button>
                    <button
                        disabled={!canMoveDown}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown();
                        }}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title={tr("Переместить ниже")}
                    >
                        <ArrowDown className="w-3 h-3"/>
                    </button>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors cursor-pointer"
                    title={tr("Редактировать аудиозапись")}
                >
                    <Edit2 className="w-4 h-4"/>
                </button>
            </div>
        </Reorder.Item>
    );
};

interface AudiobookLibraryViewProps {
    theme: ReaderThemeConfig;
    settings?: ReaderSettings;
    onUpdateSettings?: (newSettings: Partial<ReaderSettings>) => void;
    onOpenSourceCode?: () => void;
    onOpenSync?: () => void;
    bottomPadding?: number;
    onIsAtRootChange?: (isAtRoot: boolean) => void;
    /** true, когда открыт сборник (а не главный экран аудиокниг) */
    onCollectionOpenChange?: (isOpen: boolean) => void;
}

export const AudiobookLibraryView: React.FC<AudiobookLibraryViewProps> = ({
                                                                              theme,
                                                                              settings,
                                                                              onUpdateSettings,
                                                                              onOpenSourceCode,
                                                                              onOpenSync,
                                                                              bottomPadding = 90,
                                                                              onIsAtRootChange,
                                                                              onCollectionOpenChange,
                                                                          }) => {
    const isDark = theme.isDark;
    const [showAppearanceModal, setShowAppearanceModal] = useState(false);
    const [collections, setCollections] = useState<AudiobookCollection[]>([]);
    const [tracks, setTracks] = useState<AudiobookTrack[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'collections' | 'all_tracks'>('collections');

    const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
    const [showBatchCollectionPicker, setShowBatchCollectionPicker] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const trackLongPressTimerRef = useRef<{ [key: string]: number }>({});
    const isTrackLongPressTriggeredRef = useRef<{ [key: string]: boolean }>({});
    const trackTouchStartPosRef = useRef<{ [key: string]: { x: number; y: number } }>({});

    const handleTrackTouchStart = (id: string, e: React.TouchEvent | React.MouseEvent) => {
        isTrackLongPressTriggeredRef.current[id] = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        trackTouchStartPosRef.current[id] = {x: clientX, y: clientY};

        if (trackLongPressTimerRef.current[id]) {
            clearTimeout(trackLongPressTimerRef.current[id]);
        }

        trackLongPressTimerRef.current[id] = window.setTimeout(() => {
            isTrackLongPressTriggeredRef.current[id] = true;
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch {
                }
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

    const isAtRoot = selectedCollectionId === null && !isSelectionMode && !showAppearanceModal && !showBatchCollectionPicker && !editingCollection && !isCreatingCollection && !editingTrack && !duplicateWarning;

    useEffect(() => {
        onIsAtRootChange?.(isAtRoot);
    }, [isAtRoot, onIsAtRootChange]);

    useEffect(() => {
        onCollectionOpenChange?.(selectedCollectionId !== null);
    }, [selectedCollectionId, onCollectionOpenChange]);
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

    useEffect(() => {
        if (currentTrack) {
            setTracks((prev) =>
                prev.map((t) =>
                    t.id === currentTrack.id
                        ? {...t, currentTime, progressPercent, duration: duration || t.duration}
                        : t
                )
            );
        }
    }, [currentTrack, currentTime, duration, progressPercent]);

    useEffect(() => {
        if (selectedCollectionId) {
            const unreg = pushBackHandler(() => {
                setSelectedCollectionId(null);
                return true;
            });
            return unreg;
        }
    }, [selectedCollectionId]);

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
        showToast(tr`Убрано из сборника: ${ids.length} аудиозаписей`);
        clearSelection();
        await loadData();
    }, [selectedTrackIds, clearSelection, loadData]);

    const handleBatchMoveToCollection = useCallback(async (colId: string) => {
        const ids = Array.from<string>(selectedTrackIds);
        if (ids.length === 0) return;
        await moveTracksToCollection(ids, colId);
        showToast(tr`Перемещено в сборник: ${ids.length} аудиозаписей`);
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
        showToast(tr`Создан сборник «${title}» и добавлено ${ids.length} аудиозаписей`);
        setShowBatchCollectionPicker(false);
        clearSelection();
        await loadData();
    }, [selectedTrackIds, clearSelection, loadData]);

    const handleBatchResetProgress = useCallback(async () => {
        const ids = Array.from<string>(selectedTrackIds);
        if (ids.length === 0) return;
        await resetTracksProgress(ids);
        showToast(tr`Прогресс сброшен на 0% для ${ids.length} аудиозаписей`);
        clearSelection();
        await loadData();
    }, [selectedTrackIds, clearSelection, loadData]);

    const handleBatchDeleteTracks = useCallback(async () => {
        const ids = Array.from<string>(selectedTrackIds);
        if (ids.length === 0) return;
        if (window.confirm(tr`Удалить выбранные аудиофайлы (${ids.length} шт.) из памяти?`)) {
            await deleteMultipleAudioTracks(ids);
            showToast(tr`Удалено: ${ids.length} аудиозаписей`);
            clearSelection();
            await loadData();
        }
    }, [selectedTrackIds, clearSelection, loadData]);

    const activeCollection = collections.find((c) => c.id === selectedCollectionId) || null;
    const activeCollectionTracks = tracks
        .filter((t) => t.collectionId === selectedCollectionId)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    const handleReorderTracks = async (reordered: AudiobookTrack[]) => {
        const updatedWithOrder = reordered.map((t, idx) => ({
            ...t,
            orderIndex: idx,
        }));

        const orderMap = new Map(updatedWithOrder.map((t) => [t.id, t.orderIndex]));
        setTracks((prev) =>
            prev.map((t) =>
                orderMap.has(t.id) ? {...t, orderIndex: orderMap.get(t.id)!} : t
            )
        );

        if (currentCollection && currentCollection.id === selectedCollectionId && updatePlaylist) {
            updatePlaylist(updatedWithOrder);
        }

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

                const cleanName = file.name
                    .replace(/\.[^/.]+$/, '')
                    .replace(/^[0-9]+[_\-\s.]+/, '')
                    .replace(/[_-]+/g, ' ')
                    .trim() || tr`Аудиозапись ${baseOrder + i + 1}`;

                const newTrack: AudiobookTrack = {
                    id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    collectionId: targetColId || undefined,
                    title: cleanName,
                    author: activeCollection?.author || tr("Автор не указан"),
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

    const handleAudioFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList: File[] = Array.from(files);
        const targetColId = targetUploadCollectionIdRef.current;

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
                duplicates.push({file, existingTrack: existing});
            } else {
                newFiles.push(file);
            }
        }

        if (duplicates.length > 0) {
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

    // Кнопки из меню «+» в центре нижней панели (App.tsx)
    useEffect(() => {
        const onAdd = () => handleOpenUploadPicker(selectedCollectionId || undefined);
        const onCreate = () => setIsCreatingCollection(true);
        window.addEventListener('audiobooks:add-audiobook', onAdd);
        window.addEventListener('audiobooks:create-collection', onCreate);
        return () => {
            window.removeEventListener('audiobooks:add-audiobook', onAdd);
            window.removeEventListener('audiobooks:create-collection', onCreate);
        };
    });

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
                title: colData.title || tr("Новый сборник"),
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

    const handlePlayCollection = (colId: string) => {
        const colTracks = tracks
            .filter((t) => t.collectionId === colId)
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        if (colTracks.length === 0) return;

        const col = collections.find((c) => c.id === colId);


        const inProgressTracks = colTracks.filter(
            (t) => (t.progressPercent ?? 0) > 0 && (t.progressPercent ?? 0) < 98
        );
        let chosenTrack: AudiobookTrack | undefined;

        if (inProgressTracks.length > 0) {
            chosenTrack = inProgressTracks.sort(
                (a, b) => (b.lastListenedTimestamp ?? 0) - (a.lastListenedTimestamp ?? 0)
            )[0];
        }

        if (!chosenTrack) {
            chosenTrack = colTracks.find((t) => (t.progressPercent ?? 0) < 98);
        }

        if (!chosenTrack) {
            chosenTrack = colTracks[0];
        }

        if (!chosenTrack) {
            showToast(tr("В сборнике нет аудиофайлов для воспроизведения"));
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
                paddingBottom: `calc(${bottomPadding}px + max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)))`,
            }}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.m4a,.m4b,.aac,.ogg,.wav,.flac,.opus"
                onChange={handleAudioFilesSelected}
                className="hidden"
            />

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
                                title={tr("Назад к сборникам")}
                            >
                                <ArrowLeft className="w-5 h-5"/>
                            </button>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-bold truncate">
                                    {activeCollection.title}
                                </h2>
                                <p className="text-[11px] opacity-65 truncate">
                                    {activeCollection.author || tr("Сборник аудиокниг")}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button
                                id="btn-edit-collection-details"
                                onClick={() => setEditingCollection(activeCollection)}
                                className="p-2 rounded-xl border border-inherit/20 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-xs"
                                title={tr("Редактировать сборник")}
                            >
                                <Edit2 className="w-4 h-4 opacity-75"/>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div
                            className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 border-b border-inherit/15">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                    id="btn-app-appearance-audio"
                                    onClick={() => setShowAppearanceModal(true)}
                                    className="w-10 h-10 min-w-[40px] rounded-2xl flex items-center justify-center font-bold shadow-xs active:scale-95 transition-all cursor-pointer hover:opacity-90"
                                    style={{
                                        backgroundColor: theme.accent,
                                        color: isDark ? '#000' : '#fff',
                                    }}
                                    title={tr("Настройки темы и оформления приложения")}
                                >
                                    <Headphones className="w-5 h-5"/>
                                </button>

                                <div
                                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                                    style={{
                                        backgroundColor: theme.bg,
                                        borderColor: theme.border,
                                        color: theme.text,
                                    }}
                                    title={tr("Количество сборников и аудиофайлов в библиотеке")}
                                >
                                    <span className="font-bold">{collections.length}</span>
                                    <span className="opacity-70 font-normal">
                    {collections.length === 1 ? tr("сборник") : collections.length < 5 ? tr("сборника") : tr("сборников")}
                  </span>
                                    <span className="opacity-40">•</span>
                                    <span className="font-bold">{tracks.length}</span>
                                    <span className="opacity-70 font-normal">{tr("аудио")}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                {onOpenSourceCode && (
                                    <button
                                        id="btn-open-source-code-audio"
                                        onClick={onOpenSourceCode}
                                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                                        title={tr("Исходный код на GitHub")}
                                    >
                                        <Github className="w-4 h-4 shrink-0"/>
                                        <span className="hidden sm:inline">{tr("Исходный код")}</span>
                                    </button>
                                )}

                                <button
                                    id="btn-refresh-audiobooks"
                                    onClick={() => loadData()}
                                    className="p-1.5 sm:p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-amber-500 transition-colors active:scale-95 cursor-pointer"
                                    title={tr("Обновить список аудиокниг")}
                                >
                                    <RefreshCw className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>


                        <div className="px-3.5 sm:px-6 py-2.5 flex items-center gap-2">
                            <div
                                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm"
                                style={{
                                    backgroundColor: theme.bg,
                                    borderColor: theme.border,
                                }}
                            >
                                <Search className="w-4 h-4 opacity-50 shrink-0"/>
                                <input
                                    id="input-audio-search"
                                    type="text"
                                    placeholder={tr("Поиск аудиокниг по названию или автору...")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent outline-none text-xs sm:text-sm placeholder:opacity-50"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="opacity-50 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5"/>
                                    </button>
                                )}
                            </div>

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
                                    {tr`Сборники (${collections.length})`}
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
                                    {tr`Все записи (${tracks.length})`}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {isUploading && (
                <div
                    className="px-4 py-2 bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center gap-2 border-b border-amber-500/30 animate-pulse">
                    <Upload className="w-4 h-4 animate-bounce"/>
                    <span>{tr("Обработка и сохранение аудиофайлов в память...")}</span>
                </div>
            )}

            {selectedCollectionId && activeCollection ? (
                <div data-no-swipe="true" className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 touch-pan-y">
                    <div
                        className="p-4 sm:p-5 rounded-3xl border shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-4"
                        style={{
                            backgroundColor: theme.cardBg,
                            borderColor: theme.border,
                        }}
                    >
                        <div
                            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-lg border border-inherit/20 shrink-0 bg-neutral-900 group">
                            {activeCollection.coverUrl ? (
                                <img
                                    src={activeCollection.coverUrl}
                                    alt={activeCollection.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                                    <Headphones className="w-12 h-12 opacity-50"/>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left min-w-0">
              <span
                  className="text-[10px] font-bold tracking-wider uppercase text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                {tr("Сборник аудиокниг")}
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

                            {(() => {
                                const stats = getCollectionStats(activeCollection.id);
                                return (
                                    <div
                                        className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                        <button
                                            id="btn-play-entire-collection"
                                            disabled={stats.count === 0}
                                            onClick={() => handlePlayCollection(activeCollection.id)}
                                            className="px-4 py-2 rounded-2xl bg-amber-500 text-neutral-950 hover:bg-amber-400 active:scale-95 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Play className="w-4 h-4 fill-current"/>
                                            <span>{stats.progress > 0 ? tr("Продолжить") : tr("Слушать")}</span>
                                        </button>

                                        <div className="text-xs opacity-75 flex items-center gap-2">
                                            <span>{tr`${stats.count} томов/глав`}</span>
                                            <span>•</span>
                                            <span>{formatAudioTime(stats.totalDuration)}</span>
                                            <span>•</span>
                                            <span
                                                className="font-bold text-amber-500">{tr`${stats.progress}% прослушано`}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold opacity-75 uppercase tracking-wider">
                                {tr`Содержимое сборника (${activeCollectionTracks.length})`}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenUploadPicker(selectedCollectionId)}
                                    className="text-xs text-amber-500 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5"/> {tr("Добавить том")}
                                </button>
                            </div>
                        </div>

                        {activeCollectionTracks.length === 0 ? (
                            <div
                                className="py-12 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3"
                                style={{backgroundColor: theme.cardBg, borderColor: theme.border}}
                            >
                                <div
                                    className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Music className="w-6 h-6 opacity-60"/>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold">{tr("Сборник пуст")}</h4>
                                    <p className="text-xs opacity-60 mt-1 max-w-xs">
                                        {tr("Загрузите тома или аудиозаписи (.mp3, .m4a, .aac) прямо в этот сборник")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleOpenUploadPicker(selectedCollectionId)}
                                    className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-xs"
                                >
                                    {tr("Загрузить аудиофайлы")}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activeCollectionTracks.length > 1 && (
                                    <div
                                        className="flex items-center gap-1.5 text-[11px] opacity-60 px-1 py-0.5 select-none">
                                        <GripVertical className="w-3.5 h-3.5 text-amber-500 shrink-0"/>
                                        <span>{tr("Потяните за значок слева для перетаскивания и смены очередности аудиофайлов")}</span>
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
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                    {activeTab === 'collections' ? (
                        <div>
                            {filteredCollections.length === 0 ? (
                                <div
                                    className="py-14 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3"
                                    style={{backgroundColor: theme.cardBg, borderColor: theme.border}}
                                >
                                    <div
                                        className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                        <FolderPlus className="w-7 h-7 opacity-60"/>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">{tr("Нет сборников")}</h4>
                                        <p className="text-xs opacity-60 mt-1 max-w-sm">
                                            {tr("Создайте сборник для объединения томов книги или загрузите аудиофайлы")}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreatingCollection(true)}
                                        className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-xs"
                                    >
                                        {tr("Создать первый сборник")}
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
                                                <div className="flex items-start gap-3.5">
                                                    <div
                                                        className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md border border-inherit/20 shrink-0 bg-neutral-900">
                                                        {col.coverUrl ? (
                                                            <img
                                                                src={col.coverUrl}
                                                                alt={col.title}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-full h-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                                                                <Headphones className="w-8 h-8 opacity-60"/>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-500">
                              {tr`${stats.count} томов`}
                            </span>
                                                        <h3 className="text-xs sm:text-sm font-bold truncate leading-tight mt-0.5">
                                                            {col.title}
                                                        </h3>
                                                        {col.author && (
                                                            <p className="text-[11px] opacity-65 truncate mt-0.5">{col.author}</p>
                                                        )}
                                                        <p className="text-[10px] opacity-55 mt-1 flex items-center gap-1">
                                                            <Clock className="w-3 h-3"/>
                                                            <span>{formatAudioTime(stats.totalDuration)}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-inherit/15">
                                                    <div
                                                        className="flex items-center justify-between text-[11px] font-bold mb-1">
                                                        <span className="opacity-70">{tr("Прослушано")}</span>
                                                        <span className="text-amber-500">{stats.progress}%</span>
                                                    </div>
                                                    <div
                                                        className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                                            style={{width: `${stats.progress}%`}}
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
                                                            <Play className="w-3.5 h-3.5 fill-current"/>
                                                            <span>{stats.progress > 0 ? tr("Продолжить") : tr("Слушать")}</span>
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingCollection(col);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                                                            title={tr("Настройки сборника")}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5"/>
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
                        <div className="space-y-2">
                            {filteredTracks.length === 0 ? (
                                <div
                                    className="py-14 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3"
                                    style={{backgroundColor: theme.cardBg, borderColor: theme.border}}
                                >
                                    <div
                                        className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                        <Music className="w-7 h-7 opacity-60"/>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">{tr("Нет загруженных аудиозаписей")}</h4>
                                        <p className="text-xs opacity-60 mt-1 max-w-sm">
                                            {tr("Нажмите «Загрузить», чтобы добавить файлы аудиокниг (.mp3, .m4a, .aac)")}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleOpenUploadPicker()}
                                        className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-xs"
                                    >
                                        {tr("Загрузить аудиофайлы")}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-xs font-bold opacity-75 uppercase tracking-wider">
                      {tr`Все аудиозаписи (${filteredTracks.length})`}
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
                                                    {isSelected ? (
                                                        <div
                                                            className="w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
                                                            <Check className="w-3.5 h-3.5 stroke-[3]"/>
                                                        </div>
                                                    ) : isSelectionMode ? (
                                                        <div
                                                            className="w-6 h-6 rounded-lg border-2 border-inherit/40 bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                                                            <Square className="w-3 h-3 opacity-40"/>
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
                                                                <Pause className="w-4 h-4 fill-current"/>
                                                            ) : (
                                                                <Play className="w-4 h-4 fill-current ml-0.5"/>
                                                            )}
                                                        </button>

                                                        {trackCover && (
                                                            <div
                                                                className="w-10 h-10 rounded-xl overflow-hidden border border-inherit/20 shrink-0">
                                                                <img src={trackCover} alt=""
                                                                     className="w-full h-full object-cover"/>
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-xs sm:text-sm font-bold truncate">
                                                                {track.title}
                                                            </h4>
                                                            <div
                                                                className="flex items-center gap-2 text-[11px] opacity-70 mt-0.5">
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
                                  {tr`${track.progressPercent}% прослушано`}
                                </span>
                                                            </div>

                                                            <div
                                                                className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                                                    style={{width: `${track.progressPercent}%`}}
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
                                                        title={tr("Редактировать")}
                                                    >
                                                        <Edit2 className="w-4 h-4"/>
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
                                initial={{scale: 0.94, opacity: 0}}
                                animate={{scale: 1, opacity: 1}}
                                exit={{scale: 0.94, opacity: 0}}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4"
                                style={{
                                    backgroundColor: theme.cardBg,
                                    borderColor: theme.border,
                                    color: theme.text,
                                }}
                            >
                                <div className="flex items-start gap-3.5">
                                    <div
                                        className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 shrink-0 mt-0.5">
                                        <AlertTriangle className="w-5 h-5 text-amber-500"/>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-base leading-snug">
                                            {duplicateWarning.duplicates.length === 1
                                                ? tr("Этот аудиофайл уже есть в приложении")
                                                : tr("Найдены повторяющиеся аудиофайлы")}
                                        </h3>
                                        <p className="text-xs opacity-75 mt-1 leading-relaxed">
                                            {duplicateWarning.duplicates.length === 1
                                                ? tr("Выбранный аудиофайл уже сохранён в вашей медиатеке. Вы хотите пропустить дубликат или загрузить его повторно?")
                                                : tr`Обнаружено ${duplicateWarning.duplicates.length} файлов, которые уже загружены в приложение.`}
                                        </p>
                                    </div>
                                </div>

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
                                                    <span>{tr("Уже в:")} {item.existingTrack.title}</span>
                                                </p>
                                            </div>
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 shrink-0">
                        {tr("Дубликат")}
                      </span>
                                        </div>
                                    ))}
                                </div>

                                {duplicateWarning.newFiles.length > 0 && (
                                    <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5"/>
                                        <span>
                      {tr`Также выбрано ${duplicateWarning.newFiles.length} новых уникальных файлов`}
                    </span>
                                    </p>
                                )}

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
                                            {tr`Загрузить только новые (${duplicateWarning.newFiles.length})`}
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
                                            {tr("Не загружать дубликат")}
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
                                        {tr("Всё равно добавить")}
                                    </button>

                                    <button
                                        id="btn-cancel-duplicate-upload"
                                        onClick={() => {
                                            setDuplicateWarning(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="py-2.5 px-3 rounded-xl text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-center"
                                    >
                                        {tr("Отмена")}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </OverlayPortal>

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
                                    initial={{y: 60, opacity: 0}}
                                    animate={{y: 0, opacity: 1}}
                                    exit={{y: 60, opacity: 0}}
                                    id="audio-batch-action-bar"
                                    className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-auto max-w-xl mx-auto z-40 p-2 sm:p-2.5 rounded-3xl bg-neutral-950/95 text-white border border-neutral-800 shadow-2xl backdrop-blur-md flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 select-none"
                                    style={{bottom: `calc(${bottomPadding + 8}px + max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)))`}}
                                >
                                    <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 shrink-0">
                    <span className="text-[11px] font-bold bg-amber-500 text-neutral-950 px-2 py-0.5 rounded-full">
                      {selectedTrackIds.size}
                    </span>
                                        <button
                                            onClick={() => toggleSelectAll(currentVisibleTracks)}
                                            className="text-[11px] font-semibold opacity-80 hover:opacity-100 underline decoration-dotted cursor-pointer px-1"
                                            title={isAllSelected ? tr("Снять выделение со всех") : tr("Выделить все видимые аудиозаписи")}
                                        >
                                            {isAllSelected ? tr("Снять") : tr("Все")}
                                        </button>
                                    </div>

                                    <div className="h-4 w-px bg-white/20 shrink-0"/>

                                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                        <button
                                            id="btn-batch-add-collection"
                                            onClick={() => setShowBatchCollectionPicker(true)}
                                            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-amber-400"
                                            title={tr("Добавить выбранные файлы в сборник")}
                                        >
                                            <FolderInput className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">{tr("В сборник")}</span>
                                        </button>

                                        {hasAnyInCollection && (
                                            <button
                                                id="btn-batch-remove-collection"
                                                onClick={handleBatchRemoveFromCollection}
                                                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-amber-300"
                                                title={tr("Убрать выбранные файлы из сборника")}
                                            >
                                                <FolderMinus className="w-3.5 h-3.5"/>
                                                <span className="hidden sm:inline">{tr("Из сборника")}</span>
                                            </button>
                                        )}

                                        <button
                                            id="btn-batch-reset-progress"
                                            onClick={handleBatchResetProgress}
                                            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-sky-400"
                                            title={tr("Сбросить прогресс на 0%")}
                                        >
                                            <RotateCcw className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">{tr("Сброс")}</span>
                                        </button>

                                        <button
                                            id="btn-batch-delete"
                                            onClick={handleBatchDeleteTracks}
                                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                            title={tr("Удалить выбранные файлы из библиотеки")}
                                        >
                                            <Trash2 className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">{tr("Удалить")}</span>
                                        </button>

                                        {/* Закрыть выбор */}
                                        <button
                                            onClick={clearSelection}
                                            className="p-1.5 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer ml-0.5"
                                            title={tr("Закрыть панель выбора")}
                                        >
                                            <X className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </OverlayPortal>
                );
            })()}

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

            <OverlayPortal>
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{y: -20, opacity: 0}}
                            animate={{y: 0, opacity: 1}}
                            exit={{y: -20, opacity: 0}}
                            className="fixed left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-2 pointer-events-none z-[99999] select-none"
                            style={{
                                top: 'max(calc(env(safe-area-inset-top, 0px) + 64px), 80px)',
                            }}
                        >
                            <CheckCircle2 className="w-4 h-4"/>
                            <span>{toastMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </OverlayPortal>

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