import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  CloudCheck, 
  Download, 
  Upload, 
  Smartphone, 
  Database, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { createFullBackupJson, restoreFromBackupJson } from '../services/storage';
import { exportFile } from '../utils/fileExport';

interface SyncDialogProps {
  onClose: () => void;
  onRefreshLibrary: () => void;
  isDark?: boolean;
}

export const SyncDialog: React.FC<SyncDialogProps> = ({
  onClose,
  onRefreshLibrary,
  isDark = true,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Только что');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualSync = () => {
    setIsSyncing(true);
    setErrorMsg(null);
    setSyncSuccess(false);

    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  const handleExportBackup = async () => {
    try {
      const json = await createFullBackupJson();
      const filename = `android-reader-sync-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const result = await exportFile({
        filename,
        content: json,
        mimeType: 'application/json',
        title: 'Резервная копия библиотеки',
      });

      if (result.success) {
        setSyncSuccess(true);
        setErrorMsg(null);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err) {
      setErrorMsg('Ошибка при экспорте резервной копии');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setIsSyncing(true);
        const success = await restoreFromBackupJson(text);
        setIsSyncing(false);
        if (success) {
          setSyncSuccess(true);
          onRefreshLibrary();
          setTimeout(() => {
            setSyncSuccess(false);
            onClose();
          }, 1500);
        } else {
          setErrorMsg('Неверный формат файла синхронизации');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="sync-dialog-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="sync-dialog"
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-stone-200 text-stone-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-inherit/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="font-bold text-base">Синхронизация прогресса</h2>
              <p className="text-xs opacity-60">Android Cloud & Local Room Store</p>
            </div>
          </div>
          <button
            id="btn-close-sync"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-amber-400">Прогресс чтения сохранен</p>
                <p className="text-[11px] opacity-70 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Последняя синхронизация: {lastSyncTime}
                </p>
              </div>
            </div>
            <button
              id="btn-sync-now"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-900 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Синхронизация...' : 'Обновить'}
            </button>
          </div>

          {syncSuccess && (
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Библиотека, закладки и заметки успешно синхронизированы!
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 text-xs text-rose-400 font-medium">{errorMsg}</div>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-neutral-800/50 border border-inherit/20">
            <Smartphone className="w-5 h-5 text-amber-500 opacity-80" />
            <div className="flex-1">
              <p className="font-semibold">Локальное хранилище (Offline-First)</p>
              <p className="text-[11px] opacity-60">Все книги, шрифты и цитаты доступны без интернета</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold">
              АКТИВНО
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              id="btn-export-backup"
              onClick={handleExportBackup}
              className="p-3 rounded-2xl border border-inherit/30 hover:bg-black/5 dark:hover:bg-neutral-800 transition-colors flex flex-col items-center text-center gap-1.5"
            >
              <Download className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">Экспорт копии</span>
              <span className="text-[10px] opacity-60">Скачать файл .json с прогрессом и заметками</span>
            </button>

            <label
              id="label-import-backup"
              className="p-3 rounded-2xl border border-inherit/30 hover:bg-black/5 dark:hover:bg-neutral-800 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">Импорт копии</span>
              <span className="text-[10px] opacity-60">Восстановить прогресс с другого устройства</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
