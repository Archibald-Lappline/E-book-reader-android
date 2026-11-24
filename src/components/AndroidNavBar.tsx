import React from 'react';

interface AndroidNavBarProps {
  isDark?: boolean;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({ isDark = true }) => {
  return (
    <div
      id="android-gesture-bar-container"
      className="w-full flex items-center justify-center py-2.5 select-none pointer-events-none z-30"
    >
      <div
        className={`w-32 h-1 rounded-full transition-colors ${
          isDark ? 'bg-white/30' : 'bg-black/30'
        }`}
      />
    </div>
  );
};
