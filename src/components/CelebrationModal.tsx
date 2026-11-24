import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ReaderThemeConfig } from '../types';

/** Каждая N-я страница книги (сквозная нумерация по всем главам) вызывает уведомление. */
export const PAGE_MILESTONE_INTERVAL = 67;

/**
 * GIF для уведомлений. Положите файлы в папку `public/gifs/`
 * (или поменяйте пути/имена здесь).
 */
/** Окно «Книга прочитана!» (конец книги) */
export const BOOK_FINISHED_GIF_SRC = `${import.meta.env.BASE_URL}gifs/book-finished.gif`;
/** Окно на каждой PAGE_MILESTONE_INTERVAL-й странице */
export const PAGE_MILESTONE_GIF_SRC = `${import.meta.env.BASE_URL}gifs/page-67.gif`;

interface CelebrationModalProps {
    theme: ReaderThemeConfig;
    /** Путь к GIF для этого окна */
    gifSrc: string;
    title: string;
    /** Плашка-бейдж под заголовком, например ['Прогресс: 100%', 'Завершено'] */
    badges: string[];
    message: string;
    secondaryLabel: string;
    onSecondary: () => void;
    /** Если не передан, показывается только одна кнопка (secondary). */
    primaryLabel?: string;
    onPrimary?: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
                                                                      theme,
                                                                      gifSrc,
                                                                      title,
                                                                      badges,
                                                                      message,
                                                                      secondaryLabel,
                                                                      onSecondary,
                                                                      primaryLabel,
                                                                      onPrimary,
                                                                  }) => {
    // Если GIF не найден — показываем прежний эмодзи, чтобы окно не выглядело сломанным
    const [gifFailed, setGifFailed] = useState(false);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm p-6 rounded-3xl text-center shadow-2xl flex flex-col items-center gap-3 border"
                style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                    color: theme.text,
                }}
            >
                {gifFailed ? (
                    <span className="text-4xl">🎉</span>
                ) : (
                    <img
                        src={gifSrc}
                        alt=""
                        draggable={false}
                        onError={() => setGifFailed(true)}
                        className="w-40 h-40 object-contain rounded-2xl pointer-events-none select-none"
                    />
                )}

                <h3 className="text-base sm:text-lg font-bold">{title}</h3>

                {badges.length > 0 && (
                    <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                        {badges.map((b, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span>•</span>}
                                <span>{b}</span>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <p className="text-xs opacity-75 max-w-xs leading-relaxed">{message}</p>

                <div className="flex items-center gap-3 w-full mt-3">
                    <button
                        onClick={onSecondary}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                            primaryLabel
                                ? 'border border-inherit/25 hover:bg-black/5 dark:hover:bg-white/5'
                                : 'bg-amber-500 text-neutral-950 font-bold shadow-xs active:scale-95'
                        }`}
                    >
                        {secondaryLabel}
                    </button>
                    {primaryLabel && onPrimary && (
                        <button
                            onClick={onPrimary}
                            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
                        >
                            {primaryLabel}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};