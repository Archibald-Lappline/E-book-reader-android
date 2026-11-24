import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Headphones, Moon, X } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { ReaderThemeConfig } from '../../types';
import { formatAudioTime } from '../../services/audioStorage';
import { Rewind15Icon, Forward15Icon } from './AudioIcons';

interface MiniAudioPlayerProps {
  theme: ReaderThemeConfig;
  bottomOffset?: number; // e.g. above bottom nav bar
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({
  theme,
  bottomOffset = 64,
}) => {
  const {
    currentTrack,
    currentCollection,
    isPlaying,
    currentTime,
    duration,
    progressPercent,
    sleepTimer,
    togglePlay,
    seekDelta,
    openFullPlayer,
    closePlayer,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const cover = currentTrack.coverUrl || currentCollection?.coverUrl;

  return (
    <div
      id="mini-audio-player-container"
      className="fixed left-0 right-0 z-40 px-3 pointer-events-none select-none"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={openFullPlayer}
        className="pointer-events-auto max-w-md mx-auto rounded-2xl shadow-xl border overflow-hidden cursor-pointer backdrop-blur-md transition-all active:scale-[0.99] group ring-1 ring-black/10 dark:ring-white/10"
        style={{
          backgroundColor: theme.isDark ? 'rgba(26, 26, 26, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Progress Bar Strip */}
        <div className="w-full h-1 bg-black/10 dark:bg-white/10 relative overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-r-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: theme.accent,
            }}
          />
        </div>

        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2.5">
          {/* Cover & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-black/10 dark:bg-white/10 shadow-xs flex items-center justify-center border border-inherit/20">
              {cover ? (
                <img
                  src={cover}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Headphones className="w-5 h-5 opacity-60 text-amber-500" />
              )}
              {isPlaying && (
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-ping" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold truncate leading-tight">
                  {currentTrack.title}
                </h4>
                {sleepTimer.active && (
                  <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 text-[9px] font-bold">
                    <Moon className="w-2.5 h-2.5" />
                    {sleepTimer.mode === 'end_of_track' ? 'Конец' : `${Math.ceil(sleepTimer.remainingSeconds / 60)}м`}
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-65 truncate mt-0.5 flex items-center gap-1.5">
                <span>{currentCollection?.title || currentTrack.author || 'Аудиокнига'}</span>
                <span>•</span>
                <span className="font-semibold text-amber-500">{progressPercent}%</span>
                <span>({formatAudioTime(currentTime)})</span>
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* -15s */}
            <button
              id="mini-player-rewind-15"
              onClick={() => seekDelta(-15)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer text-inherit opacity-85 hover:opacity-100"
              title="Перемотать на 15 секунд назад"
            >
              <Rewind15Icon className="w-4.5 h-4.5" />
            </button>

            {/* Play/Pause */}
            <button
              id="mini-player-toggle-play"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: theme.accent,
                color: theme.isDark ? '#000' : '#fff',
              }}
              title={isPlaying ? 'Пауза' : 'Слушать'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* +15s */}
            <button
              id="mini-player-forward-15"
              onClick={() => seekDelta(15)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer text-inherit opacity-85 hover:opacity-100"
              title="Перемотать на 15 секунд вперёд"
            >
              <Forward15Icon className="w-4.5 h-4.5" />
            </button>

            {/* Close / Dismiss Player */}
            <button
              id="mini-player-close"
              onClick={(e) => {
                e.stopPropagation();
                closePlayer();
              }}
              className="w-7 h-7 ml-0.5 rounded-full flex items-center justify-center hover:bg-red-500/20 text-neutral-400 hover:text-red-400 active:scale-90 transition-all cursor-pointer"
              title="Закрыть плеер"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
