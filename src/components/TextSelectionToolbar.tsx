import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Copy, Check, X } from 'lucide-react';
import { Note } from '../types';
import { tr } from '../i18n';

export interface SelectionPosition {
  top: number;
  left: number;
  bottom?: number;
  right?: number;
}

interface TextSelectionToolbarProps {
  selectedText: string;
  position: SelectionPosition;
  onHighlight: (color: Note['color'], noteComment?: string) => void;
  onClose: () => void;
  onNoteModeChange?: (isWritingNote: boolean) => void;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  selectedText,
  position,
  onHighlight,
  onClose,
  onNoteModeChange,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<Note['color']>('yellow');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when note input mode opens
  useEffect(() => {
    if (showNoteInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showNoteInput]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 800);
  };

  const handleOpenNoteInput = () => {
    if (onNoteModeChange) onNoteModeChange(true);
    setShowNoteInput(true);
  };

  const handleCloseNoteInput = () => {
    setShowNoteInput(false);
    if (onNoteModeChange) onNoteModeChange(false);
  };

  const handleSaveNote = () => {
    if (onNoteModeChange) onNoteModeChange(false);
    onHighlight(selectedColor, noteText.trim());
    onClose();
  };

  const colors: Array<{ id: Note['color']; bg: string; name: string }> = [
    { id: 'yellow', bg: 'bg-yellow-400', name: tr("Жёлтый") },
    { id: 'green', bg: 'bg-emerald-400', name: tr("Зелёный") },
    { id: 'blue', bg: 'bg-sky-400', name: tr("Голубой") },
    { id: 'pink', bg: 'bg-pink-400', name: tr("Розовый") },
    { id: 'purple', bg: 'bg-purple-400', name: tr("Фиолетовый") },
  ];

  const selectedColorObj = colors.find((c) => c.id === selectedColor) || colors[0];

  // Smart responsive positioning right next to the selected text:
  // If text is in the lower part of the screen, toolbar MUST be ABOVE the text.
  // If text is near the top of the screen, toolbar goes BELOW the text.
  const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 640;

  const estimatedToolbarHeight = showNoteInput ? 180 : 54;
  const estimatedToolbarWidth = showNoteInput ? 316 : 284;

  const selectionTop = position.top;
  const selectionBottom = position.bottom ?? (position.top + 28);
  const selectionCenter = position.left;

  // Space calculation
  const spaceAbove = selectionTop - 56; // 56px reserved for header
  const spaceBelow = winH - selectionBottom - 56; // 56px reserved for footer
  const isMobile = winW <= 768;

  let targetTop: number;
  if (isMobile) {
    // On Android, the OS native context menu ("Copy / Select all") sits directly ABOVE the selection.
    // Therefore on mobile we PREFER positioning below the text selection if space permits,
    // avoiding any collision or overlap with Android's system menu!
    if (spaceBelow >= estimatedToolbarHeight + 14) {
      targetTop = selectionBottom + 12;
    } else if (spaceAbove >= estimatedToolbarHeight + 14) {
      targetTop = Math.max(56, selectionTop - estimatedToolbarHeight - 12);
    } else {
      // Clamped comfortably in viewport
      targetTop = Math.max(56, Math.min(winH - estimatedToolbarHeight - 64, selectionBottom + 8));
    }
  } else {
    // Desktop: default above selection
    if (spaceBelow < estimatedToolbarHeight + 20) {
      targetTop = Math.max(56, selectionTop - estimatedToolbarHeight - 10);
    } else if (spaceAbove >= estimatedToolbarHeight + 16) {
      targetTop = selectionTop - estimatedToolbarHeight - 10;
    } else {
      targetTop = Math.min(winH - estimatedToolbarHeight - 16, selectionBottom + 10);
    }
  }

  // Ensure targetTop never flies off screen
  targetTop = Math.max(56, Math.min(winH - estimatedToolbarHeight - 16, targetTop));

  // Horizontal clamping so it stays completely inside screen boundaries
  const halfW = estimatedToolbarWidth / 2;
  const targetLeft = Math.max(halfW + 12, Math.min(winW - halfW - 12, selectionCenter));

  return (
    <div
      id="text-selection-toolbar"
      className="fixed z-[99999] select-none pointer-events-auto transition-all animate-fade-in"
      style={{
        top: targetTop,
        left: targetLeft,
        transform: 'translateX(-50%)',
      }}
      onPointerDown={(e) => {
        // Prevent toolbar clicks from collapsing document text selection
        // Do not preventDefault if clicking textarea to allow keyboard focus
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-neutral-900/96 text-neutral-100 rounded-2xl shadow-2xl border border-neutral-700/70 p-2 backdrop-blur-md flex flex-col gap-2 ring-1 ring-black/40">
        {showNoteInput ? (
          <div className="p-1.5 w-72 sm:w-80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> {tr("Заметка к цитате")}
              </span>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseNoteInput();
                }}
                className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title={tr("Отмена")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              id="textarea-note-input"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={tr("Введите комментарий или мысль...")}
              className="w-full text-xs p-2.5 rounded-xl bg-neutral-800/90 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-500 resize-none transition-colors"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSaveNote();
                }
              }}
            />
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-60 mr-0.5">{selectedColorObj.name}:</span>
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(c.id);
                    }}
                    title={c.name}
                    className={`w-4.5 h-4.5 rounded-full ${c.bg} cursor-pointer transition-all ${
                      selectedColor === c.id ? 'ring-2 ring-white scale-115 shadow-sm' : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
              <button
                id="btn-save-note"
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveNote();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                {tr("Сохранить")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-1.5 border-r border-neutral-700/80">
              {colors.map((c) => (
                <button
                  key={c.id}
                  id={`btn-highlight-${c.id}`}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onHighlight(c.id);
                    onClose();
                  }}
                  className={`w-5.5 h-5.5 rounded-full ${c.bg} hover:scale-120 active:scale-95 transition-transform shadow-xs cursor-pointer`}
                  title={tr`Выделить цветом: ${c.name}`}
                />
              ))}
            </div>

            <button
              id="btn-add-note-inline"
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenNoteInput();
              }}
              className="p-1.5 rounded-xl hover:bg-white/15 text-neutral-200 active:scale-95 transition-all flex items-center gap-1.5 text-xs px-2.5 font-semibold cursor-pointer"
              title={tr("Добавить заметку к выделенному тексту")}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>{tr("Заметка")}</span>
            </button>

            <button
              id="btn-copy-selection"
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 rounded-xl hover:bg-white/15 text-neutral-200 active:scale-95 transition-all cursor-pointer"
              title={tr("Скопировать цитату")}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="btn-close-selection"
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={tr("Закрыть")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
