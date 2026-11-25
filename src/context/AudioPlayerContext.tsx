import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AudiobookTrack, AudiobookCollection } from '../types';
import { updateTrackProgress, getAudioTrackById } from '../services/audioStorage';
import { pushBackHandler } from '../utils/androidBackNavigation';
import { tr } from '../i18n';

export interface SleepTimerState {
  active: boolean;
  mode: 'duration' | 'end_of_track';
  remainingSeconds: number;
  initialMinutes: number;
}

interface AudioPlayerContextType {
  currentTrack: AudiobookTrack | null;
  currentCollection: AudiobookCollection | null;
  playlist: AudiobookTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progressPercent: number;
  playbackRate: number;
  sleepTimer: SleepTimerState;
  isFullPlayerOpen: boolean;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  closePlayer: () => void;
  playTrack: (track: AudiobookTrack, newPlaylist?: AudiobookTrack[], collection?: AudiobookCollection) => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  seekDelta: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | 'end_of_track') => void;
  clearSleepTimer: () => void;
  playNext: () => void;
  playPrev: () => void;
  updatePlaylist: (newPlaylist: AudiobookTrack[]) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudiobookTrack | null>(null);
  const [currentCollection, setCurrentCollection] = useState<AudiobookCollection | null>(null);
  const [playlist, setPlaylist] = useState<AudiobookTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRateState] = useState<number>(1.0);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);

  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>({
    active: false,
    mode: 'duration',
    remainingSeconds: 0,
    initialMinutes: 0,
  });

  const sleepTimerRef = useRef<SleepTimerState>(sleepTimer);
  sleepTimerRef.current = sleepTimer;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const progressSaveTimerRef = useRef<number | null>(null);

  // Synchronized refs to avoid stale closures in HTML5 audio event handlers
  const currentTrackRef = useRef<AudiobookTrack | null>(null);
  currentTrackRef.current = currentTrack;
  const playlistRef = useRef<AudiobookTrack[]>([]);
  playlistRef.current = playlist;
  const currentCollectionRef = useRef<AudiobookCollection | null>(null);
  currentCollectionRef.current = currentCollection;
  const playNextRef = useRef<() => void>(() => {});
  const playPrevRef = useRef<() => void>(() => {});
  const closePlayerRef = useRef<() => void>(() => {});

  // Preloaded next track state for instant background and lockscreen transition
  interface PreloadedTrack {
    trackId: string;
    sourceUrl: string;
    track: AudiobookTrack;
    isBlobUrl: boolean;
  }
  const nextTrackPreloadRef = useRef<PreloadedTrack | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const isSeekingRef = useRef<boolean>(false);
  const lastPlayRequestTimeRef = useRef<number>(0);
  const lastToggleTimeRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  playbackRateRef.current = playbackRate;

  // Initialize HTML5 Audio instance
  useEffect(() => {
    if (!audioRef.current && typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      const dur = audio.duration || 0;
      setCurrentTime(cur);
      if (dur > 0 && Number.isFinite(dur)) {
        setDuration(dur);
      }
    };

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      if (dur > 0 && Number.isFinite(dur)) {
        setDuration(dur);
      }
    };

    const handleEnded = () => {
      // Check if sleep timer is waiting for end of track
      const st = sleepTimerRef.current;
      if (st.active && st.mode === 'end_of_track') {
        setSleepTimer({ active: false, mode: 'duration', remainingSeconds: 0, initialMinutes: 0 });
        isTransitioningRef.current = false;
        setIsPlaying(false);
        const cur = currentTrackRef.current;
        if (cur) {
          updateTrackProgress(cur.id, cur.duration || audio.duration, cur.duration || audio.duration);
        }
        return;
      }

      // Mark transition in progress so pause events during src change don't drop background wake lock
      isTransitioningRef.current = true;
      // Advance to next track synchronously inside ended handler (crucial when screen is off)
      playNextRef.current();
    };

    const handlePlay = () => {
      isTransitioningRef.current = false;
      setIsPlaying(true);
    };

    const handlePause = () => {
      if (isTransitioningRef.current || isSeekingRef.current) {
        // Suppress pause state while transitioning to next track in background or seeking
        return;
      }
      setIsPlaying(false);
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
    };

    const handleError = () => {
      console.warn('HTMLAudioElement error occurred:', audio.error?.code, audio.error?.message);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Sync Android Back Gesture for Full Player
  useEffect(() => {
    if (isFullPlayerOpen) {
      const unreg = pushBackHandler(() => {
        setIsFullPlayerOpen(false);
        return true;
      });
      return unreg;
    }
  }, [isFullPlayerOpen]);

  // Sleep timer interval countdown
  useEffect(() => {
    if (!sleepTimer.active || sleepTimer.mode === 'end_of_track') return;

    const interval = window.setInterval(() => {
      setSleepTimer((prev) => {
        if (!prev.active || prev.remainingSeconds <= 1) {
          // Timer finished: Stop audio
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
          return { active: false, mode: 'duration', remainingSeconds: 0, initialMinutes: 0 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.active, sleepTimer.mode]);

  // Debounced save listening progress to IndexedDB
  const saveProgressDebounced = useCallback((trackId: string, time: number, dur: number) => {
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
    }
    progressSaveTimerRef.current = window.setTimeout(() => {
      updateTrackProgress(trackId, time, dur);
    }, 2000);
  }, []);

  useEffect(() => {
    if (currentTrack && currentTime > 0) {
      saveProgressDebounced(currentTrack.id, currentTime, duration || currentTrack.duration);
    }
  }, [currentTrack, currentTime, duration, saveProgressDebounced]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const safeTime = Math.max(0, Math.min(audio.duration || Infinity, time));
    audio.currentTime = safeTime;
    setCurrentTime(safeTime);
    if ((window as any).AndroidMediaBridge?.updatePlaybackState) {
      try {
        (window as any).AndroidMediaBridge.updatePlaybackState(
          !audio.paused,
          Math.round(safeTime * 1000),
          Math.round((audio.duration || 0) * 1000),
          audio.playbackRate || 1.0
        );
      } catch {}
    }
  }, []);

  const seekDelta = useCallback((deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + deltaSeconds));
    audio.currentTime = target;
    setCurrentTime(target);
    if ((window as any).AndroidMediaBridge?.updatePlaybackState) {
      try {
        (window as any).AndroidMediaBridge.updatePlaybackState(
          !audio.paused,
          Math.round(target * 1000),
          Math.round((audio.duration || 0) * 1000),
          audio.playbackRate || 1.0
        );
      } catch {}
    }
  }, []);

  // Плавное изменение громкости (приглушение при уведомлениях, пауза при звонке).
  // setInterval, а не requestAnimationFrame: rAF не работает при выключенном экране.
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeVolume = useCallback((target: number, durationMs: number, onDone?: () => void) => {
    const audio = audioRef.current;
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (!audio) {
      onDone?.();
      return;
    }
    const from = audio.volume;
    const steps = Math.max(1, Math.round(durationMs / 25));
    let step = 0;
    fadeTimerRef.current = setInterval(() => {
      step++;
      const k = step / steps;
      // ease-in-out, чтобы начало и конец изменения были незаметны
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      try {
        audio.volume = Math.min(1, Math.max(0, from + (target - from) * eased));
      } catch {}
      if (step >= steps) {
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        onDone?.();
      }
    }, 25);
  }, []);

  // Setup MediaSession and Android Media Bridge for Android notification shade, lockscreen, and Bluetooth controls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Bridge action callback for Android native notifications and hardware/Bluetooth buttons
    (window as any).audioBridgeAction = (action: string, param?: any) => {
      switch (action) {
        case 'play':
          lastPlayRequestTimeRef.current = Date.now();
          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
          break;
        case 'pause':
          // Prevent spurious Android system pause echoes immediately following playback startup
          if (Date.now() - lastPlayRequestTimeRef.current < 2500) {
            console.warn('Ignoring spurious OS pause echo right after play request');
            break;
          }
          audioRef.current?.pause();
          setIsPlaying(false);
          break;
        case 'toggle':
          if (audioRef.current?.paused) {
            lastPlayRequestTimeRef.current = Date.now();
            audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            if (Date.now() - lastPlayRequestTimeRef.current < 2500) {
              console.warn('Ignoring spurious OS toggle pause echo right after play request');
              break;
            }
            audioRef.current?.pause();
            setIsPlaying(false);
          }
          break;
        case 'rewind':
          seekDelta(-(typeof param === 'number' ? param : 15));
          break;
        case 'forward':
          seekDelta(typeof param === 'number' ? param : 15);
          break;
        case 'previous':
          playPrevRef.current?.();
          break;
        case 'next':
          playNextRef.current?.();
          break;
        case 'seek':
          if (typeof param === 'number') {
            seekTo(param);
          }
          break;
        case 'stop':
          closePlayerRef.current?.();
          break;
        // ---- Аудиофокус (MainActivity.java) ----
        case 'duck':
          // Уведомление: плавно приглушить до 20%
          fadeVolume(0.2, 450);
          break;
        case 'unduck':
          fadeVolume(1, 900);
          break;
        case 'focusPause':
          // Звонок или другое приложение: плавно затихнуть и поставить на паузу
          if (Date.now() - lastPlayRequestTimeRef.current < 2500) break;
          fadeVolume(0, 350, () => {
            audioRef.current?.pause();
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.volume = 1;
          });
          break;
        case 'focusResume':
          if (audioRef.current) {
            lastPlayRequestTimeRef.current = Date.now();
            audioRef.current.volume = 0;
            audioRef.current
              .play()
              .then(() => {
                setIsPlaying(true);
                fadeVolume(1, 900);
              })
              .catch(() => {
                if (audioRef.current) audioRef.current.volume = 1;
              });
          }
          break;
      }
    };

    return () => {
      delete (window as any).audioBridgeAction;
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    };
  }, [seekDelta, seekTo, fadeVolume]);

  // Synchronize track metadata with MediaSession & Android Native Bridge
  useEffect(() => {
    if (typeof window === 'undefined' || !currentTrack) return;

    const rawCover = currentTrack.coverUrl || currentCollection?.coverUrl || '';
    let cover = '';
    if (rawCover) {
      if (rawCover.startsWith('http://') || rawCover.startsWith('https://') || rawCover.startsWith('data:')) {
        cover = rawCover;
      } else {
        try {
          cover = new URL(rawCover, window.location.href).href;
        } catch {
          cover = rawCover;
        }
      }
    }

    const isNativeAndroid = typeof (window as any).AndroidMediaBridge !== 'undefined';

    // 1. Web MediaSession Metadata & Actions (ONLY for Web/PWA, NOT native Android where Java MediaSession is active)
    if (!isNativeAndroid && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.author || currentCollection?.author || tr("Аудиокнига"),
          album: currentCollection?.title || 'Читалка Книг',
          artwork: cover
            ? [
                { src: cover, sizes: '96x96', type: 'image/png' },
                { src: cover, sizes: '128x128', type: 'image/png' },
                { src: cover, sizes: '256x256', type: 'image/png' },
                { src: cover, sizes: '512x512', type: 'image/png' },
              ]
            : [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
              ],
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          seekDelta(-15);
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
          seekDelta(15);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPrevRef.current?.();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNextRef.current?.();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
          }
        });
      } catch (e) {
        console.warn('MediaSession handler setup failed', e);
      }
    }

    // 2. Android Native Bridge (for Capacitor APK running in WebView)
    if ((window as any).AndroidMediaBridge?.updateMediaMetadata) {
      try {
        (window as any).AndroidMediaBridge.updateMediaMetadata(
          currentTrack.title,
          currentTrack.author || currentCollection?.author || tr("Аудиокнига"),
          currentCollection?.title || 'Читалка Книг',
          cover
        );
      } catch (e) {
        console.warn('AndroidMediaBridge update failed', e);
      }
    }
  }, [currentTrack, currentCollection, seekDelta]);

  // Synchronize playback state with MediaSession & Android Native Bridge
  // Only called when isPlaying, currentTrack, or playbackRate changes - NOT every 250ms tick!
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isNativeAndroid = typeof (window as any).AndroidMediaBridge !== 'undefined';

    if (!isNativeAndroid && 'mediaSession' in navigator) {
      try {
        if (!currentTrack) {
          navigator.mediaSession.playbackState = 'none';
        } else {
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
      } catch {}
    }

    if (!currentTrack) {
      if ((window as any).AndroidMediaBridge?.stopMedia) {
        try {
          (window as any).AndroidMediaBridge.stopMedia();
        } catch {}
      }
      return;
    }

    if ((window as any).AndroidMediaBridge?.updatePlaybackState) {
      try {
        (window as any).AndroidMediaBridge.updatePlaybackState(
          isPlaying,
          Math.round((audioRef.current?.currentTime || currentTime || 0) * 1000),
          Math.round((duration || currentTrack?.duration || 0) * 1000),
          playbackRate || 1.0
        );
      } catch {}
    }
  }, [isPlaying, currentTrack?.id, playbackRate]);

  // Synchronize position state for Android System Media Carousel
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;
    const dur = duration || currentTrack.duration;
    if (dur > 0 && Number.isFinite(dur)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, dur),
          playbackRate: playbackRate || 1.0,
          position: Math.max(0, Math.min(dur, currentTime)),
        });
      } catch {}
    }
  }, [currentTrack, duration, playbackRate, Math.floor(currentTime)]);

  // Web WakeLock to ensure device does not sleep during active playback
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;

    const requestWakeLock = async () => {
      try {
        if (isPlaying && !wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        } else if (!isPlaying && wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch {
        // WakeLock request could fail in non-active tab, safe to ignore
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isPlaying]);

  // Preload next track candidate in the background while current is playing
  const preloadNextTrack = useCallback(async (candidate: AudiobookTrack | null | undefined) => {
    if (!candidate) return;
    if (nextTrackPreloadRef.current?.trackId === candidate.id) return;

    if (nextTrackPreloadRef.current?.isBlobUrl) {
      try {
        URL.revokeObjectURL(nextTrackPreloadRef.current.sourceUrl);
      } catch {}
    }
    nextTrackPreloadRef.current = null;

    try {
      if (candidate.audioUrl) {
        nextTrackPreloadRef.current = {
          trackId: candidate.id,
          sourceUrl: candidate.audioUrl,
          track: candidate,
          isBlobUrl: false,
        };
        return;
      }
      if (candidate.audioBlob) {
        const url = URL.createObjectURL(candidate.audioBlob);
        nextTrackPreloadRef.current = {
          trackId: candidate.id,
          sourceUrl: url,
          track: candidate,
          isBlobUrl: true,
        };
        return;
      }
      const dbTrack = await getAudioTrackById(candidate.id);
      if (dbTrack?.audioBlob) {
        const url = URL.createObjectURL(dbTrack.audioBlob);
        nextTrackPreloadRef.current = {
          trackId: candidate.id,
          sourceUrl: url,
          track: { ...dbTrack, ...candidate, audioBlob: dbTrack.audioBlob },
          isBlobUrl: true,
        };
      }
    } catch (err) {
      console.warn('Preload candidate error', err);
    }
  }, []);

  // Play a specific track
  const playTrack = useCallback(
    async (track: AudiobookTrack, newPlaylist?: AudiobookTrack[], collection?: AudiobookCollection) => {
      if (!track) return;
      if (!audioRef.current && typeof window !== 'undefined') {
        audioRef.current = new Audio();
        audioRef.current.preload = 'auto';
      }
      const audio = audioRef.current;
      if (!audio) return;

      if (newPlaylist) {
        setPlaylist(newPlaylist);
        playlistRef.current = newPlaylist;
      }
      if (collection) {
        setCurrentCollection(collection);
        currentCollectionRef.current = collection;
      }

      // Save previous track progress if any
      const cur = currentTrackRef.current;
      if (cur && audio) {
        updateTrackProgress(cur.id, currentTime, duration || audio.duration);
      }

      let activeTrack = track;
      let sourceUrl = track.audioUrl;
      if (!sourceUrl && track.audioBlob) {
        sourceUrl = URL.createObjectURL(track.audioBlob);
      } else if (!sourceUrl) {
        // Fallback: try loading blob from IndexedDB directly
        try {
          const dbTrack = await getAudioTrackById(track.id);
          if (dbTrack?.audioBlob) {
            sourceUrl = URL.createObjectURL(dbTrack.audioBlob);
            activeTrack = { ...dbTrack, ...track, audioBlob: dbTrack.audioBlob };
          }
        } catch (e) {
          console.warn('Fallback track load failed', e);
        }
      }

      if (!sourceUrl) {
        console.warn('No playable audio source URL found for track', track.id);
        return;
      }

      // Cleanup old blob only if URL has actually changed
      const oldBlob = currentBlobUrlRef.current;
      if (oldBlob && oldBlob !== sourceUrl && oldBlob.startsWith('blob:')) {
        try { URL.revokeObjectURL(oldBlob); } catch {}
      }
      currentBlobUrlRef.current = sourceUrl;

      setCurrentTrack(activeTrack);
      currentTrackRef.current = activeTrack;
      setDuration(activeTrack.duration || 0);

      // Trigger preload for the following track in playlist
      const curList = newPlaylist || playlistRef.current;
      const curIdx = curList.findIndex((t) => t.id === track.id);
      if (curIdx !== -1 && curIdx + 1 < curList.length) {
        preloadNextTrack(curList[curIdx + 1]);
      }

      isTransitioningRef.current = false;
      audio.src = sourceUrl;
      audio.playbackRate = playbackRateRef.current || 1.0;

      const isNearEnd = (activeTrack.duration || 0) > 0 && (activeTrack.currentTime || 0) >= (activeTrack.duration - 2);
      const initialPos = isNearEnd ? 0 : (activeTrack.currentTime || 0);
      setCurrentTime(initialPos);

      const seekIfNeeded = () => {
        if (initialPos > 1 && Number.isFinite(initialPos)) {
          if (!audio.duration || initialPos < audio.duration - 2) {
            try {
              isSeekingRef.current = true;
              audio.currentTime = initialPos;
              const onSeeked = () => {
                audio.removeEventListener('seeked', onSeeked);
                isSeekingRef.current = false;
              };
              audio.addEventListener('seeked', onSeeked, { once: true });
            } catch {
              isSeekingRef.current = false;
            }
          }
        }
      };

      if (audio.readyState >= 1) {
        seekIfNeeded();
      } else if (initialPos > 1) {
        const onMeta = () => {
          audio.removeEventListener('loadedmetadata', onMeta);
          seekIfNeeded();
        };
        audio.addEventListener('loadedmetadata', onMeta, { once: true });
      }

      // Call play() immediately during active user interaction gesture and record timestamp
      lastPlayRequestTimeRef.current = Date.now();
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('Audio play request failed or was interrupted:', err);
            });
        }
      } catch (err) {
        console.warn('Synchronous audio.play() threw:', err);
      }
    },
    [currentTime, duration, preloadNextTrack]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const now = Date.now();
    if (now - lastToggleTimeRef.current < 450) {
      // Prevent synthetic click and double-tap duplicate toggling
      return;
    }
    lastToggleTimeRef.current = now;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (currentTrack) {
        updateTrackProgress(currentTrack.id, audio.currentTime, audio.duration);
      }
    } else {
      lastPlayRequestTimeRef.current = now;
      if ((!audio.src || audio.src === '' || audio.src === 'about:blank') && currentTrack) {
        playTrack(currentTrack);
        return;
      }
      if (audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - 1)) {
        try { audio.currentTime = 0; } catch {}
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Audio play failed, retrying via playTrack:', err);
            if (currentTrack) {
              playTrack(currentTrack);
            }
          });
      }
    }
  }, [isPlaying, currentTrack, playTrack]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setSleepTimerOption = useCallback((option: number | 'end_of_track') => {
    if (option === 'end_of_track') {
      setSleepTimer({
        active: true,
        mode: 'end_of_track',
        remainingSeconds: 0,
        initialMinutes: 0,
      });
    } else if (typeof option === 'number' && option > 0) {
      setSleepTimer({
        active: true,
        mode: 'duration',
        remainingSeconds: option * 60,
        initialMinutes: option,
      });
    } else {
      setSleepTimer({
        active: false,
        mode: 'duration',
        remainingSeconds: 0,
        initialMinutes: 0,
      });
    }
  }, []);

  const clearSleepTimer = useCallback(() => {
    setSleepTimer({
      active: false,
      mode: 'duration',
      remainingSeconds: 0,
      initialMinutes: 0,
    });
  }, []);

  const playNext = useCallback(() => {
    const cur = currentTrackRef.current;
    const list = playlistRef.current;
    const col = currentCollectionRef.current;
    const audio = audioRef.current;
    if (!cur || list.length === 0 || !audio) return;

    // Mark current track as completed
    const dur = cur.duration || audio.duration || 1;
    updateTrackProgress(cur.id, dur, dur);

    const currentIndex = list.findIndex((t) => t.id === cur.id);
    if (currentIndex !== -1 && currentIndex + 1 < list.length) {
      const nextTrack = list[currentIndex + 1];
      isTransitioningRef.current = true;

      // If preloaded candidate matches, switch audio synchronously (crucial when screen is off)
      const preloaded = nextTrackPreloadRef.current;
      if (preloaded && preloaded.trackId === nextTrack.id) {
        if (currentBlobUrlRef.current && currentBlobUrlRef.current !== preloaded.sourceUrl) {
          try {
            URL.revokeObjectURL(currentBlobUrlRef.current);
          } catch {}
        }
        currentBlobUrlRef.current = preloaded.isBlobUrl ? preloaded.sourceUrl : null;
        nextTrackPreloadRef.current = null;

        audio.src = preloaded.sourceUrl;
        audio.currentTime = 0;
        audio.playbackRate = playbackRateRef.current || 1.0;
        audio
          .play()
          .then(() => {
            isTransitioningRef.current = false;
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Immediate autoplay on ended failed, falling back to playTrack', err);
            isTransitioningRef.current = false;
            playTrack(nextTrack, list, col || undefined);
          });

        const freshTrack = { ...preloaded.track, currentTime: 0, progressPercent: 0 };
        setCurrentTrack(freshTrack);
        setDuration(freshTrack.duration || 0);
        setCurrentTime(0);

        // Preload the following track
        if (currentIndex + 2 < list.length) {
          preloadNextTrack(list[currentIndex + 2]);
        }
      } else {
        const freshTrack = { ...nextTrack, currentTime: 0, progressPercent: 0 };
        playTrack(freshTrack, list, col || undefined).finally(() => {
          isTransitioningRef.current = false;
        });
      }
    } else {
      // End of playlist
      isTransitioningRef.current = false;
      setIsPlaying(false);
    }
  }, [playTrack, preloadNextTrack]);

  // Keep playNextRef, playPrevRef, closePlayerRef in sync on each render
  playNextRef.current = playNext;

  const playPrev = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;
    const audio = audioRef.current;
    // If more than 3 seconds in, restart current track
    if (audio && audio.currentTime > 3) {
      seekTo(0);
      return;
    }
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(playlist[currentIndex - 1], playlist, currentCollection || undefined);
    } else {
      seekTo(0);
    }
  }, [currentTrack, playlist, currentCollection, playTrack, seekTo]);

  playPrevRef.current = playPrev;

  const closePlayer = useCallback(() => {
    isTransitioningRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
    if (currentTrack && audio) {
      updateTrackProgress(currentTrack.id, audio.currentTime, audio.duration || duration);
    }
    setCurrentTrack(null);
    setCurrentCollection(null);
    setIsFullPlayerOpen(false);

    if (typeof window !== 'undefined') {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'none';
        } catch {}
      }
      if ((window as any).AndroidMediaBridge?.stopMedia) {
        try {
          (window as any).AndroidMediaBridge.stopMedia();
        } catch {}
      }
    }
  }, [currentTrack, duration]);

  closePlayerRef.current = closePlayer;

  const updatePlaylist = useCallback((newPlaylist: AudiobookTrack[]) => {
    setPlaylist(newPlaylist);
  }, []);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100))) : 0;

  return (
    <AudioPlayerContext.Provider
      value={{
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
        openFullPlayer: () => setIsFullPlayerOpen(true),
        closeFullPlayer: () => setIsFullPlayerOpen(false),
        closePlayer,
        playTrack,
        togglePlay,
        seekTo,
        seekDelta,
        setPlaybackRate,
        setSleepTimer: setSleepTimerOption,
        clearSleepTimer,
        playNext,
        playPrev,
        updatePlaylist,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};
