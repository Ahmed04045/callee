// src/components/LanguageSwitch.jsx
//
// One-tap English / العربية toggle for the headers. Switching sets <html dir>,
// so the whole layout mirrors for Arabic (see src/i18n/index.js).

import React from 'react';
import themeConfig from '../theme/themeConfig';
import { useT } from '../i18n';

export default function LanguageSwitch() {
  const { t, lang, languages, setLanguage } = useT();
  const { colors, radius } = themeConfig;
  const other = languages.find((l) => l.id !== lang);

  return (
    <button
      onClick={() => setLanguage(other.id)}
      title={t('Language')}
      aria-label={`${t('Language')}: ${other.label}`}
      lang={other.id}
      className={`px-2.5 py-2 text-xs font-bold ${radius.md} ${colors.textMuted} ${colors.bgHoverInset}`}
    >
      <span className="sm:hidden">{other.short}</span>
      <span className="hidden sm:inline">{other.label}</span>
    </button>
  );
}
