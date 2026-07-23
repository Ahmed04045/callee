// src/components/Icon.jsx
//
// Renders one Google Material Symbol (fonts.google.com/icons — search by
// name, e.g. "home", "work", "explore"). Requires the Material Symbols
// stylesheet link already added to index.html.
//
// `active` fills the glyph solid (matches how Google's own nav bars show
// the selected tab). Hovering does the same thing temporarily, which is
// the little "fills in as you hover" animation Google's nav icons do —
// driven by the icon font's FILL variable axis, not a swapped icon.

import React, { useState } from 'react';

export default function Icon({ name, size = 20, active = false, className = '', style = {} }) {
  const [isHovered, setIsHovered] = useState(false);
  const filled = active || isHovered;

  return (
    <span
      aria-hidden="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`material-symbols-outlined select-none inline-block leading-none ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${active ? 500 : 400}, 'GRAD' 0, 'opsz' ${size}`,
        transition: 'font-variation-settings 200ms ease, transform 200ms ease',
        transform: isHovered ? 'scale(1.12)' : 'scale(1)',
        ...style,
      }}
    >
      {name}
    </span>
  );
}