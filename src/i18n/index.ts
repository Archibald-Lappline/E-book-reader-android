import { EN } from './en';

export type AppLanguage = 'ru' | 'en';

const STORAGE_KEY = 'ereader_app_language';

function detectInitial(): AppLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* localStorage недоступен */
  }
  return 'ru';
}

let currentLang: AppLanguage = detectInitial();

export function getLanguage(): AppLanguage {
  return currentLang;
}

/** Меняет язык. Компоненты перерисуются, когда App обновит своё состояние. */
export function setLanguage(lang: AppLanguage): void {
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  try {
    document.documentElement.lang = lang;
  } catch {
    /* ignore */
  }
}

function fill(template: string, values: unknown[]): string {
  const parts = template.split('{}');
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    out += String(values[i - 1] ?? '') + parts[i];
  }
  return out;
}

/**
 * Перевод строки. Ключ — русский текст.
 *   tr('Добавить книгу')
 *   tr`Удалено книг: ${count}`
 * Если перевода нет, возвращается русский текст.
 */
export function tr(text: string): string;
export function tr(strings: TemplateStringsArray, ...values: unknown[]): string;
export function tr(input: string | TemplateStringsArray, ...values: unknown[]): string {
  if (typeof input === 'string') {
    return currentLang === 'en' ? EN[input] ?? input : input;
  }
  const key = input.join('{}');
  const template = currentLang === 'en' ? EN[key] ?? key : key;
  return fill(template, values);
}
