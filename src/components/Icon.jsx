// src/components/Icon.jsx
//
// One icon component, two looks, chosen by the current style (see
// src/theme/theme.js):
//   plain (default)  Google Material Symbols: smooth outlined icons
//   pixel            Pixelarticons: pixel-art icons
// Callers always use the familiar Material names (`name="home"`); in the pixel
// style they are mapped to pixel glyphs by src/theme/iconMap.js.
// Icons are deliberately STATIC: no hover or transition effects. `active`
// draws the smooth glyph filled (the pixel set has no filled variants).

import React from 'react';
import { FALLBACK_ICON, ICON_MAP } from '../theme/iconMap';
import { useTheme } from '../theme/theme';

export default function Icon({ name, size = 20, active = false, className = '', style = {} }) {
  const { style: look } = useTheme();

  if (look === 'pixel') {
    const mapped = ICON_MAP[name];
    if (!mapped && import.meta.env.DEV) console.warn(`[Icon] no pixel icon mapped for "${name}" (see src/theme/iconMap.js)`);
    return (
      <i
        aria-hidden="true"
        className={`pixelart-icons-font-${mapped ?? FALLBACK_ICON} select-none inline-block leading-none not-italic ${className}`}
        style={{ fontSize: size, width: size, height: size, lineHeight: 1, ...style }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined select-none inline-block leading-none ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' ${active ? 500 : 400}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
