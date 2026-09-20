// src/i18n/index.js
//
// Circosodal translations (English + Arabic with right-to-left layout).
//
// How it works: every user-facing string in the code is written in English and
// passed through t('English text'). English is the fallback, so a string that has
// no Arabic entry yet simply shows in English (nothing breaks). Arabic lives in
// src/i18n/ar.js as { 'English text': 'النص العربي' }. Values with variables use
// {name} placeholders: t('Welcome back, {name}.', { name }).
//
// The language is remembered per device, defaults to the browser language, and
// sets <html lang> and <html dir> so the whole layout flips for Arabic.
// To add a language: add it to LANGUAGES, create its dictionary, register it below.

import { useMemo, useSyncExternalStore } from 'react';
import ar from './ar';

export const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN', dir: 'ltr', locale: 'en-US' },
  // Western (Latin) digits are the norm in Qatar, so numbers stay 0-9 in Arabic.
  { id: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', locale: 'ar-QA-u-nu-latn' },
];

const DICTIONARIES = { en: {}, ar };
const KEY = 'circosodal.lang';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGUAGES.some((l) => l.id === saved)) return saved;
  } catch {
    /* storage blocked */
  }
  return typeof navigator !== 'undefined' && /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
}

let lang = detect();
const listeners = new Set();

function applyToDocument() {
  if (typeof document === 'undefined') return;
  const meta = LANGUAGES.find((l) => l.id === lang);
  document.documentElement.setAttribute('lang', meta.id);
  document.documentElement.setAttribute('dir', meta.dir);
}
applyToDocument();

export function setLanguage(id) {
  if (!LANGUAGES.some((l) => l.id === id) || id === lang) return;
  lang = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  applyToDocument();
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function translate(key, params, language) {
  const dict = DICTIONARIES[language] ?? {};
  let text = dict[key] ?? key;
  if (params) text = text.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined && params[name] !== null ? String(params[name]) : m));
  return text;
}

/** Translate outside React components (uses the current language). */
export const t = (key, params) => translate(key, params, lang);

export const currentLocale = () => LANGUAGES.find((l) => l.id === lang).locale;

/** Hook: re-renders when the language changes. */
export function useT() {
  const current = useSyncExternalStore(subscribe, () => lang);
  return useMemo(() => {
    const meta = LANGUAGES.find((l) => l.id === current);
    return {
      t: (key, params) => translate(key, params, current),
      lang: current,
      dir: meta.dir,
      locale: meta.locale,
      isRtl: meta.dir === 'rtl',
      setLanguage,
      languages: LANGUAGES,
    };
  }, [current]);
}
