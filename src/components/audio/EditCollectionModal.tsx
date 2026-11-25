import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Image as ImageIcon, Trash2, Check, FolderPlus, Sparkles } from 'lucide-react';
import { AudiobookCollection, ReaderThemeConfig } from '../../types';
import { tr } from '../../i18n';

interface EditCollectionModalProps {
  collection?: AudiobookCollection | null;
  theme: ReaderThemeConfig;
  onSave: (collectionData: Partial<AudiobookCollection>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const EditCollectionModal: React.FC<EditCollectionModalProps> = ({
  collection,
  theme,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState(collection?.title || '');
  const [author, setAuthor] = useState(collection?.author || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [coverUrl, setCoverUrl] = useState(collection?.coverUrl || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      author: author.trim() || undefined,
      description: description.trim() || undefined,
      coverUrl: coverUrl || undefined,
    });
    onClose();
  };

  return (
    <div
      id="edit-collection-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-inherit/20 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-amber-500" />
            {collection ? tr("Редактировать сборник") : tr("Создать сборник аудиокниг")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Cover Preview & Upload */}
          <div className="flex items-center gap-4">
            <div className="relative w-22 h-22 rounded-2xl overflow-hidden border-2 border-inherit/30 shadow-md shrink-0 bg-neutral-900 group flex items-center justify-center">
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt={tr("Обложка")} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                  >
                    <ImageIcon className="w-5 h-5 mb-0.5" /> {tr("Сменить")}
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-amber-500/10 text-amber-500">
                  <FolderPlus className="w-8 h-8 opacity-60" />
                  <span className="text-[9px] opacity-60 mt-1">{tr("Без обложки")}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 active:scale-95 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 w-full justify-center"
              >
                <ImageIcon className="w-4 h-4" /> {coverUrl ? tr("Заменить обложку") : tr("Загрузить обложку")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="text-[10px] text-red-400 hover:underline mt-1.5 block cursor-pointer"
                >
                  {tr("Удалить обложку")}
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold mb-1">
              {tr("Название сборника / серии")} <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("Например: Властелин Колец (Тома 1-3)")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-inherit/30 bg-black/5 dark:bg-white/5 text-xs focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs font-bold mb-1">{tr("Автор или чтец")}</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={tr("Например: Дж. Р. Р. Толкин")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-inherit/30 bg-black/5 dark:bg-white/5 text-xs focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold mb-1">{tr("Описание (необязательно)")}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("Заметки о цикле, переводчике или содержании...")}
              className="w-full px-3.5 py-2 rounded-xl border border-inherit/30 bg-black/5 dark:bg-white/5 text-xs focus:outline-hidden focus:border-amber-500 resize-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-inherit/15">
            {collection && onDelete && (
              <div>
                {showConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(collection.id)}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer shadow-sm"
                  >
                    {tr("Точно удалить?")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer"
                    title={tr("Удалить сборник")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer opacity-70 hover:opacity-100"
              >
                {tr("Отмена")}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                {collection ? tr("Сохранить") : tr("Создать")}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
