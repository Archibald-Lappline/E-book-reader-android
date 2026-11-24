import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SOURCE_CODE_REPO_URL } from '../components/SourceCodeModal';

export type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error' | 'unsupported';

export interface ReleaseInfo {
  /** Версия без префикса «v», например «1.0.3» */
  version: string;
  tag: string;
  name: string;
  /** Страница релиза на GitHub (там лежат APK) */
  url: string;
  /** Краткое описание изменений (очищенный текст релиза) */
  notes: string;
  publishedAt: string | null;
}

export interface UpdateCheck {
  status: UpdateStatus;
  /** Версия установленного приложения (null — неизвестна, например в браузере) */
  currentVersion: string | null;
  latest: ReleaseInfo | null;
  errorMessage: string | null;
  /** Нужно ли показывать баннер о новой версии (не скрыт пользователем) */
  showBanner: boolean;
  check: () => Promise<void>;
  dismissBanner: () => void;
}

const DISMISSED_KEY = 'ereader.update.dismissedVersion';
/** Для проверки в браузере: localStorage.setItem('ereader.debugVersion', '1.0.0') */
const DEBUG_VERSION_KEY = 'ereader.debugVersion';
const AUTO_CHECK_DELAY_MS = 2500;
const REQUEST_TIMEOUT_MS = 10000;

function parseRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/\s]+)\/([^/#?\s]+)/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, '');
  if (owner === 'YOUR_USERNAME') return null; // адрес ещё не заполнен
  return { owner, repo };
}

function parseVersion(v: string): number[] {
  return (v.match(/\d+/g) || []).slice(0, 4).map(Number);
}

/** > 0, если a новее b */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function cleanNotes(body: unknown): string {
  if (typeof body !== 'string') return '';
  return body
    .replace(/\r/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // ссылки и картинки -> текст
    .replace(/[#*_`>]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n')
    .slice(0, 400);
}

async function getCurrentVersion(): Promise<string | null> {
  try {
    const dbg = localStorage.getItem(DEBUG_VERSION_KEY);
    if (dbg) return dbg;
  } catch { /* localStorage недоступен */ }
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapApp.getInfo();
      return info.version || null;
    } catch { /* плагин недоступен */ }
  }
  return null;
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/**
 * Проверка обновлений через GitHub Releases (последний опубликованный релиз).
 * Автоматически запускается один раз при старте приложения.
 */
export function useUpdateCheck(): UpdateCheck {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latest, setLatest] = useState<ReleaseInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(readDismissed);

  const check = useCallback(async () => {
    const repo = parseRepo(SOURCE_CODE_REPO_URL);
    if (!repo) {
      setStatus('error');
      setErrorMessage('Не указан адрес репозитория GitHub');
      return;
    }

    setStatus('checking');
    setErrorMessage(null);

    const current = await getCurrentVersion();
    setCurrentVersion(current);
    if (!current) {
      setStatus('unsupported');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`,
        { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal }
      );
      if (res.status === 404) throw new Error('На GitHub пока нет опубликованных релизов');
      if (res.status === 403 || res.status === 429) {
        throw new Error('Превышен лимит запросов GitHub, попробуйте позже');
      }
      if (!res.ok) throw new Error(`GitHub вернул ошибку ${res.status}`);

      const data = await res.json();
      const tag: string = String(data.tag_name || '');
      const release: ReleaseInfo = {
        version: tag.replace(/^v/i, ''),
        tag,
        name: String(data.name || tag),
        url: String(data.html_url || `${SOURCE_CODE_REPO_URL}/releases/latest`),
        notes: cleanNotes(data.body),
        publishedAt: data.published_at ? String(data.published_at) : null,
      };
      setLatest(release);
      setStatus(compareVersions(release.version, current) > 0 ? 'available' : 'up-to-date');
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      const offline = e instanceof TypeError;
      setStatus('error');
      setErrorMessage(
        aborted
          ? 'GitHub не отвечает, попробуйте позже'
          : offline
            ? 'Нет подключения к интернету'
            : e instanceof Error
              ? e.message
              : 'Неизвестная ошибка'
      );
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // Проверка при запуске приложения
  useEffect(() => {
    const t = setTimeout(() => {
      void check();
    }, AUTO_CHECK_DELAY_MS);
    return () => clearTimeout(t);
  }, [check]);

  const dismissBanner = useCallback(() => {
    if (!latest) return;
    setDismissedVersion(latest.version);
    try {
      localStorage.setItem(DISMISSED_KEY, latest.version);
    } catch { /* ignore */ }
  }, [latest]);

  return {
    status,
    currentVersion,
    latest,
    errorMessage,
    showBanner: status === 'available' && !!latest && dismissedVersion !== latest.version,
    check,
    dismissBanner,
  };
}
