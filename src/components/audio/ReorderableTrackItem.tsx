import React from 'react';
import { Reorder, useDragControls } from 'motion/react';
import {
  Play,
  Pause,
  Edit2,
  Check,
  Square,
  GripVertical
} from 'lucide-react';
import { AudiobookTrack, ReaderThemeConfig } from '../../types';
import { formatAudioTime } from '../../services/audioStorage';
import { tr } from '../../i18n';

interface ReorderableTrackItemProps {
  track: AudiobookTrack;
  idx: number;
  isCur: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  theme: ReaderThemeConfig;
  coverUrl?: string;
  onToggleSelect: (id: string) => void;
  onPlayToggle: () => void;
  onEdit: () => void;
}

export const ReorderableTrackItem: React.FC<ReorderableTrackItemProps> = ({
  track,
  idx,
  isCur,
  isPlaying,
  isSelected,
  isSelectionMode,
  theme,
  coverUrl,
  onToggleSelect,
  onPlayToggle,
  onEdit,
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={track}
      id={track.id}
      dragListener={false}
      dragControls={dragControls}
      onClick={() => {
        if (isSelectionMode) {
          onToggleSelect(track.id);
        }
      }}
      className={`p-3 sm:p-3.5 rounded-2xl border transition-colors flex items-center justify-between gap-2.5 sm:gap-3 group relative select-none ${
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
        boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.4), 0 8px 12px -6px rgba(0, 0, 0, 0.3)',
        zIndex: 50,
      }}
    >
      {/* 1. Drag Handle for Reordering */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          dragControls.start(e);
        }}
        className="p-1 sm:p-1.5 rounded-xl cursor-grab active:cursor-grabbing touch-none text-neutral-400 hover:text-amber-500 active:text-amber-400 shrink-0 transition-colors"
        title={tr("Зажмите и перетащите для изменения порядка")}
      >
        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      {/* 2. Selection Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(track.id);
        }}
        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
          isSelected
            ? 'bg-amber-500 text-neutral-950 shadow-xs'
            : isSelectionMode
            ? 'border-2 border-inherit/40 hover:border-amber-500 bg-black/5 dark:bg-white/5'
            : 'opacity-0 sm:group-hover:opacity-60 hover:!opacity-100 border border-inherit/25 hover:border-amber-500'
        }`}
        title={isSelected ? tr("Снять выбор") : tr("Выбрать")}
      >
        {isSelected ? (
          <Check className="w-4 h-4 stroke-[3]" />
        ) : (
          <Square className="w-3.5 h-3.5 opacity-40" />
        )}
      </button>

      {/* 3. Play Button + Cover + Details */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayToggle();
          }}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer ${
            isCur && isPlaying
              ? 'bg-amber-500 text-neutral-950'
              : 'bg-black/5 dark:bg-white/10 hover:bg-amber-500 hover:text-neutral-950'
          }`}
          title={isCur && isPlaying ? tr("Пауза") : tr("Слушать")}
        >
          {isCur && isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {coverUrl && (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-inherit/20 shrink-0">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] opacity-60 font-mono font-bold bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
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
              {tr`${track.progressPercent}% прослушано`}
            </span>
            <span className="text-[10px] opacity-60">({track.fileSize})</span>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${track.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Edit Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors cursor-pointer shrink-0"
        title={tr("Редактировать аудиофайл")}
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </Reorder.Item>
  );
};
