import React from 'react';
import { motion } from 'motion/react';
import { X, Palette, Sun, Moon, Sparkles, Touchpad, PartyPopper } from 'lucide-react';
import { ReaderSettings, ReaderThemeId } from '../types';
import { READER_THEMES } from '../utils/themeConfig';

interface AppAppearanceModalProps {
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

export const AppAppearanceModal: React.FC<AppAppearanceModalProps> = ({
                                                                        settings,
                                                                        onUpdateSettings,
                                                                        onClose,
                                                                      }) => {
  const currentTheme = READER_THEMES[settings.theme];
  const isDark = currentTheme.isDark;

  return (
      <motion.div
          id="app-appearance-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end select-none"
          onClick={onClose}
      >
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
            id="app-appearance-modal"
            className="w-full max-w-lg mx-auto rounded-t-3xl shadow-2xl border-t overflow-hidden flex flex-col max-h-[85vh] will-change-transform transform-gpu"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.border,
              color: currentTheme.text,
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center pt-3 pb-1">
            <div
                className="w-12 h-1.5 rounded-full"
                style={{ backgroundColor: currentTheme.border }}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-b border-inherit/25">
            <div className="flex items-center gap-2.5">
              <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
                  style={{
                    backgroundColor: currentTheme.accent,
                    color: isDark ? '#000' : '#fff',
                  }}
              >
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold">Оформление приложения</h2>
                <p className="text-[11px] opacity-65">Цветовая тема, яркость и эффекты</p>
              </div>
            </div>
            <button
                id="btn-close-appearance"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6 overflow-y-auto">
            {/* Theme selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-3">
                Цветовая тема (для всего приложения)
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {(Object.keys(READER_THEMES) as ReaderThemeId[]).map((themeKey) => {
                  const theme = READER_THEMES[themeKey];
                  const isSelected = settings.theme === themeKey;
                  return (
                      <button
                          key={themeKey}
                          id={`btn-theme-${themeKey}`}
                          onClick={() => onUpdateSettings({ theme: themeKey })}
                          className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${
                              isSelected
                                  ? 'ring-2 ring-amber-500 scale-102 shadow-md'
                                  : 'opacity-75 hover:opacity-100 hover:scale-101'
                          }`}
                      >
                        <div
                            className="w-10 h-10 rounded-full border shadow-inner flex items-center justify-center font-serif text-sm font-bold"
                            style={{
                              backgroundColor: theme.bg,
                              color: theme.text,
                              borderColor: theme.border,
                            }}
                        >
                          Аа
                        </div>
                        <span className="text-[10px] font-medium mt-1.5 text-center truncate max-w-full">
                      {theme.name}
                    </span>
                      </button>
                  );
                })}
              </div>
            </div>

            {/* Screen brightness */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  Яркость экрана
                </label>
                <span className="text-xs font-mono font-medium">{settings.brightness}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 opacity-50 shrink-0" />
                <input
                    id="slider-appearance-brightness"
                    type="range"
                    min="25"
                    max="100"
                    value={settings.brightness}
                    onChange={(e) => onUpdateSettings({ brightness: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer h-2 rounded-lg bg-neutral-600/30"
                />
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
            </div>

            {/* Page transition animation */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5" />
                Анимация перелистывания страниц
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'flip', label: '3D-книга', desc: 'Объёмный лист с тенью' },
                  { id: 'slide', label: 'Сдвиг', desc: 'Скольжение листа' },
                  { id: 'fade', label: 'Выцветание', desc: 'Мягкий переход' },
                  { id: 'none', label: 'Без анимации', desc: 'Мгновенно' },
                ].map((item) => {
                  const isSelected = (settings.pageTransition || 'flip') === item.id;
                  return (
                      <button
                          key={item.id}
                          id={`btn-anim-${item.id}`}
                          onClick={() => onUpdateSettings({ pageTransition: item.id as any })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                  ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/15 font-semibold shadow-xs'
                                  : 'border-inherit/20 hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                          }`}
                      >
                        <span className="block text-xs font-bold">{item.label}</span>
                        <span className="block text-[10px] opacity-60 mt-0.5">{item.desc}</span>
                      </button>
                  );
                })}
              </div>
            </div>

            {/* Tap to turn pages toggle */}
            <div className="pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-inherit/20 bg-black/5 dark:bg-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Touchpad className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Листание тапом по краям</h4>
                    <p className="text-[10px] opacity-65">
                      {settings.tapToTurnPages !== false
                          ? 'Включено: нажатие на край экрана меняет страницу'
                          : 'Отключено: страницы листаются только жестом смахивания (свайпом)'}
                    </p>
                  </div>
                </div>
                <button
                    id="toggle-appearance-tap-to-turn"
                    onClick={() =>
                        onUpdateSettings({ tapToTurnPages: settings.tapToTurnPages === false })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        settings.tapToTurnPages !== false ? 'bg-amber-500' : 'bg-neutral-600/40'
                    }`}
                    title="Переключить листание тапом"
                >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                        settings.tapToTurnPages !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
                </button>
              </div>
            </div>

            {/* Page milestone (every 67th page) congratulation toggle */}
            <div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-inherit/20 bg-black/5 dark:bg-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <PartyPopper className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Поздравление на 67-й странице</h4>
                    <p className="text-[10px] opacity-65">
                      {settings.showPageMilestone !== false
                          ? 'Включено: окно с гифкой на каждой 67-й странице книги'
                          : 'Отключено: окно на 67-й странице не показывается'}
                    </p>
                  </div>
                </div>
                <button
                    id="toggle-appearance-page-milestone"
                    onClick={() =>
                        onUpdateSettings({ showPageMilestone: settings.showPageMilestone === false })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        settings.showPageMilestone !== false ? 'bg-amber-500' : 'bg-neutral-600/40'
                    }`}
                    title="Переключить поздравление на 67-й странице"
                >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                        settings.showPageMilestone !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
  );
};