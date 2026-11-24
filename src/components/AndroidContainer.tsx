import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AndroidNavBar } from './AndroidNavBar';

interface AndroidContainerProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export const AndroidContainer: React.FC<AndroidContainerProps> = ({ children, isDark = true }) => {
  const [deviceMode, setDeviceMode] = useState<'phone' | 'tablet' | 'full'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'full';
    return (localStorage.getItem('ereader_device_mode') as 'phone' | 'tablet' | 'full') || 'full';
  });
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const isMobile = window.innerWidth < 768;
      setIsSmallScreen(isMobile);
      if (isMobile) {
        setDeviceMode('full');
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleSetDeviceMode = (mode: 'phone' | 'tablet' | 'full') => {
    setDeviceMode(mode);
    localStorage.setItem('ereader_device_mode', mode);
  };

  return (
    <div
      id="android-emulator-container"
      className="relative w-full h-[100dvh] flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none"
    >
      {!isSmallScreen && (
        <header className="w-full flex items-center justify-between px-4 sm:px-6 py-2 bg-neutral-900/90 border-b border-neutral-800 text-xs z-40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wide text-neutral-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Android Material 3 E-Reader
            </span>
          </div>

          <div className="flex items-center gap-1 bg-neutral-800/90 p-1 rounded-xl border border-neutral-700/60 shadow-xs">
            <button
              id="btn-switch-phone"
              onClick={() => handleSetDeviceMode('phone')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deviceMode === 'phone'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Форм-фактор смартфона (Google Pixel)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Телефон</span>
            </button>

            <button
              id="btn-switch-tablet"
              onClick={() => handleSetDeviceMode('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deviceMode === 'tablet'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Форм-фактор планшета"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Планшет</span>
            </button>

            <button
              id="btn-switch-fullscreen"
              onClick={() => handleSetDeviceMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deviceMode === 'full'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Полноэкранный адаптивный режим"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Весь экран</span>
            </button>
          </div>
        </header>
      )}

      <div className="flex-1 w-full flex items-center justify-center p-0 md:p-3 overflow-hidden">
        {deviceMode === 'full' || isSmallScreen ? (
          <div className="w-full h-full relative overflow-hidden flex flex-col">
            {children}
          </div>
        ) : deviceMode === 'phone' ? (
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-[400px] h-full max-h-[840px] rounded-[44px] p-3 bg-neutral-850 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] border-4 border-neutral-700 ring-1 ring-neutral-600/50 flex flex-col my-auto shrink-0"
          >
            {/* Camera notch */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-neutral-700/80 z-50 flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
            </div>

            <div className={`w-full h-full rounded-[32px] overflow-hidden relative flex flex-col shadow-inner transition-colors duration-200 ${
              isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-stone-100 text-stone-900'
            }`}>
              <AndroidStatusBar isDark={isDark} />
              <div className="flex-1 w-full relative overflow-hidden flex flex-col min-h-0">
                {children}
              </div>
              <AndroidNavBar isDark={isDark} />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-[780px] h-full max-h-[820px] rounded-[36px] p-3.5 bg-neutral-850 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] border-4 border-neutral-700 ring-1 ring-neutral-600/50 flex flex-col my-auto shrink-0"
          >
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-black border border-neutral-700 z-50 pointer-events-none" />
            <div className={`w-full h-full rounded-[24px] overflow-hidden relative flex flex-col shadow-inner transition-colors duration-200 ${
              isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-stone-100 text-stone-900'
            }`}>
              <AndroidStatusBar isDark={isDark} />
              <div className="flex-1 w-full relative overflow-hidden flex flex-col min-h-0">
                {children}
              </div>
              <AndroidNavBar isDark={isDark} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
