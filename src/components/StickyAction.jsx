// src/components/StickyAction.jsx
//
// The main call to action on a detail page (RSVP / Apply / Request to join)
// in a bar that stays in view while you scroll. It sits just above the
// bottom tab bar on mobile and floats near the bottom on desktop.
// `summary` is the short text on the left; children are the button(s).

import React from 'react';
import themeConfig from '../theme/themeConfig';

export default function StickyAction({ summary, sub, children }) {
  const { colors, radius } = themeConfig;
  return (
    <div className="sticky bottom-[68px] md:bottom-4 z-30">
      <div className={`${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} px-4 py-3 flex items-center justify-between gap-4`}>
        <div className="min-w-0">
          {summary && <p className={`text-sm font-bold ${colors.textWhite} truncate`}>{summary}</p>}
          {sub && <p className={`text-[11px] ${colors.textFaint} truncate`}>{sub}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}
