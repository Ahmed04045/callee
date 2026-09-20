// src/theme/theme.js
//
// Circosodal look = two independent choices, remembered per device:
//   STYLE   plain (default) | pixel   -> shapes, icons, placeholders, effects
//   COLORS  electric | ultraviolet | acid | paper   -> the palette
// Palettes and style rules live in src/index.css (data-theme / data-style on
// <html>); this file lists them for the pickers and holds the tiny store any
// component can read (useTheme) or change (setTheme / setStyle).

import { useSyncExternalStore } from 'react';

export const THEMES = [
  { id: 'electric', label: 'Electric', hint: 'Black + electric blue', swatch: ['#04060F', '#3D8BFF', '#5CE1FF', '#FF3DA5'] },
  { id: 'ultraviolet', label: 'Ultraviolet', hint: 'Black + violet + hot pink', swatch: ['#08040F', '#B26BFF', '#FF4FD8', '#3DFFD1'] },
  { id: 'acid', label: 'Acid', hint: 'Black + lime + yellow', swatch: ['#030804', '#7CFF3D', '#FFE600', '#00E5FF'] },
  { id: 'paper', label: 'Paper', hint: 'Light + cobalt blue', swatch: ['#F4F7FF', '#1F4FFF', '#0082B2', '#D60078'] },
];

export const STYLES = [
  { id: 'plain', label: 'Plain', hint: 'Clean and modern: rounded shapes, smooth icons' },
  { id: 'pixel', label: 'Pixel', hint: 'Retro: pixel icons and art, square frames, grid + scanlines' },
];

const THEME_KEY = 'circosodal.theme';
const STYLE_KEY = 'circosodal.style';
const DEFAULT_THEME = 'electric';
const DEFAULT_STYLE = 'plain';

const ICON_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&display=swap';

function read(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (allowed.some((a) => a.id === saved)) return saved;
  } catch {
    /* storage blocked: use the default */
  }
  return fallback;
}

// The smooth icon font is only needed in the plain style, so it is loaded on demand.
function ensureIconFont() {
  if (typeof document === 'undefined' || document.getElementById('material-symbols-font')) return;
  const link = document.createElement('link');
  link.id = 'material-symbols-font';
  link.rel = 'stylesheet';
  link.href = ICON_FONT_HREF;
  document.head.appendChild(link);
}

function apply(state) {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.setAttribute('data-style', state.style);
  if (state.style !== 'pixel') ensureIconFont();
}

let state = {
  theme: read(THEME_KEY, THEMES, DEFAULT_THEME),
  style: read(STYLE_KEY, STYLES, DEFAULT_STYLE),
};
if (typeof document !== 'undefined') apply(state);

const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function update(patch, key, value) {
  state = { ...state, ...patch };
  apply(state);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function setTheme(id) {
  if (THEMES.some((t) => t.id === id)) update({ theme: id }, THEME_KEY, id);
}

export function setStyle(id) {
  if (STYLES.some((s) => s.id === id)) update({ style: id }, STYLE_KEY, id);
}

/** @returns {{theme: string, style: string, setTheme: Function, setStyle: Function, themes: typeof THEMES, styles: typeof STYLES}} */
export function useTheme() {
  const s = useSyncExternalStore(subscribe, () => state);
  return { theme: s.theme, style: s.style, setTheme, setStyle, themes: THEMES, styles: STYLES };
}
