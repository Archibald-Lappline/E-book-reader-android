import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpCircle, X, ChevronRight } from 'lucide-react';
import { ReaderThemeConfig } from '../types';

interface UpdateBannerProps {
  theme: ReaderThemeConfig;
  version: string;
  currentVersion: string | null;
  onOpen: () => void;
  onDismiss: () => void;
}

/** Ненавязчивое уведомление о новой версии (появляется сверху при запуске). */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  theme,
  version,
  currentVersion,
  onOpen,
  onDismiss,
}) => (
  <motion.div
    id="update-banner"
    initial={{ opacity: 0, y: -24, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -24, scale: 0.97 }}
    transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
    className="fixed left-3 right-3 z-[70] mx-auto max-w-md"
    style={{ top: 'max(env(safe-area-inset-top, 0px), 12px)' }}
  >
    <div
      className="flex items-center gap-1 pl-3.5 pr-1.5 py-2 rounded-2xl border shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: theme.cardBg,
        borderColor: 'rgba(245, 158, 11, 0.45)',
        color: theme.text,
      }}
    >
      <button
        id="btn-update-banner-open"
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-3 py-1 text-left cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
          <ArrowUpCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate">Доступна версия {version}</div>
          <div className="text-[11px] opacity-65 truncate">
            {currentVersion ? `У вас ${currentVersion} · ` : ''}нажмите, чтобы посмотреть
          </div>
        </div>
        <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
      </button>
      <button
        id="btn-update-banner-dismiss"
        onClick={onDismiss}
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        title="Скрыть"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </motion.div>
);
