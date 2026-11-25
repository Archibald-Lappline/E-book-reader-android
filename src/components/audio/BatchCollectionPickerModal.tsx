import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, FolderPlus, FolderCheck, Check, Headphones, Plus } from 'lucide-react';
import { AudiobookCollection, ReaderThemeConfig } from '../../types';
import { tr } from '../../i18n';

interface BatchCollectionPickerModalProps {
  collections: AudiobookCollection[];
  selectedCount: number;
  theme: ReaderThemeConfig;
  onSelectCollection: (collectionId: string) => void;
  onCreateCollectionAndMove: (title: string, author?: string) => void;
  onClose: () => void;
}

export const BatchCollectionPickerModal: React.FC<BatchCollectionPickerModalProps> = ({
  collections,
  selectedCount,
  theme,
  onSelectCollection,
  onCreateCollectionAndMove,
  onClose,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateCollectionAndMove(newTitle.trim(), newAuthor.trim() || undefined);
  };

  return (
    <div
      id="batch-collection-picker-backdrop"
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        id="batch-collection-picker-modal"
        className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-inherit/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{tr("Добавить в сборник")}</h3>
              <p className="text-[11px] opacity-65">{tr("Выбрано записей:")} {selectedCount}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="space-y-3 p-1">
              <div>
                <label className="text-xs font-bold block mb-1">{tr("Название нового сборника")}</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={tr("Например: Властелин колец")}
                  className="w-full px-3.5 py-2 rounded-xl border border-inherit/30 bg-black/5 dark:bg-white/5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{tr("Автор (необязательно)")}</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder={tr("Например: Дж. Р. Р. Толкин")}
                  className="w-full px-3.5 py-2 rounded-xl border border-inherit/30 bg-black/5 dark:bg-white/5 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 rounded-xl border border-inherit/30 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {tr("Назад")}
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 active:scale-95 disabled:opacity-50"
                >
                  {tr("Создать и переместить")}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Button: Create New */}
              <button
                id="btn-create-new-col-for-batch"
                onClick={() => setIsCreating(true)}
                className="w-full p-3 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 text-xs font-bold text-amber-500 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{tr("Создать новый сборник для выбранного")}</span>
              </button>

              {/* Existing Collections List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 px-1 block">
                  {tr`Или выберите существующий (${collections.length}):`}
                </span>

                {collections.length === 0 ? (
                  <p className="text-xs opacity-60 text-center py-4">{tr("Сборников пока нет")}</p>
                ) : (
                  collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => onSelectCollection(col.id)}
                      className="w-full p-2.5 rounded-2xl border border-inherit/20 hover:border-amber-500/50 hover:bg-amber-500/10 active:scale-98 transition-all flex items-center justify-between text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-900 border border-inherit/20 shrink-0 flex items-center justify-center">
                          {col.coverUrl ? (
                            <img src={col.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Headphones className="w-4 h-4 text-amber-500 opacity-60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate group-hover:text-amber-500 transition-colors">
                            {col.title}
                          </h4>
                          {col.author && (
                            <p className="text-[10px] opacity-65 truncate">{col.author}</p>
                          )}
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-black/5 dark:bg-white/10 group-hover:bg-amber-500 group-hover:text-neutral-950 flex items-center justify-center shrink-0 transition-colors">
                        <Check className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
