// src/components/Logo.jsx
//
// Placeholder Circosodal mark: a pixel "C" built from squares in the pixel style,
// a rounded "C" tile in the plain style (coloured by the current theme), plus the wordmark. Swap the <svg> for your own logo when it's ready —
// every place that shows the brand goes through this component.

import React from 'react';
import themeConfig from '../theme/themeConfig';
import { useTheme } from '../theme/theme';

export function LogoMark({ size = 28, className = '' }) {
  const { style } = useTheme();
  if (style !== 'pixel') {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.62 }}
        className={`inline-flex items-center justify-center rounded-[var(--r-md)] bg-md3-primary text-md3-onPrimary font-display font-bold leading-none ${className}`}
      >
        C
      </span>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      <g style={{ fill: 'rgb(var(--md3-primary))' }}>
        <rect x="4" y="2" width="8" height="2" />
        <rect x="3" y="4" width="2" height="8" />
        <rect x="4" y="12" width="8" height="2" />
        <rect x="11" y="4" width="2" height="2" />
        <rect x="11" y="10" width="2" height="2" />
      </g>
      <rect x="7" y="7" width="2" height="2" style={{ fill: 'rgb(var(--md3-secondary))' }} />
    </svg>
  );
}

export default function Logo({ showWordmark = true, size = 28 }) {
  const { brand, colors } = themeConfig;
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`font-display font-bold text-lg tracking-tight ${colors.textWhite}`}>{brand.name}</span>
      )}
    </span>
  );
}
