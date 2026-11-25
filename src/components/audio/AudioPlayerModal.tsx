import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Moon,
  Gauge,
  ListMusic,
  Headphones,
  Check,
  X,
  Clock,
  Sparkles,
  Volume2
} from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { ReaderThemeConfig, AudiobookTrack } from '../../types';
import { formatAudioTime } from '../../services/audioStorage';
import { Rewind15Icon, Forward15Icon } from './AudioIcons';
import { tr } from '../../i18n';

interface AudioPlayerModalProps {
  theme: ReaderThemeConfig;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({ theme }) => {
  const {
    currentTrack,
    currentCollection,
    playlist,
    isPlaying,
    currentTime,
    duration,
    progressPercent,
    playbackRate,
    sleepTimer,
    isFullPlayerOpen,
    closeFullPlayer,
    closePlayer,
    togglePlay,
    seekTo,
    seekDelta,
    setPlaybackRate,
    setSleepTimer,
    clearSleepTimer,
    playNext,
    playPrev,
    playTrack,
  } = useAudioPlayer();

  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
  const [showSleepSheet, setShowSleepSheet] = useState(false);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);

  if (!isFullPlayerOpen || !currentTrack) return null;

  const cover = currentTrack.coverUrl || currentCollection?.coverUrl;
  const remainingSeconds = Math.max(0, duration - currentTime);

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  const sleepTimerOptions: Array<{ label: string; value: number | 'end_of_track' }> = [
    { label: tr("5 минут"), value: 5 },
    { label: tr("10 минут"), value: 10 },
    { label: tr("15 минут"), value: 15 },
    { label: tr("30 минут"), value: 30 },
    { label: tr("45 минут"), value: 45 },
    { label: tr("60 минут"), value: 60 },
    { label: tr("В конце трека / главы"), value: 'end_of_track' },
  ];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  return (
    <div
      id="audio-player-modal-backdrop"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/75 backdrop-blur-md select-none transition-all"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        id="audio-player-modal"
        className="w-full sm:max-w-md h-[92vh] sm:h-[86vh] sm:rounded-3xl rounded-t-3xl border shadow-2xl flex flex-col overflow-hidden relative"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Top Header Bar */}
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b shrink-0 transition-colors"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderColor: theme.border,
          }}
        >
          <button
            id="btn-collapse-player"
            onClick={closeFullPlayer}
            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
              theme.isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-stone-900'
            }`}
            title={tr("Свернуть плеер")}
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="text-center min-w-0 max-w-[200px]">
            <p className="text-[10px] font-bold tracking-wider uppercase opacity-60">
              {currentCollection?.title ? tr("Сборник") : tr("Аудиокнига")}
            </p>
            <h3 className="text-xs font-bold truncate">
              {currentCollection?.title || 'BookSlut'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Close / Stop Player completely */}
            <button
              id="btn-header-close-player"
              onClick={closePlayer}
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                theme.isDark
                  ? 'text-neutral-400 hover:text-rose-400 hover:bg-white/10'
                  : 'text-stone-600 hover:text-rose-600 hover:bg-black/10'
              }`}
              title={tr("Остановить и закрыть плеер")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Main Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-between items-center text-center">
          {/* Cover Art */}
          <div className="w-full flex justify-center my-auto py-2">
            <div className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-inherit/20 flex items-center justify-center group ${
              theme.isDark ? 'bg-neutral-900' : 'bg-stone-200/90'
            }`}>
              {cover ? (
                <img
                  src={cover}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${
                  theme.isDark
                    ? 'bg-gradient-to-tr from-amber-600/30 to-amber-400/20 text-neutral-100'
                    : 'bg-gradient-to-tr from-amber-200/80 to-amber-100/60 text-stone-800'
                }`}>
                  <Headphones className="w-20 h-20 text-amber-600 dark:text-amber-500/80 mb-2" />
                  <span className="text-xs font-semibold opacity-75">{tr("Аудиокнига")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Track Titles & Progress Percent Badge */}
          <div className="w-full px-2 mt-2 mb-4">
            <h2 className="text-lg sm:text-xl font-bold truncate leading-snug">
              {currentTrack.title}
            </h2>
            <p className={`text-xs truncate mt-1 ${theme.isDark ? 'text-neutral-400' : 'text-stone-600'}`}>
              {currentTrack.author || currentCollection?.author || tr("Автор не указан")}
            </p>

            <div className="inline-flex items-center gap-2 mt-2.5 px-3 py-1 rounded-full border text-xs font-bold"
              style={{
                backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(217, 119, 6, 0.35)',
                color: theme.isDark ? '#fbbf24' : '#92400e',
              }}
            >
              <span>{tr`${progressPercent}% прослушано`}</span>
              <span>•</span>
              <span className="font-normal opacity-85">{tr("Осталось")} {formatAudioTime(remainingSeconds)}</span>
            </div>
          </div>

          {/* Scrubber Progress Slider */}
          <div className="w-full space-y-1.5 px-2">
            <div className="relative w-full flex items-center">
              <input
                id="audio-progress-slider"
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                value={currentTime}
                onChange={handleSliderChange}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden ${
                  theme.isDark ? 'bg-white/20' : 'bg-stone-300'
                }`}
              />
            </div>
            <div className={`flex justify-between text-[11px] font-mono font-medium ${
              theme.isDark ? 'text-neutral-400' : 'text-stone-600'
            }`}>
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="w-full flex items-center justify-center gap-3 sm:gap-4 my-3">
            {/* Prev Track */}
            <button
              id="btn-player-prev"
              onClick={playPrev}
              className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
                theme.isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-stone-900'
              }`}
              title={tr("Предыдущая глава")}
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Seek -15s */}
            <button
              id="btn-player-rewind-15"
              onClick={() => seekDelta(-15)}
              className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-xs border ${
                theme.isDark
                  ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                  : 'bg-black/5 hover:bg-black/10 text-stone-900 border-black/10'
              }`}
              title={tr("Назад на 15 секунд")}
            >
              <Rewind15Icon className="w-6 h-6" />
            </button>

            {/* Play/Pause Main FAB */}
            <button
              id="btn-player-toggle-play"
              onClick={togglePlay}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer hover:scale-105"
              style={{
                backgroundColor: theme.accent,
                color: '#fff',
              }}
              title={isPlaying ? tr("Пауза") : tr("Слушать")}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            {/* Seek +15s */}
            <button
              id="btn-player-forward-15"
              onClick={() => seekDelta(15)}
              className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-xs border ${
                theme.isDark
                  ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                  : 'bg-black/5 hover:bg-black/10 text-stone-900 border-black/10'
              }`}
              title={tr("Вперёд на 15 секунд")}
            >
              <Forward15Icon className="w-6 h-6" />
            </button>

            {/* Next Track */}
            <button
              id="btn-player-next"
              onClick={playNext}
              className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
                theme.isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-stone-900'
              }`}
              title={tr("Следующая глава")}
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Bottom Secondary Controls Row */}
          <div className="w-full flex items-center justify-around pt-3 border-t border-inherit/15 mt-auto">
            {/* Speed Button */}
            <button
              id="btn-player-speed"
              onClick={() => setShowSpeedSheet(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-xs font-bold cursor-pointer ${
                theme.isDark ? 'hover:bg-white/10 text-neutral-200' : 'hover:bg-black/10 text-stone-900'
              }`}
            >
              <Gauge className="w-4 h-4 text-amber-500" />
              <span>{playbackRate}x</span>
            </button>

            {/* Sleep Timer Button */}
            <button
              id="btn-player-sleep"
              onClick={() => setShowSleepSheet(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-xs font-bold cursor-pointer border ${
                sleepTimer.active
                  ? theme.isDark
                    ? 'text-amber-400 bg-amber-500/20 border-amber-500/30'
                    : 'text-amber-900 bg-amber-100 border-amber-300'
                  : theme.isDark
                  ? 'border-transparent hover:bg-white/10 text-neutral-200'
                  : 'border-transparent hover:bg-black/10 text-stone-900'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>
                {sleepTimer.active
                  ? sleepTimer.mode === 'end_of_track'
                    ? tr("Конец")
                    : formatAudioTime(sleepTimer.remainingSeconds)
                  : tr("Таймер")}
              </span>
            </button>

            {/* Chapters / Playlist Button */}
            <button
              id="btn-player-playlist"
              onClick={() => setShowPlaylistSheet(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-xs font-bold cursor-pointer ${
                theme.isDark ? 'hover:bg-white/10 text-neutral-200' : 'hover:bg-black/10 text-stone-900'
              }`}
            >
              <ListMusic className="w-4 h-4 text-amber-500" />
              <span>{tr`Тома (${playlist.length})`}</span>
            </button>
          </div>
        </div>

        {/* Speed Selector Bottom Sheet */}
        <AnimatePresence>
          {showSpeedSheet && (
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end"
              onClick={() => setShowSpeedSheet(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-t-3xl border-t p-5 shadow-2xl"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-500" /> {tr("Скорость воспроизведения")}
                  </h4>
                  <button
                    onClick={() => setShowSpeedSheet(false)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      id={`speed-btn-${rate}x`}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedSheet(false);
                      }}
                      className={`py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        playbackRate === rate
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-md scale-102'
                          : theme.isDark
                          ? 'border-neutral-800 hover:bg-white/5 text-neutral-200'
                          : 'border-stone-300 hover:bg-black/5 text-stone-800'
                      }`}
                    >
                      {rate}x {playbackRate === rate && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Sleep Timer Bottom Sheet */}
        <AnimatePresence>
          {showSleepSheet && (
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end"
              onClick={() => setShowSleepSheet(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-t-3xl border-t p-5 shadow-2xl max-h-[70vh] overflow-y-auto"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Moon className="w-4 h-4 text-amber-500" /> {tr("Таймер остановки (сна)")}
                  </h4>
                  <button
                    onClick={() => setShowSleepSheet(false)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {sleepTimer.active && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-500">{tr("Таймер активен")}</p>
                      <p className="text-[11px] opacity-75">
                        {sleepTimer.mode === 'end_of_track'
                          ? tr("Остановится в конце текущего трека")
                          : tr`Осталось: ${formatAudioTime(sleepTimer.remainingSeconds)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        clearSleepTimer();
                        setShowSleepSheet(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        theme.isDark
                          ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                          : 'bg-stone-200 text-stone-900 hover:bg-stone-300'
                      }`}
                    >
                      {tr("Отключить")}
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  {sleepTimerOptions.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        setSleepTimer(opt.value);
                        setShowSleepSheet(false);
                      }}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer text-left ${
                        theme.isDark
                          ? 'border-neutral-800 hover:bg-white/5 text-neutral-200'
                          : 'border-stone-200 hover:bg-stone-100 text-stone-900'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <Clock className="w-4 h-4 opacity-50" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Playlist / Volumes Sheet */}
        <AnimatePresence>
          {showPlaylistSheet && (
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end"
              onClick={() => setShowPlaylistSheet(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-t-3xl border-t p-5 shadow-2xl max-h-[75vh] flex flex-col"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-amber-500" /> {tr`Тома и главы (${playlist.length})`}
                  </h4>
                  <button
                    onClick={() => setShowPlaylistSheet(false)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {playlist.map((track, idx) => {
                    const isSelected = track.id === currentTrack.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          playTrack(track, playlist, currentCollection || undefined);
                          setShowPlaylistSheet(false);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? theme.isDark
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-800 font-bold'
                            : theme.isDark
                            ? 'border-neutral-800 hover:bg-white/5 text-neutral-300 hover:text-white'
                            : 'border-stone-200 hover:bg-black/5 text-stone-700 hover:text-stone-950'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-6 text-center text-xs opacity-60 font-mono">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs truncate font-bold">{track.title}</h5>
                            <div className="flex items-center gap-2 text-[10px] opacity-70 mt-0.5">
                              <span>{formatAudioTime(track.duration)}</span>
                              <span>•</span>
                              <span>{tr`${track.progressPercent}% прослушано`}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && isPlaying ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0">
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          </div>
                        ) : (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 opacity-70 ${
                            theme.isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-stone-900'
                          }`}>
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
