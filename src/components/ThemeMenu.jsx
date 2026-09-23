// src/components/ThemeMenu.jsx
//
// Header button that opens a small menu with the four themes. The full picker
// (with descriptions) is Settings > Theme.

import React, { useEffect, useRef, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useTheme } from '../theme/theme';
import Icon from './Icon';
import { useT } from '../i18n';

export function Swatch({ colors: swatch, size = 14 }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {swatch.map((c) => (
        <span key={c} style={{ background: c, width: size, height: size }} className="border border-md3-outlineVariant -ms-px first:ms-0" />
      ))}
    </span>
  );
}

export default function ThemeMenu() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { theme, setTheme, themes, style, setStyle, styles } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('Theme')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`h-9 w-9 flex items-center justify-center ${radius.md} ${colors.bgHoverInset}`}
      >
        <Icon name="palette" size={20} />
      </button>
      {open && (
        <div role="menu" className={`absolute end-0 mt-2 w-60 ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.md} p-1.5 z-50`}>
          <p className={`px-2.5 pt-1.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint}`}>{t('Style')}</p>
          <div className="grid grid-cols-2 gap-1 px-1 pb-2">
            {styles.map((s) => (
              <button
                key={s.id}
                role="menuitemradio"
                aria-checked={style === s.id}
                onClick={() => setStyle(s.id)}
                className={`py-1.5 text-xs font-bold ${radius.sm} border ${style === s.id ? 'bg-md3-primary/15 border-md3-primary text-md3-primary' : `${colors.border} ${colors.textMuted} ${colors.bgHoverInset}`}`}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
          <p className={`px-2.5 pt-1 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint}`}>{t('Colors')}</p>
          {themes.map((th) => (
            <button
              key={th.id}
              role="menuitemradio"
              aria-checked={theme === th.id}
              onClick={() => {
                setTheme(th.id);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 ${radius.sm} text-start ${colors.bgHoverInset} ${theme === th.id ? 'bg-md3-primary/10' : ''}`}
            >
              <span className="flex items-center gap-2.5">
                <Swatch colors={th.swatch} />
                <span className={`text-sm font-semibold ${colors.textWhite}`}>{t(th.label)}</span>
              </span>
              {theme === th.id && <Icon name="check" size={16} className={colors.accent} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
