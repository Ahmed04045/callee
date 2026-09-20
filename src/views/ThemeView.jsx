// src/views/ThemeView.jsx
//
// Appearance picker: a STYLE (Plain is the default, Pixel is the retro look)
// and a COLOR set (Electric, Ultraviolet, Acid, Paper). Any style works with
// any colors; both are remembered on this device. The definitions live in
// src/theme/theme.js and src/index.css.

import React from 'react';
import themeConfig from '../theme/themeConfig';
import { useTheme } from '../theme/theme';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';
import { Swatch } from '../components/ThemeMenu';

function Choice({ active, onClick, children }) {
  const { colors, radius } = themeConfig;
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`${colors.bgCard} border ${active ? 'border-md3-primary' : colors.border} ${radius.lg} p-4 flex items-center justify-between text-left w-full ${active ? 'bg-md3-primary/10' : colors.borderHover}`}
    >
      {children}
      {active && <Icon name="check_circle" size={20} active className={colors.accent} />}
    </button>
  );
}

export default function ThemeView() {
  const { colors } = themeConfig;
  const { theme, setTheme, themes, style, setStyle, styles } = useTheme();

  return (
    <div className="w-full max-w-md mx-auto">
      <SubPageHeader title="Appearance" />

      <section className="space-y-3 mb-8">
        <h2 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>Style</h2>
        <div className="grid gap-3" role="radiogroup" aria-label="Style">
          {styles.map((s) => (
            <Choice key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
              <div>
                <p className={`text-sm font-bold ${colors.textWhite}`}>{s.label}</p>
                <p className={`text-[11px] ${colors.textFaint}`}>{s.hint}</p>
              </div>
            </Choice>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>Colors</h2>
        <div className="grid gap-3" role="radiogroup" aria-label="Colors">
          {themes.map((t) => (
            <Choice key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>
              <div className="flex items-center gap-4">
                <Swatch colors={t.swatch} size={22} />
                <div>
                  <p className={`text-sm font-bold ${colors.textWhite}`}>{t.label}</p>
                  <p className={`text-[11px] ${colors.textFaint}`}>{t.hint}</p>
                </div>
              </div>
            </Choice>
          ))}
        </div>
      </section>
    </div>
  );
}
