/**
 * Universal File Export Utility with native Android & Mobile support
 * 
 * Supports:
 * 1. Native Android via Capacitor Filesystem (writes directly to Documents / Downloads)
 * 2. Mobile Chrome & Web direct download to /storage/emulated/0/Download (Загрузки)
 * 3. Fallbacks to Web Share API and Clipboard if downloads are blocked.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { tr } from '../i18n';

export interface ExportFileOptions {
  filename: string;
  content: string | Blob;
  mimeType: string;
  title?: string;
}

export interface ExportResult {
  success: boolean;
  method: 'filesystem' | 'download' | 'share' | 'clipboard';
  message: string;
  path?: string;
}

/**
 * Converts a Blob to a base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      if (commaIdx !== -1) {
        resolve(result.substring(commaIdx + 1));
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts string or Blob to standard Blob
 */
function toBlob(content: string | Blob, mimeType: string): Blob {
  if (typeof content === 'string') {
    return new Blob([content], { type: `${mimeType};charset=utf-8` });
  }
  return content;
}

export async function exportFile(options: ExportFileOptions): Promise<ExportResult> {
  const { filename, content, mimeType, title = filename } = options;
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const blob = toBlob(content, mimeType);
      const base64Data = await blobToBase64(blob);

      let savedUri = '';
      try {
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        savedUri = writeResult.uri;
      } catch (docErr) {
        console.warn('[Export] Documents write failed, trying Cache', docErr);
        const fallbackResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        savedUri = fallbackResult.uri;
      }

      try {
        await Share.share({
          title: title,
          text: tr`Экспортированный файл: ${filename}`,
          url: savedUri,
          dialogTitle: tr("Сохранить или отправить файл"),
        });
      } catch {
      }

      return {
        success: true,
        method: 'filesystem',
        path: savedUri,
        message: tr`Файл «${filename}» сохранён в папку «Документы» (Documents) на устройстве!`,
      };
    } catch (nativeErr) {
      console.error('[Export] Native filesystem export error', nativeErr);
    }
  }

  try {
    const blob = toBlob(content, mimeType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('rel', 'noopener');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch {
      }
    }, 180000);

    return {
      success: true,
      method: 'download',
      message: tr`Файл «${filename}» скачан в папку «Загрузки» (Downloads)!`,
    };
  } catch (downloadErr) {
    console.warn('[Export] Browser download failed, trying Web Share API', downloadErr);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const blob = toBlob(content, mimeType);
        const file = new File([blob], filename, {
          type: mimeType,
          lastModified: Date.now(),
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title,
            text: tr`Файл из Читалки: ${filename}`,
          });

          return {
            success: true,
            method: 'share',
            message: tr`Файл «${filename}» отправлен! Выберите «Сохранить на устройство» или папку «Загрузки».`,
          };
        }
      } catch {
      }
    }

    if (typeof content === 'string') {
      try {
        await navigator.clipboard.writeText(content);
        return {
          success: true,
          method: 'clipboard',
          message: tr("Текст файла скопирован в буфер обмена!"),
        };
      } catch {
      }
    }

    return {
      success: false,
      method: 'download',
      message: tr("Не удалось сохранить файл. Проверьте разрешения устройства."),
    };
  }
}
