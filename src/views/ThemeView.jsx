// src/views/ThemeView.jsx
//
// No live theme-switching yet — themeConfig/tailwind.config.js are static,
// so "the app's theme" currently means "whatever's hardcoded there," which
// is now this dark scheme by default. This page is a placeholder for the
// day a real toggle exists (a second palette + something that switches
// which one tailwind.config.js's md3-* names resolve to — themeConfig and
// components wouldn't need to change either way).

import React from 'react';
import themeConfig from '../theme/themeConfig';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';

export default function ThemeView() {
  const { colors, radius } = themeConfig;

  return (
    <div className="w-full max-w-md mx-auto">
      <SubPageHeader title="Theme" />

      <div className="space-y-3">
        <div
          className={`${colors.bgCard} border ${colors.accentBorder} ${radius.lg} p-4 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <Icon name="dark_mode" size={20} className={colors.accent} />
            <div className="text-left">
              <p className={`text-sm font-bold ${colors.textWhite}`}>Dark</p>
              <p className={`text-[11px] ${colors.textFaint}`}>Current default</p>
            </div>
          </div>
          <Icon name="check_circle" size={18} className={colors.accent} />
        </div>

        <div
          className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-4 flex items-center justify-between opacity-50`}
        >
          <div className="flex items-center gap-3">
            <Icon name="light_mode" size={20} className={colors.textFaint} />
            <div className="text-left">
              <p className={`text-sm font-bold ${colors.textWhite}`}>Light</p>
              <p className={`text-[11px] ${colors.textFaint}`}>Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}