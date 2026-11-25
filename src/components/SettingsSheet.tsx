import React from 'react';
import { 
  X, 
  Type, 
  AlignJustify, 
  AlignLeft, 
  Rows, 
  Minus,
  Plus,
  Touchpad
} from 'lucide-react';
import { ReaderSettings, ReaderFontFamily } from '../types';
import { READER_THEMES, FONT_OPTIONS } from '../utils/themeConfig';
import { tr } from '../i18n';

interface SettingsSheetProps {
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const currentTheme = READER_THEMES[settings.theme];
  const isDark = currentTheme.isDark;

  return (
    <div
      id="reader-settings-sheet-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end transition-opacity select-none"
      onClick={onClose}
    >
      <div
        id="reader-settings-sheet"
        className={`w-full max-h-[85vh] overflow-y-auto rounded-t-3xl p-5 shadow-2xl border-t transition-transform transform ${
          isDark 
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
            : 'bg-stone-50 border-stone-200 text-stone-900'
        }`}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pb-3">
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-neutral-700' : 'bg-stone-300'}`} />
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-inherit/40">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold">{tr("Настройки шрифта и текста")}</h2>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isDark ? 'hover:bg-neutral-800' : 'hover:bg-stone-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-4 text-sm">
          {/* Font Family */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-2.5">
              {tr("Гарнитура шрифта")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((font) => {
                const isSelected = settings.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    id={`btn-font-${font.id}`}
                    onClick={() => onUpdateSettings({ fontFamily: font.id as ReaderFontFamily })}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      font.cssClass
                    } ${
                      isSelected
                        ? isDark
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold shadow-xs'
                          : 'border-amber-600 bg-amber-50 text-amber-900 font-semibold shadow-xs'
                        : isDark
                        ? 'border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800'
                        : 'border-stone-200 bg-white hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-sm">{font.name}</span>
                    <span className="text-[11px] opacity-60 font-sans mt-0.5">{tr(font.preview)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size & Line Height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  {tr("Размер шрифта")}
                </span>
                <span className="text-xs font-mono font-bold text-amber-500">
                  {settings.fontSize} px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-font-size-dec"
                  onClick={() => onUpdateSettings({ fontSize: Math.max(13, settings.fontSize - 1) })}
                  className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border cursor-pointer ${
                    isDark ? 'border-neutral-700 bg-neutral-800' : 'border-stone-300 bg-white'
                  }`}
                  title={tr("Уменьшить шрифт")}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  id="slider-font-size"
                  type="range"
                  min="13"
                  max="32"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 rounded-lg bg-neutral-600/30"
                />
                <button
                  id="btn-font-size-inc"
                  onClick={() => onUpdateSettings({ fontSize: Math.min(32, settings.fontSize + 1) })}
                  className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border cursor-pointer ${
                    isDark ? 'border-neutral-700 bg-neutral-800' : 'border-stone-300 bg-white'
                  }`}
                  title={tr("Увеличить шрифт")}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  {tr("Межстрочный интервал")}
                </span>
                <span className="text-xs font-mono font-medium">
                  {settings.lineHeight.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Rows className="w-4 h-4 opacity-50" />
                <input
                  id="slider-line-height"
                  type="range"
                  min="1.3"
                  max="2.3"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => onUpdateSettings({ lineHeight: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 rounded-lg bg-neutral-600/30"
                />
              </div>
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-2">
              {tr("Выравнивание текста")}
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-neutral-800/60 border border-inherit/30">
              <button
                id="btn-align-justify"
                onClick={() => onUpdateSettings({ textAlign: 'justify' })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.textAlign === 'justify'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                {tr("По ширине")}
              </button>
              <button
                id="btn-align-left"
                onClick={() => onUpdateSettings({ textAlign: 'left' })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.textAlign === 'left'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                {tr("По левому краю")}
              </button>
            </div>
          </div>

          {/* Margins */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                {tr("Поля страницы (отступы)")}
              </span>
              <span className="text-xs font-mono font-medium">{settings.marginHorizontal} px</span>
            </div>
            <input
              id="slider-margins"
              type="range"
              min="12"
              max="54"
              value={settings.marginHorizontal}
              onChange={(e) => onUpdateSettings({ marginHorizontal: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer h-1.5 rounded-lg bg-neutral-600/30"
            />
          </div>

          {/* Tap to turn pages toggle */}
          <div className="pt-1">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-inherit/20 bg-black/5 dark:bg-white/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                  <Touchpad className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">{tr("Листание тапом по краям")}</h4>
                  <p className="text-[10px] opacity-65">
                    {settings.tapToTurnPages !== false
                      ? tr("Включено: нажатие на края экрана листает страницу")
                      : tr("Отключено: страницы листаются только свайпом")}
                  </p>
                </div>
              </div>
              <button
                id="toggle-reader-tap-to-turn"
                onClick={() =>
                  onUpdateSettings({ tapToTurnPages: settings.tapToTurnPages === false })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.tapToTurnPages !== false ? 'bg-amber-500' : 'bg-neutral-600/40'
                }`}
                title={tr("Переключить листание тапом")}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    settings.tapToTurnPages !== false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
