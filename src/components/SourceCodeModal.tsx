import React from 'react';
import { motion } from 'motion/react';
import {
  X, Github, Code2, ExternalLink, Download, Scale, GitFork, Smartphone,
  RefreshCw, CheckCircle2, ArrowUpCircle, AlertTriangle,
} from 'lucide-react';
import type { UpdateCheck } from '../utils/useUpdateCheck';
import { ReaderThemeConfig } from '../types';
import { tr } from '../i18n';

export const SOURCE_CODE_REPO_URL = 'https://github.com/Archibald-Lappline/E-book-reader-android';

interface SourceCodeModalProps {
  theme: ReaderThemeConfig;
  update: UpdateCheck;
  onClose: () => void;
}

const FACTS = [
  { icon: Scale, label: 'Лицензия MIT' },
  { icon: GitFork, label: 'Можно форкать' },
  { icon: Smartphone, label: 'Android и веб' },
];

const UpdateSection: React.FC<{ update: UpdateCheck }> = ({ update }) => {
  const { status, currentVersion, latest, errorMessage, check } = update;
  const card = 'rounded-2xl border p-3.5 flex flex-col gap-3';
  const smallBtn =
    'shrink-0 px-3 py-1.5 rounded-lg border border-inherit/25 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-semibold flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer';

  if (status === 'available' && latest) {
    return (
      <div id="update-section-available" className={`${card} border-amber-500/45 bg-amber-500/10`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">{tr("Доступна версия")} {latest.version}</div>
            <div className="text-[11px] opacity-65">
              {currentVersion ? tr`Установлена ${currentVersion}` : tr("Есть новое обновление")}
            </div>
          </div>
        </div>
        {latest.notes && (
          <p className="text-[11px] leading-relaxed opacity-75 whitespace-pre-line line-clamp-5">
            {latest.notes}
          </p>
        )}
        <a
          id="link-update-download"
          href={latest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold shadow-xs flex items-center justify-center gap-2 active:scale-95"
        >
          <Download className="w-4 h-4" />
          {tr("Скачать обновление")}
        </a>
      </div>
    );
  }

  if (status === 'up-to-date') {
    return (
      <div id="update-section-uptodate" className={`${card} border-emerald-500/30 bg-emerald-500/10 !flex-row items-center`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold">{tr("У вас последняя версия")}</div>
          {currentVersion && <div className="text-[11px] opacity-65">{tr("Версия")} {currentVersion}</div>}
        </div>
        <button id="btn-update-recheck" onClick={() => void check()} className={smallBtn}>
          <RefreshCw className="w-3.5 h-3.5" /> {tr("Проверить")}
        </button>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div id="update-section-checking" className={`${card} border-inherit/25 bg-black/5 dark:bg-white/5 !flex-row items-center`}>
        <RefreshCw className="w-5 h-5 text-amber-500 shrink-0 animate-spin" />
        <div className="text-xs font-semibold">{tr("Проверяем обновления…")}</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div id="update-section-error" className={`${card} border-red-500/30 bg-red-500/10 !flex-row items-center`}>
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold">{tr("Не удалось проверить обновления")}</div>
          {errorMessage && <div className="text-[11px] opacity-65">{errorMessage}</div>}
        </div>
        <button id="btn-update-retry" onClick={() => void check()} className={smallBtn}>
          <RefreshCw className="w-3.5 h-3.5" /> {tr("Повторить")}
        </button>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div id="update-section-unsupported" className={`${card} border-inherit/25 bg-black/5 dark:bg-white/5 !flex-row items-center`}>
        <Smartphone className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="text-[11px] leading-relaxed opacity-75">
          {tr("Проверка обновлений работает в установленном Android-приложении.")}
        </div>
      </div>
    );
  }

  // idle: автопроверка ещё не началась
  return (
    <div id="update-section-idle" className={`${card} border-inherit/25 bg-black/5 dark:bg-white/5 !flex-row items-center`}>
      <RefreshCw className="w-5 h-5 text-amber-500 shrink-0" />
      <div className="text-xs font-semibold flex-1">{tr("Обновления")}</div>
      <button id="btn-update-check" onClick={() => void check()} className={smallBtn}>
        {tr("Проверить")}
      </button>
    </div>
  );
};

export const SourceCodeModal: React.FC<SourceCodeModalProps> = ({ theme, update, onClose }) => {
  const isDark = theme.isDark;
  const repoLabel = SOURCE_CODE_REPO_URL.replace(/^https?:\/\//, '');

  return (
    <motion.div
      id="source-code-modal-backdrop"
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
        id="source-code-modal"
        className="w-full max-w-lg mx-auto rounded-t-3xl shadow-2xl border-t overflow-hidden flex flex-col max-h-[85vh] will-change-transform transform-gpu"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: theme.border }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-inherit/25">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: theme.accent, color: isDark ? '#000' : '#fff' }}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">{tr("Открытый исходный код")}</h2>
              <p className="text-[11px] opacity-65">{tr("BookSlut — проект с открытым кодом")}</p>
            </div>
          </div>
          <button
            id="btn-close-source-code"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs leading-relaxed opacity-80">
            {tr("Весь код приложения, история изменений и готовые сборки APK лежат в репозитории на GitHub. Его можно читать, скачивать, форкать и предлагать правки.")}
          </p>

          <UpdateSection update={update} />

          {/* Repository card */}
          <a
            id="link-source-code-repo"
            href={SOURCE_CODE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3.5 p-3.5 rounded-2xl border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/15 transition-colors active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Github className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{tr("Репозиторий на GitHub")}</div>
              <div className="text-[11px] opacity-65 truncate font-mono">{repoLabel}</div>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-500 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          {/* Facts */}
          <div className="flex flex-wrap gap-2">
            {FACTS.map(({ icon: Icon, label }) => (
              <span
                key={tr(label)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-inherit/25 bg-black/5 dark:bg-white/5"
              >
                <Icon className="w-3.5 h-3.5 text-amber-500" />
                {label}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1">
            <a
              id="link-source-code-releases"
              href={`${SOURCE_CODE_REPO_URL}/releases/latest`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl border border-inherit/25 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <Download className="w-4 h-4 text-amber-500" />
              {tr("Скачать APK")}
            </a>
            <button
              id="btn-source-code-done"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
            >
              {tr("Закрыть")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
