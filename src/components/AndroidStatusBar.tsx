import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface AndroidStatusBarProps {
  isDark?: boolean;
  className?: string;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isDark = true, className = '' }) => {
  const [timeStr, setTimeStr] = useState('12:45');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const textColor = isDark ? 'text-white/80' : 'text-neutral-800/80';

  return (
    <div
      id="android-status-bar"
      className={`w-full flex items-center justify-between px-5 pt-1.5 pb-1 text-xs font-medium tracking-tight select-none z-30 transition-colors ${textColor} ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-[13px]">{timeStr}</span>
      </div>

      <div className="flex items-center gap-2">
        <Wifi className="w-3.5 h-3.5 opacity-90" />
        <Signal className="w-3.5 h-3.5 opacity-90" />
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono opacity-90">88%</span>
          <BatteryMedium className="w-4 h-4 opacity-90" />
        </div>
      </div>
    </div>
  );
};
